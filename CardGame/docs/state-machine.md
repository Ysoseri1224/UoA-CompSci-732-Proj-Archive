# 状态机设计 — Elemental Poker (v0.1)

> 技术栈：React 18 + Zustand 4 + XState（推荐引入）
> 本文档定义完整的回合状态机，可直接映射到 XState v5 或 Zustand slice。

---

## 1. 全局状态层级

```
GameState（整局 Run）
  └── BattleState（单层 Boss 战）
        └── RoundState（单回合）
```

三层分离，互不污染。存档只需序列化 GameState。

---

## 2. GameState — 整局 Run

```typescript
interface GameState {
  runId: string;                    // 唯一 run 标识
  layer: number;                    // 当前层数（从 1 开始）
  
  // 玩家持久数据
  player: {
    hp: number;                     // 当前 HP
    maxHp: number;                  // 最大 HP
    buffs: Buff[];                  // 永久累积的强化效果
    chosenElement: Element | null;  // 第一层选择的属性专精
  };
  
  // 牌库持久数据（跨回合共享同一副牌）
  deck: Card[];                     // 当前牌堆（未抽出）
  discardPile: Card[];              // 弃牌堆
  hand: Card[];                     // 当前手牌（7张）
  
  // 进度
  phase: 'BATTLE' | 'UPGRADE' | 'GAME_OVER' | 'RUN_COMPLETE';

  // UPGRADE 子状态（仅在 phase = 'UPGRADE' 时有值）
  upgradePhase: 'GENERATING' | 'CHOOSING' | 'APPLYING' | null;
  upgradeOptions: Upgrade[];        // 当前展示给玩家的候选（CHOOSING 阶段有值）

  savepoint: SavePoint | null;      // 最近存档点
}

// 存档点（每层结束后写入）
interface SavePoint {
  layer: number;
  timestamp: number;
  gameState: Omit<GameState, 'savepoint'>;
}
```

### 2.1 UPGRADE 子状态流转

```
BATTLE_WIN 触发
  → upgradePhase = 'GENERATING'（生成3个候选buff，写入 upgradeOptions）
  → upgradePhase = 'CHOOSING'（等待玩家 SELECT_UPGRADE 事件）
  → upgradePhase = 'APPLYING'（将选中 buff 写入 player.buffs）
  → upgradePhase = null，GameState.phase = 'BATTLE'，进入下一层
```

---

## 3. BattleState — 单层 Boss 战

```typescript
interface BattleState {
  boss: {
    hp: number;
    maxHp: number;
    attackPerRound: number;         // 本层普通攻击值
    chargeAttack: number;           // 蓄力爆发值（= attackPerRound × 2.2，取整）
    element: Element;               // 属性（未来相克用）

    behavior: {
      currentIntent: BossIntent;    // 本回合意图（对玩家可见）
      chargeStored: boolean;        // 是否有蓄力待释放
    };
    weights: BossWeights;           // 本层行为权重（从配置表读入，不随回合变化）
  };
  round: number;                    // 当前回合数（从 1 开始）
  roundState: RoundState;           // 当前回合子状态
  result: 'ONGOING' | 'WIN' | 'LOSE';
}
```

```typescript
type BossIntent = 'ATTACK' | 'CHARGE' | 'DEFEND';

interface BossWeights {
  attack: number;   // 示例：0.80
  charge: number;   // 示例：0.15
  defend: number;   // 示例：0.05
  // 三者之和必须 = 1.0
}
```

权重配置表（硬编码为常量，不进状态）：

```typescript
const BOSS_WEIGHTS_BY_LAYER: Record<number, BossWeights> = {
  1:  { attack: 0.80, charge: 0.15, defend: 0.05 },
  2:  { attack: 0.80, charge: 0.15, defend: 0.05 },
  3:  { attack: 0.80, charge: 0.15, defend: 0.05 },
  4:  { attack: 0.60, charge: 0.25, defend: 0.15 },
  5:  { attack: 0.60, charge: 0.25, defend: 0.15 },
  6:  { attack: 0.60, charge: 0.25, defend: 0.15 },
  7:  { attack: 0.45, charge: 0.30, defend: 0.25 },
  8:  { attack: 0.45, charge: 0.30, defend: 0.25 },
  9:  { attack: 0.45, charge: 0.30, defend: 0.25 },
  10: { attack: 0.45, charge: 0.30, defend: 0.25 },
};
```

---

## 4. RoundState — 单回合状态机

### 4.1 状态枚举

```typescript
type RoundPhase =
  | 'DRAW'            // 补牌阶段（自动）
  | 'BOSS_TELEGRAPH'  // Boss 意图展示阶段（自动）
  | 'SKILL'           // 技能阶段（玩家操作）
  | 'SHUFFLE'         // Shuffle 阶段（玩家操作，可与 SKILL 交替）
  | 'PLAY'            // 出牌阶段（玩家选牌 → 打出）
  | 'RESOLVE'         // 结算阶段（计算伤害，自动）
  | 'BOSS_ATTACK'     // Boss 攻击阶段（自动）
  | 'ROUND_END';      // 回合结束（触发下一回合 or 胜负判定）
```

### 4.2 状态转移图

```
            ┌─────────────────────────────────────────┐
            │              ROUND START                │
            └──────────────────┬──────────────────────┘
                               │ auto
                               ▼
                           ┌──────┐
                           │ DRAW │  补牌至 7 张
                           └──┬───┘
                              │ done
                              ▼
                     ┌──────────────────┐
                     │  BOSS_TELEGRAPH  │  确定Boss意图 → 对玩家展示
                     └────────┬─────────┘
                              │ done
                              ▼
               ┌──────────────────────────┐
               │     SKILL / SHUFFLE      │◄──────────────┐
               │  （玩家可任意操作，      │               │
               │   顺序自由，可交替）     │               │
               └──────────┬───────────────┘               │
                          │                               │
               ┌──────────┴───────────┐                   │
               │ player clicks "PLAY" │                   │
               └──────────┬───────────┘                   │
                          ▼                               │
                      ┌──────┐                            │
                      │ PLAY │  玩家选牌（1-7张）          │
                      └──┬───┘                            │
                         │ confirm selection              │
                         ▼                               │
                    ┌─────────┐                          │
                    │ RESOLVE │  计算伤害，扣 Boss HP      │
                    └────┬────┘                          │
                         │                               │
              ┌──────────┴──────────┐                    │
              │                     │                    │
          Boss HP ≤ 0           Boss HP > 0              │
              │                     │                    │
              ▼                     ▼                    │
          ┌─────────────────────┐  ┌─────────────┐      │
          │  WIN（护盾作废）   │  │ BOSS_ATTACK │      │
          └─────────────────────┘  └──────┬──────┘      │
                                    │                    │
                         ┌──────────┴──────────┐         │
                         │                     │         │
                    Player HP ≤ 0         Player HP > 0  │
                         │                     │         │
                         ▼                     ▼         │
                      ┌──────┐          ┌───────────┐    │
                      │ LOSE │          │ ROUND_END │────┘
                      └──────┘          └───────────┘
                                        （进入下一回合）
```

### 4.2.1 BOSS_TELEGRAPH 阶段说明

- 自动触发，无需玩家操作
- 系统根据 `boss.weights` 随机抽取本回合 intent
- 若 `boss.behavior.chargeStored === true`，强制 intent = 'ATTACK'（释放蓄力），忽略权重
- 将结果写入 `bossRound.intent`、`bossRound.isDefending`、`bossRound.willReleaseCharge`
- 对玩家 UI 展示本回合意图后，进入 SKILL/SHUFFLE 阶段

### 4.3 RoundState 数据结构

```typescript
interface RoundState {
  phase: RoundPhase;
  
  // 技能冷却与使用状态（每回合重置）
  skills: {
    changeColor: { used: boolean };   // 每回合重置
    changeCost:  { used: boolean };   // 每回合重置
    shield: {
      active: boolean;                // 护盾当前是否激活
      onCooldown: boolean;            // 是否在冷却中（碎裂后）
    };
  };
  
  // Shuffle 状态
  shuffle: {
    remaining: number;                // 本回合剩余次数（初始 2）
    pendingDiscard: CardId[];         // 待弃置的牌（确认前）
  };
  
  // 出牌状态
  play: {
    selectedCards: CardId[];          // 玩家当前选中的牌
    handType: HandType | null;        // 识别出的牌型
    score: number | null;             // 计算出的伤害值
  };

  // Boss 回合状态
  bossRound: {
    intent: BossIntent;               // 本回合意图（DRAW阶段结束后确定并展示）
    isDefending: boolean;             // true 时玩家本回合伤害减半
    willReleaseCharge: boolean;       // true 时本回合 Boss 攻击为蓄力爆发
  };
}
```

---

## 5. 事件（Actions / Events）

> 以下为状态机接受的所有事件，Zustand action 或 XState event 均可对应。

```typescript
// ── 技能事件 ──────────────────────────────
{ type: 'SKILL_CHANGE_COLOR'; cardId: CardId; newColor: Element }
{ type: 'SKILL_CHANGE_COST';  cardId: CardId; newCost: number  }
{ type: 'SKILL_SHIELD'                                         }

// ── Shuffle 事件 ──────────────────────────
{ type: 'SHUFFLE_SELECT';   cardIds: CardId[] }  // 选定要弃置的牌
{ type: 'SHUFFLE_CONFIRM'                     }  // 确认执行 shuffle
{ type: 'SHUFFLE_CANCEL'                      }  // 取消选择

// ── 出牌事件 ──────────────────────────────
{ type: 'PLAY_SELECT';   cardId: CardId }        // 选/取消选一张牌
{ type: 'PLAY_CONFIRM'                  }        // 确认打出选中牌

// ── 系统事件（自动触发）──────────────────
{ type: 'DRAW_COMPLETE'           }              // 补牌完成
{ type: 'BOSS_TELEGRAPH_COMPLETE' }              // Boss 意图展示完成
{ type: 'RESOLVE_COMPLETE'        }              // 伤害结算完成
{ type: 'BOSS_ATTACK_COMPLETE'    }              // Boss 攻击完成
{ type: 'ROUND_END_CONFIRM'       }              // 进入下一回合

// ── 胜负事件 ─────────────────────────────
{ type: 'BATTLE_WIN'    }
{ type: 'BATTLE_LOSE'   }

// ── Roguelike 事件 ────────────────────────
{ type: 'UPGRADE_OPTIONS_READY'                }  // 候选生成完成（GENERATING → CHOOSING）
{ type: 'SELECT_UPGRADE'; upgradeId: string }     // 玩家选择强化选项
{ type: 'UPGRADE_APPLIED'                      }  // 强化应用完成（APPLYING → BATTLE）
{ type: 'LOAD_SAVEPOINT'                   }     // 读取存档
```

---

## 6. 守卫条件（Guards）

```typescript
// 技能是否可用
canUseChangeColor  = !skills.changeColor.used && phase === 'SKILL'
canUseChangeCost   = !skills.changeCost.used  && phase === 'SKILL'
canUseShield       = !skills.shield.active && !skills.shield.onCooldown && phase === 'SKILL'

// Shuffle 是否可用
canShuffle = shuffle.remaining > 0 && phase === 'SHUFFLE'

// 出牌是否合法
canPlay = play.selectedCards.length >= 1 && phase === 'PLAY'

// Boss 攻击是否被护盾阻挡
shieldBlocksBossAttack = skills.shield.active

// 护盾是否在 Boss 死亡时作废
shieldVoided = bossHP <= 0   // 若进入 WIN，护盾不保留
```

---

## 7. 副作用（Side Effects）

| 触发条件              | 副作用                                              |
|-----------------------|-----------------------------------------------------|
| DRAW 阶段             | 若牌堆不足，先将弃牌堆洗回牌堆，再补牌              |
| SHUFFLE_CONFIRM       | 弃牌暂存，补牌完成后弃牌才回牌堆                    |
| RESOLVE 后 Boss HP≤0  | 护盾状态重置（作废），触发 WIN                       |
| BOSS_ATTACK + Shield  | 护盾碎裂，shield.active=false, onCooldown=true       |
| ROUND_END             | skills.changeColor.used / changeCost.used 重置为false；shuffle.remaining 重置为 2 |
| BOSS_TELEGRAPH：intent = CHARGE         | `bossRound.willReleaseCharge = false`；本回合跳过 BOSS_ATTACK；`boss.behavior.chargeStored = true` |
| BOSS_TELEGRAPH：chargeStored = true     | 强制 intent = ATTACK；`bossRound.willReleaseCharge = true`；`boss.behavior.chargeStored = false` |
| BOSS_TELEGRAPH：intent = DEFEND         | `bossRound.isDefending = true` |
| RESOLVE 阶段：`bossRound.isDefending = true` | 玩家本回合计算出的伤害值 × 0.5（取整）再扣 Boss HP |
| BOSS_ATTACK 阶段：`bossRound.willReleaseCharge = true` | 扣玩家 HP = `boss.chargeAttack`，护盾可拦截 |
| BOSS_ATTACK 阶段：intent = ATTACK，无蓄力 | 扣玩家 HP = `boss.attackPerRound`，护盾可拦截 |
| BOSS_ATTACK 阶段：intent = CHARGE 或 DEFEND | Boss 本回合不攻击，跳过扣血 |
| ROUND_END                               | `bossRound` 重置为默认值（intent='ATTACK', isDefending=false, willReleaseCharge=false） |
| BATTLE_WIN            | 写入 SavePoint，进入 UPGRADE 阶段                   |
| SELECT_UPGRADE        | 将 Upgrade 推入 player.buffs，进入下一层 BattleState |

---

## 8. PVP 预留接口

```typescript
// 当前 PVP 实现为 future feature
// 状态机设计上，将玩家行动抽象为 PlayerAction，
// PVP 模式只需将"等待对手"注入为一个额外 phase

type RoundPhaseExtended = RoundPhase | 'WAITING_OPPONENT'; // PVP 专用

interface PVPRoundState extends RoundState {
  opponentReady: boolean;
  opponentAction: PlayerAction | null;  // 异步轮流制下对手的行动结果
}
```

---

## 9. 状态持久化策略

```typescript
// 需要持久化（写入 SavePoint）：
// - GameState.player（HP、buffs、chosenElement）
// - GameState.deck / discardPile / hand
// - GameState.layer

// 不需要持久化（每回合/每层重建）：
// - RoundState（每回合重置）
// - BattleState.roundState（每回合重置）
// - skills.used 标志（每回合重置）

// 存档时机：BATTLE_WIN 事件触发后，进入 UPGRADE 阶段前
```
