# PvE 模块需求规格（技能德州扑克）

**版本**：v1.0  
**日期**：2026-04-28  
**阶段**：当前开发目标（PvP 为 Future Feature）  
**参考**：requirement.md v2.0 + 游戏逻辑状态图.drawio + 团队讨论确认

---

## 1. 概述

PvE 模块实现**真人玩家 vs 服务端 AI Bot** 的完整对战。

对战规则与 requirement.md 中描述的多人德州扑克完全一致，唯一区别是：**对手不是另一个真人 socket 连接，而是服务端内置的 AI Bot**。Bot 的行动由服务端直接触发，不经过 socket，对玩家透明（前端表现与真人对手完全相同）。

**设计动机：**
- 玩家无需等待匹配即可立即开始游戏
- 为 PvP 阶段积累完整的游戏状态机、技能系统实现
- AI Bot 接入外部 AI API 作为 Future Feature 预留扩展点

---

## 2. 游戏流程（与 requirement.md §6 一致）

每手牌按以下顺序执行：

| 阶段 | 操作 | 技能窗口 |
|------|------|----------|
| **发牌** | 双方各得 2 张底牌；能量重置为 8；收取盲注 | 窗口 A（3 秒）：线索嗅探、信息封锁 |
| **Pre-Flop 下注** | 标准下注流程；庄家先行动 | 翻倍协议（独立触发） |
| **Flop** | 翻开 3 张公共牌 | 窗口 B（4 秒）：孤注一掷、精准换牌、线索嗅探、信息封锁 |
| **Flop 下注** | 标准下注流程 | 翻倍协议 |
| **Turn** | 翻开第 4 张公共牌 | 窗口 C（4 秒）：线索嗅探、信息封锁 |
| **Turn 下注** | 标准下注流程 | 翻倍协议 |
| **River** | 翻开第 5 张公共牌 | 窗口 D（4 秒）：线索嗅探、信息封锁 |
| **River 下注** | 标准下注流程 | 翻倍协议 |
| **摊牌 & 结算** | pokersolver 7选5 比牌型；筹码结算；写入战绩 | — |

- 庄家每手牌轮换；初始由服务端随机决定
- 玩家每次行动限时 **15 秒**，超时自动 fold（有注）或 check（无注）
- 技能窗口超时视为跳过（不使用技能）

---

## 3. 下注系统（与 requirement.md §7 一致）

| 操作 | 说明 |
|------|------|
| Check | 当前无人下注时过牌 |
| Bet | 最低为大盲注（20）；通过滑块或输入框设定金额 |
| Call | 跟随当前最高注额 |
| Raise | 加注金额 ≥ 当前最高注额的 2 倍 |
| Fold | 放弃本手牌，对手赢得底池 |
| All-in | 押上全部剩余筹码 |

- 小盲注：10；大盲注：20（固定）
- 初始筹码：玩家 1000，Bot 1000
- 筹码归零即淘汰，最后存活者获胜

---

## 4. 技能系统（与 requirement.md §10 一致）

### 4.1 技能池（6 个）

| 技能名 | 类型 | 能量 | 效果 |
|--------|------|------|------|
| 线索嗅探 | 主动 | 3 | 查看对手一张随机底牌（仅自己可见） |
| 孤注一掷 | 主动 | 2 | 随机替换自己一张底牌 |
| 翻倍协议 | 主动 | 3 | 发起底池翻倍提案；对手 5 秒响应，拒绝/超时则对手损失 1 点能量 |
| 盾反 | 响应 | 2 | 免疫并反弹线索嗅探/孤注一掷/精准换牌（5 秒内响应） |
| 精准换牌 | 主动 | 4 | 指定替换自己一张底牌 |
| 信息封锁 | 主动 | 3 | 本手内免疫对手线索嗅探和精准换牌 |

### 4.2 能量系统

- 每手牌开始重置为 **8 点**
- 平局时双方各 +2 点（不超过上限 8，重置前结算）
- 能量不足时对应技能不可用
- 能量不跨手积累

### 4.3 技能选择

- 游戏开始前（房间进入后），玩家从 6 个技能中选择 **2 个**
- 限时 30 秒，超时随机分配
- Bot 同样拥有 2 个随机选择的技能（选择结果对玩家可见）

---

## 5. AI Bot 设计

### 5.1 定位

中等复杂度规则型 Bot，**不接入外部 AI API**（作为 Future Feature 预留）。基于当前牌面强度和筹码状态做概率性决策，行为有一定可预测性但不完全随机。

### 5.2 下注决策逻辑

Bot 在轮到自己行动时，通过 pokersolver 评估当前最优 5 张牌的强度，映射到以下行动概率：

| 手牌强度等级 | 判定范围 | 行动倾向 |
|-------------|---------|---------|
| 强（High Card 以上，三条及以上） | rank ≥ Three of a Kind | 70% raise / 25% call / 5% fold |
| 中（对子、二对） | Pair / Two Pair | 20% raise / 60% call / 20% fold |
| 弱（散牌） | High Card | 10% bet/call / 90% check/fold |

- Pre-Flop 阶段（无公共牌）：基于底牌点数估算强度（A/K 高牌视为中等，对子视为强）
- All-in：仅在筹码 < 大盲注 2 倍时触发
- Raise 金额：随机取当前最高注额的 2~3 倍

### 5.3 技能使用逻辑

Bot 在技能窗口期内按以下规则决策：

| 技能 | 使用条件 |
|------|---------|
| 线索嗅探 | 窗口 A/B 各 50% 概率使用（能量充足时） |
| 孤注一掷 | 手牌弱时 60% 概率使用；强时不用 |
| 翻倍协议 | 手牌强时 40% 概率发起 |
| 盾反 | 玩家使用技能后 40% 概率反弹 |
| 精准换牌 | 手牌弱时 50% 概率使用 |
| 信息封锁 | 每局首次技能窗口 30% 概率使用 |

- Bot 行动延迟：模拟思考时间，随机 **500ms ~ 1500ms** 后执行
- Bot 不会同一手牌超出能量限制

### 5.4 扩展点

服务端 Bot 逻辑封装为独立模块 `src/logic/bot.js`，对外暴露：
- `botBettingAction(gameState)` → 返回行动指令
- `botSkillAction(gameState, window)` → 返回技能指令或 null

Future Feature：替换为调用外部 AI API（如 GPT）的实现，接口不变。

---

## 6. 游戏状态机

服务端维护每个 Room 对象，包含以下状态：

```
WAITING → SKILL_SELECT → DEALING → SKILL_WINDOW_A
→ PRE_FLOP_BETTING → FLOP → SKILL_WINDOW_B
→ FLOP_BETTING → TURN → SKILL_WINDOW_C
→ TURN_BETTING → RIVER → SKILL_WINDOW_D
→ RIVER_BETTING → SHOWDOWN → (next hand or GAME_OVER)
```

Room 对象关键字段：

```js
{
  roomId,           // 6位唯一房间码
  player: {         // 真人玩家
    userId, socketId, chips, holeCards, energy,
    selectedSkills, usedSkills, infoBlocked
  },
  bot: {            // AI Bot
    chips, holeCards, energy,
    selectedSkills, usedSkills, infoBlocked
  },
  deck,             // 剩余牌堆
  communityCards,   // 公共牌
  pot,              // 底池
  currentBet,       // 当前最高注额
  dealerSide,       // 'player' | 'bot'
  phase,            // 当前阶段
  replayBuffer,     // 回放事件缓冲
  timers            // 超时定时器句柄
}
```

---

## 7. Socket.io 事件（PvE 相关）

### 客户端 → 服务端

| 事件 | 参数 | 说明 |
|------|------|------|
| `startPveGame` | — | 创建 PvE 房间并立即开始 |
| `selectSkills` | `{ skills: [s1, s2] }` | 玩家确认技能选择 |
| `playerAction` | `{ action, amount? }` | 下注操作 |
| `useSkill` | `{ skillName, targetCardIndex? }` | 使用技能 |
| `respondDoubleProtocol` | `{ accept: bool }` | 响应翻倍协议 |
| `respondShield` | `{ activate: bool }` | 响应盾反确认 |

### 服务端 → 客户端

| 事件 | 说明 |
|------|------|
| `gameState` | 全量游戏状态广播（每次状态变更后推送） |
| `skillWindowOpen` | 技能窗口开启，含窗口标识和剩余秒数 |
| `skillWindowClose` | 技能窗口关闭 |
| `skillResult` | 技能执行结果（定向推送给使用方） |
| `skillNotify` | 技能发生通知（广播给双方，不含具体内容） |
| `doubleProtocolRequest` | Bot 发起翻倍协议，含 5 秒倒计时 |
| `shieldPrompt` | 盾反确认弹窗，含 5 秒倒计时 |
| `eventLog` | 事件日志条目 `{ timestamp, message }` |
| `handResult` | 本手牌结算结果 |
| `gameOver` | 对局结束，含胜负和最终筹码 |
| `achievementUnlocked` | 成就解锁通知 |

---

## 8. 数据持久化

### 8.1 对局结束写入（Match 集合）

```js
{
  winnerId,         // 'player' userId 或 'bot'
  loserId,
  playerUserId,
  duration,         // 秒
  handsPlayed,
  playerSkillsUsed, // { skillName: count }
  botSkillsUsed,
  endedAt,
  finalChips: { player, bot }
}
```

### 8.2 回放数据（MatchReplay 集合）

每手牌记录：发牌结果、所有下注操作、所有技能事件、摊牌结果。  
最多保留最近 **50 场**，按 `endedAt` 排序，超出自动删除最旧记录。

### 8.3 用户统计更新

对局结束后更新 `User.stats`：
- `totalGames += 1`
- `totalWins += 1`（胜利时）

---

## 9. 成就检查（与 requirement.md §14 一致）

对局结束后服务端检查全部成就触发条件，满足则写入并通过 `achievementUnlocked` 推送前端。

---

## 10. 遗留代码处理

以下文件为早期原型遗留，与当前 PvE 需求不对齐，**不再维护，后续可安全删除**：

| 文件 | 原设计 | 状态 |
|------|--------|------|
| `src/models/Run.js` | Balatro 风格 Run 数据模型 | 废弃 |
| `src/models/Card.js` | Balatro 卡牌增强/蜡封/版本 | 废弃 |
| `src/logic/scoring.js` | Balatro chips×mult 计分管线 | 废弃 |
| `游戏逻辑状态图.drawio` | 炉石传说风格回合制状态图 | 仅供历史参考 |

`src/logic/evaluator.js` **保留并复用**（pokersolver 封装，与当前需求完全匹配）。

---

## 11. 实现优先级

| 优先级 | 模块 |
|--------|------|
| P0 | 服务端游戏状态机 + Room 管理 |
| P0 | Socket.io 游戏事件处理（发牌、下注、摊牌） |
| P0 | AI Bot 下注决策（`bot.js`） |
| P1 | 技能系统事件处理 |
| P1 | AI Bot 技能决策 |
| P1 | 前端 GamePage UI（GameBoard + BettingControls + SkillPanel + EventLog） |
| P1 | 前端 LoginPage / RegisterPage（接入已有 API） |
| P1 | 前端 LobbyPage（startPveGame 入口） |
| P2 | Match / MatchReplay MongoDB Model + 写入逻辑 |
| P2 | 成就检查逻辑 |
| P2 | ProfilePage / LeaderboardPage UI |
| P2 | ReplayPage UI |
| P3 | 断线重连（30 秒保留状态） |
