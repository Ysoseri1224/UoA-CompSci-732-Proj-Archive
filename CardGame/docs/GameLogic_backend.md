# 游戏后端逻辑 — 分步实现计划

> 目标：后端逻辑完整、对齐前端操作、测试通过、前后端 + 数据库联动正常无 Bug。
> 每步一个 PR，独立可测，不依赖后续步骤。

---

## 当前状态概览

| 层 | 现状 |
|---|---|
| **类型定义** | 散落在 `useGameLogic.js`、`cards.js`、`handTypes.js` 中，后端无对应类型 |
| **牌堆操作** | `frontend/src/data/cards.js` 有静态牌池，无洗牌/抽牌/弃牌逻辑 |
| **牌型识别** | 前端 `useGameLogic.js` 有简易判定，后端 `evaluator.js` 用 pokersolver（不适合 1-7 张选牌） |
| **伤害计算** | 后端 `scoring.js` 是 Balatro 风格（joker/edition/enhancement），非 Poker 牌型计分 |
| **技能系统** | 前端 `useGameLogic.js` 有 changeColor/changeCost/shield，后端 PvE 有不同技能设计 |
| **状态机** | 后端有 XState PvE 状态机（16 阶段，基于德扑 betting 流），与 docs 设计不符 |
| **Store** | 前端无 Zustand game store，逻辑全在 `useGameLogic` hook |
| **Boss/Upgrade** | 前端 `useGameLogic.js` 有简易 bossHP/floor，无正式 Upgrade/Buff 系统 |
| **数据库** | Match/MatchReplay/Achievement 模型已有，matches/achievements 路由为 501 stub |

---

## 第 1 步：后端类型 + 卡牌原语

**目标**：建立后端 TypeScript（JSDoc）类型定义 + 纯函数工具库，零依赖，可单测。

**文件**：
```
backend/src/types/
  card.js        ← Element, Rank, HandType, CardId, Card, createCard, rankToDisplay, rankToChipValue
  state.js       ← GameState, BattleState, RoundState, RoundPhase
  buff.js        ← Buff / ElementDamageBuff / ElementDrawBuff / HighRankDrawBuff / Upgrade
  events.js      ← 所有 Action/Event 类型（SKILL_CHANGE_COLOR, SHUFFLE_SELECT, PLAY_CONFIRM, ...）
```

**验收标准**：
- [ ] `tests/unit/card.types.test.js` 通过
  - CardId 格式 `{ELEMENT}_{rank}` 正确
  - rankToDisplay(1) = 'A', (11) = 'J', (12) = 'Q', (13) = 'K'
  - rankToChipValue(rank) = rank (A=1, 2-10=面值, J=11, Q=12, K=13)
  - createCard 生成完整 Card 对象

---

## 第 2 步：牌堆操作

**目标**：实现纯函数牌堆操作，不依赖任何外部状态。

**文件**：
```
backend/src/lib/
  deck.js       ← createFullDeck, shuffle, initDeckState, drawCards, playCards, shuffleHand
```

**关键规则**：
- 39 张牌（3 属性 × 13 点数），无重复
- Fisher-Yates 洗牌
- 补牌时牌堆不足先洗入弃牌堆
- Shuffle 弃牌先暂存，抽完再回弃牌堆（防止抽回自己刚弃的牌）

**验收标准**：
- [ ] `tests/unit/deck.test.js` 通过
  - createFullDeck 生成 39 张无重复牌
  - initDeckState 生成 7 张手牌 + 32 张牌堆
  - drawCards 正确补牌，牌堆不足时回收弃牌堆
  - playCards 打出牌进弃牌堆，补至 7 张
  - shuffleHand 弃牌后不回抽自己
  - 跑 1000 次随机操作无异常

---

## 第 3 步：牌型识别 + 伤害计算

**目标**：实现 9 种扑克牌型识别 + 伤害公式，直接替换后端现有的 `evaluator.js` + `scoring.js`。

**文件**：
```
backend/src/lib/
  hand.js       ← HAND_SCORES, identifyHand, detectHandType, checkStraight, calculateDamage
```

**牌型优先级**：Straight Flush > Four of a Kind > Full House > Flush > Straight > Three of a Kind > Two Pair > Pair > High Card

**伤害公式**：`(底分 + Σ打出牌.chipValue) × 倍率`，向下取整

**验收标准**：
- [ ] `tests/unit/hand.test.js` 通过
  - 9 种牌型各至少 2 个 case（正面 + 边界）
  - 同花顺识别正确
  - 选中杂牌时降级为 High Card
  - 伤害计算数值正确
  - 与 card-abstractions.md 中的示例核对（三口 7,9,3,7,7 = 189）

---

## 第 4 步：技能逻辑

**目标**：实现 3 个技能（变色/变费/护盾）的纯函数逻辑 + 守卫条件。

**文件**：
```
backend/src/lib/
  skills.js     ← skillChangeColor, skillChangeCost, skillShield, canUseChangeColor, canUseChangeCost, canUseShield
```

**规则对齐 game-rules-prompt.md**：
- 变色：同 rank + 目标颜色优先，否则目标颜色 rank 最接近
- 变费：同颜色 + 目标 rank
- 替换牌不得已在当前手牌中
- 护盾：碎裂后 onCooldown，跨回合保留，Boss 死亡时作废

**验收标准**：
- [ ] `tests/unit/skills.test.js` 通过
  - 变色：同 rank 替换成功，找不到时退而求其次（rank 最接近）
  - 变费：同颜色目标 rank 替换成功
  - 替换不会产生重复牌
  - 找不到可替换牌时 state 不变
  - 护盾状态转换：非活跃 → 激活 → 碎裂 → 冷却

---

## 第 5 步：XState 状态机

**目标**：用 XState v5 实现 RoundState 状态机，替换后端现有的 PvE 状态机。

**文件**：
```
backend/src/pve/
  roundMachine.js  ← RoundPhase 状态机：DRAW → SKILL/SHUFFLE → PLAY → RESOLVE → BOSS_ATTACK → ROUND_END
  guards.js        ← 守卫条件（canUseChangeColor, canShuffle, canPlay, ...）
  actions.js       ← 副作用（draw_cards, resolve_damage, boss_attack, round_end_reset, ...）
  index.js         ← 更新，引入新状态机
```

**状态转移**（对齐 state-machine.md §4.2）：
```
DRAW → SKILL/SHUFFLE（玩家任意操作，可交替）→ PLAY → RESOLVE
  ├─ Boss HP ≤ 0 → WIN
  └─ Boss HP > 0 → BOSS_ATTACK
       ├─ Player HP ≤ 0 → LOSE
       └─ Player HP > 0 → ROUND_END → 回到 DRAW
```

**验收标准**：
- [ ] `tests/unit/pve.roundMachine.test.js` 通过
  - 完整回合流程：DRAW → SKILL → PLAY → RESOLVE → BOSS_ATTACK → ROUND_END → DRAW
  - SKILL/SHUFFLE 阶段可交替
  - Boss HP ≤ 0 时跳至 WIN
  - 护盾阻挡 Boss 攻击 → 碎裂 → 下回合冷却
  - Boss 死亡时护盾作废
  - round_end 重置 skills.used 和 shuffle.remaining

---

## 第 6 步：GameState + BattleState Store（Zustand）

**目标**：实现游戏状态管理，GameState / BattleState / RoundState 三层分离。

**文件**：
```
frontend/src/store/
  gameStore.js    ← GameState slice（runId, layer, player, deck, hand, phase）
  battleStore.js  ← BattleState slice（boss, round, roundState, result）
  roundStore.js   ← RoundState slice + 事件处理
```

**后端扩展**：
```
backend/src/lib/
  boss.js         ← createBoss, Boss 数值缩放公式
  upgrades.js     ← FIRST_LAYER_UPGRADES, generateUpgradePool
  savepoint.js    ← createSavepoint, loadSavepoint, 序列化/反序列化
```

**验收标准**：
- [ ] `tests/unit/boss.test.js` — Boss 创建，数值随层数缩放
- [ ] `tests/unit/upgrades.test.js` — 第一层 3 选 1，后续层生成候选池
- [ ] `tests/unit/savepoint.test.js` — SavePoint 写入/读取，序列化反序列化
- [ ] 前端 store 可通过 DevTools 观察状态变化
- [ ] Zustand 三层 store 分界清晰，互不污染

---

## 第 7 步：Socket.io 联机层

**目标**：通过 Socket.io 将后端状态机与前端 UI 打通，实现完整的 PvE 游戏流程。

**文件**：
```
backend/src/
  socket.js         ← 更新：注册 PvE game 事件处理器
  utils/
    pveHandlers.js  ← 重写：对接新状态机，startPveGame / selectSkills / playerAction / disconnect
backend/src/pve/
  runtime.js        ← 更新：对接新状态机，actor 生命周期管理
```

**事件流**：
```
Client                           Server
  │                                │
  ├── startPveGame ──────────────►│ 创建 actor，init Deck + Boss
  ├── phase:DRAW ──────────────────┤ 自动补牌完成
  ├── phase:SKILL/SHUFFLE ────────┤ 等待玩家操作
  ├── skill:changeColor(cardId) ──►│ 执行技能，返回新 state
  ├── shuffle:select(cardIds) ────►│ 执行换牌
  ├── play:confirm(cardIds) ──────►│ 打出牌，结算伤害
  ├── phase:RESOLVE ───────────────┤ 显示伤害结果
  ├── phase:BOSS_ATTACK ───────────┤ Boss 攻击
  ├── phase:ROUND_END ─────────────┤ 进入下一回合
  │  ...                           │
  ├── phase:WIN/LOSE ──────────────┤ 胜负
```

**验收标准**：
- [ ] Socket.io 建连/断连正常
- [ ] 完整一局 PvE 游戏流程无卡顿
- [ ] 前端 UI 响应状态机推送的状态变化
- [ ] `tests/unit/pve.socketHandlers.test.js` 更新并通过

---

## 第 8 步：数据库持久化 + 路由补完

**目标**：将 Match/MatchReplay 模型与游戏结果对接，补完 stubbed 路由。

**文件**：
```
backend/src/routes/
  matches.js      ← 实现 GET /api/matches, GET /api/matches/:matchId, GET /api/matches/:matchId/replay
  achievements.js ← 实现 GET /api/achievements
```

**数据库写入时机**：
- 每局结束时写入 Match 记录
- 每回合结束后写入 MatchReplay.hand
- 通关/失败时检查成就

**验收标准**：
- [ ] `tests/api/matches.test.js` — Match CRUD 端点正常
- [ ] `tests/api/achievements.test.js` — 成就端点正常
- [ ] 一局游戏结束后数据库有完整 Match + MatchReplay 记录
- [ ] 读取 MatchReplay 可完整重放一局

---

## 第 9 步：前后端联调 + 集成测试

**目标**：前后端 + MongoDB + Redis 完整链路走通，无 Bug。

**内容**：
- 完整游戏流程集成测试（注册 → 登录 → 开始 PvE → 多回合 → 通关/失败 → 查看回放）
- 边界条件测试（断网重连、同时在多窗口操作、极端牌库状态）
- 前端 Zustand store 与后端状态同步验证

**验收标准**：
- [ ] Docker Compose 一键启动，前后端 + MongoDB + Redis 正常
- [ ] 完整一局游戏无 console error
- [ ] `tests/integration/fullGame.test.js` 通过
- [ ] 手动测试 checklist 全部通过

---

## 依赖关系

```
第1步（类型）
  └─► 第2步（牌堆）
       └─► 第3步（牌型+伤害）
            ├─► 第4步（技能）
            │    └─► 第5步（状态机）
            │         ├─► 第6步（Store + Boss + Upgrade）
            │         │    └─► 第7步（Socket.io 联机）
            │         │         └─► 第8步（数据库 + 路由）
            │         │              └─► 第9步（联调 + 集成测试）
            │         └─► （可并行）第6步 后端部分
            └─► （可并行）第6步 后端部分
```

---

## 文件组织最终状态

```
backend/src/
  types/
    card.js          ← Element, Rank, HandType, CardId, Card
    state.js         ← GameState, BattleState, RoundState, RoundPhase
    buff.js          ← Buff, Upgrade
    events.js        ← Action/Event 类型
  lib/
    cards.js         ← createCard, rankToDisplay, rankToChipValue
    deck.js          ← createFullDeck, shuffle, initDeckState, drawCards, playCards, shuffleHand
    hand.js          ← HAND_SCORES, identifyHand, detectHandType, calculateDamage
    skills.js        ← skillChangeColor, skillChangeCost, shieldStateMachine
    boss.js          ← createBoss
    upgrades.js      ← generateUpgradePool, FIRST_LAYER_UPGRADES
    savepoint.js     ← createSavepoint, loadSavepoint
  pve/
    roundMachine.js  ← XState round 状态机
    guards.js        ← 守卫条件
    actions.js       ← 副作用
    runtime.js       ← Actor 生命周期 + Socket 事件路由
    index.js
  store/             ← Zustand（或继续用 XState context）
    gameStore.js
    battleStore.js
    roundStore.js
  routes/
    matches.js       ← 完整实现
    achievements.js  ← 完整实现
  models/            ← 已有（可能需要微调字段）

frontend/src/
  store/
    gameStore.js     ← Zustand GameState slice
    battleStore.js   ← Zustand BattleState slice
    roundStore.js    ← Zustand RoundState slice
  hooks/
    useGameLogic.js  ← 重构：从本地 state 改为 Zustand store
```

---

## 测试策略

| 层 | 测试类型 | 工具 |
|---|---|---|
| types/lib | 纯函数单测 | `node:test` + `node:assert/strict` |
| XState 状态机 | 状态转移测试 | `xstate` test utils / 事件驱动测试 |
| API 路由 | 集成测试 | `node:test` + supertest + 真实 MongoDB |
| Socket.io | 事件驱动测试 | socket.io-client + 事件监听 |
| 前端 Store | 单向数据流测试 | Zustand subscribe + mock |
| 完整流程 | E2E 测试 | Docker Compose + 手动 checklist |
