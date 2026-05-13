# Card and Deck Abstractions - Elemental Poker (v0.1)

> This document defines card data structures, deck operation interfaces, and the buff system.
> All types are written in TypeScript and can be used directly in a React + Zustand project.

---

## 1. Basic Types

```typescript
// -- Element ----------------------------------
type Element = 'WATER' | 'FIRE' | 'GRASS';

// -- Rank (1-13, corresponding to A/2-10/J/Q/K) --
type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

// -- Hand Type --------------------------------
type HandType =
  | 'STRAIGHT_FLUSH'
  | 'FOUR_OF_A_KIND'
  | 'FULL_HOUSE'
  | 'FLUSH'
  | 'STRAIGHT'
  | 'THREE_OF_A_KIND'
  | 'TWO_PAIR'
  | 'PAIR'
  | 'HIGH_CARD';

// -- Unique Card ID ---------------------------
// Format: "{element}_{rank}", for example "WATER_1" or "FIRE_13"
type CardId = string;
```

---

## 2. Card Data Structure

```typescript
interface Card {
  id: CardId;              // Unique identifier, format "{ELEMENT}_{rank}"
  element: Element;        // Element
  rank: Rank;              // Rank 1-13
  
  // Derived fields (computable, no need to store separately, but may be cached)
  displayRank: string;     // Display text: "A" | "2"-"10" | "J" | "Q" | "K"
  chipValue: number;       // Scoring rank value: A=1, 2-10=face value, J=11, Q=12, K=13
}
```

### 2.1 Factory Functions

```typescript
function createCard(element: Element, rank: Rank): Card {
  return {
    id: `${element}_${rank}`,
    element,
    rank,
    displayRank: rankToDisplay(rank),
    chipValue:   rankToChipValue(rank),
  };
}

function rankToDisplay(rank: Rank): string {
  if (rank === 1)  return 'A';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  return String(rank);
}

function rankToChipValue(rank: Rank): number {
  return rank;  // A=1, 2-10=face value, J=11, Q=12, K=13
}
```

---

## 3. Full Deck Definition

```typescript
const ALL_ELEMENTS: Element[] = ['WATER', 'FIRE', 'GRASS'];
const ALL_RANKS: Rank[] = [1,2,3,4,5,6,7,8,9,10,11,12,13];

// Generate the full 39-card deck (ordered, unshuffled)
function createFullDeck(): Card[] {
  const deck: Card[] = [];
  for (const element of ALL_ELEMENTS) {
    for (const rank of ALL_RANKS) {
      deck.push(createCard(element, rank));
    }
  }
  return deck; // 39 cards
}
```

---

## 4. Deck Operation Interface

```typescript
interface DeckState {
  deck:        Card[];   // Deck (not yet drawn, index 0 = top of deck)
  discardPile: Card[];   // Discard pile
  hand:        Card[];   // Hand (up to 7 cards)
}

// -- Shuffle -----------------------------------------------
// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// -- Initialization ----------------------------------------
function initDeckState(): DeckState {
  const deck = shuffle(createFullDeck());
  const hand  = deck.slice(0, 7);
  return {
    deck:        deck.slice(7),
    discardPile: [],
    hand,
  };
}

// -- Draw cards --------------------------------------------
// Draw n cards from the top of the deck; if the deck is too small, reshuffle the discard pile back first
function drawCards(state: DeckState, n: number): DeckState {
  let { deck, discardPile, hand } = { ...state, deck: [...state.deck], discardPile: [...state.discardPile], hand: [...state.hand] };
  
  if (deck.length < n) {
    // Reshuffle the discard pile back into the deck
    deck = shuffle([...deck, ...discardPile]);
    discardPile = [];
  }
  
  const drawn = deck.splice(0, n);
  hand = [...hand, ...drawn];
  
  return { deck, discardPile, hand };
}

// -- Play cards --------------------------------------------
// Move selected cards to the discard pile, then draw the same number from the deck
function playCards(state: DeckState, cardIds: CardId[]): DeckState {
  let { deck, discardPile, hand } = state;
  
  const played  = hand.filter(c => cardIds.includes(c.id));
  const newHand = hand.filter(c => !cardIds.includes(c.id));
  
  const newDiscard = [...discardPile, ...played];
  
  // Draw back up to 7 cards
  const needed = 7 - newHand.length;
  return drawCards(
    { deck, discardPile: newDiscard, hand: newHand },
    needed
  );
}

// -- Shuffle hand (player-initiated redraw) ----------------
// Rule: discarded cards do not return to the deck until the current operation finishes (two-step flow)
function shuffleHand(state: DeckState, cardIds: CardId[]): DeckState {
  const { deck, discardPile, hand } = state;
  
  // Step 1: remove selected cards from the hand (temporarily stored, not returned to the deck yet)
  const discarded = hand.filter(c => cardIds.includes(c.id));
  const remaining = hand.filter(c => !cardIds.includes(c.id));
  
  // Step 2: draw the same number from the current deck (excluding the cards just discarded)
  const n = discarded.length;
  let workingDeck = [...deck];
  let workingDiscard = [...discardPile];
  
  if (workingDeck.length < n) {
    workingDeck = shuffle([...workingDeck, ...workingDiscard]);
    workingDiscard = [];
  }
  
  const drawn     = workingDeck.splice(0, n);
  const newHand   = [...remaining, ...drawn];
  
  // Step 3: only now do the just-discarded cards return to the card flow (added to the discard pile)
  const newDiscard = [...workingDiscard, ...discarded];
  
  return { deck: workingDeck, discardPile: newDiscard, hand: newHand };
}

// -- Skill: change color -----------------------------------
// Replace with a card from the full pool that has the same rank and target color; if unavailable, use the closest rank in the target color
function skillChangeColor(
  state: DeckState,
  cardId: CardId,
  newElement: Element
): DeckState {
  const target = state.hand.find(c => c.id === cardId);
  if (!target) return state;
  
  // All cards in the deck and discard pile are candidate replacements
  const pool = [...state.deck, ...state.discardPile];
  
  // Preferred: same rank + target color
  let replacement = pool.find(c => c.element === newElement && c.rank === target.rank);
  
  // Fallback: closest rank within the target color
  if (!replacement) {
    const candidates = pool.filter(c => c.element === newElement);
    candidates.sort((a, b) => Math.abs(a.rank - target.rank) - Math.abs(b.rank - target.rank));
    replacement = candidates[0];
  }
  
  if (!replacement) return state; // No card of the target color is available (extreme case)
  
  const newHand = state.hand.map(c => c.id === cardId ? replacement! : c);
  const newDeck = state.deck.filter(c => c.id !== replacement!.id);
  const newDiscard = state.discardPile.filter(c => c.id !== replacement!.id);
  // Move the original card into the discard pile
  const finalDiscard = [...newDiscard, target];
  
  return { deck: newDeck, discardPile: finalDiscard, hand: newHand };
}

// -- Skill: change rank ------------------------------------
// Replace with a card from the full pool that has the same color and target rank
function skillChangeCost(
  state: DeckState,
  cardId: CardId,
  newRank: Rank
): DeckState {
  const target = state.hand.find(c => c.id === cardId);
  if (!target) return state;
  
  const pool = [...state.deck, ...state.discardPile];
  const replacement = pool.find(c => c.element === target.element && c.rank === newRank);
  
  if (!replacement) return state;
  
  const newHand    = state.hand.map(c => c.id === cardId ? replacement : c);
  const newDeck    = state.deck.filter(c => c.id !== replacement.id);
  const newDiscard = [...state.discardPile.filter(c => c.id !== replacement.id), target];
  
  return { deck: newDeck, discardPile: newDiscard, hand: newHand };
}
```

---

## 5. Hand Detection

```typescript
interface HandResult {
  type: HandType;
  chips: number;   // Base chips for the hand type
  mult:  number;   // Multiplier for the hand type
}

const HAND_SCORES: Record<HandType, { chips: number; mult: number }> = {
  STRAIGHT_FLUSH:  { chips: 100, mult: 8 },
  FOUR_OF_A_KIND:  { chips: 60,  mult: 7 },
  FULL_HOUSE:      { chips: 40,  mult: 6 },
  FLUSH:           { chips: 35,  mult: 4 },
  STRAIGHT:        { chips: 30,  mult: 4 },
  THREE_OF_A_KIND: { chips: 30,  mult: 3 },
  TWO_PAIR:        { chips: 20,  mult: 2 },
  PAIR:            { chips: 10,  mult: 2 },
  HIGH_CARD:       { chips: 5,   mult: 1 },
};

// Hand detection is based on all selected cards.
// Players must choose their cards carefully to form the target hand type;
// if the selected cards include off-type filler that breaks the hand (for example, 5 flush cards + 1 off-color card), it will downgrade to High Card.
// The UI should show a live preview of the current selected hand type to guide player choice.
function identifyHand(cards: Card[]): HandResult {
  const type = detectHandType(cards);
  return { type, ...HAND_SCORES[type] };
}

function detectHandType(cards: Card[]): HandType {
  const n = cards.length;
  
  const isFlush    = n >= 5 && cards.every(c => c.element === cards[0].element);
  const isStraight = n >= 5 && checkStraight(cards);
  
  if (isFlush && isStraight) return 'STRAIGHT_FLUSH';
  
  const rankCounts = getRankCounts(cards);
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  
  if (counts[0] === 4)                           return 'FOUR_OF_A_KIND';
  if (counts[0] === 3 && counts[1] === 2)        return 'FULL_HOUSE';
  if (isFlush)                                   return 'FLUSH';
  if (isStraight)                                return 'STRAIGHT';
  if (counts[0] === 3)                           return 'THREE_OF_A_KIND';
  if (counts[0] === 2 && counts[1] === 2)        return 'TWO_PAIR';
  if (counts[0] === 2)                           return 'PAIR';
  return 'HIGH_CARD';
}

function getRankCounts(cards: Card[]): Record<number, number> {
  return cards.reduce((acc, c) => {
    acc[c.rank] = (acc[c.rank] ?? 0) + 1;
    return acc;
  }, {} as Record<number, number>);
}

function checkStraight(cards: Card[]): boolean {
  const ranks = [...new Set(cards.map(c => c.rank))].sort((a, b) => a - b);
  if (ranks.length < 5) return false;
  // Check whether the ranks are consecutive
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] !== ranks[i - 1] + 1) return false;
  }
  return true;
}
```

---

## 6. Damage Calculation

```typescript
interface ScoreResult {
  handType:   HandType;
  baseChips:  number;   // Base chips from the hand type
  cardChips:  number;   // Total chips from card ranks
  mult:       number;   // Multiplier
  total:      number;   // Final damage = (baseChips + cardChips) x mult
}

function calculateDamage(cards: Card[], buffs: Buff[], isDefending: boolean = false): ScoreResult {
  const hand = identifyHand(cards);

  // Step 1: read base chips and base mult from the hand table
  let baseChips = hand.chips;
  let mult      = hand.mult;

  // Step 2: apply HAND_CHIPS_BONUS (stack when the hand type matches)
  // Step 3: apply HAND_MULT_BONUS (stack when the hand type matches, additive)
  for (const buff of buffs) {
    if (buff.type === 'HAND_CHIPS_BONUS' && buff.handType === hand.type) {
      baseChips += buff.bonusChips;
    }
    if (buff.type === 'HAND_MULT_BONUS' && buff.handType === hand.type) {
      mult += buff.bonusMult;
    }
  }

  // Step 4: calculate each card's chip value (apply buffs in order)
  let cardChips = 0;
  for (const card of cards) {
    let chip = card.chipValue;

    // 4a: ELEMENT_CHIP_MULT - element-based chip multiplier
    for (const buff of buffs) {
      if (buff.type === 'ELEMENT_CHIP_MULT' && buff.element === card.element) {
        chip *= buff.mult;
      }
    }

    // 4b: ELEMENT_CHIPS_BONUS - extra chips for the matching element
    for (const buff of buffs) {
      if (buff.type === 'ELEMENT_CHIPS_BONUS' && buff.element === card.element) {
        chip += buff.bonusChips;
      }
    }

    // 4c: ALL_CHIPS_BONUS - extra chips for every played card
    for (const buff of buffs) {
      if (buff.type === 'ALL_CHIPS_BONUS') {
        chip += buff.bonusChips;
      }
    }

    cardChips += chip;
  }

  // Step 5: damage = floor((baseChips + cardChips) x mult)
  let total = Math.floor((baseChips + cardChips) * mult);

  // Step 6: Boss DEFEND damage reduction
  if (isDefending) {
    total = Math.floor(total * 0.5);
  }

  return { handType: hand.type, baseChips, cardChips, mult, total };
}
```

---

## 7. Buff / Upgrade System

```typescript
// Buff is designed as an extensible union type
type Buff =
  // Category A: direct damage amplification
  | HandMultBonus          // Hand-type multiplier bonus
  | HandChipsBonus         // Hand-type base-chip bonus
  | AllChipsBonus          // Global chip bonus for all cards

  // Category B: element-based damage boosts
  | ElementChipMult        // Element-based chip multiplier
  | ElementChipsBonus      // Extra chips for a specific element

  // Category C: expand operational options
  | ElementDrawBuff        // Guarantee a specific element on Shuffle
  | HighRankDrawBuff       // Guarantee the highest-rank card on Shuffle
  // future:
  // | ShuffleCountBuff     // Shuffle count +N
  // | ShieldAutoRestoreBuff// Automatically restore shield at the start of each layer
  // | HPBonus             // Increase max HP

// -- Category A: direct damage amplification ---------------
interface HandMultBonus {
  type:      'HAND_MULT_BONUS';
  handType:  HandType;
  bonusMult: number;   // multiplier += bonusMult (additive stacking)
}

interface HandChipsBonus {
  type:       'HAND_CHIPS_BONUS';
  handType:   HandType;
  bonusChips: number;  // base chips += bonusChips
}

interface AllChipsBonus {
  type:       'ALL_CHIPS_BONUS';
  bonusChips: number;  // extra chips for every played card
}

// -- Category B: element-based damage boosts ---------------
interface ElementChipMult {
  type:    'ELEMENT_CHIP_MULT';
  element: Element;
  mult:    number;      // chip x mult (first-layer specialization buff, mult=1.1)
}

interface ElementChipsBonus {
  type:       'ELEMENT_CHIPS_BONUS';
  element:    Element;
  bonusChips: number;   // extra chips for each matching-element card
}

// -- Category C: expand operational options ----------------
interface ElementDrawBuff {
  type:    'ELEMENT_DRAW_ON_SHUFFLE';
  element: Element;
  // On each Shuffle, guarantee at least one card of this element
}

interface HighRankDrawBuff {
  type: 'HIGH_RANK_DRAW_ON_SHUFFLE';
  // On each Shuffle, guarantee at least one rank-13 card
}

// -- Upgrade option ----------------------------------------
// Generate candidates after each layer settlement; the player chooses 1 out of 3
interface Upgrade {
  id:          string;
  label:       string;    // Display text
  description: string;    // Effect description
  buff:        Buff;      // Applied buff
}

// First layer: fixed 3-choice selection (choose an element specialization)
const FIRST_LAYER_UPGRADES: Upgrade[] = [
  { id: 'water_spec', label: 'Water Specialization', description: 'Water cards chip x1.1', buff: { type: 'ELEMENT_CHIP_MULT', element: 'WATER', mult: 1.1 } },
  { id: 'fire_spec',  label: 'Fire Specialization', description: 'Fire cards chip x1.1', buff: { type: 'ELEMENT_CHIP_MULT', element: 'FIRE',  mult: 1.1 } },
  { id: 'grass_spec', label: 'Grass Specialization', description: 'Grass cards chip x1.1', buff: { type: 'ELEMENT_CHIP_MULT', element: 'GRASS', mult: 1.1 } },
];

// Generate the follow-up upgrade candidate pool based on the chosen element
// TODO: expand pool to 6+ before implementation (the current pool only has 3 options, so a 3-choice pick has no real choice)
function generateUpgradePool(chosenElement: Element, layer: number): Upgrade[] {
  const pool: Upgrade[] = [
    {
      id: `${chosenElement}_dmg_${layer}`,
      label: `${chosenElement} Enhancement`,
      description: `${chosenElement} cards chip x1.1 (stackable)`,
      buff: { type: 'ELEMENT_CHIP_MULT', element: chosenElement, mult: 1.1 }
    },
    {
      id: `${chosenElement}_draw_${layer}`,
      label: 'Shuffle Guarantee',
      description: `Each Shuffle guarantees one ${chosenElement} card`,
      buff: { type: 'ELEMENT_DRAW_ON_SHUFFLE', element: chosenElement }
    },
    {
      id: `high_rank_draw_${layer}`,
      label: 'High-Rank Guarantee',
      description: 'Each Shuffle guarantees one K (rank 13) card',
      buff: { type: 'HIGH_RANK_DRAW_ON_SHUFFLE' }
    },
  ];
  // Shuffle randomly, then take 3 options (after the pool is expanded)
  return shuffle(pool).slice(0, 3);
}
```

---

## 8. Boss Stat Structure

```typescript
interface Boss {
  id:           string;
  layer:        number;
  element:      Element;   // Element (reserved for future advantage/disadvantage rules)
  hp:           number;
  maxHp:        number;
  attackPerRound: number;
}

// Placeholder stat generation (pending game balance design)
const BASE_BOSS_HP     = 300;
const BASE_BOSS_ATTACK = 5;
const BASE_PLAYER_HP   = 20;

// layer starts counting from 1; passing <=0 will produce invalid values
function createBoss(layer: number): Boss {
  return {
    id:             `boss_layer_${layer}`,
    layer,
    element:        ALL_ELEMENTS[(layer - 1) % 3],  // Rotating elements
    hp:             Math.floor(BASE_BOSS_HP     * (1 + 0.3 * (layer - 1))),
    maxHp:          Math.floor(BASE_BOSS_HP     * (1 + 0.3 * (layer - 1))),
    attackPerRound: Math.floor(BASE_BOSS_ATTACK * (1 + 0.2 * (layer - 1))),
  };
}
```

---

## 9. Suggested File Organization

```
src/
├── types/
│   ├── card.ts          // Card, Element, Rank, HandType, CardId
│   ├── state.ts         // GameState, BattleState, RoundState
│   ├── buff.ts          // Buff union types, Upgrade
│   └── events.ts        // All Action/Event types
├── lib/
│   ├── deck.ts          // createFullDeck, initDeckState, drawCards, playCards, shuffleHand
│   ├── cards.ts         // createCard, rankToDisplay, rankToChipValue (moved into types/card.ts)
│   ├── hand.ts          // identifyHand, detectHandType, calculateDamage
│   ├── skills.ts        // skillChangeColor, skillChangeCost
│   ├── boss.ts          // createBoss, Boss stats (to be implemented, Step 6)
│   └── upgrades.ts      // generateUpgradePool, FIRST_LAYER_UPGRADES (moved into types/buff.ts)
└── store/
    ├── gameStore.ts     // Zustand: GameState slice
    ├── battleStore.ts   // Zustand: BattleState slice
    └── roundStore.ts    // Zustand: RoundState slice + event handling
```
