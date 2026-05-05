# 卡牌与牌堆抽象 — Elemental Poker (v0.1)

> 本文档定义卡牌数据结构、牌堆操作接口与强化 Buff 系统。
> 所有类型为 TypeScript，可直接用于 React + Zustand 项目。

---

## 1. 基础类型

```typescript
// ── 属性 ──────────────────────────────────
type Element = 'WATER' | 'FIRE' | 'GRASS';

// ── 点数（1–13，对应 A/2–10/J/Q/K）────────
type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

// ── 牌型 ──────────────────────────────────
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

// ── 卡牌唯一 ID ───────────────────────────
// 格式："{element}_{rank}"，例如 "WATER_1"、"FIRE_13"
type CardId = string;
```

---

## 2. 卡牌数据结构

```typescript
interface Card {
  id: CardId;              // 唯一标识，格式 "{ELEMENT}_{rank}"
  element: Element;        // 属性
  rank: Rank;              // 点数 1–13
  
  // 派生字段（可计算，不需要单独存储，但可缓存）
  displayRank: string;     // 展示文字："A" | "2"–"10" | "J" | "Q" | "K"
  chipValue: number;       // 计分用点数值：A=1, 2–10=面值, J=11, Q=12, K=13
}
```

### 2.1 工厂函数

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
  return rank;  // A=1, 2-10=面值, J=11, Q=12, K=13
}
```

---

## 3. 完整牌库定义

```typescript
const ALL_ELEMENTS: Element[] = ['WATER', 'FIRE', 'GRASS'];
const ALL_RANKS: Rank[] = [1,2,3,4,5,6,7,8,9,10,11,12,13];

// 生成完整 39 张牌库（有序，未洗牌）
function createFullDeck(): Card[] {
  const deck: Card[] = [];
  for (const element of ALL_ELEMENTS) {
    for (const rank of ALL_RANKS) {
      deck.push(createCard(element, rank));
    }
  }
  return deck; // 39 张
}
```

---

## 4. 牌堆操作接口

```typescript
interface DeckState {
  deck:        Card[];   // 牌堆（未抽出，index 0 = 堆顶）
  discardPile: Card[];   // 弃牌堆
  hand:        Card[];   // 手牌（最多 7 张）
}

// ── 洗牌 ──────────────────────────────────────────────────────────
// Fisher-Yates 原地洗牌
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── 初始化 ────────────────────────────────────────────────────────
function initDeckState(): DeckState {
  const deck = shuffle(createFullDeck());
  const hand  = deck.slice(0, 7);
  return {
    deck:        deck.slice(7),
    discardPile: [],
    hand,
  };
}

// ── 补牌（draw）──────────────────────────────────────────────────
// 从牌堆顶部抽 n 张；牌堆不足时先将弃牌堆洗回
function drawCards(state: DeckState, n: number): DeckState {
  let { deck, discardPile, hand } = { ...state, deck: [...state.deck], discardPile: [...state.discardPile], hand: [...state.hand] };
  
  if (deck.length < n) {
    // 弃牌堆洗回牌堆
    deck = shuffle([...deck, ...discardPile]);
    discardPile = [];
  }
  
  const drawn = deck.splice(0, n);
  hand = [...hand, ...drawn];
  
  return { deck, discardPile, hand };
}

// ── 打出手牌 ─────────────────────────────────────────────────────
// 选中的牌进弃牌堆；从牌堆补等量
function playCards(state: DeckState, cardIds: CardId[]): DeckState {
  let { deck, discardPile, hand } = state;
  
  const played  = hand.filter(c => cardIds.includes(c.id));
  const newHand = hand.filter(c => !cardIds.includes(c.id));
  
  const newDiscard = [...discardPile, ...played];
  
  // 补牌至 7 张
  const needed = 7 - newHand.length;
  return drawCards(
    { deck, discardPile: newDiscard, hand: newHand },
    needed
  );
}

// ── Shuffle 手牌（玩家主动换牌）─────────────────────────────────
// 规则：弃置的牌须等本次操作完成后才回牌堆（两步执行）
function shuffleHand(state: DeckState, cardIds: CardId[]): DeckState {
  const { deck, discardPile, hand } = state;
  
  // Step 1：将选中牌从手牌移除（暂存，先不回牌堆）
  const discarded = hand.filter(c => cardIds.includes(c.id));
  const remaining = hand.filter(c => !cardIds.includes(c.id));
  
  // Step 2：从现有牌堆（不含刚弃置的牌）抽等量
  const n = discarded.length;
  let workingDeck = [...deck];
  let workingDiscard = [...discardPile];
  
  if (workingDeck.length < n) {
    workingDeck = shuffle([...workingDeck, ...workingDiscard]);
    workingDiscard = [];
  }
  
  const drawn     = workingDeck.splice(0, n);
  const newHand   = [...remaining, ...drawn];
  
  // Step 3：刚弃置的牌现在才回牌堆（加入弃牌堆）
  const newDiscard = [...workingDiscard, ...discarded];
  
  return { deck: workingDeck, discardPile: newDiscard, hand: newHand };
}

// ── 技能：变色 ───────────────────────────────────────────────────
// 从完整牌库找同费用+目标颜色的牌替换；找不到则找目标颜色费用最接近的
function skillChangeColor(
  state: DeckState,
  cardId: CardId,
  newElement: Element
): DeckState {
  const target = state.hand.find(c => c.id === cardId);
  if (!target) return state;
  
  // 所有牌（牌堆 + 弃牌堆中的牌）作为候选
  const pool = [...state.deck, ...state.discardPile];
  
  // 优先：同 rank + 目标颜色
  let replacement = pool.find(c => c.element === newElement && c.rank === target.rank);
  
  // 退而求其次：目标颜色中 rank 最接近的
  if (!replacement) {
    const candidates = pool.filter(c => c.element === newElement);
    candidates.sort((a, b) => Math.abs(a.rank - target.rank) - Math.abs(b.rank - target.rank));
    replacement = candidates[0];
  }
  
  if (!replacement) return state; // 目标颜色无牌可用（极端情况）
  
  const newHand = state.hand.map(c => c.id === cardId ? replacement! : c);
  const newDeck = state.deck.filter(c => c.id !== replacement!.id);
  const newDiscard = state.discardPile.filter(c => c.id !== replacement!.id);
  // 原卡进弃牌堆
  const finalDiscard = [...newDiscard, target];
  
  return { deck: newDeck, discardPile: finalDiscard, hand: newHand };
}

// ── 技能：变费 ───────────────────────────────────────────────────
// 从完整牌库找同颜色+目标 rank 的牌替换
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

## 5. 牌型识别

```typescript
interface HandResult {
  type: HandType;
  chips: number;   // 牌型底分
  mult:  number;   // 牌型倍率
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

// 牌型检测基于所有选中牌判定。玩家需自行精选手牌以达成目标牌型；
// 若选中牌中包含破坏牌型的杂牌（如 5 同花 + 1 杂色），将降级为 High Card。
// UI 应实时显示当前选中牌的牌型预览，引导玩家调整选择。
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
  // 检查是否连续
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] !== ranks[i - 1] + 1) return false;
  }
  return true;
}
```

---

## 6. 伤害计算

```typescript
interface ScoreResult {
  handType:   HandType;
  baseChips:  number;   // 牌型底分
  cardChips:  number;   // 卡牌点数合计
  mult:       number;   // 倍率
  total:      number;   // 最终伤害 = (baseChips + cardChips) × mult
}

function calculateDamage(cards: Card[], buffs: Buff[]): ScoreResult {
  const hand      = identifyHand(cards);
  const cardChips = cards.reduce((sum, c) => sum + c.chipValue, 0);
  
  let baseChips = hand.chips;
  let mult      = hand.mult;
  
  // 应用强化 Buff（当前阶段只有属性伤害加成）
  // 注：属性加成仅作用于打出牌中属于该属性的点数
  for (const buff of buffs) {
    if (buff.type === 'ELEMENT_DAMAGE_MULT') {
      // 只计算目标属性的牌的 chipValue
      const elementCards = cards.filter(c => c.element === buff.element);
      const elementChips = elementCards.reduce((sum, c) => sum + c.chipValue, 0);
      // 将该属性牌的点数部分乘以系数，累加差值到 cardChips
      // 等效：total 增加 elementChips * (buff.value - 1)
      // 这里直接在 mult 结算前处理
    }
  }
  
  const total = Math.floor((baseChips + cardChips) * mult);
  
  return { handType: hand.type, baseChips, cardChips, mult, total };
}

// TODO: implement buff application logic（当前 buff 循环未实际计算加成）
// 注：属性加成的精确应用方式待数值策划确认后完善
```

---

## 7. Buff / 强化系统

```typescript
// Buff 设计为可扩展的 union type
type Buff =
  | ElementDamageBuff       // 属性伤害加成（第一层必选）
  | ElementDrawBuff         // Shuffle 时固定获取某属性牌
  | HighRankDrawBuff        // Shuffle 时固定获取最高费用牌
  // future:
  // | ShuffleCountBuff     // Shuffle 次数 +N
  // | ShieldAutoRestoreBuff// 每层开始自动恢复护盾

interface ElementDamageBuff {
  type:    'ELEMENT_DAMAGE_MULT';
  element: Element;
  value:   number;   // 乘数，例如 1.1
}

interface ElementDrawBuff {
  type:    'ELEMENT_DRAW_ON_SHUFFLE';
  element: Element;
  // 每次 Shuffle 额外保证获取至少一张该属性牌
}

interface HighRankDrawBuff {
  type: 'HIGH_RANK_DRAW_ON_SHUFFLE';
  // 每次 Shuffle 额外保证获取至少一张 rank=13 的牌
}

// ── 强化选项（Upgrade）────────────────────────────────────────────
// 每层结算时生成候选，玩家 3 选 1
interface Upgrade {
  id:          string;
  label:       string;    // 展示文字
  description: string;    // 效果描述
  buff:        Buff;      // 应用的 Buff
}

// 第一层：固定 3 选 1（选属性专精）
const FIRST_LAYER_UPGRADES: Upgrade[] = [
  { id: 'water_spec', label: '水系专精', description: '水系牌伤害 ×1.1', buff: { type: 'ELEMENT_DAMAGE_MULT', element: 'WATER', value: 1.1 } },
  { id: 'fire_spec',  label: '火系专精', description: '火系牌伤害 ×1.1', buff: { type: 'ELEMENT_DAMAGE_MULT', element: 'FIRE',  value: 1.1 } },
  { id: 'grass_spec', label: '草系专精', description: '草系牌伤害 ×1.1', buff: { type: 'ELEMENT_DAMAGE_MULT', element: 'GRASS', value: 1.1 } },
];

// 根据已选属性生成后续强化候选池
// TODO: expand pool to 6+ before implementation（当前池子仅 3 个，3 选 3 无实际选择）
function generateUpgradePool(chosenElement: Element, layer: number): Upgrade[] {
  // 当前只有两种强化类型，各1个，共2个，实际游戏需要扩展到至少 6+ 保证 3 选 1 有意义
  const pool: Upgrade[] = [
    {
      id: `${chosenElement}_dmg_${layer}`,
      label: `${chosenElement} 强化`,
      description: `${chosenElement} 系牌伤害再 ×1.1`,
      buff: { type: 'ELEMENT_DAMAGE_MULT', element: chosenElement, value: 1.1 }
    },
    {
      id: `${chosenElement}_draw_${layer}`,
      label: 'Shuffle 保底',
      description: `每次 Shuffle 保证获得一张 ${chosenElement} 系牌`,
      buff: { type: 'ELEMENT_DRAW_ON_SHUFFLE', element: chosenElement }
    },
    {
      id: `high_rank_draw_${layer}`,
      label: '高费保底',
      description: '每次 Shuffle 保证获得一张 K（13点）牌',
      buff: { type: 'HIGH_RANK_DRAW_ON_SHUFFLE' }
    },
  ];
  // 随机打乱后取 3 个（当池子扩大后）
  return shuffle(pool).slice(0, 3);
}
```

---

## 8. Boss 数值结构

```typescript
interface Boss {
  id:           string;
  layer:        number;
  element:      Element;   // 属性（未来相克用）
  hp:           number;
  maxHp:        number;
  attackPerRound: number;
}

// 占位数值生成（待数值策划）
const BASE_BOSS_HP     = 300;
const BASE_BOSS_ATTACK = 5;
const BASE_PLAYER_HP   = 20;

// layer 从 1 开始计数，传入 ≤0 将产生错误数值
function createBoss(layer: number): Boss {
  return {
    id:             `boss_layer_${layer}`,
    layer,
    element:        ALL_ELEMENTS[(layer - 1) % 3],  // 循环属性
    hp:             Math.floor(BASE_BOSS_HP     * (1 + 0.3 * (layer - 1))),
    maxHp:          Math.floor(BASE_BOSS_HP     * (1 + 0.3 * (layer - 1))),
    attackPerRound: Math.floor(BASE_BOSS_ATTACK * (1 + 0.2 * (layer - 1))),
  };
}
```

---

## 9. 文件组织建议

```
src/
├── types/
│   ├── card.ts          // Card, Element, Rank, HandType, CardId
│   ├── state.ts         // GameState, BattleState, RoundState
│   ├── buff.ts          // Buff union types, Upgrade
│   └── events.ts        // 所有 Action/Event 类型
├── lib/
│   ├── deck.ts          // createFullDeck, initDeckState, drawCards, playCards, shuffleHand
│   ├── cards.ts         // createCard, rankToDisplay, rankToChipValue
│   ├── hand.ts          // identifyHand, detectHandType, calculateDamage
│   ├── skills.ts        // skillChangeColor, skillChangeCost
│   ├── boss.ts          // createBoss, Boss 数值
│   └── upgrades.ts      // generateUpgradePool, FIRST_LAYER_UPGRADES
└── store/
    ├── gameStore.ts     // Zustand: GameState slice
    ├── battleStore.ts   // Zustand: BattleState slice
    └── roundStore.ts    // Zustand: RoundState slice + 事件处理
```
