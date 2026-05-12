import { CARD_POOL } from '../data/cards.js';
import { HAND_TYPES } from '../data/handTypes.js';

const ELEMENT_TO_COLOR = {
  FIRE: 'red',
  WATER: 'blue',
  GRASS: 'green',
};

const ELEMENT_TO_LABEL = {
  FIRE: 'Fire',
  WATER: 'Water',
  GRASS: 'Grass',
};

const BACKEND_TO_FRONTEND_HAND_TYPE = {
  STRAIGHT_FLUSH: 'straight_flush',
  FOUR_OF_A_KIND: 'four_of_a_kind',
  FULL_HOUSE: 'full_house',
  FLUSH: 'flush',
  STRAIGHT: 'straight',
  THREE_OF_A_KIND: 'three_of_a_kind',
  TWO_PAIR: 'two_pair',
  PAIR: 'one_pair',
  HIGH_CARD: 'high_card',
};

const CARD_LOOKUP = new Map(
  CARD_POOL.map((card) => [`${card.color}:${card.cost}`, card]),
);

function rankLabel(rank) {
  return { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }[rank] ?? String(rank);
}

export function adaptServerCard(card) {
  const color = ELEMENT_TO_COLOR[card.element] ?? 'blue';
  const lookup = CARD_LOOKUP.get(`${color}:${card.rank}`);

  return {
    id: card.id,
    name: lookup?.name ?? `${ELEMENT_TO_LABEL[card.element] ?? '?'}-${rankLabel(card.rank)}`,
    cost: card.rank,
    color,
    image: lookup?.image ?? '/cards/card_01.png',
  };
}

export function adaptBackendHandType(handType) {
  if (!handType) return null;
  const frontendId = BACKEND_TO_FRONTEND_HAND_TYPE[handType] ?? null;
  return HAND_TYPES.find((item) => item.id === frontendId) ?? null;
}

export function deriveGameOver(battleResult) {
  if (battleResult === 'WIN') return 'win';
  if (battleResult === 'LOSE') return 'lose';
  return null;
}

export function adaptPveGameState(payload) {
  const hand = Array.isArray(payload?.hand)
    ? payload.hand.map(adaptServerCard)
    : [];

  return {
    hand,
    deckCount: payload?.deckCount ?? 0,
    discardCount: payload?.discardCount ?? 0,
    player: payload?.player ?? { hp: 20, maxHp: 20, buffs: [], chosenElement: null },
    boss: payload?.boss ?? null,
    round: payload?.round ?? 1,
    floor: payload?.boss?.layer ?? 1,
    phase: payload?.phase ?? 'DRAW',
    skills: payload?.skills ?? {
      changeColor: { used: false },
      changeCost: { used: false },
      shield: { active: false, onCooldown: false },
    },
    shuffle: payload?.shuffle ?? { remaining: 0, pendingDiscard: [] },
    play: {
      ...(payload?.play ?? { selectedCards: [], handType: null, score: null }),
      handType: adaptBackendHandType(payload?.play?.handType),
    },
    bossRound: payload?.bossRound ?? {
      intent: 'ATTACK',
      isDefending: false,
      willReleaseCharge: false,
    },
    battleResult: payload?.battleResult ?? 'ONGOING',
    shieldActive: payload?.skills?.shield?.active ?? false,
    gameOver: deriveGameOver(payload?.battleResult ?? 'ONGOING'),
  };
}
