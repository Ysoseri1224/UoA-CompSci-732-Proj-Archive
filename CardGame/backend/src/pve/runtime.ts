import { initDeckState } from '../lib/deck.js';
import { createBossForLayer } from '../lib/boss.js';
import { createPlayerState, createRoundState } from '../types/state.js';
import { transition } from './roundMachine.js';
import type { GameContext } from './actions.js';
import type { GameEvent } from '../types/events.js';

// ══════════════════════════════════════════════════════════════════
//  Room storage — in-memory Map（无外部依赖）
// ══════════════════════════════════════════════════════════════════

const rooms = new Map<string, GameContext>();
const roomBySocket = new Map<string, string>();

// ══════════════════════════════════════════════════════════════════
//  Room lifecycle
// ══════════════════════════════════════════════════════════════════

export function getRoomId(socketId: string): string | null {
  return roomBySocket.get(socketId) ?? null;
}

export function getRoom(roomId: string): GameContext | null {
  return rooms.get(roomId) ?? null;
}

export function createRoom(opts: {
  roomId: string;
  socketId: string;
  layer?: number;
}): GameContext {
  const { roomId, socketId, layer = 1 } = opts;

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

  rooms.set(roomId, ctx);
  roomBySocket.set(socketId, roomId);

  return ctx;
}

export function sendRoomEvent(
  roomId: string,
  event: GameEvent,
): { ctx: GameContext | null; ok: boolean; error?: string } {
  const ctx = rooms.get(roomId);
  if (!ctx) return { ctx: null, ok: false, error: `Room ${roomId} not found` };

  const result = transition(ctx, event);
  if (!result.ok) return { ctx: null, ok: false, error: result.error };

  rooms.set(roomId, result.ctx);
  return { ctx: result.ctx, ok: true };
}

export function updateRoom(roomId: string, ctx: GameContext): void {
  rooms.set(roomId, ctx);
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
