import type { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../middleware/logger.js';
import {
  getRoomId,
  getRoom,
  createRoom,
  sendRoomEvent,
  updateRoom,
  isRogueRoom,
  stopRoomForSocket,
} from '../pve/runtime.js';
import { loadGame } from '../lib/savepoint.js';
import { createBossForLayer, playerHpForLayer } from '../lib/boss.js';
import {
  drawComplete,
  bossTelegraphComplete,
  skillChangeColor,
  skillChangeCost,
  skillShield,
  shuffleSelect,
  shuffleConfirm,
  startBattle,
  playSelect,
  playConfirm,
  resolveComplete,
  bossAttackComplete,
  roundEndConfirm,
} from '../types/events.js';
import type { GameContext } from '../pve/roundMachine.js';
import { ROUND_PHASE } from '../types/state.js';
import type { Buff, ElementChipMult, ElementChipsBonus, ElementDrawBuff } from '../types/buff.js';
import { applyPlayerBuffs, FIRST_LAYER_UPGRADES, generateUpgradePool } from '../types/buff.js';
import type { Element, Rank } from '../types/card.js';

function freshRoundState(energy: number, shuffleCount: number) {
  return {
    phase: 'DRAW' as const,
    skills: {
      energy,
      shield: { active: false, onCooldown: false, cooldownRounds: 0 },
    },
    shuffle:   { remaining: shuffleCount, pendingDiscard: [] },
    play:      { selectedCards: [], handType: null, score: null },
    bossRound: { intent: 'ATTACK' as const, isDefending: false, willReleaseCharge: false },
  };
}

function buffKey(b: Buff): string {
  const el = 'element' in b ? (b as ElementChipMult | ElementChipsBonus | ElementDrawBuff).element : '';
  return `${b.type}:${el}`;
}

// ══════════════════════════════════════════════════════════════════
//  注册 Socket 事件处理器
// ══════════════════════════════════════════════════════════════════

/**
 * Verify the handshake JWT and return the decoded `userId`.
 *
 * The second tuple element reports *why* verification failed, which lets
 * the caller decide whether to nudge the client into a refresh
 * (`'expired'`) or treat the connection as unauthenticated (`'invalid'` /
 * `'missing'`).  We **do not** disconnect on auth failure here — the
 * current socket layer is non-strict and a missing/expired token simply
 * means the resulting match will not be persisted.  The frontend can react
 * to `'expired'` by refreshing and re-handshaking; nothing else changes.
 */
type AuthFailureReason = 'missing' | 'invalid' | 'expired';

function resolveSocketUserId(socket: Socket): { userId: string | null; reason: AuthFailureReason | null } {
  const token = (socket.handshake.auth as Record<string, unknown>)?.token;
  if (!token || typeof token !== 'string') return { userId: null, reason: 'missing' };

  const secret = process.env.JWT_SECRET;
  if (!secret) return { userId: null, reason: 'invalid' };

  try {
    const decoded = jwt.verify(token, secret) as Record<string, unknown>;
    const uid = decoded?.userId;
    return { userId: uid ? String(uid) : null, reason: uid ? null : 'invalid' };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) return { userId: null, reason: 'expired' };
    return { userId: null, reason: 'invalid' };
  }
}

/** Warn when a PvE socket connection could not resolve a userId (match won't be persisted). */
function warnIfNoUserId(socket: Socket, resolvedUserId: string | null): void {
  if (resolvedUserId) return;

  const auth = socket.handshake.auth as Record<string, unknown> | undefined;
  const raw = auth?.token;
  const tokenKind = raw == null ? 'missing' : typeof raw === 'string' ? `string(len=${raw.length})` : typeof raw;

  let verifyHint = 'n/a';
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    verifyHint = 'JWT_SECRET unset';
  } else if (typeof raw !== 'string' || raw.length === 0) {
    verifyHint = 'handshake.auth.token missing or empty';
  } else {
    try {
      const decoded = jwt.verify(raw, secret) as Record<string, unknown>;
      verifyHint = decoded?.userId
        ? 'payload has userId but resolve returned null (unexpected)'
        : 'payload missing userId';
    } catch (err) {
      verifyHint = err instanceof Error ? err.message : String(err);
    }
  }

  logger.warn({ socketId: socket.id, tokenKind, verifyHint }, 'pve socket: userId not resolved — match will not be persisted');
}

export function registerPveHandlers(socket: Socket): void {
  logger.info({ socketId: socket.id }, 'socket connected');

  const { userId, reason: authFailureReason } = resolveSocketUserId(socket);
  warnIfNoUserId(socket, userId);

  // Tell the client *why* its handshake had no user, so the frontend can
  // react (refresh + re-handshake) without us needing to disconnect.
  // Done on next tick so the client's `'connect'` listener wires up first.
  if (authFailureReason === 'expired') {
    setImmediate(() => {
      socket.emit('auth:expired', { code: 'TOKEN_EXPIRED' });
    });
  }

  /** 将当前状态推送回客户端 */
  function emit(ctx: GameContext) {
    socket.emit('gameState', {
      hand: ctx.hand,
      deckCount: ctx.deck.length,
      discardCount: ctx.discardPile.length,
      player: ctx.player,
      boss: ctx.boss,
      round: ctx.round,
      phase: ctx.roundState.phase,
      skills: ctx.roundState.skills,
      shuffle: ctx.roundState.shuffle,
      play: ctx.roundState.play,
      bossRound: ctx.roundState.bossRound,
      battleResult: ctx.battleResult,
    });
  }

  function emitError(msg: string) {
    socket.emit('gameError', { message: msg });
  }

  function ensureRoomId(): string {
    const existing = getRoomId(socket.id);
    if (existing) return existing;

    for (let i = 0; i < 10; i++) {
      const id = String(Math.floor(100000 + Math.random() * 900000));
      if (!getRoom(id)) return id;
    }
    return String(Date.now());
  }

  // ── 开始 PvE ──────────────────────────────────
  socket.on('startPveGame', () => {
    try {
      const roomId = ensureRoomId();
      logger.info({ roomId, socketId: socket.id, userIdPresent: Boolean(userId) }, 'pve startPveGame');
      const ctx = createRoom({ roomId, socketId: socket.id, userId: userId ?? undefined, rogueMode: false });
      emit(ctx);

      // 自动推进：DRAW → BOSS_TELEGRAPH → SKILL
      const r1 = sendRoomEvent(roomId, drawComplete());
      if (r1.ctx) emit(r1.ctx);
      const r2 = sendRoomEvent(roomId, bossTelegraphComplete());
      if (r2.ctx) emit(r2.ctx);
    } catch (err) {
      logger.error({ err, socketId: socket.id }, 'failed to start PvE game');
      socket.emit('gameError', { message: 'Failed to start PvE game.' });
    }
  });

  // ── 开始 Rogue 跨层模式 ─────────────────────
  socket.on('startRogueGame', async () => {
    try {
      if (!userId) {
        emitError('Authentication required for Rogue mode');
        return;
      }
      const roomId = ensureRoomId();
      logger.info({ roomId, socketId: socket.id, userId }, 'rogue startRogueGame');

      createRoom({ roomId, socketId: socket.id, userId, rogueMode: true });
      const ctx = getRoom(roomId)!;
      emit(ctx);
      ctx.rogueMode = true;
      ctx.roguePhase = "BATTLE";
      updateRoom(roomId, ctx);
      logger.info({ roomId, layer: 1 }, "rogue: fresh run started");
      let r = sendRoomEvent(roomId, drawComplete());
      if (r.ctx) emit(r.ctx);
      r = sendRoomEvent(roomId, bossTelegraphComplete());
      if (r.ctx) emit(r.ctx);
    } catch (err) {
      logger.error({ err, socketId: socket.id }, 'failed to start Rogue game');
      socket.emit('gameError', { message: 'Failed to start Rogue game.' });
    }
  });

  // ── 技能 ──────────────────────────────────────
  socket.on('useSkill', (payload: { skill: string; cardId?: string; target?: string; targetRank?: number }) => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;
    const ctxBefore = getRoom(roomId);
    const handBefore = ctxBefore?.hand.map(c => c.id).join(',') ?? '';

    let result;
    switch (payload.skill) {
      case 'changeColor':
        result = sendRoomEvent(roomId, skillChangeColor(payload.cardId!, payload.target! as Element));
        break;
      case 'changeCost':
        result = sendRoomEvent(roomId, skillChangeCost(payload.cardId!, payload.targetRank as Rank));
        break;
      case 'shield':
        result = sendRoomEvent(roomId, skillShield());
        break;
      default:
        emitError(`Unknown skill: ${payload.skill}`);
        return;
    }

    if (result.ctx) {
      const handAfter = result.ctx.hand.map(c => c.id).join(',');
      if ((payload.skill === 'changeColor' || payload.skill === 'changeCost') && handBefore === handAfter) {
        socket.emit('skillWarning', { skill: payload.skill, message: 'No valid replacement found' });
      }
      emit(result.ctx);
    }
    if (result.error) emitError(result.error);
  });

  // ── Shuffle ───────────────────────────────────
  socket.on('shuffleCards', (payload: { cardIds: string[] }) => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;

    // select + confirm in one step
    let r = sendRoomEvent(roomId, shuffleSelect(payload.cardIds));
    if (!r.ok) { emitError(r.error ?? 'Shuffle select failed'); return; }
    r = sendRoomEvent(roomId, shuffleConfirm());
    if (!r.ok) { emitError(r.error ?? 'Shuffle confirm failed'); return; }
    if (r.ctx) emit(r.ctx);
  });

  // ── 进入出牌阶段 ──────────────────────────────
  socket.on('enterPlay', () => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;
    const r = sendRoomEvent(roomId, startBattle());
    if (!r.ok) emitError(r.error ?? 'Cannot enter play');
    if (r.ctx) emit(r.ctx);
  });

  // ── 选牌 ──────────────────────────────────────
  socket.on('selectCard', (payload: { cardId: string }) => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;
    const r = sendRoomEvent(roomId, playSelect(payload.cardId));
    if (r.ctx) emit(r.ctx);
  });

  // ── 确认出牌 ──────────────────────────
  socket.on('confirmPlay', () => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;
    const ctxCheck = getRoom(roomId);
    if (ctxCheck?.roguePhase === 'UPGRADE') {
      emitError('Cannot play cards during upgrade phase');
      return;
    }

    // PLAY_CONFIRM → RESOLVE
    let r = sendRoomEvent(roomId, playConfirm());
    if (!r.ok) { emitError(r.error ?? 'Cannot confirm play'); return; }
    if (r.ctx) emit(r.ctx);

    // 自动：RESOLVE → BOSS_ATTACK or WIN
    r = sendRoomEvent(roomId, resolveComplete());
    if (!r.ok) { emitError(r.error ?? 'Resolve failed'); return; }
    if (r.ctx) {
      const score = r.ctx.roundState.play.score ?? null;
      logger.info({
        socketId: socket.id,
        roomId,
        round: r.ctx.round,
        score,
        battleResult: r.ctx.battleResult,
      }, `pve score resolved roomId=${roomId} round=${r.ctx.round} score=${score} battleResult=${r.ctx.battleResult}`);
      emit(r.ctx);
      if (r.ctx.roguePhase === 'UPGRADE') {
        // Rogue 层通关：向前端发 battleWin，前端播放动画后发 upgradePhaseReady
        socket.emit('battleWin', { layer: r.ctx.boss.layer });
        return;
      }
      if (r.ctx.battleResult === 'WIN') {
        // Solo 通关
        socket.emit('battleWin', { layer: r.ctx.boss.layer });
        return;
      }
    }
  });

  // resolveAnimationComplete -> boss_attack for Player attack animation played
  socket.on('resolveAnimationComplete', () => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;

    const currentRoom = getRoom(roomId);
    if (!currentRoom) {
      emitError(`Room ${roomId} not found`);
      return;
    }

    if (currentRoom.roundState.phase !== ROUND_PHASE.BOSS_ATTACK) {
      return;
    }

    let r = sendRoomEvent(roomId, bossAttackComplete());
    if (!r.ok) { emitError(r.error ?? 'Boss attack failed'); return; }
    if (r.ctx) {
      emit(r.ctx);
      if (r.ctx.battleResult === 'LOSE') {
        socket.emit('battleLose', { layer: r.ctx.boss.layer });
        return;
      }
    }

    r = sendRoomEvent(roomId, roundEndConfirm());
    if (r.ctx) {
      emit(r.ctx);
      r = sendRoomEvent(roomId, drawComplete());
      if (r.ctx) emit(r.ctx);
      r = sendRoomEvent(roomId, bossTelegraphComplete());
      if (r.ctx) emit(r.ctx);
    }
  });

  // ── Rogue 动画结束信号 → 后端生成增益选项 ───────────
  socket.on('upgradePhaseReady', () => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;
    const ctx = getRoom(roomId);
    if (!ctx) { emitError('Room not found'); return; }
    if (!isRogueRoom(roomId)) { emitError('Not a rogue session'); return; }
    if (ctx.roguePhase !== 'UPGRADE') { emitError('Not in upgrade phase'); return; }

    const layer = ctx.boss.layer;
    const chosenElement = ctx.player.chosenElement ?? (['WATER', 'FIRE', 'GRASS'] as const)[(layer - 1) % 3];
    const ownedTypes = (ctx.player.buffs ?? []).map(b => b.type);
    const options = layer === 1 ? FIRST_LAYER_UPGRADES : generateUpgradePool(chosenElement, layer, ownedTypes);
    socket.emit('upgradeOptions', { options });
    logger.info({ roomId, layer }, 'rogue: upgrade options sent');
  });

  // ── 推进到下一层（前端在 battleWin 动画后发送）────────
  socket.on('advanceLayer', (payload?: { shuffleCount?: number; buffs?: Buff[] }) => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;
    const ctx = getRoom(roomId);
    if (!ctx) { emitError('Room not found'); return; }
    if (!isRogueRoom(roomId)) { emitError('Not a rogue session'); return; }
    if (ctx.roguePhase !== 'UPGRADE') { emitError('Not in upgrade phase — cannot advance layer'); return; }

    const nextLayer    = ctx.boss.layer + 1;
    const nextBoss     = createBossForLayer(nextLayer);
    const nextHp       = playerHpForLayer(nextLayer);
    const shuffleCount = Math.max(2, Math.floor(payload?.shuffleCount ?? 2));
    const existing = ctx.player.buffs ?? [];
    const incoming  = Array.isArray(payload?.buffs) ? payload.buffs : [];
    const merged    = [...existing];
    for (const b of incoming) {
      const key = buffKey(b);
      const idx = merged.findIndex(e => buffKey(e) === key);
      if (idx >= 0) merged[idx] = b;
      else merged.push(b);
    }
    const buffs = incoming.length > 0 ? merged : existing;
    const { skillEnergyMax, maxHp } = applyPlayerBuffs(buffs, nextHp, 3);

    const newCtx: GameContext = {
      ...ctx,
      player: { ...ctx.player, hp: maxHp, maxHp, buffs, skillEnergyMax },
      boss: nextBoss,
      round: 1,
      roundState: freshRoundState(skillEnergyMax, shuffleCount),
      battleResult: 'ONGOING',
      roguePhase: 'BATTLE',
    };
    updateRoom(roomId, newCtx);

    let r = sendRoomEvent(roomId, drawComplete());
    if (r.ctx) emit(r.ctx);
    r = sendRoomEvent(roomId, bossTelegraphComplete());
    if (r.ctx) emit(r.ctx);

    logger.info({ socketId: socket.id, roomId, nextLayer }, 'advanced to next layer');
  });

  // ── 从存档恢复─────────────────────
  socket.on('restoreFromCheckpoint', (payload: {
    layer: number;
    playerHp: number;
    bossHp: number;
    buffs?: Buff[];
    shuffleCount: number;
  }) => {
    const roomId = getRoomId(socket.id);
    if (!roomId) { emitError('No active room'); return; }
    const ctx = getRoom(roomId);
    if (!ctx) { emitError('Room not found'); return; }
    if (!isRogueRoom(roomId)) { emitError('Not a rogue session'); return; }

    const layer = Math.max(1, Math.floor(payload.layer ?? 1));
    const bossTemplate = createBossForLayer(layer);
    const boss = { ...bossTemplate, hp: Math.max(1, Math.floor(payload.bossHp ?? bossTemplate.maxHp)) };
    const baseMaxHp = playerHpForLayer(layer);
    const shuffleCount = Math.max(2, Math.floor(payload.shuffleCount ?? 2));
    const buffs = Array.isArray(payload.buffs) ? payload.buffs : (ctx.player.buffs ?? []);
    const { skillEnergyMax, maxHp } = applyPlayerBuffs(buffs, baseMaxHp, 3);
    const playerHp = Math.max(1, Math.floor(payload.playerHp ?? maxHp));

    const restoredCtx: GameContext = {
      ...ctx,
      player: { ...ctx.player, hp: playerHp, maxHp, buffs, skillEnergyMax },
      boss,
      round: 1,
      roundState: freshRoundState(skillEnergyMax, shuffleCount),
      battleResult: 'ONGOING',
      roguePhase: 'BATTLE',
    };
    updateRoom(roomId, restoredCtx);

    let r = sendRoomEvent(roomId, drawComplete());
    if (r.ctx) emit(r.ctx);
    r = sendRoomEvent(roomId, bossTelegraphComplete());
    if (r.ctx) emit(r.ctx);

    logger.info({ socketId: socket.id, roomId, layer }, 'restored from checkpoint');
  });

  // ── 断开 ──────────────────────────────────────
  socket.on('disconnect', () => {
    stopRoomForSocket(socket.id);
    logger.info({ socketId: socket.id }, 'socket disconnected');
  });
}
