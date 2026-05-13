# Socket.io Event Protocol Document

**Connection URL**: `http://localhost:3000`  
**Connection Timing**: establish the socket after the user logs in and enters the lobby; disconnect after the match ends  
**Authentication**: pass the JWT token in the `auth` option when connecting

```js
const socket = io('http://localhost:3000', {
  auth: { token: '<JWT Token>' }
});
```

---

## Client -> Server

### PvE (minimum backend skeleton currently wired up)

#### `startPveGame`
Create a PvE room and start the PvE state machine (server-side in-memory state). The frontend should send this event directly when the user clicks the "Start PvE" button.

**Send**: no parameters

**Server response**: `gameState` (see the server -> client `gameState` below, PvE minimum skeleton version)

---

#### `selectSkills`
Confirm the skill selection (after entering the room, before dealing cards).

**Send**
```json
{ "skills": ["Clue Sniff", "Double Up"] }
```

> Exactly 2 skills must be selected from the skill pool.

---

#### `playerAction`
Execute a betting action.

**Send**
```json
{
  "action": "raise",
  "amount": 40
}
```

| action value | Description | Is amount required |
|-----------|------|-----------------|
| `check` | Check | No |
| `bet` | Bet | Yes |
| `call` | Call | No |
| `raise` | Raise | Yes |
| `fold` | Fold | No |
| `allin` | All in | No |

---

## Server -> Client

### Game State

#### `gameState`
**The most important event.** After each game state change, the server broadcasts the full state, and the frontend uses it to drive all rendering.

##### PvE (minimum skeleton version, current backend implementation)
The `gameState` payload structure currently pushed by the backend in the PvE skeleton stage is:

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

Notes:
- `phase` is the current XState state (equivalent to `gameState.phase`).
- `gameState` is the XState context (currently only the minimum fields are included; later tasks will expand it step by step).

Minimum frontend integration:
- Listen for the `gameState` event after connecting the socket
- Emit `socket.emit('startPveGame')` when the button is clicked
- Drive the UI with `phase` or `gameState.phase` (for example, show the skill-selection UI during `SKILL_SELECT`)

---

#### `gameOver`
Match end event. In the PvE skeleton stage, when the state machine enters `GAME_OVER`, the server sends this event and clears the corresponding in-memory room actor.

**Receive**
```json
{
  "reason": "PLAYER_DIED",
  "winner": "bot",
  "finalHealth": { "player": 0, "bot": 100 }
}
```
