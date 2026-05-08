import test from 'node:test';
import assert from 'node:assert/strict';

import { initDeckState } from '../../src/lib/deck.js';
import { createPlayerState, createBossState, createRoundState, ROUND_PHASE } from '../../src/types/state.js';
import { transition, type GameContext } from '../../src/pve/roundMachine.js';
import {
  drawComplete,
  bossTelegraphComplete,
  skillChangeColor,
  skillChangeCost,
  skillShield,
  shuffleSelect,
  shuffleConfirm,
  shuffleCancel,
  playSelect,
  playConfirm,
  resolveComplete,
  bossAttackComplete,
  roundEndConfirm,
  startBattle,
} from '../../src/types/events.js';
import type { Card } from '../../src/types/card.js';

// ══════════════════════════════════════════════════════════════════
//  Factory
// ══════════════════════════════════════════════════════════════════

function makeCtx(overrides: Partial<GameContext> = {}): GameContext {
  const deckState = initDeckState();
  return {
    deck: deckState.deck,
    discardPile: deckState.discardPile,
    hand: deckState.hand,
    player: createPlayerState(),
    boss: createBossState(),
    round: 1,
    roundState: createRoundState(),
    battleResult: 'ONGOING',
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════
//  Phase transitions
// ══════════════════════════════════════════════════════════════════

test('DRAW → DRAW_COMPLETE → BOSS_TELEGRAPH', () => {
  const ctx = makeCtx({ roundState: createRoundState({ roundPhase: 'DRAW' }) });
  const result = transition(ctx, drawComplete());
  assert.equal(result.ok, true);
  assert.equal(result.ctx.roundState.phase, ROUND_PHASE.BOSS_TELEGRAPH);
});

test('DRAW_COMPLETE rejected in wrong phase', () => {
  const ctx = makeCtx({ roundState: createRoundState({ roundPhase: 'SKILL' }) });
  const result = transition(ctx, drawComplete());
  assert.equal(result.ok, false);
  assert.ok(result.error?.includes('Cannot'));
});

test('BOSS_TELEGRAPH → BOSS_TELEGRAPH_COMPLETE → SKILL', () => {
  const ctx = makeCtx({ roundState: createRoundState({ roundPhase: 'BOSS_TELEGRAPH' }) });
  const result = transition(ctx, bossTelegraphComplete());
  assert.equal(result.ok, true);
  assert.equal(result.ctx.roundState.phase, ROUND_PHASE.SKILL);
  // Boss intent determined
  assert.ok(['ATTACK', 'CHARGE', 'DEFEND'].includes(result.ctx.roundState.bossRound.intent));
});

test('BOSS_TELEGRAPH: charge stored forces ATTACK', () => {
  const boss = createBossState();
  boss.behavior.chargeStored = true;
  const ctx = makeCtx({ boss, roundState: createRoundState({ roundPhase: 'BOSS_TELEGRAPH' }) });
  const result = transition(ctx, bossTelegraphComplete());
  assert.equal(result.ok, true);
  assert.equal(result.ctx.roundState.bossRound.intent, 'ATTACK');
  assert.equal(result.ctx.roundState.bossRound.willReleaseCharge, true);
  assert.equal(result.ctx.boss.behavior.chargeStored, false);
});

test('PLAY_SELECT toggles card selection', () => {
  const ctx = makeCtx({ roundState: createRoundState({ roundPhase: 'PLAY' }) });
  const cardId = ctx.hand[0].id;

  const r1 = transition(ctx, playSelect(cardId));
  assert.equal(r1.ok, true);
  assert.ok(r1.ctx.roundState.play.selectedCards.includes(cardId));

  const r2 = transition(r1.ctx, playSelect(cardId));
  assert.equal(r2.ok, true);
  assert.ok(!r2.ctx.roundState.play.selectedCards.includes(cardId));
});

test('PLAY_CONFIRM rejected when no card selected', () => {
  const ctx = makeCtx({ roundState: createRoundState({ roundPhase: 'PLAY' }) });
  const result = transition(ctx, playConfirm());
  assert.equal(result.ok, false);
});

test('PLAY → PLAY_CONFIRM → RESOLVE with score', () => {
  const ctx = makeCtx({ roundState: createRoundState({ roundPhase: 'PLAY' }) });
  // Select first 3 cards
  const ids = ctx.hand.slice(0, 3).map((c) => c.id);
  let r = transition(ctx, playSelect(ids[0]));
  r = transition(r.ctx, playSelect(ids[1]));
  r = transition(r.ctx, playSelect(ids[2]));

  const result = transition(r.ctx, playConfirm());
  assert.equal(result.ok, true);
  assert.equal(result.ctx.roundState.phase, ROUND_PHASE.RESOLVE);
  assert.ok(typeof result.ctx.roundState.play.score === 'number');
  assert.ok(result.ctx.roundState.play.score! >= 0);
});

test('RESOLVE → RESOLVE_COMPLETE → BOSS_ATTACK (boss survives)', () => {
  const boss = createBossState({ hp: 300, maxHp: 300 });
  const rs = createRoundState({ roundPhase: 'RESOLVE' });
  rs.play.score = 50; // not enough to kill
  const ctx = makeCtx({ boss, roundState: rs });

  const result = transition(ctx, resolveComplete());
  assert.equal(result.ok, true);
  assert.equal(result.ctx.roundState.phase, ROUND_PHASE.BOSS_ATTACK);
  assert.equal(result.ctx.boss.hp, 250);
});

test('RESOLVE → RESOLVE_COMPLETE → WIN (boss dies, shield voided)', () => {
  const boss = createBossState({ hp: 50, maxHp: 300 });
  const rs = createRoundState({ roundPhase: 'RESOLVE' });
  rs.play.score = 100;
  rs.skills.shield = { active: true, onCooldown: false };
  const ctx = makeCtx({ boss, roundState: rs });

  const result = transition(ctx, resolveComplete());
  assert.equal(result.ok, true);
  assert.equal(result.ctx.battleResult, 'WIN');
  assert.equal(result.ctx.boss.hp, 0);
  // Shield voided
  assert.equal(result.ctx.roundState.skills.shield.active, false);
  assert.equal(result.ctx.roundState.skills.shield.onCooldown, false);
});

test('BOSS_ATTACK: normal attack damages player', () => {
  const rs = createRoundState({ roundPhase: 'BOSS_ATTACK' });
  rs.bossRound = { intent: 'ATTACK', isDefending: false, willReleaseCharge: false };
  const ctx = makeCtx({ roundState: rs });
  const hpBefore = ctx.player.hp;

  const result = transition(ctx, bossAttackComplete());
  assert.equal(result.ok, true);
  assert.ok(result.ctx.player.hp < hpBefore);
});

test('BOSS_ATTACK: shield blocks damage and shatters', () => {
  const rs = createRoundState({ roundPhase: 'BOSS_ATTACK' });
  rs.bossRound = { intent: 'ATTACK', isDefending: false, willReleaseCharge: false };
  rs.skills.shield = { active: true, onCooldown: false };
  const ctx = makeCtx({ roundState: rs });
  const hpBefore = ctx.player.hp;

  const result = transition(ctx, bossAttackComplete());
  assert.equal(result.ok, true);
  assert.equal(result.ctx.player.hp, hpBefore); // no damage
  assert.equal(result.ctx.roundState.skills.shield.active, false);
  assert.equal(result.ctx.roundState.skills.shield.onCooldown, true);
});

test('BOSS_ATTACK: charge burst deals chargeAttack damage', () => {
  const boss = createBossState({ attackPerRound: 10 });
  const rs = createRoundState({ roundPhase: 'BOSS_ATTACK' });
  rs.bossRound = { intent: 'ATTACK', isDefending: false, willReleaseCharge: true };
  const player = createPlayerState({ hp: 50 }); // enough to survive burst
  const ctx = makeCtx({ boss, player, roundState: rs });

  const result = transition(ctx, bossAttackComplete());
  assert.equal(result.ok, true);
  assert.equal(result.ctx.player.hp, 50 - Math.floor(10 * 2.2));
});

test('BOSS_ATTACK: CHARGE and DEFEND skip damage', () => {
  for (const intent of ['CHARGE', 'DEFEND'] as const) {
    const rs = createRoundState({ roundPhase: 'BOSS_ATTACK' });
    rs.bossRound = { intent, isDefending: intent === 'DEFEND', willReleaseCharge: false };
    const ctx = makeCtx({ roundState: rs });
    const hpBefore = ctx.player.hp;

    const result = transition(ctx, bossAttackComplete());
    assert.equal(result.ok, true);
    assert.equal(result.ctx.player.hp, hpBefore);
    assert.equal(result.ctx.roundState.phase, ROUND_PHASE.ROUND_END);
  }
});

test('BOSS_ATTACK → player dies → LOSE', () => {
  const boss = createBossState({ attackPerRound: 100 });
  const rs = createRoundState({ roundPhase: 'BOSS_ATTACK' });
  rs.bossRound = { intent: 'ATTACK', isDefending: false, willReleaseCharge: false };
  const ctx = makeCtx({
    boss,
    player: createPlayerState({ hp: 5 }),
    roundState: rs,
  });

  const result = transition(ctx, bossAttackComplete());
  assert.equal(result.ok, true);
  assert.equal(result.ctx.battleResult, 'LOSE');
  assert.equal(result.ctx.player.hp, 0);
});

test('ROUND_END → ROUND_END_CONFIRM → DRAW (skills reset, round++)', () => {
  const rs = createRoundState({ roundPhase: 'ROUND_END' });
  rs.skills.changeColor.used = true;
  rs.skills.changeCost.used = true;
  rs.shuffle.remaining = 1;
  const ctx = makeCtx({ round: 3, roundState: rs });

  const result = transition(ctx, roundEndConfirm());
  assert.equal(result.ok, true);
  assert.equal(result.ctx.roundState.phase, ROUND_PHASE.DRAW);
  assert.equal(result.ctx.round, 4);
  assert.equal(result.ctx.roundState.skills.changeColor.used, false);
  assert.equal(result.ctx.roundState.skills.changeCost.used, false);
  assert.equal(result.ctx.roundState.shuffle.remaining, 2);
});

// ══════════════════════════════════════════════════════════════════
//  Skills
// ══════════════════════════════════════════════════════════════════

test('SKILL_CHANGE_COLOR replaces card in hand', () => {
  const ctx = makeCtx({ roundState: createRoundState({ roundPhase: 'SKILL' }) });
  const target = ctx.hand[0];
  const result = transition(ctx, skillChangeColor(target.id, 'FIRE'));

  assert.equal(result.ok, true);
  // Target should no longer be in hand (unless it was already FIRE and same rank)
  const oldInHand = result.ctx.hand.some((c) => c.id === target.id);
  // Original card goes to discard
  const inDiscard = result.ctx.discardPile.some((c) => c.id === target.id);
  assert.ok(!oldInHand || target.element === 'FIRE');
  if (!oldInHand) assert.ok(inDiscard);
});

test('SKILL_CHANGE_COST replaces card in hand', () => {
  const ctx = makeCtx({ roundState: createRoundState({ roundPhase: 'SKILL' }) });
  const target = ctx.hand[0];
  const result = transition(ctx, skillChangeCost(target.id, 10));

  assert.equal(result.ok, true);
});

test('SKILL_SHIELD activates shield', () => {
  const ctx = makeCtx({ roundState: createRoundState({ roundPhase: 'SKILL' }) });
  const result = transition(ctx, skillShield());
  assert.equal(result.ok, true);
  assert.equal(result.ctx.roundState.skills.shield.active, true);
});

test('Skills rejected outside player action phase', () => {
  const ctx = makeCtx({ roundState: createRoundState({ roundPhase: 'DRAW' }) });
  assert.equal(transition(ctx, skillChangeColor(ctx.hand[0].id, 'FIRE')).ok, false);
  assert.equal(transition(ctx, skillChangeCost(ctx.hand[0].id, 5)).ok, false);
  assert.equal(transition(ctx, skillShield()).ok, false);
});

test('Skill used twice is rejected (changeColor)', () => {
  const ctx = makeCtx({ roundState: createRoundState({ roundPhase: 'SKILL' }) });
  const r1 = transition(ctx, skillChangeColor(ctx.hand[0].id, 'FIRE'));
  // Can't use again (already used)
  const r2 = transition(r1.ctx, skillChangeColor(r1.ctx.hand[0].id, 'WATER'));
  assert.equal(r2.ok, false);
  assert.ok(r2.error?.includes('Cannot'));
});

// ══════════════════════════════════════════════════════════════════
//  Shuffle
// ══════════════════════════════════════════════════════════════════

test('SHUFFLE_SELECT → SHUFFLE_CONFIRM replaces cards', () => {
  const ctx = makeCtx({ roundState: createRoundState({ roundPhase: 'SHUFFLE' }) });
  const toDiscard = ctx.hand.slice(0, 2).map((c) => c.id);

  let r = transition(ctx, shuffleSelect(toDiscard));
  assert.equal(r.ok, true);
  assert.deepEqual(r.ctx.roundState.shuffle.pendingDiscard, toDiscard);

  r = transition(r.ctx, shuffleConfirm());
  assert.equal(r.ok, true);
  // Discarded cards gone from hand
  for (const id of toDiscard) {
    assert.ok(!r.ctx.hand.some((c) => c.id === id));
  }
  assert.equal(r.ctx.roundState.shuffle.remaining, 1);
  assert.deepEqual(r.ctx.roundState.shuffle.pendingDiscard, []);
});

test('SHUFFLE_CANCEL clears pending', () => {
  const ctx = makeCtx({ roundState: createRoundState({ roundPhase: 'SHUFFLE' }) });
  let r = transition(ctx, shuffleSelect([ctx.hand[0].id]));
  r = transition(r.ctx, shuffleCancel());
  assert.deepEqual(r.ctx.roundState.shuffle.pendingDiscard, []);
});

test('Shuffle rejected when remaining is 0', () => {
  const rs = createRoundState({ roundPhase: 'SHUFFLE' });
  rs.shuffle.remaining = 0;
  const ctx = makeCtx({ roundState: rs });
  const result = transition(ctx, shuffleSelect([ctx.hand[0].id]));
  assert.equal(result.ok, false);
});

// ══════════════════════════════════════════════════════════════════
//  Full round flow
// ══════════════════════════════════════════════════════════════════

test('Full round: DRAW → SKILL → PLAY → RESOLVE → BOSS_ATTACK → ROUND_END', () => {
  let ctx = makeCtx({ roundState: createRoundState({ roundPhase: 'DRAW' }) });

  // DRAW → BOSS_TELEGRAPH
  ctx = transition(ctx, drawComplete()).ctx;
  assert.equal(ctx.roundState.phase, ROUND_PHASE.BOSS_TELEGRAPH);

  // BOSS_TELEGRAPH → SKILL
  ctx = transition(ctx, bossTelegraphComplete()).ctx;
  assert.equal(ctx.roundState.phase, ROUND_PHASE.SKILL);

  // SKILL → PLAY
  ctx = transition(ctx, startBattle()).ctx;
  assert.equal(ctx.roundState.phase, ROUND_PHASE.PLAY);

  // PLAY: select cards and confirm
  const toPlay = ctx.hand.slice(0, 5).map((c) => c.id);
  for (const id of toPlay) {
    ctx = transition(ctx, playSelect(id)).ctx;
  }
  ctx = transition(ctx, playConfirm()).ctx;
  assert.equal(ctx.roundState.phase, ROUND_PHASE.RESOLVE);
  assert.ok(ctx.roundState.play.score !== null);

  // RESOLVE: complete
  ctx = transition(ctx, resolveComplete()).ctx;
  assert.ok(
    ctx.roundState.phase === ROUND_PHASE.BOSS_ATTACK ||
    ctx.battleResult === 'WIN'
  );

  if (ctx.roundState.phase === ROUND_PHASE.BOSS_ATTACK) {
    ctx = transition(ctx, bossAttackComplete()).ctx;
    assert.ok(
      ctx.roundState.phase === ROUND_PHASE.ROUND_END ||
      ctx.battleResult === 'LOSE'
    );
  }

  if (ctx.roundState.phase === ROUND_PHASE.ROUND_END) {
    ctx = transition(ctx, roundEndConfirm()).ctx;
    assert.equal(ctx.roundState.phase, ROUND_PHASE.DRAW);
  }
});

test('SKILL/SHUFFLE alternation: can use skill then shuffle', () => {
  let ctx = makeCtx({ roundState: createRoundState({ roundPhase: 'SKILL' }) });

  // Use a skill
  ctx = transition(ctx, skillShield()).ctx;
  assert.equal(ctx.roundState.skills.shield.active, true);

  // Also do a shuffle (switching to SHUFFLE)
  ctx.roundState.phase = ROUND_PHASE.SHUFFLE;
  ctx = transition(ctx, shuffleSelect([ctx.hand[0].id])).ctx;
  ctx = transition(ctx, shuffleConfirm()).ctx;
  assert.equal(ctx.roundState.shuffle.remaining, 1);
});
