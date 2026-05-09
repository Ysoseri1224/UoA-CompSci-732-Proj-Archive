import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getRoomId,
  getRoom,
  createRoom,
  sendRoomEvent,
  stopRoom,
  stopRoomForSocket,
} from '../../src/pve/runtime.js';
import {
  drawComplete,
  bossTelegraphComplete,
  skillShield,
  startBattle,
  playSelect,
  playConfirm,
  resolveComplete,
  bossAttackComplete,
  roundEndConfirm,
} from '../../src/types/events.js';
import { ROUND_PHASE } from '../../src/types/state.js';

// ══════════════════════════════════════════════════════════════════
//  Room lifecycle
// ══════════════════════════════════════════════════════════════════

test('createRoom initialises GameContext', () => {
  const ctx = createRoom({ roomId: 'room-1', socketId: 'socket-1' });
  assert.ok(ctx);
  assert.equal(ctx.round, 1);
  assert.equal(ctx.roundState.phase, ROUND_PHASE.DRAW);
  assert.equal(ctx.hand.length, 7);
  assert.ok(ctx.boss);
  assert.equal(ctx.battleResult, 'ONGOING');
});

test('createRoom throws if room exists', () => {
  createRoom({ roomId: 'room-dup', socketId: 's1' });
  assert.throws(() => createRoom({ roomId: 'room-dup', socketId: 's2' }));
  stopRoom('room-dup');
});

test('getRoomId returns room for socket', () => {
  createRoom({ roomId: 'room-abc', socketId: 'sock-abc' });
  assert.equal(getRoomId('sock-abc'), 'room-abc');
  stopRoom('room-abc');
});

test('getRoomId returns null for unknown socket', () => {
  assert.equal(getRoomId('nonexistent'), null);
});

test('getRoom returns GameContext', () => {
  createRoom({ roomId: 'room-xyz', socketId: 'sock-xyz' });
  const ctx = getRoom('room-xyz');
  assert.ok(ctx);
  assert.equal(ctx.hand.length, 7);
  stopRoom('room-xyz');
});

test('getRoom returns null for unknown room', () => {
  assert.equal(getRoom('ghost-room'), null);
});

test('stopRoom cleans up', () => {
  createRoom({ roomId: 'room-del', socketId: 'sock-del' });
  assert.equal(stopRoom('room-del'), true);
  assert.equal(getRoom('room-del'), null);
  assert.equal(getRoomId('sock-del'), null);
});

test('stopRoom returns false for nonexistent', () => {
  assert.equal(stopRoom('no-such-room'), false);
});

test('stopRoomForSocket works', () => {
  createRoom({ roomId: 'room-sfs', socketId: 'sock-sfs' });
  assert.equal(stopRoomForSocket('sock-sfs'), true);
  assert.equal(getRoom('room-sfs'), null);
});

// ══════════════════════════════════════════════════════════════════
//  Event flow
// ══════════════════════════════════════════════════════════════════

test('sendRoomEvent: full round progression', () => {
  const roomId = 'room-flow';
  createRoom({ roomId, socketId: 'sock-flow' });

  // DRAW → BOSS_TELEGRAPH
  let r = sendRoomEvent(roomId, drawComplete());
  assert.equal(r.ok, true);
  assert.equal(r.ctx!.roundState.phase, ROUND_PHASE.BOSS_TELEGRAPH);

  // BOSS_TELEGRAPH → SKILL
  r = sendRoomEvent(roomId, bossTelegraphComplete());
  assert.equal(r.ok, true);
  assert.ok(
    r.ctx!.roundState.phase === ROUND_PHASE.SKILL ||
    r.ctx!.roundState.phase === ROUND_PHASE.SHUFFLE
  );

  // SKILL: use shield
  r = sendRoomEvent(roomId, skillShield());
  assert.equal(r.ok, true);
  assert.equal(r.ctx!.roundState.skills.shield.active, true);

  // Enter PLAY
  r = sendRoomEvent(roomId, startBattle());
  assert.equal(r.ok, true);
  assert.equal(r.ctx!.roundState.phase, ROUND_PHASE.PLAY);

  // Select cards + confirm
  const cards = r.ctx!.hand.slice(0, 3).map((c) => c.id);
  for (const id of cards) {
    r = sendRoomEvent(roomId, playSelect(id));
    assert.equal(r.ok, true);
  }
  r = sendRoomEvent(roomId, playConfirm());
  assert.equal(r.ok, true);
  assert.equal(r.ctx!.roundState.phase, ROUND_PHASE.RESOLVE);

  // RESOLVE
  r = sendRoomEvent(roomId, resolveComplete());
  assert.equal(r.ok, true);
  assert.ok(
    r.ctx!.roundState.phase === ROUND_PHASE.BOSS_ATTACK ||
    r.ctx!.battleResult === 'WIN'
  );

  // If boss survived → BOSS_ATTACK
  if (r.ctx!.roundState.phase === ROUND_PHASE.BOSS_ATTACK) {
    r = sendRoomEvent(roomId, bossAttackComplete());
    assert.equal(r.ok, true);
    assert.ok(
      r.ctx!.roundState.phase === ROUND_PHASE.ROUND_END ||
      r.ctx!.battleResult === 'LOSE'
    );
  }

  // If survived → ROUND_END → DRAW
  if (r.ctx!.roundState.phase === ROUND_PHASE.ROUND_END) {
    r = sendRoomEvent(roomId, roundEndConfirm());
    assert.equal(r.ok, true);
    assert.equal(r.ctx!.roundState.phase, ROUND_PHASE.DRAW);
  }

  stopRoom(roomId);
});

test('sendRoomEvent: unknown room returns error', () => {
  const r = sendRoomEvent('no-room', drawComplete());
  assert.equal(r.ok, false);
  assert.ok(r.error?.includes('not found'));
});

test('multiple rooms do not interfere', () => {
  const ctx1 = createRoom({ roomId: 'multi-1', socketId: 'ms1' });
  const ctx2 = createRoom({ roomId: 'multi-2', socketId: 'ms2' });

  // Progress room 1 only
  sendRoomEvent('multi-1', drawComplete());
  sendRoomEvent('multi-1', bossTelegraphComplete());

  const r1 = getRoom('multi-1')!;
  const r2 = getRoom('multi-2')!;

  // Room 1 should be in SKILL phase
  assert.ok(
    r1.roundState.phase === ROUND_PHASE.SKILL ||
    r1.roundState.phase === ROUND_PHASE.SHUFFLE
  );
  // Room 2 should still be in DRAW phase
  assert.equal(r2.roundState.phase, ROUND_PHASE.DRAW);

  stopRoom('multi-1');
  stopRoom('multi-2');
});
