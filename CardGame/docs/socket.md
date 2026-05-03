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

### PvE（当前后端已接入的最小骨架）

#### `startPveGame`
创建一个 PvE 房间并启动 PvE 状态机（服务端内存态）。前端点击“Start PvE”按钮时直接发送此事件即可。

**发送**：无参数

**服务端响应**：`gameState`（见下方服务端 → 客户端 `gameState`，PvE 最小骨架版本）

---

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

## 服务端 → 客户端

### 游戏状态

#### `gameState`
**最核心的事件**。每次游戏状态变更后服务端广播全量状态，前端以此驱动所有渲染。

##### PvE（最小骨架版本，当前后端实现）
当前后端在 PvE 骨架阶段推送的 `gameState` payload 结构为：

```json
{
  "phase": "SKILL_SELECT",
  "gameState": {
    "room": { "roomId": "123456", "pot": 0, "currentBet": 0, "dealerSide": "player", "activeSide": "player" },
    "player": { "userId": null, "socketId": "abc", "health": 10, "holeCards": [] },
    "bot": { "health": 100, "holeCards": [] },
    "phase": "SKILL_SELECT",
    "lastError": null,
    "gameOver": null
  }
}
```

说明：
- `phase` 是 XState 的当前状态（也等价于 `gameState.phase`）。
- `gameState` 是 XState context（当前只包含最小字段，后续任务会逐步扩展）。

前端最小接入方式：
- 连接 socket 后监听 `gameState` 事件
- 点击按钮时 `socket.emit('startPveGame')`
- 以 `phase` 或 `gameState.phase` 驱动 UI（例如在 `SKILL_SELECT` 展示技能选择界面）

---

#### `gameOver`
对局结束事件。在 PvE 骨架阶段，当状态机进入 `GAME_OVER` 时服务端发送此事件，并清理对应的内存房间 actor。

**接收**
```json
{
  "reason": "PLAYER_DIED",
  "winner": "bot",
  "finalHealth": { "player": 0, "bot": 100 }
}
```
