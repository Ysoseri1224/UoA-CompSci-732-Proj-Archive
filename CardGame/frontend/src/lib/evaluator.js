// Pure evaluator — no React / no store / no network.
//
// Mirrors the backend formula at `backend/src/lib/hand.ts` (`HAND_SCORES`,
// `getHandTier`, `calculateDamage`).  Any change here MUST be reflected in
// the backend, and vice versa.  The contract test
// `backend/tests/unit/scoring.contract.test.ts` runs ten fixtures through
// both implementations to keep them in sync.
//
// Why duplicated?  The Docker bind mounts split `frontend/` and `backend/`
// into separate containers, so a single shared module is not reachable from
// both sides without a build-time copy step.  We treat the contract test as
// the source of truth for "frontend evaluator must equal backend evaluator".

import { HAND_TYPES } from '../data/handTypes.js';

// ──────────────────────────────────────────────────────────────────────────
//  Constants — keep in sync with backend `HAND_SCORES` in `lib/hand.ts`.
// ──────────────────────────────────────────────────────────────────────────
const HAND_SCORES = {
  royal_flush:      { chips: 100, mult: 8 },
  straight_flush:   { chips: 100, mult: 8 },
  four_of_a_kind:   { chips: 60,  mult: 7 },
  full_house:       { chips: 40,  mult: 6 },
  flush:            { chips: 35,  mult: 4 },
  straight:         { chips: 30,  mult: 4 },
  three_of_a_kind:  { chips: 30,  mult: 3 },
  two_pair:         { chips: 20,  mult: 2 },
  one_pair:         { chips: 10,  mult: 2 },
  high_card:        { chips: 5,   mult: 1 },
};

// Frontend hand id → backend `HandType` enum (used for HAND_*_BONUS matching).
const HAND_ID_TO_BACKEND = {
  royal_flush:     'STRAIGHT_FLUSH',
  straight_flush:  'STRAIGHT_FLUSH',
  four_of_a_kind:  'FOUR_OF_A_KIND',
  full_house:      'FULL_HOUSE',
  flush:           'FLUSH',
  straight:        'STRAIGHT',
  three_of_a_kind: 'THREE_OF_A_KIND',
  two_pair:        'TWO_PAIR',
  one_pair:        'PAIR',
  high_card:       'HIGH_CARD',
};

// Frontend card.color → backend Element.
const COLOR_TO_ELEMENT = {
  red:   'FIRE',
  blue:  'WATER',
  green: 'GRASS',
};

const COMMON_HANDS = ['HIGH_CARD', 'PAIR', 'TWO_PAIR', 'THREE_OF_A_KIND'];
const RARE_HANDS   = ['STRAIGHT', 'FLUSH'];
const EPIC_HANDS   = ['FULL_HOUSE', 'FOUR_OF_A_KIND', 'STRAIGHT_FLUSH'];

function getHandTier(backendHandType) {
  if (COMMON_HANDS.includes(backendHandType)) return 'common';
  if (RARE_HANDS.includes(backendHandType))   return 'rare';
  if (EPIC_HANDS.includes(backendHandType))   return 'epic';
  return 'common';
}

// ──────────────────────────────────────────────────────────────────────────
//  Hand-type detection (kept identical in shape to backend `detectHandType`).
// ──────────────────────────────────────────────────────────────────────────
export function getHandType(cards) {
  if (cards.length === 0) return HAND_TYPES.find((h) => h.id === 'high_card');

  const costs = cards.map((c) => c.cost);
  const colors = cards.map((c) => c.color);

  const costCount = {};
  costs.forEach((c) => { costCount[c] = (costCount[c] || 0) + 1; });
  const counts = Object.values(costCount).sort((a, b) => b - a);

  const colorCount = {};
  colors.forEach((c) => { colorCount[c] = (colorCount[c] || 0) + 1; });
  const isFlush = cards.length === 5 && Object.keys(colorCount).length === 1;

  const isStraight = (() => {
    if (cards.length !== 5) return false;
    const sorted = [...new Set(costs)].sort((a, b) => a - b);
    if (sorted.length !== 5) return false;
    if (sorted[4] - sorted[0] === 4) return true;
    const highStraight = [1, 10, 11, 12, 13];
    return highStraight.every((v) => sorted.includes(v));
  })();

  const isRoyalFlush = (() => {
    if (!isFlush || !isStraight) return false;
    const sorted = [...costs].sort((a, b) => a - b);
    const royal = [1, 10, 11, 12, 13];
    return royal.every((v) => sorted.includes(v));
  })();

  if (isRoyalFlush) return HAND_TYPES.find((h) => h.id === 'royal_flush');
  if (isFlush && isStraight) return HAND_TYPES.find((h) => h.id === 'straight_flush');
  if (counts[0] === 4) return HAND_TYPES.find((h) => h.id === 'four_of_a_kind');
  if (counts[0] === 3 && counts[1] === 2) return HAND_TYPES.find((h) => h.id === 'full_house');
  if (isFlush) return HAND_TYPES.find((h) => h.id === 'flush');
  if (isStraight) return HAND_TYPES.find((h) => h.id === 'straight');
  if (counts[0] === 3) return HAND_TYPES.find((h) => h.id === 'three_of_a_kind');
  if (counts[0] === 2 && counts[1] === 2) return HAND_TYPES.find((h) => h.id === 'two_pair');
  if (counts[0] === 2) return HAND_TYPES.find((h) => h.id === 'one_pair');
  return HAND_TYPES.find((h) => h.id === 'high_card');
}

/**
 * Buff-aware preview score.  Mirrors backend `calculateDamage` step-for-step.
 *
 * @param {Array<{id:string,cost:number,color:string}>} cards
 * @param {Array<{type:string,[k:string]:any}>} [buffs]   raw backend Buff objects (server's `player.buffs`)
 * @param {boolean} [isDefending]  Boss DEFEND halves total
 * @returns {{handType:object, baseAttack:number, bonusAttack:number, multiplier:number, totalScore:number}}
 */
export function evaluateHand(cards, buffs = [], isDefending = false) {
  const handType = getHandType(cards);
  const beHandType = HAND_ID_TO_BACKEND[handType.id] ?? 'HIGH_CARD';
  const { chips: rawBaseChips, mult: rawMult } = HAND_SCORES[handType.id] ?? { chips: 5, mult: 1 };

  let baseChips = rawBaseChips;
  let mult = rawMult;

  // Step 2-3: HAND_CHIPS_BONUS / HAND_MULT_BONUS — single hand-type targeted.
  for (const b of buffs) {
    if (b?.type === 'HAND_CHIPS_BONUS' && b.handType === beHandType) baseChips += b.bonusChips ?? 0;
    if (b?.type === 'HAND_MULT_BONUS'  && b.handType === beHandType) mult       += b.bonusMult  ?? 0;
  }

  // Step 4-5: TIERED_*_BONUS — tier (common/rare/epic) of current hand.
  const tier = getHandTier(beHandType);
  for (const b of buffs) {
    if (b?.type === 'TIERED_CHIPS_BONUS') {
      baseChips += tier === 'common' ? (b.commonBonus ?? 0)
                : tier === 'rare'   ? (b.rareBonus   ?? 0)
                                    : (b.epicBonus   ?? 0);
    }
    if (b?.type === 'TIERED_MULT_BONUS') {
      mult += tier === 'common' ? (b.commonMult ?? 0)
            : tier === 'rare'   ? (b.rareMult   ?? 0)
                                : (b.epicMult   ?? 0);
    }
  }

  // Step 6: per-card chip pipeline — ELEMENT_CHIP_MULT → ELEMENT_CHIPS_BONUS → ALL_CHIPS_BONUS
  let cardChips = 0;
  for (const card of cards) {
    let chip = card.cost ?? 0;
    const cardElement = COLOR_TO_ELEMENT[card.color];

    for (const b of buffs) {
      if (b?.type === 'ELEMENT_CHIP_MULT' && b.element === cardElement) chip *= (b.mult ?? 1);
    }
    for (const b of buffs) {
      if (b?.type === 'ELEMENT_CHIPS_BONUS' && b.element === cardElement) chip += (b.bonusChips ?? 0);
    }
    for (const b of buffs) {
      if (b?.type === 'ALL_CHIPS_BONUS') chip += (b.bonusChips ?? 0);
    }
    cardChips += chip;
  }

  let total = Math.floor((baseChips + cardChips) * mult);
  if (isDefending) total = Math.floor(total * 0.5);

  return {
    handType,
    baseAttack: baseChips,
    bonusAttack: Math.round(cardChips * 100) / 100,
    multiplier: mult,
    totalScore: total,
  };
}
