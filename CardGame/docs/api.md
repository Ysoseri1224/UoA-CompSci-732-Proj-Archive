# REST API 接口文档

**Base URL**：`http://localhost:3000`  
**统一响应格式**：所有接口均返回以下结构

```json
{
  "success": true | false,
  "message": "描述信息",
  "data": { ... } | null
}
```

**认证方式**：需要登录的接口在请求头携带：
```
Authorization: Bearer <JWT Token>
```

---

## 认证模块 `/api/auth`

### 注册

```
POST /api/auth/register
```

**请求体**
```json
{
  "username": "player01",
  "email": "player01@example.com",
  "password": "mypassword123"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | String | ✅ | 3–20 字符，全局唯一 |
| email | String | ✅ | 合法邮箱格式，全局唯一 |
| password | String | ✅ | 最少 8 字符，bcrypt 加密存储 |

**成功响应** `201`
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "token": "<JWT>",
    "user": {
      "_id": "664a...",
      "username": "player01",
      "email": "player01@example.com",
      "avatar": "default",
      "createdAt": "2026-04-12T08:00:00Z"
    }
  }
}
```

**失败响应**
- `400` 字段校验失败
- `409` 用户名或邮箱已被注册

---

### 登录

```
POST /api/auth/login
```

**请求体**
```json
{
  "email": "player01@example.com",
  "password": "mypassword123"
}
```

**成功响应** `200`
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "token": "<JWT>",
    "user": {
      "_id": "664a...",
      "username": "player01",
      "avatar": "default"
    }
  }
}
```

**失败响应**
- `401` 邮箱或密码错误（统一提示，不区分）

---

### 刷新 Token

```
POST /api/auth/refresh
```

**请求体**
```json
{
  "refreshToken": "<Refresh Token>"
}
```

**成功响应** `200`
```json
{
  "success": true,
  "message": "Token 已刷新",
  "data": { "token": "<新 JWT>" }
}
```

---

### 登出

```
POST /api/auth/logout
```
🔒 **需要 JWT**

**成功响应** `200`
```json
{
  "success": true,
  "message": "已登出",
  "data": null
}
```

---

## 用户模块 `/api/users`

### 获取用户公开资料

```
GET /api/users/:userId
```

**成功响应** `200`
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "_id": "664a...",
    "username": "player01",
    "avatar": "default",
    "createdAt": "2026-04-12T08:00:00Z",
    "totalGames": 42,
    "totalWins": 20,
    "achievements": [
      { "achievementId": "first_game", "unlockedAt": "2026-04-12T09:00:00Z" }
    ]
  }
}
```

**失败响应**
- `404` 用户不存在

---

### 获取用户统计数据

```
GET /api/users/:userId/stats
```

**成功响应** `200`
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "totalGames": 42,
    "totalWins": 20,
    "winRate": 0.476,
    "avgDuration": 312,
    "topSkills": [
      { "skillName": "线索嗅探", "useCount": 38 },
      { "skillName": "翻倍协议", "useCount": 25 },
      { "skillName": "盾反", "useCount": 17 }
    ],
    "bestSkill": { "skillName": "盾反", "winRate": 0.65 }
  }
}
```

---

### 获取用户已解锁成就

```
GET /api/users/:userId/achievements
```

**成功响应** `200`
```json
{
  "success": true,
  "message": "OK",
  "data": [
    { "achievementId": "first_game", "unlockedAt": "2026-04-12T09:00:00Z" },
    { "achievementId": "win_streak_3", "unlockedAt": "2026-04-13T10:00:00Z" }
  ]
}
```

---

### 修改自己的资料

```
PUT /api/users/me
```
🔒 **需要 JWT**

**请求体**（字段均可选，至少提供一个）
```json
{
  "username": "newname",
  "avatar": "avatar_02"
}
```

**成功响应** `200`
```json
{
  "success": true,
  "message": "资料已更新",
  "data": {
    "_id": "664a...",
    "username": "newname",
    "avatar": "avatar_02"
  }
}
```

**失败响应**
- `409` 用户名已被占用

---

### 修改密码

```
PUT /api/users/me/password
```
🔒 **需要 JWT**

**请求体**
```json
{
  "oldPassword": "mypassword123",
  "newPassword": "newsecurepass456"
}
```

**成功响应** `200`
```json
{
  "success": true,
  "message": "密码已修改",
  "data": null
}
```

**失败响应**
- `401` 旧密码错误

---

## 战绩与统计 `/api/matches`

### 获取战绩列表

```
GET /api/matches?userId=<id>&page=1&limit=10
```

| 查询参数 | 类型 | 必填 | 说明 |
|---------|------|------|------|
| userId | String | ✅ | 要查询的用户 ID |
| page | Number | ❌ | 页码，默认 1 |
| limit | Number | ❌ | 每页条数，默认 10 |

**成功响应** `200`
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "matches": [
      {
        "_id": "665b...",
        "winner": { "_id": "664a...", "username": "player01" },
        "players": ["664a...", "664b..."],
        "rounds": 15,
        "duration": 342,
        "endedAt": "2026-04-12T10:30:00Z"
      }
    ],
    "total": 42,
    "page": 1,
    "totalPages": 5
  }
}
```

---

### 获取对局详情

```
GET /api/matches/:matchId
```

**成功响应** `200`
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "_id": "665b...",
    "winner": { "_id": "664a...", "username": "player01" },
    "players": [
      { "_id": "664a...", "username": "player01" },
      { "_id": "664b...", "username": "player02" }
    ],
    "rounds": 15,
    "duration": 342,
    "playerSkills": {
      "664a...": ["线索嗅探", "翻倍协议"],
      "664b...": ["盾反", "孤注一掷"]
    },
    "playerSkillUsage": {
      "664a...": { "线索嗅探": 3, "翻倍协议": 2 },
      "664b...": { "盾反": 1, "孤注一掷": 2 }
    },
    "finalChips": { "664a...": 2000, "664b...": 0 },
    "endedAt": "2026-04-12T10:30:00Z"
  }
}
```

**失败响应**
- `404` 对局不存在

---

### 获取对局回放

```
GET /api/matches/:matchId/replay
```
🔒 **需要 JWT（仅对局参与者）**

**成功响应** `200`
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "matchId": "665b...",
    "players": [
      { "userId": "664a...", "username": "player01", "skills": ["线索嗅探", "翻倍协议"] }
    ],
    "hands": [
      {
        "handNumber": 1,
        "holeCards": { "664a...": ["As", "Kh"], "664b...": ["2c", "7d"] },
        "communityCards": ["Qh", "Jd", "Ts", "9c", "8h"],
        "events": [
          { "timestamp": 1200, "type": "bet", "actor": "664a...", "data": { "action": "raise", "amount": 40 } }
        ],
        "result": {
          "winners": ["664a..."],
          "pot": 80,
          "handScores": { "664a...": 28.3, "664b...": 5.5 },
          "handRanks": { "664a...": "Straight", "664b...": "High Card" }
        }
      }
    ]
  }
}
```

**失败响应**
- `403` 非参与者无权查看
- `404` 回放不存在

---

### 获取排行榜

```
GET /api/leaderboard?sort=winRate&page=1&limit=20
```

| 查询参数 | 类型 | 说明 |
|---------|------|------|
| sort | String | `winRate`（默认）或 `totalWins` |
| page | Number | 页码，默认 1 |
| limit | Number | 每页条数，默认 20 |

**成功响应** `200`
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "rankings": [
      {
        "rank": 1,
        "userId": "664a...",
        "username": "player01",
        "avatar": "default",
        "winRate": 0.72,
        "totalWins": 36,
        "totalGames": 50
      }
    ],
    "total": 128,
    "page": 1
  }
}
```

> 注：最少参与 10 局才会出现在排行榜中。

---

## 成就模块 `/api/achievements`

### 获取全部成就定义

```
GET /api/achievements
```

**成功响应** `200`
```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "first_game",
      "name": "初出茅庐",
      "description": "完成第 1 局对局",
      "type": "progress"
    },
    {
      "id": "win_streak_3",
      "name": "连胜三场",
      "description": "连续赢得 3 局",
      "type": "progress"
    },
    {
      "id": "royal_flush_win",
      "name": "皇家加冕",
      "description": "用皇家同花顺赢得一局",
      "type": "single_game"
    }
  ]
}
```

---

## 通用错误码

| HTTP 状态码 | 含义 |
|------------|------|
| 400 | 请求参数错误 |
| 401 | 未认证或 Token 无效 |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 409 | 数据冲突（如用户名重复） |
| 500 | 服务端内部错误 |
