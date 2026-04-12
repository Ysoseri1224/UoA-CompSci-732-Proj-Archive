# Socket.io 事件协议文档

**连接地址**：`http://localhost:3000`  
**连接时机**：用户登录后进入大厅时建立连接，对局结束后断开  
**认证**：连接时在 `auth` 选项中携带 JWT Token

```js
const socket = io('http://localhost:3000', {
  auth: { token: '<JWT Token>' }
});
```

---

## 客户端 → 服务端

### 房间管理

#### `createRoom`
创建新房间。

**发送**：无参数

**服务端响应**：`roomCreated`

---

#### `joinRoom`
通过房间码加入房间。

**发送**
```json
{ "roomId": "ABC123" }
```

**服务端响应**：`roomJoined` 或 `error`

---

#### `cancelMatch`
取消快速匹配排队。

**发送**：无参数

---

### 游戏流程

#### `selectSkills`
确认技能选择（进入房间后、发牌前）。

**发送**
```json
{ "skills": ["线索嗅探", "翻倍协议"] }
```

> 必须从技能池中选择恰好 2 个技能。

---

#### `playerAction`
执行下注操作。

**发送**
```json
{
  "action": "raise",
  "amount": 40
}
```

| action 值 | 说明 | amount 是否必填 |
|-----------|------|-----------------|
| `check` | 过牌 | ❌ |
| `bet` | 下注 | ✅ |
| `call` | 跟注 | ❌ |
| `raise` | 加注 | ✅ |
| `fold` | 弃牌 | ❌ |
| `allin` | 全押 | ❌ |

---

#### `useSkill`
使用技能。

**发送**
```json
{
  "skillName": "线索嗅探",
  "targetUserId": "664b...",
  "targetCardIndex": null
}
```

| 字段 | 说明 |
|------|------|
| skillName | 技能名称 |
| targetUserId | 目标玩家 ID（多人局中需指定；孤注一掷/信息封锁无需此字段） |
| targetCardIndex | 仅精准换牌需要，值为 `0` 或 `1`，指定换哪张底牌 |

---

#### `respondToDouble`
响应翻倍协议提案（5 秒内）。

**发送**
```json
{ "accept": true }
```

---

#### `respondToShield`
响应盾反确认弹窗（5 秒内）。

**发送**
```json
{ "activate": true }
```

---

#### `reconnectGame`
断线后重连恢复对局。

**发送**
```json
{ "roomId": "ABC123" }
```

**服务端响应**：`reconnectState`

---

## 服务端 → 客户端

### 房间管理

#### `roomCreated`
房间创建成功。

**接收**
```json
{ "roomId": "ABC123" }
```

---

#### `roomJoined`
加入房间成功，包含当前房间内所有玩家信息。

**接收**
```json
{
  "roomId": "ABC123",
  "players": [
    { "userId": "664a...", "username": "player01", "avatar": "default" },
    { "userId": "664b...", "username": "player02", "avatar": "default" }
  ]
}
```

---

#### `matchFound`
快速匹配成功。

**接收**
```json
{ "roomId": "ABC123" }
```

---

### 游戏状态

#### `gameState`
**最核心的事件**。每次游戏状态变更后服务端广播全量状态，前端以此驱动所有渲染。

**接收**
```json
{
  "roomId": "ABC123",
  "phase": "flop",
  "pot": 80,
  "currentBet": 40,
  "communityCards": ["Ah", "Kd", "Qs"],
  "skillWindowOpen": false,
  "players": [
    {
      "userId": "664a...",
      "username": "player01",
      "chips": 960,
      "energy": 5,
      "selectedSkills": ["线索嗅探", "翻倍协议"],
      "usedSkillsThisHand": [],
      "currentBet": 40,
      "folded": false,
      "eliminated": false,
      "holeCards": ["As", "Kh"]
    },
    {
      "userId": "664b...",
      "username": "player02",
      "chips": 960,
      "energy": 8,
      "selectedSkills": ["盾反", "孤注一掷"],
      "usedSkillsThisHand": [],
      "currentBet": 40,
      "folded": false,
      "eliminated": false,
      "holeCards": ["??", "??"]
    }
  ]
}
```

> **注意**：`holeCards` 中，自己的底牌为真实值，其他玩家的底牌为 `["??", "??"]`，服务端在推送前过滤。

| phase 值 | 说明 |
|----------|------|
| `skill-select` | 技能选择阶段 |
| `deal` | 已发牌，技能窗口 A 开放 |
| `preflop` | Pre-Flop 下注 |
| `flop` | 翻牌，技能窗口 B 开放 |
| `flop-betting` | Flop 下注 |
| `turn` | 转牌，技能窗口 C 开放 |
| `turn-betting` | Turn 下注 |
| `river` | 河牌，技能窗口 D 开放 |
| `river-betting` | River 下注 |
| `showdown` | 摊牌结算 |
| `ended` | 对局结束 |

---

#### `peekResult`
线索嗅探结果，**仅发送给使用技能的玩家**（定向推送，不广播）。

**接收**
```json
{ "card": "As", "targetUserId": "664b..." }
```

---

#### `skillNotify`
技能操作通知，广播给房间内所有玩家（不含保密信息）。

**接收**
```json
{
  "skillName": "孤注一掷",
  "actor": "664a...",
  "message": "player01 更换了一张底牌"
}
```

---

#### `shieldPrompt`
提示盾反持有者是否反弹（5 秒倒计时），**仅发给盾反持有者**。

**接收**
```json
{
  "skillName": "线索嗅探",
  "actorName": "player02",
  "timeoutMs": 5000
}
```

---

#### `doublePrompt`
翻倍协议提案，**仅发给被提案方**。

**接收**
```json
{
  "proposerName": "player01",
  "timeoutMs": 5000
}
```

---

#### `achievementUnlocked`
成就解锁通知，**仅发给解锁成就的玩家**。

**接收**
```json
{
  "achievement": {
    "id": "first_game",
    "name": "初出茅庐",
    "description": "完成第 1 局对局"
  }
}
```

---

#### `gameOver`
对局结束。

**接收**
```json
{
  "winner": { "userId": "664a...", "username": "player01" },
  "players": [
    { "userId": "664a...", "finalChips": 2000 },
    { "userId": "664b...", "finalChips": 0 }
  ],
  "matchId": "665b..."
}
```

> `matchId` 用于前端跳转到回放页面 `/match/:matchId/replay`

---

#### `reconnectState`
断线重连后推送的完整状态（含事件日志）。

**接收**
```json
{
  "roomState": { "...完整 gameState 结构..." },
  "eventLog": [
    "[10:23:01] 你下注了 40 筹码",
    "[10:23:05] player02 跟注"
  ]
}
```

---

#### `error`
错误通知。

**接收**
```json
{
  "code": "ROOM_NOT_FOUND",
  "message": "房间不存在或已失效"
}
```

| code 值 | 说明 |
|---------|------|
| `ROOM_NOT_FOUND` | 房间不存在 |
| `ROOM_FULL` | 房间已满 |
| `GAME_ALREADY_STARTED` | 对局已开始，无法加入 |
| `INVALID_ACTION` | 当前阶段不允许此操作 |
| `INSUFFICIENT_ENERGY` | 能量不足，无法使用技能 |
| `SKILL_ALREADY_USED` | 本手牌该技能已使用过 |
| `UNAUTHORIZED` | Token 无效或未携带 |
