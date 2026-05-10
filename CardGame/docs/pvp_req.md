# PvP 对战设计文档 — Elemental Poker v0.1

---

## 一、模式概述

异步 1v1 对战。双方各自操作，都确认后统一结算。HP 归零的一方丢一分，HP 重置。先达到 N 分者胜。

| 赛制 | 目标分数 | 基础 HP | Buff 次数 |
|---|---|---|---|
| BO2（二分制） | 2 | 600 | 1 次（开局前） |
| BO3（三分制） | 3 | 600 | 2 次（开局前 + 第 2 轮后） |
| BO5（五分制） | 5 | 600 | 3 次（开局前 + 第 2 轮后 + 第 6 轮后） |

---

## 二、回合流程

```
[回合开始]
  ├─ 双方补牌至 7 张
  ├─ 技能/Shuffle 阶段（各自操作，互不可见）
  ├─ 双方确认出牌 → 各自锁定
  ├─ 两人都锁定 → 结算
  │     A 的伤害打给 B，B 的伤害打给 A（同时生效）
  │     双方展示手牌和得分
  ├─ 判定 HP
  │     ├─ 双方 HP > 0 → 下一回合
  │     ├─ 一方 HP ≤ 0 → 丢一分，胜方 +1 分
  │     │        HP 重置，进入 buff 窗口（若有），开始下一分
  │     └─ 双方同时 HP ≤ 0 → A 和 B 同时丢分，进入下一分
  └─ 有人达到目标分数 → 对局结束
```

---

## 三、对战伤害公式

与 PvE 相同：

```
伤害 = floor((底分 + ΣcardChip) × 倍率)
```

- 双方各自对对方造成伤害
- 没有 DEFEND / CHARGE / Boss 行为
- 没有蓄力爆发

---

## 四、技能系统

双方各自独立充能池。同一套技能：

| 技能 | 消耗 | 效果 |
|---|---|---|
| skillChangeColor(cardId, newColor) | 1 能量 | 变色 |
| skillChangeCost(cardId, newRank) | 1 能量 | 变费 |
| skillShield() | 1 能量 | 免疫伤害 |

**PvP 中护盾机制**：激活后免疫本回合对方造成的伤害。盾持续 1 回合，碎裂后进入 3 回合冷却。消耗 1 能量。

充能池独立于 PvE：
- 初始 3 点
- 跨回合不恢复
- 每次赢/输一分后，HP 重置同时回满充能
- Shuffle 保持 2 次/回合

---

## 五、Buff 系统

PvP 不使用数值型 buff（属性增伤、牌型加成、固伤等全部禁用）。只保留工具类 + PvP 专属互动型。

### 5.1 复用 PvE 的工具 Buff（品质均为普通）

| # | Buff | 效果 | PvP 备注 |
|---|---|---|---|
| 1 | Shuffle +1 | 每回合换牌 3 次 | 同 PvE |
| 2 | 充能 +1 | 能量上限 +1 | 同 PvE |
| 3 | 手牌 +1 | 手牌上限 8 张 | 同 PvE |

### 5.2 PvP 专属 Buff —— 设计思路

PvE buff 是"让数字更大"——`ALL_CHIPS +2`、`倍率 +1`。PvP 如果也是这些，两边都在叠伤害，互秒，没意思。

PvP buff 做**改变打法**——信息差、干扰对手、绝地翻盘。分两档：

| 档位 | 出现率 | 定位 | 数量 |
|---|---|---|---|
| **普通** | ~50% | 战术干扰、稳定收益 | 6 个 |
| **稀有** | ~40% | 高影响力、改变比赛节奏 | 8 个 |
| **史诗** | ~10% | 改变游戏规则 | 1 个 |

每层 3 选 1 时混合抽取：1-2 普通 + 1 稀有，约 10% 概率含 1 史诗。

#### 普通档

| # | Buff | 效果 |
|---|---|---|
| P1 | **换牌干扰** | 对方本回合 Shuffle 次数 -1（下限为 0） |
| P2 | **偷牌** | Shuffle 后，从对方手牌中随机偷一张到自己手里（对方少一张，你多一张） |
| P3 | **透支** | 充能不足时可透支 1 点（下回合同充能 -1，不能连续透支） |
| P4 | **回能** | 额外多 1 点充能 |
| P5 | **赌徒** | 每回合出牌前掷骰：50% 概率伤害 ×1.5，50% 概率伤害 ×0.7 |
| P6 | **收藏家** | 手牌中每有一张未打出的满点数牌（K/A），本回合伤害 +15 |

#### 稀有档

| # | Buff | 效果 |
|---|---|---|
| P7 | **不屈** | 受到致命伤害时，保留 1 点 HP（每分限触发 1 次） |
| P8 | **狂暴** | 当 HP 降至 25% 以下时，下一出手伤害 ×1.5（每分限触发 1 次） |
| P9 | **复制** | 对手使用技能后，你可免费再用一次（消耗为 0；每分限 1 次） |
| P10 | **空手道** | 充能为 0 时出手，伤害 ×1.3 |
| P11 | **干扰** | 每次结算时，将对方随机一张牌降低至1费 |
| P12 | **破釜** | 主动将 HP 降至 1，下一出手伤害 ×3（每局限 1 次） |
| P13 | **反伤盾** | 护盾激活时，对方本回合造成的伤害 1:1 反弹回去（自身不受伤害，每分限 1 次） |
| P14 | **封印** | 消耗 1 充能，封印对方一个技能槽，该技能本轮（1 分）内无法使用（每分限 1 次） |

#### 史诗档（出现率约 10%，Buff 窗口中极低概率可见）

| # | Buff | 效果 |
|---|---|---|
| P15 | **孤注** | 仅打出 1 张 rank≤3 的牌时，选取手牌中点数最大的两张牌与该牌乘算（例：打 A(1)，手牌有 Q(12) 和 K(13)，伤害 = 1×12×13 = 156）。独立充能（初始 1 点），用后 3 回合恢复 1 点 |

### 5.3 Buff 时机

- BO2：开局前选 1 次（3 选 1）
- BO3：开局前选 1 次 + 第 2 轮结束后选 1 次 → 共 2 次
- BO5：开局前选 1 次 + 第 2 轮结束后选 1 次 + 第 6 轮结束后选 1 次 → 共 3 次

工具类 buff（Shuffle+1、充能+1、手牌+1）为唯一选择，选后从池子移除。专属 buff 可重复叠加。

---

## 六、房间系统

### 6.1 创建房间

玩家 A 点击"创建房间"→ 生成 6 位房间号 → 等待玩家 B 加入。

### 6.2 加入房间

玩家 B 输入房间号 → 加入 → 双方就位 → 赛前选 buff → 开始。

### 6.3 掉线/退房

- 任何一方断开或主动退出 → **直接判负**，对手胜
- 断线 30 秒内重连 → 继续（待定）

---

## 七、状态机设计

PvP 状态机为独立的状态机，不修改现有 PvE 状态机。

### 7.1 PvPGameState

```typescript
interface PvPGameState {
  roomId: string;
  format: 'BO2' | 'BO3' | 'BO5';
  targetScore: number;  // 2, 3, or 5

  playerA: PvPPlayerState;
  playerB: PvPPlayerState;

  currentRound: number;
  phase: 'MATCHING' | 'BUFF_SELECT' | 'PLAYING' | 'RESOLVE' | 'ROUND_END' | 'MATCH_END';
}

interface PvPPlayerState {
  userId: string;
  socketId: string;
  hp: number;           // 当前 HP
  maxHp: number;        // 600
  score: number;        // 已赢几分
  energy: number;       // 当前充能
  energyMax: number;    // 充能上限（初始 3）
  buffs: PvPBuff[];
  hand: Card[];
  deck: Card[];
  discardPile: Card[];

  // 回合内
  locked: boolean;      // 是否已确认出牌
  selectedCards: CardId[];
  currentScore: number | null;
}
```

### 7.2 状态转移

```
MATCHING（等待对手）
  → BUFF_SELECT（双方选 buff）
    → PLAYING（双方操作）
      → 双方 locked → RESOLVE（结算，亮牌，扣血）
        → 有人 HP ≤ 0 → ROUND_END（得分判定）
          → 有人达到 targetScore → MATCH_END
          → 否则 → BUFF_SELECT（如果触发 buff 窗口）或 PLAYING（新一回合）
        → 无人 HP ≤ 0 → PLAYING（下一回合）
```

---

## 八、Socket 事件

| 客户端 → 服务端 | 参数 | 说明 |
|---|---|---|
| `createPvpRoom` | `{ format }` | 创建房间，返回 roomId |
| `joinPvpRoom` | `{ roomId }` | 加入房间 |
| `pvpSelectBuff` | `{ buffId }` | 选择 buff |
| `pvpUseSkill` | `{ skill, cardId, target }` | 使用技能 |
| `pvpShuffle` | `{ cardIds }` | 换牌 |
| `pvpPlayConfirm` | `{ cardIds }` | 确认出牌（锁定） |

| 服务端 → 客户端 | 说明 |
|---|---|
| `pvpRoomState` | 房间状态变更（对手加入、buff 窗口开始等） |
| `pvpGameState` | 游戏状态推送（每步操作后） |
| `pvpResolve` | 结算结果（双方亮牌 + 伤害值） |
| `pvpScore` | 得分更新 |
| `pvpMatchEnd` | 对局结束 |

---

## 九、数据库

对局结束后写入 Match 记录：

```typescript
// 复用现有 Match 模型，matchType='PVP'
{
  matchType: 'PVP',
  format: 'BO3',
  winnerId: userId,
  loserId: userId,
  score: { winner: 3, loser: 1 },
  rounds: [
    { roundNumber: 1, playerAScore: 143, playerBScore: 120, damageAtoB: 143, damageBtoA: 120 },
    // ...
  ],
  buffsA: ['shuffle+1', 'unbending'],
  buffsB: ['energy+1', 'gambler'],
  endedAt: Date,
}
```

MatchReplay 复用现有结构，`turns` 数组记录每回合双方的操作和结果。

---

## 十、后端实现文件规划

```
backend/src/pvp/
  types.ts          ← PvPGameState, PvPPlayerState, PvPBuff 等接口
  machine.ts        ← transition(ctx, event) 自定义 PvP 状态机
  guards.ts         ← 守卫条件（canLock, canResolve, canBuff 等）
  actions.ts        ← 回合结算、HP扣减、得分判定、buff应用
  runtime.ts        ← 房间管理（createRoom, sendEvent, stopRoom）
  buffs.ts          ← PvP buff 池（普通/稀有抽取、唯一性检查）
  index.ts          ← 统一导出
backend/src/utils/
  pvpHandlers.ts    ← Socket 事件处理器（对接 pvp/ 模块）
```

状态机和 PvE 独立，不复用 `pve/roundMachine.ts`。复用部分：`lib/deck.ts`（牌堆）、`lib/hand.ts`（伤害计算）、`lib/skills.ts`（技能逻辑）。

---

## 十一、待定事项

- [ ] 断线重连时间窗口（30 秒是否合适）
- [ ] BO2/BO3/BO5 的排队匹配是否未来做随机队列
- [ ] 对局聊天/表情系统是否需要
- [ ] PvP 排行榜（胜率、最高连胜）
