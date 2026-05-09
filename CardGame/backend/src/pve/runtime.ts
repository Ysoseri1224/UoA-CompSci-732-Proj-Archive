import { initDeckState } from '../lib/deck.js';
import { createBossForLayer } from '../lib/boss.js';
import { createPlayerState, createRoundState } from '../types/state.js';
import { transition } from './roundMachine.js';
import { Match } from '../models/Match.js';
import { MatchReplay } from '../models/MatchReplay.js';
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

  const deckState = initDeckState();
  const ctx: GameContext = {
    deck: deckState.deck,
    discardPile: deckState.discardPile,
    hand: deckState.hand,
    player: createPlayerState(),
    boss: createBossForLayer(layer),
    round: 1,
    roundState: createRoundState(),
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

  const prevPhase = entry.ctx.roundState.phase;

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
    archiveGame(roomId).catch(() => { /* fire-and-forget */ });
  }

  return { ctx: result.ctx, ok: true };
}

export function updateRoom(roomId: string, ctx: GameContext): void {
  const entry = rooms.get(roomId);
  if (entry) entry.ctx = ctx;
}

export async function archiveGame(roomId: string): Promise<void> {
  const entry = rooms.get(roomId);
  if (!entry) return;

  const { ctx, userId, totalDamage, turns } = entry;
  const isWin = ctx.battleResult === 'WIN';

  const match = await Match.create({
    matchType: 'PVE',
    userId: userId ?? undefined,
    bossId: ctx.boss.id,
    layer: ctx.boss.layer,
    isWin,
    chosenElement: ctx.player.chosenElement,
    totalDamageDealt: totalDamage,
    roundsPlayed: ctx.round,
    endedAt: new Date(),
  });

  if (turns.length > 0) {
    await MatchReplay.create({
      matchId: match._id,
      turns: turns.map((t) => ({
        turnNumber: t.turnNumber,
        initialHand: t.initialHand,
        events: t.events,
        result: t.result ? { ...t.result } : undefined,
      })),
    });
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
