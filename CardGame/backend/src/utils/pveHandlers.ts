import type { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../middleware/logger.js';
import {
  getRoomId,
  getRoom,
  createRoom,
  sendRoomEvent,
  stopRoomForSocket,
} from '../pve/runtime.js';
import {
  drawComplete,
  bossTelegraphComplete,
  skillChangeColor,
  skillChangeCost,
  skillShield,
  shuffleSelect,
  shuffleConfirm,
  shuffleCancel,
  startBattle,
  playSelect,
  playConfirm,
  resolveComplete,
  bossAttackComplete,
  roundEndConfirm,
} from '../types/events.js';
import type { GameContext } from '../pve/roundMachine.js';
import { ROUND_PHASE } from '../types/state.js';

// ══════════════════════════════════════════════════════════════════
//  注册 Socket 事件处理器
// ══════════════════════════════════════════════════════════════════

function resolveSocketUserId(socket: Socket): string | null {
  try {
    const token = (socket.handshake.auth as Record<string, unknown>)?.token;
    if (!token || typeof token !== 'string') return null;
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    const decoded = jwt.verify(token, secret) as Record<string, unknown>;
    const uid = decoded?.userId;
    return uid ? String(uid) : null;
  } catch {
    return null;
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

  const userId = resolveSocketUserId(socket);
  warnIfNoUserId(socket, userId);

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
      const ctx = createRoom({ roomId, socketId: socket.id, userId: userId ?? undefined });
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

  // ── 技能 ──────────────────────────────────────
  socket.on('useSkill', (payload: { skill: string; cardId?: string; target?: string; targetRank?: number }) => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;

    let result;
    switch (payload.skill) {
      case 'changeColor':
        result = sendRoomEvent(roomId, skillChangeColor(payload.cardId!, payload.target as any));
        break;
      case 'changeCost':
        result = sendRoomEvent(roomId, skillChangeCost(payload.cardId!, payload.targetRank as any));
        break;
      case 'shield':
        result = sendRoomEvent(roomId, skillShield());
        break;
      default:
        emitError(`Unknown skill: ${payload.skill}`);
        return;
    }

    if (!result.ok) emitError(result.error ?? 'Skill failed');
    if (result.ctx) emit(result.ctx);
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

  // ── 确认出牌 ──────────────────────────────────
  socket.on('confirmPlay', () => {
    const roomId = getRoomId(socket.id);
    if (!roomId) return;

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
      if (r.ctx.battleResult === 'WIN') {
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

  // ── 断开 ──────────────────────────────────────
  socket.on('disconnect', () => {
    stopRoomForSocket(socket.id);
    logger.info({ socketId: socket.id }, 'socket disconnected');
  });
}
