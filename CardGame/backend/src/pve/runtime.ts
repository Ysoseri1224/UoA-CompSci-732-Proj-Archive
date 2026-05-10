import { initDeckState } from '../lib/deck.js';
import { createBossForLayer, playerHpForLayer } from '../lib/boss.js';
import { createPlayerState, createRoundState } from '../types/state.js';
import { transition } from './roundMachine.js';
import { Match } from '../models/Match.js';
import { MatchReplay } from '../models/MatchReplay.js';
import { User } from '../models/User.js';
import { logger } from '../middleware/logger.js';
import type { GameContext } from './actions.js';
import type { GameEvent } from '../types/events.js';

// ══════════════════════════════════════════════════════════════════
//  Room storage — in-memory Map
// ══════════════════════════════════════════════════════════════════

interface RoomEntry {
  ctx: GameContext;
  userId: string | null;
  totalDamage: number;
  turns: TurnRecord[];
}

interface TurnRecord {
  turnNumber: number;
  initialHand: string[];
  events: { timestamp: number; type: string; actor: 'player' | 'boss'; data: unknown }[];
  result: { handType: string; baseScore: number; multiplier: number; totalDamage: number; chips: number } | null;
}

const rooms = new Map<string, RoomEntry>();
const roomBySocket = new Map<string, string>();

function logArchiveRejection(roomId: string, err: unknown): void {
  // Fallback: the specific step (Match/Replay/User) already logged the full detail before re-throwing.
  // This catches anything that slipped through (e.g. winRate updateOne).
  logger.error(
    {
      roomId,
      errName: err instanceof Error ? err.name : typeof err,
      errMessage: err instanceof Error ? err.message : String(err),
    },
    'pve archiveGame rejected',
  );
}

// ══════════════════════════════════════════════════════════════════
//  Room lifecycle
// ══════════════════════════════════════════════════════════════════

export function getRoomId(socketId: string): string | null {
  return roomBySocket.get(socketId) ?? null;
}

export function getRoom(roomId: string): GameContext | null {
  return rooms.get(roomId)?.ctx ?? null;
}

export function createRoom(opts: {
  roomId: string;
  socketId: string;
  userId?: string;
  layer?: number;
}): GameContext {
  const { roomId, socketId, userId = null, layer = 1 } = opts;

  if (rooms.has(roomId)) {
    throw new Error(`Room ${roomId} already exists`);
  }

  logger.info({ roomId, layer, userIdPresent: Boolean(userId) }, 'pve room created');

  const deckState = initDeckState();
  const player = createPlayerState({ hp: playerHpForLayer(layer), maxHp: playerHpForLayer(layer) });
  const roundState = createRoundState();
  roundState.skills.energy = player.skillEnergyMax; // 每层开始回满充能

  const ctx: GameContext = {
    deck: deckState.deck,
    discardPile: deckState.discardPile,
    hand: deckState.hand,
    player,
    boss: createBossForLayer(layer),
    round: 1,
    roundState,
    battleResult: 'ONGOING',
  };

  rooms.set(roomId, { ctx, userId, totalDamage: 0, turns: [] });
  roomBySocket.set(socketId, roomId);

  return ctx;
}

export function sendRoomEvent(
  roomId: string,
  event: GameEvent,
): { ctx: GameContext | null; ok: boolean; error?: string } {
  const entry = rooms.get(roomId);
  if (!entry) return { ctx: null, ok: false, error: `Room ${roomId} not found` };

  const result = transition(entry.ctx, event);
  if (!result.ok) return { ctx: null, ok: false, error: result.error };

  entry.ctx = result.ctx;

  // Track turn data for replay
  if (
    event.type === 'PLAY_CONFIRM' &&
    result.ctx.roundState.play.score !== null
  ) {
    const turn: TurnRecord = {
      turnNumber: entry.ctx.round,
      initialHand: entry.ctx.hand.map((c) => c.id),
      events: [
        { timestamp: Date.now(), type: event.type, actor: 'player', data: { selectedCards: result.ctx.roundState.play.selectedCards } },
      ],
      result: {
        handType: result.ctx.roundState.play.handType ?? 'HIGH_CARD',
        baseScore: result.ctx.roundState.play.score ?? 0,
        multiplier: 1,
        totalDamage: result.ctx.roundState.play.score ?? 0,
        chips: result.ctx.roundState.play.score ?? 0,
      },
    };
    entry.turns.push(turn);
    entry.totalDamage += result.ctx.roundState.play.score ?? 0;
  }

  // Auto-archive on game end
  if (result.ctx.battleResult === 'WIN' || result.ctx.battleResult === 'LOSE') {
    archiveGame(roomId).catch((err) => {
      logArchiveRejection(roomId, err);
    });
  }

  return { ctx: result.ctx, ok: true };
}

export function updateRoom(roomId: string, ctx: GameContext): void {
  const entry = rooms.get(roomId);
  if (entry) entry.ctx = ctx;
}

export async function archiveGame(roomId: string): Promise<void> {
  const entry = rooms.get(roomId);
  if (!entry) {
    logger.warn({ roomId }, 'pve archiveGame: room not found');
    return;
  }

  const { ctx, userId, totalDamage, turns } = entry;
  const isWin = ctx.battleResult === 'WIN';

  // Only persist the match when we have an authenticated user (userId is required by schema)
  if (userId) {
    const matchPayload = {
      matchType: 'PVE' as const,
      userId,
      bossId: ctx.boss.id,
      layer: ctx.boss.layer,
      isWin,
      // Omit when null — Match schema enum rejects explicit null.
      ...(ctx.player.chosenElement != null ? { chosenElement: ctx.player.chosenElement } : {}),
      totalDamageDealt: totalDamage,
      roundsPlayed: ctx.round,
      endedAt: new Date(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let match: any;
    try {
      match = await Match.create(matchPayload);
    } catch (matchErr: unknown) {
      const base: Record<string, unknown> = {
        roomId,
        errName: matchErr instanceof Error ? matchErr.name : typeof matchErr,
        errMessage: matchErr instanceof Error ? matchErr.message : String(matchErr),
        errStack: matchErr instanceof Error ? matchErr.stack : undefined,
      };
      if (
        typeof matchErr === 'object' && matchErr !== null && 'errors' in matchErr &&
        typeof (matchErr as { errors: unknown }).errors === 'object'
      ) {
        const errs = (matchErr as { errors: Record<string, { message?: string; path?: string; value?: unknown; kind?: string }> }).errors;
        base.mongooseFieldErrors = Object.fromEntries(
          Object.entries(errs).map(([k, v]) => [
            k,
            { message: v?.message, path: v?.path, value: String(v?.value), kind: v?.kind },
          ]),
        );
      }
      logger.error(base, 'pve Match.create failed');
      throw matchErr;
    }

    if (turns.length > 0) {
      try {
        await MatchReplay.create({
          matchId: match._id,
          turns: turns.map((t) => ({
            turnNumber: t.turnNumber,
            initialHand: t.initialHand,
            events: t.events,
            result: t.result ? { ...t.result } : undefined,
          })),
        });
      } catch (replayErr: unknown) {
        logger.error(
          {
            roomId,
            matchId: String(match._id),
            errName: replayErr instanceof Error ? replayErr.name : typeof replayErr,
            errMessage: replayErr instanceof Error ? replayErr.message : String(replayErr),
          },
          'pve MatchReplay.create failed',
        );
        throw replayErr;
      }
    }

    // Update the user's aggregate stats so the leaderboard reflects real gameplay
    const statsInc: Record<string, number> = { 'stats.totalGames': 1 };
    if (isWin) statsInc['stats.totalWins'] = 1;

    const updateOps: Record<string, unknown> = { $inc: statsInc };
    if (totalDamage > 0) {
      updateOps.$max = { 'stats.maxDamage': totalDamage };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let updated: any;
    try {
      updated = await User.findByIdAndUpdate(userId, updateOps, {
        new: true,
        select: 'stats',
      });
    } catch (userErr: unknown) {
      logger.error(
        {
          roomId,
          errName: userErr instanceof Error ? userErr.name : typeof userErr,
          errMessage: userErr instanceof Error ? userErr.message : String(userErr),
        },
        'pve User stats update failed',
      );
      throw userErr;
    }

    // Persist the derived winRate field so profile endpoints can read it directly
    if (updated?.stats) {
      const { totalGames, totalWins } = updated.stats;
      const winRate = totalGames > 0 ? totalWins / totalGames : 0;
      await User.updateOne({ _id: userId }, { $set: { 'stats.winRate': winRate } });
    }

    logger.info({ roomId, isWin }, 'pve archiveGame: match persisted');
  } else {
    logger.warn({ roomId, battleResult: ctx.battleResult }, 'pve archiveGame: skipped (no userId)');
  }
}

export function stopRoom(roomId: string): boolean {
  const existed = rooms.delete(roomId);
  for (const [sid, rid] of roomBySocket.entries()) {
    if (rid === roomId) roomBySocket.delete(sid);
  }
  return existed;
}

export function stopRoomForSocket(socketId: string): boolean {
  const roomId = roomBySocket.get(socketId);
  if (!roomId) return false;
  return stopRoom(roomId);
}
