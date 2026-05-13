# Frontend Specification

This document describes the current frontend application in `CardGame/frontend/`.
It focuses on the user-facing flows that are part of the present deliverable: landing, authentication, lobby, leaderboard, PvE gameplay, and rogue mode.

Backend API details belong in `docs/api.md`.
Socket event details belong in `docs/socket.md`.

---

## 1. Scope

The frontend is responsible for:

- rendering the public entry experience
- handling login and registration
- protecting authenticated routes
- presenting player dashboard and leaderboard data
- rendering the PvE battle interface
- rendering the rogue-mode battle and progression flow
- maintaining client-side auth state
- maintaining client-side PvE socket state

The frontend acts as the presentation and interaction layer.
Backend state remains authoritative for API and socket-driven gameplay.

---

## 2. Tech Stack

- Framework: React 18
- Build tool: Vite
- Routing: React Router
- State management: Zustand
- HTTP client: Axios
- Realtime transport: Socket.io client
- Styling:
  - Tailwind utility classes
  - page-specific CSS files under `frontend/src/styles/`

Core entry files:

- `frontend/src/main.jsx`
- `frontend/src/App.jsx`
- `frontend/src/router/index.jsx`

---

## 3. Frontend Goals

The frontend is designed to:

- keep authentication flow simple and stable
- make major gameplay screens visually distinct
- keep PvE interaction responsive while following server state
- provide consistent English UI copy
- centralize transport logic in shared API and socket modules

---

## 4. Route Map

The current active route structure is defined in `frontend/src/router/index.jsx`.

| Route | Component | Auth Required | Purpose |
|------|------|------|------|
| `/` | `HomePage` | No | landing page and project entry |
| `/login` | `LoginPage` | No | user login |
| `/register` | `RegisterPage` | No | account creation |
| `/leaderboard` | `LeaderboardPage` | Yes | ranked PvE standings |
| `/lobby` | `LobbyPage` | Yes | authenticated player hub |
| `/room/:roomId/game` | `GamePage` | Yes | PvE battle screen |
| `/rogue` | `RogueGamePage` | Yes | rogue-mode gameplay |
| `/attack-effect-preview` | `AttackEffectPreviewPage` | No | visual effect preview page |

Shared layout:

- all routes render inside `RootLayout`
- `RootLayout` includes the global navbar and main content area

Route protection:

- protected routes are wrapped by `PrivateRoute`
- unauthenticated access redirects to `/login`

---

## 5. Page Responsibilities

### 5.1 Home Page

File:

- `frontend/src/pages/HomePage.jsx`

Responsibilities:

- present the public landing experience
- introduce the game theme and major modes
- link users into login and leaderboard flows
- provide animated showcase sections and visual previews

### 5.2 Login Page

File:

- `frontend/src/pages/LoginPage.jsx`

Responsibilities:

- collect email and password
- run light client-side validation before submit
- call the login API
- persist auth state on success
- redirect authenticated users to the lobby

Primary dependencies:

- `frontend/src/api/authApi.js`
- `frontend/src/hooks/useAuth.js`
- `frontend/src/store/authStore.js`

### 5.3 Register Page

File:

- `frontend/src/pages/RegisterPage.jsx`

Responsibilities:

- collect username, email, and password
- validate basic field rules on the client
- call the registration API
- persist auth state on success
- redirect authenticated users to the lobby

Primary dependencies:

- `frontend/src/api/authApi.js`
- `frontend/src/hooks/useAuth.js`
- `frontend/src/store/authStore.js`

### 5.4 Lobby Page

File:

- `frontend/src/pages/LobbyPage.jsx`

Responsibilities:

- show the authenticated player overview
- show player stats summary
- show recent match history
- provide entry points into solo PvE, rogue mode, and leaderboard

Primary dependencies:

- `frontend/src/api/matchApi.js`
- `frontend/src/api/userApi.js`
- `frontend/src/hooks/useAuth.js`
- `frontend/src/utils/xpSystem.js`

### 5.5 Leaderboard Page

File:

- `frontend/src/pages/LeaderboardPage.jsx`

Responsibilities:

- display the ranked PvE leaderboard
- fetch global standings
- fetch the signed-in player's stats for rank context
- communicate ranked eligibility clearly inside the page

Primary dependencies:

- `frontend/src/api/leaderboardApi.js`
- `frontend/src/api/userApi.js`
- `frontend/src/hooks/useAuth.js`

### 5.6 Game Page

File:

- `frontend/src/pages/GamePage.jsx`

Responsibilities:

- render the live PvE battle interface
- display boss, player HUD, hand, score panel, and skill controls
- react to socket-driven state updates
- manage local selection and interaction UX around the server state
- present victory and defeat overlays

Primary dependencies:

- `frontend/src/hooks/useGameLogic.js`
- `frontend/src/components/game/*`

### 5.7 Rogue Game Page

File:

- `frontend/src/pages/RogueGamePage.jsx`

Responsibilities:

- render the rogue battle loop
- restore or start a run
- save progress
- present enhancement selection
- support floor retry and run completion flow

Primary dependencies:

- `frontend/src/hooks/useRogueLikeLogic.js`
- `frontend/src/api/rogueapi.js`
- `frontend/src/components/game/*`

---

## 6. Authentication Flow

Authentication state is restored before the first render in `frontend/src/main.jsx`.

### 6.1 Login Flow

1. the user submits email and password on `LoginPage`
2. `login()` sends `POST /api/auth/login`
3. the frontend receives `accessToken` and `user`
4. `setAuth()` writes auth data into the store and local storage
5. the page redirects to `/lobby`

### 6.2 Register Flow

1. the user submits username, email, and password on `RegisterPage`
2. `register()` sends `POST /api/auth/register`
3. the frontend receives `accessToken` and `user`
4. `setAuth()` stores the authenticated state
5. the page redirects to `/lobby`

### 6.3 Route Protection

`PrivateRoute` reads `isAuthenticated` from `authStore`.

If the user is not authenticated:

- the protected route does not render
- the user is redirected to `/login`

### 6.4 Token Storage

Local storage keys are managed in `frontend/src/utils/tokenUtils.js`:

- access token: `token`
- refresh token: `refreshToken`

### 6.5 Restore on Startup

On startup:

- `restoreAuth()` reads the stored access token
- expired or missing tokens are cleared
- valid tokens restore `user`, `accessToken`, `refreshToken`, and `isAuthenticated`

### 6.6 Refresh Flow

`authStore` includes `refreshAccessToken()`:

- it uses the stored refresh token
- it deduplicates concurrent refresh requests through a shared in-flight promise
- it updates the access token in local storage and Zustand state

Socket reconnect paths also use this refresh capability when needed.

---

## 7. Global State

### 7.1 Auth Store

File:

- `frontend/src/store/authStore.js`

Responsibilities:

- current user identity
- access token state
- refresh token state
- authentication flag
- startup restore
- token refresh
- logout cleanup

Key fields:

- `user`
- `accessToken`
- `refreshToken`
- `isAuthenticated`

### 7.2 PvE Socket Store

File:

- `frontend/src/store/pveSocketStore.js`

Responsibilities:

- hold authoritative PvE state received from the socket
- expose connection metadata
- provide reset and state-application helpers

Key fields:

- `hand`
- `deckCount`
- `player`
- `boss`
- `round`
- `floor`
- `phase`
- `skills`
- `shuffle`
- `play`
- `bossRound`
- `battleResult`
- `gameOver`
- `connectionStatus`
- `lastError`

### 7.3 Audio Store

File:

- `frontend/src/store/audioStore.js`

Responsibilities:

- persist BGM volume
- persist SFX volume
- persist mute state

Key fields:

- `bgmVolume`
- `sfxVolume`
- `isMuted`

### 7.4 Supporting Gameplay Stores

Files:

- `frontend/src/store/gameStore.js`
- `frontend/src/store/battleStore.js`
- `frontend/src/store/roundStore.js`

These stores define gameplay-oriented state slices and structure.
The current PvE runtime is driven primarily through `useGameLogic()` and `pveSocketStore`.

---

## 8. API Integration Map

### 8.1 Auth API

File:

- `frontend/src/api/authApi.js`

Endpoints used:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`

Used by:

- `LoginPage`
- `RegisterPage`
- navbar logout flow
- auth refresh flow

### 8.2 User API

File:

- `frontend/src/api/userApi.js`

Endpoints used:

- `GET /api/users/:userId/stats`
- `PUT /api/users/me`
- `PUT /api/users/me/password`

Used by:

- `LobbyPage`
- `LeaderboardPage`

### 8.3 Match API

File:

- `frontend/src/api/matchApi.js`

Endpoints used:

- `GET /api/matches`
- `GET /api/matches/:matchId`
- `GET /api/matches/:matchId/replay`

Used by:

- `LobbyPage`

### 8.4 Leaderboard API

File:

- `frontend/src/api/leaderboardApi.js`

Endpoint used:

- `GET /api/leaderboard`

Used by:

- `LeaderboardPage`

### 8.5 Rogue API

File:

- `frontend/src/api/rogueapi.js`

Endpoints used:

- `POST /api/rogue/start`
- `PUT /api/rogue/save`
- `POST /api/rogue/floor-won`
- `POST /api/rogue/choose-enhancement`
- `POST /api/rogue/floor-lost`
- `POST /api/rogue/won`
- `GET /api/rogue/current`
- `GET /api/rogue/upgrades`

Used by:

- `RogueGamePage`
- `useRogueLikeLogic()`

---

## 9. HTTP Client Behavior

File:

- `frontend/src/api/client.js`

Behavior:

- uses a shared Axios instance
- uses relative `/api/*` paths in development
- attaches the JWT access token in a request interceptor
- normalizes error messages in a response interceptor

This keeps page-level API calls simple and consistent.

---

## 10. Socket Integration

Primary files:

- `frontend/src/hooks/useGameLogic.js`
- `frontend/src/socket/pveSocketAdapter.js`
- `frontend/src/store/pveSocketStore.js`
- `docs/socket.md`

### 10.1 Connection Ownership

The PvE socket connection is owned by `useGameLogic()`.

That hook:

- creates the Socket.io client
- connects it
- starts the PvE game flow
- listens for connection lifecycle events
- listens for gameplay state events
- disconnects and cleans up on teardown

### 10.2 Authentication

The socket connection uses JWT auth:

- the access token is attached through `socket.auth`
- auth state changes are mirrored onto the live socket config
- reconnect attempts can refresh the token before handshake

### 10.3 State Adaptation

Server PvE payloads are transformed by `adaptPveGameState()` so UI components receive frontend-friendly state:

- backend card payloads are mapped to card assets
- backend hand types are mapped to frontend hand-type display definitions
- `battleResult` is mapped into frontend `gameOver` semantics

### 10.4 UI Role of the Socket Layer

The socket layer supports:

- live PvE state updates
- skill usage
- card selection
- hand confirmation
- shuffle actions
- reconnect and auth-expiry recovery

---

## 11. Gameplay UI Composition

### 11.1 Core PvE Layout

Main battle screens are assembled from:

- `Battlefield`
- `SkillBar`
- `ScorePanel`
- `HandArea`

These components are reused between the standard PvE page and the rogue page.

### 11.2 Battle Presentation Rules

The game screens include:

- boss-side battlefield presentation
- hand selection area at the bottom
- action panel for play and discard flow
- skill controls
- combat resolution overlays

The UI uses local presentation state to smooth transitions such as:

- boss attack presentation
- damage display timing
- victory reveal timing
- defeat reveal timing

### 11.3 Rogue Mode Additions

Rogue mode adds:

- run restore flow
- enhancement selection modal
- floor retry flow
- run completion overlay
- exit/save confirmation flow

---

## 12. Audio Behavior

Primary files:

- `frontend/src/store/audioStore.js`
- `frontend/src/utils/audioManager.js`

Behavior:

- BGM is managed centrally through `audioManager`
- BGM is started after authentication-facing entry points
- BGM is stopped on auth cleanup
- SFX are played for gameplay actions such as selection, discard, play, and skill use
- volume and mute state are persisted through Zustand `persist`

---

## 13. UI Copy Rule

All user-facing text must be English.

Reference documents:

- `docs/language.md`
- `docs/i18n-glossary.md`

This applies to:

- page headings
- button labels
- inline validation messages
- error states
- empty states
- gameplay labels

---

## 14. Error and Empty-State Behavior

The frontend already includes user-facing handling for common fetch states.

Examples:

- `LoginPage` shows login failure messages inline
- `RegisterPage` shows validation or request failure messages inline
- `LobbyPage` shows loading, error, and empty states for recent matches
- `LeaderboardPage` shows loading, retry, and eligibility messaging
- game pages show transient warnings and error banners for gameplay-related issues

The goal is to keep failures visible to the user without breaking page structure.

---

## 15. Frontend File Organization

### 15.1 `src/pages/`

Page-level route components.

Examples:

- `HomePage.jsx`
- `LoginPage.jsx`
- `RegisterPage.jsx`
- `LobbyPage.jsx`
- `LeaderboardPage.jsx`
- `GamePage.jsx`
- `RogueGamePage.jsx`

### 15.2 `src/components/`

Reusable UI components.

Examples:

- `components/layout/Navbar.jsx`
- `components/game/Battlefield.jsx`
- `components/game/HandArea.jsx`
- `components/game/ScorePanel.jsx`
- `components/game/SkillBar.jsx`

### 15.3 `src/api/`

Shared HTTP wrappers for backend endpoints.

Examples:

- `authApi.js`
- `userApi.js`
- `matchApi.js`
- `leaderboardApi.js`
- `rogueapi.js`
- `client.js`

### 15.4 `src/store/`

Zustand stores for auth, audio, and PvE socket state.

### 15.5 `src/hooks/`

Stateful composition hooks.

Examples:

- `useAuth.js`
- `useGameLogic.js`
- `useRogueLikeLogic.js`

### 15.6 `src/socket/`

Socket adapters and socket-facing transformation helpers.

### 15.7 `src/utils/`

Cross-page utilities such as:

- token helpers
- audio manager
- XP helpers
- display helpers

---

## 16. Implementation Summary

The current frontend deliverable centers on these main user flows:

- public landing experience
- login and registration
- authenticated lobby
- leaderboard browsing
- real-time PvE battle
- rogue-mode battle progression

These flows are backed by shared auth state, shared API wrappers, and a socket-driven PvE state model.

---

## 17. Related Documents

- `docs/api.md`
- `docs/socket.md`
- `docs/state-machine.md`
- `docs/card-abstractions.md`
- `docs/GameLogic_backend.md`
- `docs/language.md`
- `docs/i18n-glossary.md`
