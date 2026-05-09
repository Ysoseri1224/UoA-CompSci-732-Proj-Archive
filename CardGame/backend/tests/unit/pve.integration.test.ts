import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRoom,
  sendRoomEvent,
  stopRoom,
} from '../../src/pve/runtime.js';
import {
  drawComplete,
  bossTelegraphComplete,
  skillShield,
  skillChangeColor,
  shuffleSelect,
  shuffleConfirm,
  startBattle,
  playSelect,
  playConfirm,
  resolveComplete,
  bossAttackComplete,
  roundEndConfirm,
} from '../../src/types/events.js';
import { ROUND_PHASE } from '../../src/types/state.js';

// ══════════════════════════════════════════════════════════════════
//  Full game: multi-round PvE flow
// ══════════════════════════════════════════════════════════════════

test('Full game: multi-round until win or lose', () => {
  const roomId = 'integration-1';
  let ctx = createRoom({ roomId, socketId: 'sock-int-1' });

  // Auto: DRAW → BOSS_TELEGRAPH → SKILL
  ctx = sendRoomEvent(roomId, drawComplete()).ctx!;
  ctx = sendRoomEvent(roomId, bossTelegraphComplete()).ctx!;

  let rounds = 0;
  const maxRounds = 100; // safety limit

  while (ctx.battleResult === 'ONGOING' && rounds < maxRounds) {
    rounds++;

    // Player actions: use skill if available, then enter play
    if (ctx.roundState.skills.shield.active === false && ctx.roundState.skills.shield.onCooldown === false) {
      const r = sendRoomEvent(roomId, skillShield());
      if (r.ok) ctx = r.ctx!;
    }

    // Shuffle some cards
    if (ctx.roundState.shuffle.remaining > 0 && ctx.hand.length >= 2) {
      const toDiscard = ctx.hand.slice(0, 2).map((c) => c.id);
      let r = sendRoomEvent(roomId, shuffleSelect(toDiscard));
      if (r.ok) {
        r = sendRoomEvent(roomId, shuffleConfirm());
        if (r.ok) ctx = r.ctx!;
      }
    }

    // Enter PLAY
    ctx = sendRoomEvent(roomId, startBattle()).ctx!;
    assert.equal(ctx.roundState.phase, ROUND_PHASE.PLAY);

    // Select 5 cards
    const toPlay = ctx.hand.slice(0, Math.min(5, ctx.hand.length)).map((c) => c.id);
    for (const id of toPlay) {
      ctx = sendRoomEvent(roomId, playSelect(id)).ctx!;
    }

    // Confirm play → RESOLVE
    ctx = sendRoomEvent(roomId, playConfirm()).ctx!;
    assert.equal(ctx.roundState.phase, ROUND_PHASE.RESOLVE);

    // Resolve → WIN or BOSS_ATTACK
    ctx = sendRoomEvent(roomId, resolveComplete()).ctx!;
    if (ctx.battleResult === 'WIN') break;

    assert.equal(ctx.roundState.phase, ROUND_PHASE.BOSS_ATTACK);

    // Boss attack → ROUND_END or LOSE
    ctx = sendRoomEvent(roomId, bossAttackComplete()).ctx!;
    if (ctx.battleResult === 'LOSE') break;

    assert.equal(ctx.roundState.phase, ROUND_PHASE.ROUND_END);

    // Next round
    ctx = sendRoomEvent(roomId, roundEndConfirm()).ctx!;
    assert.equal(ctx.roundState.phase, ROUND_PHASE.DRAW);

    // Auto-start next round
    ctx = sendRoomEvent(roomId, drawComplete()).ctx!;
    ctx = sendRoomEvent(roomId, bossTelegraphComplete()).ctx!;
  }

  // Game ended
  assert.ok(['WIN', 'LOSE'].includes(ctx.battleResult), `Expected WIN or LOSE, got ${ctx.battleResult}`);
  assert.ok(rounds > 0, `Expected at least 1 round, got ${rounds}`);
  assert.ok(rounds < maxRounds, `Safety limit exceeded: ${rounds} rounds`);

  stopRoom(roomId);
});

// ══════════════════════════════════════════════════════════════════
//  Win scenario
// ══════════════════════════════════════════════════════════════════

test('One-shot boss with huge damage → WIN', () => {
  const roomId = 'integration-win';
  let ctx = createRoom({ roomId, socketId: 'sock-win' });

  // Cheat: set boss HP to 1
  ctx.boss.hp = 1;
  ctx.boss.maxHp = 1;

  // Quick start
  ctx = sendRoomEvent(roomId, drawComplete()).ctx!;
  ctx = sendRoomEvent(roomId, bossTelegraphComplete()).ctx!;
  ctx = sendRoomEvent(roomId, startBattle()).ctx!;

  // Play 1 card
  const cardId = ctx.hand[0].id;
  ctx = sendRoomEvent(roomId, playSelect(cardId)).ctx!;
  ctx = sendRoomEvent(roomId, playConfirm()).ctx!;
  ctx = sendRoomEvent(roomId, resolveComplete()).ctx!;

  assert.equal(ctx.battleResult, 'WIN');

  stopRoom(roomId);
});

// ══════════════════════════════════════════════════════════════════
//  Skill changeColor + shuffle through a full round
// ══════════════════════════════════════════════════════════════════

test('Skill and shuffle both usable in same phase', () => {
  const roomId = 'integration-skills';
  let ctx = createRoom({ roomId, socketId: 'sock-skills' });

  ctx = sendRoomEvent(roomId, drawComplete()).ctx!;
  ctx = sendRoomEvent(roomId, bossTelegraphComplete()).ctx!;

  // Use changeColor first
  const target = ctx.hand[0];
  const r = sendRoomEvent(roomId, skillChangeColor(target.id, target.element === 'FIRE' ? 'WATER' : 'FIRE'));
  assert.equal(r.ok, true);
  ctx = r.ctx!;

  // Then shuffle
  const toDiscard = ctx.hand.slice(0, 2).map((c) => c.id);
  let sr = sendRoomEvent(roomId, shuffleSelect(toDiscard));
  assert.equal(sr.ok, true);
  sr = sendRoomEvent(roomId, shuffleConfirm());
  assert.equal(sr.ok, true);

  stopRoom(roomId);
});

// ══════════════════════════════════════════════════════════════════
//  Shield blocks charge burst
// ══════════════════════════════════════════════════════════════════

test('Shield blocks charge burst and shatters', () => {
  const roomId = 'integration-shield';
  let ctx = createRoom({ roomId, socketId: 'sock-shield' });

  ctx = sendRoomEvent(roomId, drawComplete()).ctx!;
  ctx = sendRoomEvent(roomId, bossTelegraphComplete()).ctx!;

  // Activate shield
  ctx = sendRoomEvent(roomId, skillShield()).ctx!;
  assert.equal(ctx.roundState.skills.shield.active, true);

  // Force boss to charge attack
  ctx = sendRoomEvent(roomId, startBattle()).ctx!;
  const cardId = ctx.hand[0].id;
  ctx = sendRoomEvent(roomId, playSelect(cardId)).ctx!;
  ctx = sendRoomEvent(roomId, playConfirm()).ctx!;
  ctx = sendRoomEvent(roomId, resolveComplete()).ctx!;

  if (ctx.roundState.phase === ROUND_PHASE.BOSS_ATTACK) {
    // Force willReleaseCharge
    ctx.roundState.bossRound.willReleaseCharge = true;
    const hpBefore = ctx.player.hp;
    ctx = sendRoomEvent(roomId, bossAttackComplete()).ctx!;
    // Shield should block all damage
    assert.equal(ctx.player.hp, hpBefore);
    assert.equal(ctx.roundState.skills.shield.active, false);
    assert.equal(ctx.roundState.skills.shield.onCooldown, true);
  }

  stopRoom(roomId);
});
