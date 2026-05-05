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
  savepoint: SavePoint | null;      // 最近存档点
}

// 存档点（每层结束后写入）
interface SavePoint {
  layer: number;
  timestamp: number;
  gameState: Omit<GameState, 'savepoint'>;
}
```

---

## 3. BattleState — 单层 Boss 战

```typescript
interface BattleState {
  boss: {
    hp: number;
    maxHp: number;
    attackPerRound: number;         // 本层固定攻击值
    element: Element;               // 属性（未来相克用）
  };
  round: number;                    // 当前回合数（从 1 开始）
  roundState: RoundState;           // 当前回合子状态
  result: 'ONGOING' | 'WIN' | 'LOSE';
}
```

---

## 4. RoundState — 单回合状态机

### 4.1 状态枚举

```typescript
type RoundPhase =
  | 'DRAW'          // 补牌阶段（自动）
  | 'SKILL'         // 技能阶段（玩家操作）
  | 'SHUFFLE'       // Shuffle 阶段（玩家操作，可与 SKILL 交替）
  | 'PLAY'          // 出牌阶段（玩家选牌 → 打出）
  | 'RESOLVE'       // 结算阶段（计算伤害，自动）
  | 'BOSS_ATTACK'   // Boss 攻击阶段（自动）
  | 'ROUND_END';    // 回合结束（触发下一回合 or 胜负判定）
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
{ type: 'RESOLVE_COMPLETE'        }              // 伤害结算完成
{ type: 'BOSS_ATTACK_COMPLETE'    }              // Boss 攻击完成
{ type: 'ROUND_END_CONFIRM'       }              // 进入下一回合

// ── 胜负事件 ─────────────────────────────
{ type: 'BATTLE_WIN'    }
{ type: 'BATTLE_LOSE'   }

// ── Roguelike 事件 ────────────────────────
{ type: 'SELECT_UPGRADE'; upgrade: Upgrade }     // 选择强化选项
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
