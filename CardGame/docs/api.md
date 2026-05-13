# Backend API Documentation

This document describes the API that is currently implemented in `backend/src/`.
It is based on the actual route handlers, middleware, models, and API tests in the repository.

## Base URL

- Local development: `http://localhost:3000`

## Response Format

All API endpoints return the same envelope:

```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

Error responses use the same shape:

```json
{
  "success": false,
  "message": "Error message",
  "data": null
}
```

## Authentication

Protected endpoints require:

```http
Authorization: Bearer <JWT>
```

If the header is missing:

```json
{
  "success": false,
  "message": "Authentication token is required",
  "data": null
}
```

If the token is invalid or expired:

```json
{
  "success": false,
  "message": "Invalid or expired token",
  "data": null
}
```

## Rate Limiting

`POST /api/auth/register` and `POST /api/auth/login` are rate-limited.

- Default window: 15 minutes
- Default max: 10 requests per IP
- Configurable with:
  - `RATE_LIMIT_WINDOW_MS`
  - `RATE_LIMIT_MAX`

Rate-limit response:

```json
{
  "success": false,
  "message": "Too many requests, please try again later",
  "data": null
}
```

---

## Health Endpoints

### `GET /`

Backend health check.

**Response** `200`

```json
{
  "success": true,
  "message": "Backend API is running",
  "data": null
}
```

### `GET /api`

Simple API root endpoint.

**Response** `200`

Plain text:

```text
Backend API is running
```

---

## Leaderboard

### `GET /api/leaderboard`

Returns the global leaderboard. Only users with at least `10` total games are included.

#### Query Parameters

| Field | Type | Required | Description |
|------|------|------|------|
| `sort` | `string` | No | `winRate` or `totalWins`. Default: `winRate` |
| `page` | `number` | No | Page number. Default: `1` |
| `limit` | `number` | No | Page size. Default: `20` |

#### Success Response

**Response** `200`

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "rankings": [
      {
        "rank": 1,
        "userId": "664a00000000000000000001",
        "username": "player01",
        "avatar": "default",
        "winRate": 0.8,
        "totalWins": 40,
        "totalGames": 50
      }
    ],
    "total": 128,
    "page": 1
  }
}
```

#### Failure Responses

- `400` invalid `sort` value

Example:

```json
{
  "success": false,
  "message": "Invalid sort parameter",
  "data": null
}
```

---

## Auth Module

Base path: `/api/auth`

### `POST /api/auth/register`

Register a new user.

#### Request Body

```json
{
  "username": "player01",
  "email": "player01@example.com",
  "password": "mypassword123"
}
```

#### Validation Rules

| Field | Type | Required | Description |
|------|------|------|------|
| `username` | `string` | Yes | 3-20 characters |
| `email` | `string` | Yes | Must be a valid email |
| `password` | `string` | Yes | Minimum 8 characters |

#### Success Response

**Response** `201`

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "accessToken": "<JWT>",
    "user": {
      "id": "664a00000000000000000001",
      "username": "player01",
      "email": "player01@example.com",
      "createdAt": "2026-05-13T08:00:00.000Z"
    }
  }
}
```

#### Failure Responses

- `400` validation failed
- `409` username or email already exists

Examples:

```json
{
  "success": false,
  "message": "Username must be between 3 and 20 characters",
  "data": null
}
```

```json
{
  "success": false,
  "message": "Username is already taken",
  "data": null
}
```

```json
{
  "success": false,
  "message": "Email is already taken",
  "data": null
}
```

### `POST /api/auth/login`

Authenticate a user.

#### Request Body

```json
{
  "email": "player01@example.com",
  "password": "mypassword123"
}
```

#### Success Response

**Response** `200`

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "<JWT>",
    "user": {
      "id": "664a00000000000000000001",
      "username": "player01",
      "email": "player01@example.com",
      "createdAt": "2026-05-13T08:00:00.000Z"
    }
  }
}
```

#### Failure Responses

- `400` validation failed
- `401` invalid credentials

Example:

```json
{
  "success": false,
  "message": "Invalid email or password",
  "data": null
}
```

#### Current Implementation Note

The backend generates a refresh token internally and stores it in Redis, but the current `login` response does **not** return `refreshToken` to the client.

### `POST /api/auth/refresh`

Exchange a valid refresh token for a new access token.

#### Request Body

```json
{
  "refreshToken": "<refresh-token>"
}
```

#### Success Response

**Response** `200`

```json
{
  "success": true,
  "message": "Token refreshed",
  "data": {
    "accessToken": "<new-jwt>"
  }
}
```

#### Failure Responses

- `401` missing refresh token
- `401` invalid or expired refresh token
- `401` revoked refresh token

Examples:

```json
{
  "success": false,
  "message": "Refresh token is required",
  "data": null
}
```

```json
{
  "success": false,
  "message": "Invalid or expired refresh token",
  "data": null
}
```

```json
{
  "success": false,
  "message": "Refresh token has been revoked, please log in again",
  "data": null
}
```

### `POST /api/auth/logout`

Protected endpoint. Logs out the current user. If a `refreshToken` is present in the request body, that refresh token is revoked from Redis.

#### Request Body

```json
{
  "refreshToken": "<refresh-token>"
}
```

`refreshToken` is optional in the current implementation.

#### Success Response

**Response** `200`

```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

---

## User Module

Base path: `/api/users`

### `GET /api/users/:userId`

Returns the public profile for a user.

#### Success Response

**Response** `200`

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "username": "player01",
    "avatar": "default",
    "createdAt": "2026-05-13T08:00:00.000Z",
    "totalGames": 42,
    "totalWins": 20,
    "achievements": [
      {
        "achievementId": "first_win",
        "unlockedAt": "2026-05-13T10:00:00.000Z"
      }
    ]
  }
}
```

#### Failure Responses

- `400` invalid MongoDB `userId`
- `404` user not found

### `GET /api/users/:userId/stats`

Returns currently implemented user statistics.

#### Success Response

**Response** `200`

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "totalGames": 42,
    "totalWins": 20,
    "winRate": 0.4762
  }
}
```

#### Current Implementation Note

Although some older frontend comments mention `avgDuration`, `topSkills`, and `bestSkill`, the current backend only returns:

- `totalGames`
- `totalWins`
- `winRate`

#### Failure Responses

- `400` invalid MongoDB `userId`
- `404` user not found

### `GET /api/users/:userId/achievements`

This endpoint exists but is not implemented yet.

#### Response

**Response** `501`

```json
{
  "success": false,
  "message": "Not implemented",
  "data": null
}
```

### `PUT /api/users/me`

Protected endpoint. Updates the current user's profile.

#### Request Body

```json
{
  "username": "newname",
  "avatar": "avatar_02"
}
```

All fields are optional. Only provided fields are updated.

#### Success Response

**Response** `200`

```json
{
  "success": true,
  "message": "Profile updated",
  "data": {
    "_id": "664a00000000000000000001",
    "username": "newname",
    "avatar": "avatar_02"
  }
}
```

#### Failure Responses

- `401` not authenticated
- `404` user not found
- `409` username already taken

### `PUT /api/users/me/password`

Protected endpoint. Changes the current user's password.

#### Request Body

```json
{
  "oldPassword": "mypassword123",
  "newPassword": "newsecurepass456"
}
```

#### Validation Rules

| Field | Type | Required | Description |
|------|------|------|------|
| `oldPassword` | `string` | Yes | Must not be empty |
| `newPassword` | `string` | Yes | Minimum 8 characters |

#### Success Response

**Response** `200`

```json
{
  "success": true,
  "message": "Password changed",
  "data": null
}
```

#### Failure Responses

- `400` validation failed
- `401` not authenticated
- `401` old password incorrect
- `404` user not found

---

## Match Module

Base path: `/api/matches`

### Match Document Shape

The current match model stores PvE-oriented fields:

```json
{
  "_id": "665b00000000000000000001",
  "matchType": "PVE",
  "userId": "664a00000000000000000001",
  "bossId": "boss_layer_3",
  "layer": 3,
  "isWin": true,
  "chosenElement": "FIRE",
  "totalDamageDealt": 420,
  "roundsPlayed": 6,
  "endedAt": "2026-05-13T10:30:00.000Z",
  "createdAt": "2026-05-13T10:30:00.000Z",
  "updatedAt": "2026-05-13T10:30:00.000Z"
}
```

### `GET /api/matches`

Returns paginated match history.

#### Query Parameters

| Field | Type | Required | Description |
|------|------|------|------|
| `userId` | `string` | No | If valid, filters by `Match.userId` |
| `page` | `number` | No | Default `1` |
| `limit` | `number` | No | Default `10`, max `50` |

#### Success Response

**Response** `200`

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "matches": [
      {
        "_id": "665b00000000000000000001",
        "matchType": "PVE",
        "userId": "664a00000000000000000001",
        "bossId": "boss_layer_3",
        "layer": 3,
        "isWin": true,
        "chosenElement": "FIRE",
        "totalDamageDealt": 420,
        "roundsPlayed": 6,
        "endedAt": "2026-05-13T10:30:00.000Z",
        "createdAt": "2026-05-13T10:30:00.000Z",
        "updatedAt": "2026-05-13T10:30:00.000Z"
      }
    ],
    "total": 42,
    "page": 1,
    "totalPages": 5
  }
}
```

### `GET /api/matches/:matchId`

Returns one match document.

#### Success Response

**Response** `200`

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "match": {
      "_id": "665b00000000000000000001",
      "matchType": "PVE",
      "userId": "664a00000000000000000001",
      "bossId": "boss_layer_3",
      "layer": 3,
      "isWin": true,
      "chosenElement": "FIRE",
      "totalDamageDealt": 420,
      "roundsPlayed": 6,
      "endedAt": "2026-05-13T10:30:00.000Z",
      "createdAt": "2026-05-13T10:30:00.000Z",
      "updatedAt": "2026-05-13T10:30:00.000Z"
    }
  }
}
```

#### Failure Responses

- `404` match not found

### `GET /api/matches/:matchId/replay`

Protected endpoint. Returns replay data for one match.

#### Success Response

**Response** `200`

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "replay": {
      "_id": "665c00000000000000000001",
      "matchId": "665b00000000000000000001",
      "turns": [
        {
          "turnNumber": 1,
          "initialHand": ["FIRE_1", "FIRE_13"],
          "events": [
            {
              "timestamp": 1200,
              "type": "PLAY_CONFIRM",
              "actor": "player",
              "data": {
                "selected": ["FIRE_1", "FIRE_13"]
              }
            }
          ],
          "result": {
            "handType": "PAIR",
            "baseScore": 10,
            "multiplier": 2,
            "totalDamage": 32,
            "chips": 6
          }
        }
      ],
      "createdAt": "2026-05-13T10:31:00.000Z",
      "updatedAt": "2026-05-13T10:31:00.000Z"
    }
  }
}
```

#### Failure Responses

- `401` missing or invalid JWT
- `404` replay not found

#### Current Implementation Note

The route comment says replay access is for match participants, but the current server implementation only checks JWT validity. It does **not** currently verify participant ownership.

---

## Achievement Module

Base path: `/api/achievements`

### `GET /api/achievements`

Returns all achievement definitions.

#### Success Response

**Response** `200`

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "_id": "666d00000000000000000001",
      "achievementId": "first_win",
      "name": "First Win",
      "description": "Win your first run",
      "icon": "default",
      "conditionType": "totalWins",
      "conditionValue": 1,
      "createdAt": "2026-05-13T11:00:00.000Z",
      "updatedAt": "2026-05-13T11:00:00.000Z"
    }
  ]
}
```

#### `conditionType` Enum

- `totalWins`
- `maxLayer`
- `maxDamage`
- `totalGames`

---

## Rogue Module

Base path: `/api/rogue`

### Public Endpoint

### `GET /api/rogue/upgrades`

Returns upgrade options for a given layer.

#### Query Parameters

| Field | Type | Required | Description |
|------|------|------|------|
| `layer` | `number` | No | Defaults to `1` |
| `element` | `string` | No | `WATER`, `FIRE`, or `GRASS` |
| `excludeTypes` | `string` | No | Comma-separated buff type list to exclude |

#### Success Response

**Response** `200`

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "fire_spec",
      "label": "Fire Spec",
      "description": "Fire cards chip ×1.1",
      "buff": {
        "type": "ELEMENT_CHIP_MULT",
        "element": "FIRE",
        "mult": 1.1
      }
    }
  ]
}
```

### Protected Endpoints

All endpoints below require JWT.

### `POST /api/rogue/start`

Starts a new rogue run and clears any previous save for the user.

#### Success Response

**Response** `201`

```json
{
  "success": true,
  "message": "Rogue run started",
  "data": {
    "_id": "667000000000000000000001",
    "userId": "664a00000000000000000001",
    "roomId": "rogue",
    "snapshot": {
      "layer": 1,
      "playerHp": 20,
      "playerMaxHp": 20,
      "bossHp": 543,
      "enhancements": [],
      "status": "active",
      "startedAt": "2026-05-13T12:00:00.000Z"
    },
    "layer": 1,
    "createdAt": "2026-05-13T12:00:00.000Z",
    "updatedAt": "2026-05-13T12:00:00.000Z"
  }
}
```

### `GET /api/rogue/current`

Returns the current active rogue save.

#### Success Response

**Response** `200`

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "_id": "667000000000000000000001",
    "userId": "664a00000000000000000001",
    "roomId": "rogue",
    "snapshot": {
      "layer": 2,
      "playerHp": 30,
      "playerMaxHp": 30,
      "bossHp": 570,
      "enhancements": [],
      "status": "active"
    },
    "layer": 2,
    "createdAt": "2026-05-13T12:00:00.000Z",
    "updatedAt": "2026-05-13T12:10:00.000Z"
  }
}
```

#### Failure Responses

- `404` no active rogue run found

### `PUT /api/rogue/save`

Saves rogue progress.

#### Request Body

```json
{
  "layer": 2,
  "playerHp": 18,
  "bossHp": 140,
  "enhancements": [],
  "stats": {
    "roundsPlayed": 3
  }
}
```

#### Validation

- `layer` must be a number >= 1
- `playerHp` must be a number >= 0
- `bossHp` must be a number >= 0
- `enhancements`, if present, must be an array

#### Success Response

**Response** `200`

```json
{
  "success": true,
  "message": "Saved",
  "data": {
    "_id": "667000000000000000000001",
    "userId": "664a00000000000000000001",
    "roomId": "rogue",
    "snapshot": {
      "layer": 2,
      "playerHp": 18,
      "bossHp": 140,
      "enhancements": [],
      "stats": {
        "roundsPlayed": 3
      },
      "roguePhase": "BATTLE",
      "savedAt": "2026-05-13T12:10:00.000Z"
    },
    "layer": 2,
    "createdAt": "2026-05-13T12:00:00.000Z",
    "updatedAt": "2026-05-13T12:10:00.000Z"
  }
}
```

### `POST /api/rogue/floor-won`

Marks the current floor as cleared and advances to the next layer.

#### Request Body

```json
{
  "layer": 2,
  "playerHp": 18,
  "enhancements": []
}
```

#### Success Response

**Response** `200`

```json
{
  "success": true,
  "message": "Floor cleared",
  "data": {
    "_id": "667000000000000000000001",
    "userId": "664a00000000000000000001",
    "roomId": "rogue",
    "snapshot": {
      "layer": 3,
      "playerHp": 20,
      "playerMaxHp": 20,
      "bossHp": 647,
      "enhancements": [],
      "checkpointLayer": 3,
      "checkpointHp": 18,
      "status": "active"
    },
    "layer": 3,
    "createdAt": "2026-05-13T12:00:00.000Z",
    "updatedAt": "2026-05-13T12:20:00.000Z"
  }
}
```

### `POST /api/rogue/floor-lost`

Restores from checkpoint if one exists, otherwise ends the run.

#### Restore Response

**Response** `200`

```json
{
  "success": true,
  "message": "Checkpoint restored",
  "data": {
    "action": "restore",
    "checkpoint": {
      "floor": 3,
      "playerHp": 20,
      "playerMaxHp": 20,
      "bossHp": 647,
      "enhancements": []
    }
  }
}
```

#### End Response

**Response** `200`

```json
{
  "success": true,
  "message": "Run ended",
  "data": {
    "action": "end"
  }
}
```

If there is no save at all:

```json
{
  "success": true,
  "message": "No save found",
  "data": {
    "action": "end"
  }
}
```

### `POST /api/rogue/choose-enhancement`

Adds a chosen enhancement to the current run.

#### Request Body

```json
{
  "enhancement": {
    "id": "fire_spec",
    "label": "Fire Spec",
    "description": "Fire cards chip ×1.1",
    "buff": {
      "type": "ELEMENT_CHIP_MULT",
      "element": "FIRE",
      "mult": 1.1
    }
  }
}
```

#### Allowed `buff.type` Values

- `ELEMENT_CHIP_MULT`
- `ELEMENT_CHIPS_BONUS`
- `ELEMENT_DRAW_ON_SHUFFLE`
- `HIGH_RANK_DRAW_ON_SHUFFLE`
- `HAND_MULT_BONUS`
- `HAND_CHIPS_BONUS`
- `ALL_CHIPS_BONUS`
- `HP_BONUS`
- `SKILL_ENERGY_MAX`

#### Success Response

**Response** `200`

```json
{
  "success": true,
  "message": "Enhancement saved",
  "data": {
    "_id": "667000000000000000000001",
    "userId": "664a00000000000000000001",
    "roomId": "rogue",
    "snapshot": {
      "layer": 2,
      "enhancements": [
        {
          "id": "fire_spec",
          "label": "Fire Spec",
          "description": "Fire cards chip ×1.1",
          "buff": {
            "type": "ELEMENT_CHIP_MULT",
            "element": "FIRE",
            "mult": 1.1
          }
        }
      ]
    },
    "layer": 2
  }
}
```

#### Failure Responses

- `400` invalid enhancement
- `400` invalid buff type
- `404` no active run

### `POST /api/rogue/won`

Marks the rogue run as completed and clears the save.

#### Success Response

**Response** `200`

```json
{
  "success": true,
  "message": "Run complete",
  "data": null
}
```

---

## Common Error Codes

| HTTP Status | Meaning |
|------|------|
| `200` | Success |
| `201` | Created |
| `400` | Invalid request or validation failed |
| `401` | Authentication required or token invalid |
| `404` | Resource not found |
| `409` | Conflict |
| `500` | Internal server error |

## Notes

- This document reflects the code currently mounted in `backend/src/index.ts`.
- Older placeholder examples that describe PvP-style match payloads do not match the current backend models and have been removed.
- `GET /api/users/:userId/achievements` is present but not implemented.
- `POST /api/auth/login` currently returns `accessToken` only, even though the backend also creates a refresh token internally.
- `GET /api/matches/:matchId/replay` currently requires a valid JWT, but does not yet enforce participant-only authorization.
