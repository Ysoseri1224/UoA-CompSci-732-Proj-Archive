import test from 'node:test';
import assert from 'node:assert/strict';

import { registerPveHandlers } from '../../src/utils/pveHandlers.js';
import { getRoom, getRoomId, stopRoomForSocket } from '../../src/pve/runtime.js';
import { ROUND_PHASE } from '../../src/types/state.js';

class FakeSocket {
  id: string;
  handshake = { auth: {} as Record<string, unknown> };
  handlers = new Map<string, (payload?: unknown) => void>();
  emitted: Array<{ event: string; payload: unknown }> = [];

  constructor(id: string) {
    this.id = id;
  }

  on(event: string, handler: (payload?: unknown) => void) {
    this.handlers.set(event, handler);
    return this;
  }

  emit(event: string, payload?: unknown) {
    this.emitted.push({ event, payload });
    return true;
  }

  clientEmit(event: string, payload?: unknown) {
    const handler = this.handlers.get(event);
    assert.ok(handler, `missing handler for ${event}`);
    handler(payload);
  }
}

test('confirmPlay waits in BOSS_ATTACK until resolveAnimationComplete arrives', () => {
  const socket = new FakeSocket('sock-handler-1');
  registerPveHandlers(socket as never);

  socket.clientEmit('startPveGame');
  const roomId = getRoomId(socket.id);
  assert.ok(roomId);

  socket.clientEmit('enterPlay');

  const roomAfterEnterPlay = getRoom(roomId)!;
  const handIdsBeforePlay = roomAfterEnterPlay.hand.map((card) => card.id);
  const selectedCardId = roomAfterEnterPlay.hand[0].id;
  socket.clientEmit('selectCard', { cardId: selectedCardId });
  socket.clientEmit('confirmPlay');

  let room = getRoom(roomId)!;
  assert.equal(room.roundState.phase, ROUND_PHASE.BOSS_ATTACK);
  assert.ok(!room.hand.some((card) => card.id === selectedCardId));
  assert.equal(room.hand.length, 7);
  assert.notDeepEqual(room.hand.map((card) => card.id), handIdsBeforePlay);

  socket.clientEmit('resolveAnimationComplete');

  room = getRoom(roomId)!;
  assert.equal(room.roundState.phase, ROUND_PHASE.SKILL);
  assert.equal(room.round, 2);

  stopRoomForSocket(socket.id);
});
