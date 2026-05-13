# Test Log

Records issues, affected components, root-cause analysis, and fixes found while users manually followed the E2E flow in `docs/e2e-test-prompt.md`.

---

## Round 1 — Login Page

### Time
2026-05-11 18:47 (UTC+12)

### Action
- Opened the login page in browser preview (`http://127.0.0.1:45347` -> Vite `http://localhost:5173`)
- Filled in email/password in the `LoginPage` form and clicked the `LOGIN` button to submit

### Reported Symptoms
1. The submit button `@[dom-element:button:LoginPage]` (`<button class="login-submit-btn ...">LOGIN</button>`, located at `frontend/src/pages/LoginPage.jsx:873-891`) was pushed downward after the error message appeared and overlapped with nearby elements.
2. The error bubble `@[dom-element:p:LoginPage]` (`<p role="alert">Network Error</p>`, located at `frontend/src/pages/LoginPage.jsx:864-870`) showed `Network Error`, which meant the login request never reached the backend.

### Related Components / Files
- `frontend/src/pages/LoginPage.jsx`
  - `<form>` (line 825)
  - `<p role="alert">` (lines 864-870)
  - Submit button `.login-submit-btn` (lines 873-891)
  - Style block `.login-form-card` (lines 404-407, includes `max-height` + `overflow-y-auto`)
- `frontend/src/api/client.js` (axios instance and `baseURL`)
- `frontend/vite.config.js` (dev proxy for `/api` and `/socket.io`)
- `CardGame/docker-compose.yml` (`VITE_API_BASE_URL=http://backend:3000` for the frontend container)

### Root Cause Analysis

**Issue 1 — Button overlapped after error text appeared**

`.login-form-card` uses `max-height: min(78dvh, calc(100dvh - var(--navbar-height) - 0.5rem))` together with `overflow-y-auto`, which was intended to make the card scroll when content becomes too tall. But the card itself is laid out as `flex flex-col`, the `<form>` has `min-h-0`, and it does not have `shrink-0`. Once the error `<p>` appears and total height exceeds `max-height`, the flex container shrinks the shrinkable child first. The form then overflows its own box, and the button overlaps the "No account yet?" section below it, while the `overflow-y-auto` scrollbar never actually kicks in.

**Issue 2 — Network Error**

The frontend service in `docker-compose.yml` sets `VITE_API_BASE_URL=http://backend:3000`. Vite injects `import.meta.env.VITE_API_BASE_URL` into the browser bundle, so the axios instance in `client.js` uses `http://backend:3000` directly. But `backend` is only resolvable inside the Docker network, not from the browser on the user machine, so axios throws `Network Error`. The `/api` proxy in Vite never gets used.

### Fix

1. `frontend/src/api/client.js`: force a relative base URL in development so requests go through the Vite proxy and Docker hostnames do not leak to the browser; production still respects `VITE_API_BASE_URL`.
   ```js
   baseURL: import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || ''),
   ```
2. `frontend/src/pages/LoginPage.jsx`: replace the form's `min-h-0` with `shrink-0` so the form keeps its natural height, and overflow is handled by `.login-form-card` itself.

### Verification Steps (Awaiting User Re-Test)
- [ ] After an error appears on the login page, the button no longer overlaps the lower link area; if content is too tall, the card scrolls.
- [x] With Docker running, logging in with a wrong password now shows the backend auth failure message (`Email or password is incorrect`) instead of `Network Error`.
- [ ] Logging in with a valid account successfully navigates to `/lobby`.

### New Issue Found on Re-Test (2026-05-11 19:30)
- Symptom: after a failed login (wrong email or password), the error text displays correctly, but the `"No account yet? Register"` `<p>` below the form (`frontend/src/pages/LoginPage.jsx:894-902`, class includes `mt-5 shrink-0 ...`) gets pushed outside `.login-form-card` and appears below the card boundary.
- Likely cause: the Round 1 fix gave the `<form>` `shrink-0`, keeping it at natural height, but the register `<p>` below the form also has `shrink-0`, and `.login-form-card` is a flex column with `max-height` + `overflow-y-auto`. When the combined height exceeds the card max height, nothing is allowed to shrink, so the `<p>` overflows the visible area and the scrollbar does not behave as expected (possibly because the parent `.login-page-layout` with `lg:items-center` allows the card to grow, or an ancestor overflow setting interferes).
- To be handled after user approval. Candidate approaches:
  1. Put the register `<p>` inside the scrollable content container so the card actually scrolls.
  2. Use tighter spacing in the error state or move the register link inside the form.
  3. Check the `.login-form-card` `max-height` and ancestor chain to ensure `overflow-y: auto` really takes effect.

---

## Round 2 — PvE Match Not Persisted (found by Claude CLI watching backend logs)

### Time
2026-05-11 19:05 (UTC+12)

### Action
- Claude CLI followed `docker compose logs -f backend` while the user played a PvE match
- The backend logs emitted the same WARN twice

### Backend Log
```txt
WARN: pve socket: userId not resolved — match will not be persisted
```

### Reported Symptoms
After the PvE match ended, no `Match` / `MatchReplay` document was written, `User.stats` (`totalGames` / `totalWins` / `winRate`) did not update, and the leaderboard and recent matches page did not show the match.

### Related Components / Files
- `backend/src/utils/pveHandlers.ts`
  - `resolveSocketUserId(socket)` (lines 55-67): reads JWT from `socket.handshake.auth.token`, verifies it with `jwt.verify`, then reads `decoded.userId`
  - `warnIfNoUserId(socket, userId)` (lines 70-95): emits the WARN above on failure, including `tokenKind` / `verifyHint` fields
  - `registerPveHandlers` (lines 97-101): resolves `userId` once on connection and stores it in the closure
- `backend/src/pve/runtime.ts`
  - `createRoom({ userId })` (lines 60-98): stores `userId` in `rooms.get(roomId).userId`
  - `archiveGame(roomId)` (lines 150-266): writes `Match.create` / `MatchReplay.create` / `User.findByIdAndUpdate` only if `userId` is truthy; otherwise logs `pve archiveGame: skipped (no userId)` and returns
- `frontend/src/hooks/useGameLogic.js`
  - `createSocket(accessToken)` (lines 121-127): `auth: accessToken ? { token: accessToken } : undefined`
  - `useGameLogic` line 130 reads `accessToken` through `useAuth()`, and line 249 creates the socket in an effect whose dependency array includes `accessToken`
- `frontend/src/store/authStore.js`: `setAuth` / `restoreAuth` write `accessToken`
- `frontend/src/api/authApi.js`: `login` returns only `accessToken` and does **not** pass the backend's `refreshToken` back up (a latent issue, but not the direct root cause here)

### Root Cause Analysis (Still Being Narrowed Down)
The backend has only one place to recover `userId`: the socket handshake. `socket.handshake.auth.token` must be a valid, unexpired JWT and the payload must contain `userId`. The possible causes, in order, were:

1. **The user was not logged in during PvE** (most likely): before the Round 1 Network Error fix, all logins failed, `accessToken` stayed null, and `useGameLogic` created the socket with `auth` set to `undefined`, so no token was sent.
2. **The page connected before token restore completed**: if the user refreshed or entered PvE directly, `useAuth()` can still be null while `restoreAuth` is running, so the socket connects without a token first; the later reconnect still leaves the first WARN in the log.
3. **The JWT expired or `JWT_SECRET` differs between frontend and backend**: `warnIfNoUserId` places the exact reason in `verifyHint` (for example `jwt expired`, `invalid signature`, `JWT_SECRET unset`, or `payload missing userId`).
4. **Token was cleared by Vite HMR while changing pages** and similar edge cases.

### Next Checks
- Look at the complete WARN line in the Claude CLI output and confirm the actual `tokenKind` and `verifyHint` values, which would distinguish cases 1/2/3 immediately.
- Check whether `pve archiveGame: skipped (no userId)` also appears, to confirm that the flow reached archive and was skipped only because `userId` was missing.
- Reproduce as: log in successfully -> enter PvE from the menu -> finish one match -> see whether the WARN still appears. If it does not, then the log entries were from before the fix.

### Definitive Result (from user)
The two full WARN entries were:
- `tokenKind: "missing"`
- `verifyHint: "handshake.auth.token missing or empty"`

Code path:
```txt
resolveSocketUserId()
  -> socket.handshake.auth.token is absent
  -> return null
  -> warnIfNoUserId()
  -> raw == null
  -> tokenKind = "missing"
  -> verifyHint = "handshake.auth.token missing or empty"
```

**Conclusion: not a bug.** The timestamps 06:38 / 06:40 matched the user's curl batch-API testing window. The browser may have had a socket connected without JWT, or the socket may have connected before login. PvE still works; it just skips MongoDB persistence when `archiveGame` cannot resolve `userId`.

### Follow-up Rule
**If** the same WARN appears again after a normal frontend login and a fresh PvE session, where the socket already had a valid JWT but it still was not placed into `handshake.auth.token`, **then** treat it as a bug and inspect `frontend/src/hooks/useGameLogic.js` and `createSocket(accessToken)`. No code change for now.

---

## Round 3 — Two Lobby Header Icons Are Not Clickable

### Time
2026-05-11 19:31 (UTC+12)

### Action
- After logging in, entered `/lobby` and tried clicking the top-right toolbar icons for Notifications and Brightness

### Reported Symptoms
Both buttons did nothing.

### Related Components / Files
- Lobby header toolbar `<div class="flex shrink-0 items-center gap-2 sm:gap-3">`
- Two `<button>` elements:
  - Notifications button: `disabled` + `title="Notifications (coming soon)"` + class includes `cursor-not-allowed`
  - Brightness button: `disabled` + `title="Brightness (coming soon)"` + class includes `cursor-not-allowed`
- Icon component `HeaderToolbarBell`

### Current Assessment
Both buttons have native `disabled` attributes, `cursor-not-allowed`, and `title="...(coming soon)"` in the DOM. This is clearly an intentional placeholder, not a bug.

### Follow-up
- The actual product priority for Notifications and Brightness still needs confirmation.
- If they will not be implemented soon, consider showing a `Coming soon` toast on hover/click so users do not think the page is broken.

---

## Round 4 — Clicking Profile Shows Only a Placeholder Page

### Time
2026-05-11 19:33 (UTC+12)

### Action
- Clicked the `Profile` entry from Lobby or the Navbar after logging in

### Reported Symptoms
The page renders only:
```html
<main class="min-h-[100dvh] bg-[#040410] pt-[var(--navbar-height)]">
  <h1>Profile Page</h1>
</main>
```
It is obviously an unfinished placeholder and does not show avatar, username, stats, or recent matches.

### Related Components / Files (Inferred, Not Investigated)
- `RootLayout` main render slot
- The page component mapped to `/profile` (or similar) in the router. It currently contains only `<h1>Profile Page</h1>` and likely has not been wired to `/api/users/:id`, `/api/users/:id/stats`, or `/api/matches?userId=...`

### Current Assessment
This is an **unfinished feature**, not an explicit bug. The route works, but the page has no API wiring or UI.

### Follow-up
- Confirm the scope of the Profile page and implement the needed UI and three API calls.
- If it will not be built soon, hide the entry or mark it `Coming soon` to avoid confusing users and test runs.

---

## Round 5 — Lobby "RECENT MATCHES" Header Is Misaligned

### Time
2026-05-11 19:34 (UTC+12)

### Action
- Viewed the top header line of the `RECENT MATCHES` section in `/lobby`

### Reported Symptoms
The header line (`<div class="flex items-start justify-between gap-2">`) is misaligned: the left `<h3>RECENT MATCHES</h3>` and the right `View All` button do not line up as expected.

### Related DOM
```html
<div class="flex items-start justify-between gap-2">
  <h3 class="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-violet-50 sm:text-[0.74rem]">
    RECENT MATCHES
  </h3>
  <button type="button" disabled title="Coming soon"
          class="cursor-not-allowed text-[0.75rem] font-semibold uppercase tracking-wide text-cyan-200/95 underline-offset-2 sm:text-[0.8125rem]">
    View All
  </button>
</div>
```

### Current Assessment
- This is a styling issue inside the LobbyPage recent-matches header.
- The `View All` button is also a placeholder and is intentionally disabled.

### Follow-up
- Ask the user what "misaligned" means concretely (height mismatch, wrapping, overflow, spacing, etc.) before changing `items-start` to `items-center` or using another alignment strategy.
- Also confirm whether `View All` should remain as a placeholder at all.

---

## Round 6 — Change Rank Skill Sometimes Fails on J/Q/K

### Time
2026-05-11 19:40 (UTC+12)

### Action
- Opened the `✦ Change Rank` panel in `SkillPanel` during PvE (`@[dom-element:div:SkillPanel]`)
- Selected target ranks, especially J / Q / K

### Reported Symptoms
- Initial observation: changing to **J / Q / K** sometimes fails:
  - The change sound effect plays, which means the click reaches the audio path
  - But the card in hand does not actually change
- A / 2~10 did not show the problem at the time

### Related Components / DOM (User Snapshot)
- `SkillPanel` popup: title `✦ Change Rank`, with a 5-column grid of buttons including A, 2, 3, 4, ..., J, Q, K
- The inner grid belongs to `SkillBar`
- Corresponding backend event: `useSkill({ skill: 'changeCost', cardId, targetRank })` (see section 4.4 of `e2e-test-prompt.md`)

### Current Assessment
Only the symptom was recorded; the code was not inspected yet. Possible directions:
1. Frontend sound playback and socket emission are decoupled: the click handler may play audio immediately, but the emitted payload for J/Q/K (`rank=11/12/13`) may hit a boundary bug and be rejected by the backend.
2. The backend `changeCost` skill may have special conditions for `targetRank ∈ {11,12,13}` such as insufficient energy, target rank matching the source, or cost overflow.
3. The word "sometimes" means this is not a blanket failure for all J/Q/K cases; it may depend on the initial hand, remaining energy, cooldowns, or other state.

### Extra Data Needed for Reproduction
- The failing move's original card rank/element, target rank, current `skills.energy`, phase, and whether any other skill was already used that turn
- Browser DevTools socket frames / console errors / matching backend WARNs

### Fix
**No code change yet; waiting for user approval.**

---

## Round 7 — Victory Dialog Lacks Exit Button and Needs English Copy

### Time
2026-05-11 19:43 (UTC+12)

### Action
- Cleared the boss in the PvE / Rogue flow and reached the victory dialog in `GamePage`

### Reported Symptoms
Current dialog DOM:
```html
<div class="flex flex-col items-center gap-6 bg-stone-900 ...">
  <div class="text-6xl">🏆</div>
  <div class="text-yellow-300 text-3xl font-black tracking-widest">VICTORY!</div>
  <button class="mt-2 px-8 py-3 ...">PLAY AGAIN</button>
</div>
```
There are two problems:
1. **No Exit button**: there is only one action, so the player cannot go directly back to Lobby / the main menu.
2. **The copy needs to be English**: the victory text should be `VICTORY!` or `CLEARED!`, and the replay button should be `PLAY AGAIN`.
   - The project rule (`AGENTS.md` -> `CardGame/docs/language.md`) requires all user-visible copy to be English.

### Related Components
- The victory dialog block in `GamePage` (the `<div class="flex flex-col items-center gap-6 ...">` above)

### Follow-up
- Add an `Exit` button inside that block (route back to `/lobby` or the previous page), either beside or below `Play Again`.
- Replace the victory and replay labels with English, and also check Rogue victory, PvE victory, and failure dialogs for any other non-English strings.

---

## Round 8 — HandArea Remains Visible After Victory

### Time
2026-05-11 19:43 (UTC+12)

### Action
- Defeated the boss in PvE and reached the victory dialog (see Round 7)

### Reported Symptoms
The victory dialog appears, but the bottom `HandArea` (hand area with the player avatar / HP orb / hand row) remains visible and is not hidden or faded out, so the dialog and the gameplay HUD appear stacked together.

### Related Components / DOM
- `HandArea` (`<div data-component-name="HandArea" style="position: relative; z-index: 52; height: 175px; ...">`)
- The victory dialog from Round 7 (`🏆 VICTORY!`)

### Current Assessment
Only the symptom was recorded; the code was not inspected yet. Likely directions:
- The `HandArea` render condition does not check `battleResult === 'WIN'` or `gameOver`.
- Or the dialog and `HandArea` are both shown by the same state, but `HandArea` lacks `hidden` / `opacity-0` / `pointer-events-none`.

### Follow-up
- Decide whether win/lose states should hide `HandArea` completely or keep it visible but disabled and dimmed.
- Also check how `BossArea`, `SkillBar`, `Shuffle`, and other in-game UI behaves after victory.

---

## Round 9 — `⚙ Settings` Button in GamePage Does Nothing

### Time
2026-05-11 19:45 (UTC+12)

### Action
- Clicked the `⚙ Settings` button in the PvE `GamePage`

### Reported Symptoms
Clicking it did nothing: no settings panel, no route change, and no console error.

### Related DOM
```html
<button type="button"
        class="whitespace-nowrap rounded border border-stone-800 px-2 py-1 text-[10px]
               text-stone-600 transition-colors hover:text-stone-400 sm:px-3 sm:text-xs"
        data-component-name="GamePage">
  ⚙&nbsp;Settings
</button>
```
Note: unlike the placeholder buttons in Rounds 3 / 5, this one has no `disabled` attribute and no `title="Coming soon"`, but it still does not have an `onClick`, so from the user's perspective it is a button that cannot be used.

### Current Assessment
Only the symptom was recorded; the code was not inspected yet. Possible reasons:
- The JSX is missing an `onClick` handler, or it is wired to an empty stub.
- Or there is an `onClick`, but the overlay component is not mounted or is hidden behind another layer.

### Follow-up
- Decide the scope of the Settings panel first (volume, difficulty, exit current run, etc.), then implement the handler and panel.
- In the short term, add `disabled` + `title="Coming soon"` so it matches other placeholder controls in the project and does not look broken.

---

## Round 10 — Boss Intent (Attack / Charge / Defend) Lacks UX Feedback

### Time
2026-05-11 19:46 (UTC+12)

### Action
- Observed the boss video area in PvE across multiple turns, comparing it with the backend-pushed `bossRound.intent` (`ATTACK` / `CHARGE` / `DEFEND`)

### Reported Symptoms
The boss area currently renders only a permanent idle video:
```html
<video src="/animation/boss-idle.mp4" autoplay loop playsinline ...
       data-component-name="BossVideoDisplay">
</video>
```
Players cannot tell what the boss intends to do this turn, and there is no:
- intent icon / label such as `ATK`, `CHARGE`, or `DEFEND`
- warning damage value (`bossRound.willReleaseCharge` / `boss.attackPerRound`)
- video transition, effects, or distinct highlight

In gameplay, `CHARGE` leads to burst damage next turn and `DEFEND` halves player damage (see section 4.8 of `e2e-test-prompt.md`), but the player gets no visual warning and cannot adjust strategy.

### Related Components
- `BossVideoDisplay` only plays the idle video and does not consume `bossRound`
- The backend already sends `gameState.bossRound` (`intent` / `isDefending` / `willReleaseCharge`) to the frontend, but the frontend does not consume it

### Current Assessment
Only the symptom was recorded; the code was not inspected yet. This is a UX gap, not a bug.

### Follow-up
- Add an intent badge component on top of `BossVideoDisplay` or the outer BossArea, driven by `bossRound.intent`.
- Optionally prepare different videos, filters, glow, or accents for each intent.
- Any new copy must be English.

---

## Round 11 — Shield Skill Lacks Cooldown UX and the Game UI Still Has Chinese Copy

### Time
2026-05-11 19:48 (UTC+12)

### Action
- Used the shield skill in PvE and checked the `SkillSlot` state
- Reviewed visible copy in `Battlefield`, `HandTypeDisplay`, and `ScorePanel`

---

### 11.1 Shield skill only looks disabled and does not show cooldown turns

DOM:
```html
<div class="skill-back" data-component-name="SkillSlot">
  <img src="/images/skill-faded-shield.png" .../>
  <span style="color: rgb(147, 197, 253); ...">Active</span>
</div>
```

**Symptom**: after using the shield, the slot switches to the faded-shield image and shows `Active`, but **does not show the remaining cooldown turns**.
**Backend data**: `gameState.skills.shield = { active, onCooldown, cooldownRounds }` (see section 4.3 / 4.8 of `e2e-test-prompt.md`), so `cooldownRounds` is already available on the frontend but not used.

**Follow-up**:
- When `onCooldown=true`, show `cooldownRounds` as a number, circular progress, or a badge like `CD 3`.
- The current `Active` label is already English, so that part is fine.

---

### 11.2 The game UI still contains several Chinese strings

This violates the project rule (`AGENTS.md` -> `CardGame/docs/language.md`, all user-visible copy must be English). The current matches are:

| Component | Chinese Copy | Suggested English |
| --- | --- | --- |
| `Battlefield` boss banner | `Shadow Lord` | `Shadow Lord` |
| `Battlefield` floor label | `Floor 1` | `Floor 1` / `Layer 1` |
| `HandTypeDisplay` hand name | `High Card` | `High Card` |
| `HandTypeDisplay` score unit | `pts` | `pts` or omitted |
| `ScorePanel` main action button | `Play & Attack` | `Play & Attack` / `Play Hand` |
| `ScorePanel` secondary action button | `Discard & Draw` | `Discard & Draw` (keep the `2/2` badge on the right) |
| `ScorePanel` section title | `TOTAL SCORE` | `TOTAL SCORE` |
| `ScorePanel` selection hint | `Selected 1 / 5` | `Selected 1 / 5` |
| `EnhancementModal` descriptions | `Fire cards: chip ×1.1` | `Fire cards: chip ×1.1` (the Water/Grass variants must be translated too) |

Note that the boss name likely comes from a data source as well: either the backend returns a Chinese `boss.name` / `boss.id`, or the frontend has a Chinese mapping table. The i18n strategy must be confirmed:

- Option A: keep the boss names in the frontend and make them English only.
- Option B: change the backend to return English.
- Option C: keep `bossId` as the key and map to English in the frontend for now.

**Follow-up**:
- Search the frontend for remaining Chinese strings (recommended regex: `[\u4e00-\u9fff]`) and clean up anything not listed here.
- Also scan backend boss / hand type / error-message strings and align them with `language.md`.

---

## Round 12 — Rogue Page Has No Background Music

### Time
2026-05-11 19:54 (UTC+12)

### Action
- Opened `/rogue` directly from the address bar after logging in and started a Rogue match

### Reported Symptoms
There is **no background music** in Rogue. Lobby and PvE audio still work by comparison.

### Related Components / Files (Reference Only, Not Deeply Investigated)
- `frontend/src/utils/audioManager.js`: `bgm = new Audio('/audio/bgm.mp3')`, controlled by `audioManager.playBGM()`
- `frontend/src/router/index.jsx` `RootLayout`: only plays or pauses BGM when `isAuthenticated` changes
- `frontend/src/pages/RogueGamePage.jsx`: no active call to `audioManager.playBGM()` was observed on mount
- `frontend/src/pages/LoginPage.jsx:195`: login success explicitly calls `audioManager.playBGM()`

### Current Assessment
Only the symptom was recorded; the code was not deeply inspected yet. Likely directions:
- If the user entered Rogue from a flow that had paused the BGM, and Rogue does not explicitly resume it, audio remains silent.
- Rogue may need a different BGM than Lobby, but the project currently has only one `bgm.mp3`.

### Follow-up
- Decide whether Rogue should reuse Lobby BGM or have its own battle BGM.
- Make `RogueGamePage` call `playBGM()` on mount and stop or keep it according to the chosen strategy.
- Also check the PvE `GamePage` music behavior so both flows behave consistently.

---

## Round 13 — Change Color: Red 2 -> Green, Color Changes but Rank Jumps to 13

### Time
2026-05-11 19:57 (UTC+12)

### Action
- In a PvE / Rogue match, selected a red 2 (`FIRE_2`) and used the change-color skill
- Target color: green (`GRASS`)

### Reported Symptoms
- The color changed successfully: the card became green
- But the cost/rank became **13 (K)** instead of the expected same-rank replacement (`GRASS_2`, cost = 2)

### Code Path Investigated

#### Frontend emission
- `frontend/src/components/game/SkillBar.jsx:41`: `skillChangeColor(targetCard, newColor)` passes `targetCard.id` and the color string
- `frontend/src/hooks/useGameLogic.js:427-435`: emits
  ```js
  socket.emit('useSkill', {
    skill: 'changeColor',
    cardId,
    target: COLOR_TO_ELEMENT[newColor] ?? 'FIRE',
  });
  ```
  -> **no rank is transmitted**, only `cardId` and the target element

#### Backend processing
- `backend/src/pve/actions.ts:98-108` -> `doSkillChangeColor`
- `backend/src/lib/skills.ts:27-36`
  ```ts
  return swapCard({
    state, cardId,
    filter: (c) => c.id !== target.id && c.element === newElement,
    sortBy: (a, b) => Math.abs(a.rank - target.rank) - Math.abs(b.rank - target.rank),
  });
  ```
- `swapCard` (`skills.ts:57-76`):
  - `pool = [...deck, ...discardPile]`
  - `candidates = pool.filter(filter && !handIds.has(c.id))`
  - `candidates.sort(sortBy)` -> pick `candidates[0]` as the replacement

#### Frontend display
- `frontend/src/socket/pveSocketAdapter.js:36-47`: `adaptServerCard` maps `cost: card.rank` directly from the backend
- Therefore a card with `cost=13` means the backend returned rank 13

### Logic Question
According to `skillChangeColor`:
- target = `FIRE_2`, so `target.rank = 2`
- candidates = all cards in the pool with `element = GRASS` and not already in hand
- sort by `|rank - 2|` ascending and take the first card

The full deck contains 13 GRASS cards (rank 1-13), and `pool = deck + discardPile = 32` cards while hand can hold at most 7. So at most 6 GRASS cards are removed by `handIds`, meaning at least 7 GRASS cards still remain in the pool.

By distance from 2, `GRASS_2` should win, followed by `GRASS_1` / `GRASS_3`, then farther ranks. For `GRASS_13` to become `candidates[0]`, `GRASS_1` through `GRASS_12` would have to be absent from the pool, which is impossible with a 7-card hand.

### Hypotheses (Cannot Confirm from Code Alone; Need Repro Data)

1. **The sort was reversed or uses the wrong key somewhere**: the code in `skills.ts` looks correct, unless production is running different code.
2. **Target parsing is wrong**: maybe the backend resolves `target.rank` from `cardId` incorrectly. But `state.hand.find(c => c.id === cardId)` should give the original card object, so the rank should be correct.
3. **The user actually triggered `changeCost` instead of `changeColor`**: but that would not change the element, so it conflicts with the reported green card.
4. **The frontend display is wrong**: `adaptServerCard` uses `card.rank` as cost, so it should reflect backend state unless the backend really returned rank 13.
5. **A rare JS sort issue because of side effects / NaN**: unlikely, because `Math.abs(integer - integer)` does not produce `NaN`.
6. **Some later reducer or middleware overwrites `hand[i].rank` with 13**: needs a wider grep beyond `rank = 13` / `rank: 13`, including archive or replay code.

### Data Needed for Reproduction
- The full hand for the failing move, including each card's `id` / `name` / `cost`, plus current `discardCount` / `deckCount`
- Network -> WS frames in DevTools showing the `useSkill` payload and the returned `gameState.hand`
- Backend `docker compose logs backend` lines around that exact second

### User Follow-up (2026-05-11 20:03)
- Multiple reproductions suggest the rank after changing color looks **random**, not "same as original" or "nearest available".
- The user described it as "the card changes to a random rank rather than the original rank" (the phrase about "changing cost" was likely a typo; they meant the rank before `changeColor`).

### Compare with the Code Comment
The comment in `backend/src/lib/skills.ts:22-26` says:
> Search order: 1) same rank + target color; 2) the closest rank among the target color.

But the implementation does not do a separate "same rank first" check; it simply filters all cards of the target element and relies on `sortBy` by `|rank - target.rank|`. **In theory**, this is equivalent to the two-step search in the comment, and the result should be deterministic and close to the original rank.

### Further Hypotheses (Still Need Repro Data)
1. `candidates.sort(sortBy)` may not actually be taking effect, for example because the built output differs.
2. `target` might be wrong: `state.hand.find(c => c.id === cardId)` may return a hand card whose `rank` was already mutated.
3. The running code may not be this repository's code, for example the container is still using an old build.
   ```bash
   docker compose exec backend node -e "console.log(require('./dist/lib/skills.js').skillChangeColor.toString())"
   ```
4. The reducer may be reading stale hand state.

### Fix
**No code change yet; waiting for user approval and reproduction data.** This round only records the symptom and the investigation path.

### Suggested Immediate Next Step
- Temporarily add a `logger.info` line in `skills.ts` to print `target.id`, `target.rank`, and `candidates.slice(0,3).map(c => c.id)`. One repro would show whether the issue is sort failure or target mismatch. This is logging work and should be approved by the user first.

---

## Round 14 — Change Cost / Change Color Can Consume Energy Without Doing Anything

### Time
2026-05-11 20:08 (UTC+12)

### Action
- Repro path: hand already contains `BLUE_13` (blue 13), then use change-cost to try to turn another `BLUE_4` into rank 13

### Reported Symptoms
- The skill fires successfully (effects / sound), and energy decreases by 1
- But the `BLUE_4` card does **not** change at all (rank stays 4, color stays blue)
- In other words, one charge is spent for nothing

### Root Cause (Fairly Certain)

This bug is the result of two backend pieces working together:

**Step 1: `skillChangeCost` filter in `backend/src/lib/skills.ts:42-51`**
```ts
return swapCard({
  state, cardId,
  filter: (c) => c.id !== target.id && c.element === target.element && c.rank === newRank,
  sortBy: null,
});
```

**Step 2: `swapCard` excludes `handIds` in `backend/src/lib/skills.ts:57-76`**
```ts
const handIds = new Set(state.hand.map(c => c.id));
let candidates = pool.filter(c => filter(c) && !handIds.has(c.id));
const replacement = candidates[0];
if (!replacement) return { ...state unchanged };
```

Each `(element + rank)` combination has only one card in the deck (for example `BLUE_13` is unique). If the player already has `BLUE_13` in hand, there is no second `BLUE_13` in the pool, so `candidates` is empty and `swapCard` returns the hand unchanged.

**Step 3: `doSkillChangeCost` subtracts energy unconditionally in `backend/src/pve/actions.ts:114-122`**
```ts
export function doSkillChangeCost(ctx, cardId, newCost) {
  const ds = skillChangeCostFn(deckState(ctx), cardId, newCost);
  return {
    ...ctx,
    ...ds,
    roundState: {
      ...ctx.roundState,
      skills: { energy: Math.max(0, ctx.roundState.skills.energy - 1), shield: ... },
    },
  };
}
```

Whether `skillChangeCostFn` actually changed a card or not, energy is reduced by 1.

-> The charge is consumed, but the hand stays the same. `doSkillChangeColor` has the same pattern (`actions.ts:98-108`), so this is a shared class of "consume without effect" bugs for both change-color and change-cost.

### This Also Explains Part of Round 13
- When change-color cannot find any candidate of the target element, `swapCard` returns the original state while the frontend animation and energy deduction still happen.
- This does not by itself explain the rank-13 case, but it does confirm that the energy deduction is not linked to whether the replacement succeeded.

### Follow-up
Two possible fixes:

**Option A — Reject and do not spend energy when no replacement exists (recommended):**
- Make `swapCard` return a flag such as `{ ok: false, ... }` when there is no replacement
- Let `doSkillChangeCost` / `doSkillChangeColor` keep the original energy when `ok === false`
- Make `roundMachine.ts` return `err(ctx, 'no valid replacement')` so the frontend can show a failure instead of success

**Option B — Validate reachability on the frontend first:**
- Gray out target ranks / elements that cannot be replaced when the panel opens
- This only protects the UI and does not stop malicious clients

Option A is the better fix.

### Verification After Fix
- [ ] If the hand already contains `BLUE_13`, using changeCost(13) on `BLUE_4` should be rejected, show a frontend message, and keep energy unchanged
- [ ] If the hand does not contain `BLUE_13`, using changeCost(13) on `BLUE_4` should succeed and consume energy
- [ ] The same edge cases should be covered for changeColor when the target color / rank is already saturated

---

## Round 15 — Rogue Full House Preview vs Damage Mismatch, 401 Expired Token, and Missing Boss Intent Feedback

### Time
2026-05-11 20:12 (UTC+12)

### Action
- In Rogue mode, on the very first action of a fresh run, played five cards:
  red 13 / blue 13 / green 13 (three 13s) + two different-colored 10s (a pair of 10) -> hand type = `FULL_HOUSE`
- Frontend ScorePanel preview showed **594**, but actual damage was **330**

### Three Observations from the User

#### A. Preview score 594 does not match actual damage 330
- The ratio `330 / 594 ≈ 0.555` is neither a clean half (`DEFEND` would give 297) nor two-thirds.
- Possible explanations:
  1. Frontend `evaluateHand` / `HAND_SCORES_FRONTEND` differs from backend `lib/hand.ts` `calculateDamage`.
  2. Frontend preview already includes Rogue buffs (`ELEMENT_CHIP_MULT WATER 1.1` / `ALL_CHIPS_BONUS +2`), while backend does not, or vice versa.
  3. Frontend counts all 5 cards, while backend counts only the cards that belong to the hand type.
  4. The displayed 330 is the floating combat text, but backend final damage may have been recomputed by another buff. Need to inspect `payload.play.score` to know which side is wrong.

#### B. The boss has no intent feedback before the player acts
- This directly matches Round 10: Rogue mode also lacks visible attack / charge / defend feedback.
- The player therefore cannot tell whether the low damage is due to `DEFEND` or because the score calculation is off.

#### C. Console shows `401 Invalid or expired token` on `PUT /api/rogue/save`
- Full console frame:
  ```txt
  message: "Invalid or expired token"
  status: 401
  url: "/api/rogue/save"
  Authorization: Bearer eyJ... (iat=1778485825, exp=1778486725 -> 15 minute TTL)
  ```
- **This 401 is expected, not a bug**: access token TTL is 15 minutes (`docker-compose` sets `JWT_EXPIRES_IN=15m`), and the session had run longer than that.
- **The real root cause is still the Round 2 follow-up issue**: `frontend/src/api/authApi.js:35-41`'s `login` returns only `accessToken` and does **not** save the backend's `refreshToken`, so once access token expires the client cannot recover.
- Impact:
  - Rogue progress cannot be persisted (`saveRogueProgress` fails silently)
  - Any authenticated API will return 401
  - The user must log in again manually
- The client did not get kicked back to `/login` like `/rogue` because the axios response interceptor currently rethrows the error and does **not** call `clearAuth`, leaving the app in a stale "still logged in" state.

### Related Components / Files
- Score / damage: `backend/src/lib/hand.ts` `HAND_SCORES` and `calculateDamage`; frontend `useGameLogic.js` `HAND_SCORES_FRONTEND` and `evaluateHand`
- Boss intent UX: `BossVideoDisplay` / outer BossArea
- Auth: `frontend/src/api/authApi.js`, `frontend/src/api/client.js`, `frontend/src/store/authStore.js` (refresh token flow is not connected yet)

### Follow-up
- **Priority 1**: log `play.score` (backend-pushed `gameState.play.score`) and the frontend `evaluatedScore` in RogueGamePage after a play, so we can tell whether the frontend overestimates or the backend undercounts.
- **Priority 2**: wire `refreshToken` into the login flow so `authApi.login` returns and stores it, and the axios 401 path silently refreshes. This also reduces the 401 failures in Round 11.
- **Priority 3**: add boss intent UI as in Round 10.

---

<!-- Add future tests below as `Round N — Topic` sections.
Template:
## Round N — Title
### Time
### Action
### Reported Symptoms
### Related Components / Files
### Root Cause Analysis
### Fix
### Verification Steps
-->

## Round 16 — Rogue Buff Tags Too Small / Chinese Copy Remaining & Straight Damage Difference

### Time
2026-05-11 20:18 (UTC+12)

### 16.1 Buff labels exist but are too small, too faint, and still in Chinese

`RogueGamePage` already renders buff tags near the top, but:
1. `text-[10px]` + `text-stone-400` + dark background make them tiny and hard to see.
2. The three tags are still not fully English, which violates `language.md`:
   - `Water Mastery`
   - `Shuffle Guarantee`
   - `Chip Boost`
3. There is no hover tooltip explaining the actual numbers (`x1.1 chip / +2 chip`, etc.).

**Component involved**: `frontend/src/pages/RogueGamePage.jsx` (buff tag rendering area)

**Follow-up**: switch to English labels, increase contrast and size, and add tooltips.

---

### 16.2 Straight changes from 220 to 254: frontend preview ignores Rogue buffs while backend already includes them

Same-run buffs: `ALL_CHIPS_BONUS +2` (each card gets +2 chip) + `ELEMENT_CHIP_MULT WATER x1.1`.

| Hand Type | Frontend Preview | Backend Actual Damage | Difference |
|---|---|---|---|
| FULL_HOUSE | 594 | 330 | -264 |
| STRAIGHT | 220 | 254 | +34 |

Reverse check for straight: `(220 + 5x2) x 1.1 = 230 x 1.1 = 253 ≈ 254` ✅

**Conclusion**: frontend `evaluateHand` does **not** include Rogue buffs; backend `calculateDamage` does include them, so the preview misleads the player. The full-house delta `-264` still needs WS frame confirmation because it may also include boss `DEFEND` reduction.

**Files involved**: `frontend/src/utils/handEvaluator.js` (preview calculation), `backend/src/lib/damage.ts` (actual damage)

---

### 16.3 Two more 401s in this round (same expired token, already tracked in Round 15-C)

`PUT /api/rogue/save` still used the expired token (`exp=1778486725`) -> 401 x 2. Same root cause as before: no refresh-token flow. No separate item.

---

## Round 17 — Picking the SKILL_ENERGY_MAX Buff Does Not Increase SkillBar Charges

### Time
2026-05-11 20:22 (UTC+12)

### Reported Symptoms
After the player picked the enhancement "energy expansion" (`buff.type = SKILL_ENERGY_MAX, bonusEnergy: 1`), `SkillBar` still showed 3 charges instead of the expected 4.

### Related Components / Files
- `backend/src/utils/pveHandlers.ts` (`advanceLayer` socket handler, lines 276-313)
- `backend/src/types/buff.ts` (`applyPlayerBuffs`, lines 84-96)
- `backend/src/pve/runtime.ts` (correctly calls `applyPlayerBuffs` during initialization, lines 78-79)
- `frontend/src/hooks/useGameLogic.js` (`maxCharges: player.skillEnergyMax ?? 3`, line 513)
- `frontend/src/components/game/SkillBar.jsx` (`maxCharges` prop controls how many charge dots render, line 21)

### Root Cause

The `advanceLayer` socket handler merges the new buff and then builds `newCtx`:

```ts
// pveHandlers.ts ~L297-304
const newCtx: GameContext = {
  ...ctx,
  player: { ...ctx.player, hp: nextHp, maxHp: nextHp, buffs },  // buffs already include the new SKILL_ENERGY_MAX
  boss: nextBoss,
  round: 1,
  roundState: freshRoundState(ctx.player.skillEnergyMax, shuffleCount), // still using the old value 3
  battleResult: 'ONGOING',
};
```

`...ctx.player` carries over the old `skillEnergyMax` value (3), and `applyPlayerBuffs` is never called again to recompute the new one.

By contrast, `pve/runtime.ts` already does the right thing during initialization:
```ts
const { maxHp, skillEnergyMax } = applyPlayerBuffs(buffs, baseMaxHp, 3);
const player = createPlayerState({ hp: maxHp, maxHp, skillEnergyMax, buffs });
```

The same omission also exists in `restoreFromCheckpoint` (line 338).

The token-expired `PUT /api/rogue/choose-enhancement` 401 is a separate symptom and does not stop the socket `advanceLayer` event from running.

### Suggested Fix (No Code Change Yet)

In `advanceLayer`, after merging buffs, call `applyPlayerBuffs`:

```ts
import { applyPlayerBuffs } from '../types/buff.js';

// after merging buffs...
const BASE_ENERGY = 3;
const { skillEnergyMax: newEnergyMax } = applyPlayerBuffs(buffs, nextHp, BASE_ENERGY);

const newCtx: GameContext = {
  ...ctx,
  player: { ...ctx.player, hp: nextHp, maxHp: nextHp, buffs, skillEnergyMax: newEnergyMax },
  roundState: freshRoundState(newEnergyMax, shuffleCount),
  ...
};
```

Do the same in `restoreFromCheckpoint`.

### Verification Steps
1. After selecting "energy expansion", the `SkillBar` top number should change from 3 to 4 and render 4 dots.
2. In DevTools WS frames, `gameState.player.skillEnergyMax` should be 4.
3. `freshRoundState` should initialize `roundState.skills.energy` to 4.

---

## Round 18 — The "Energy Expansion (Unique)" Buff Can Be Picked Repeatedly

### Time
2026-05-11 20:24 (UTC+12)

### Reported Symptoms
At layer 6, "energy expansion" appears again and can be selected a second time. The saved payload contains two identical buffs:
- `skill_energy_5`: chosen on layer 5
- `skill_energy_6`: chosen again on layer 6 (different id, same content)

The description says "unique", but there is no actual restriction.

### Related Components / Files
- `backend/src/routes/rogue.js` lines 14-21 (`GET /upgrades`)
- `backend/src/types/buff.ts` lines 102-135 (`generateUpgradePool`, has an `excludeTypes` parameter but nothing passes it in)
- `frontend/src/hooks/useRogueLikeLogic.js` line 100 (`confirmEnhancement` pushes without deduplication)
- `frontend/src/api/rogueapi.js` lines 39-42 (`getUpgradeOptions` does not pass the owned list)

### Root Cause

**Backend**: `/upgrades` calls `generateUpgradePool` with the default `excludeTypes = []` and never passes the player's owned buff types. The "unique" label only exists in the description.

```js
// rogue.js:19 — excludeTypes is always empty
const options = layer === 1 ? FIRST_LAYER_UPGRADES : generateUpgradePool(chosenElement, layer);
```

**Frontend**: `confirmEnhancement` appends directly without checking uniqueness:
```js
// useRogueLikeLogic.js:100
const next = [...enhancementsRef.current, enhancement];
```

**Server-side merging does provide some protection**: in `advanceLayer`, identical `buffKey('SKILL_ENERGY_MAX:')` entries are overwritten rather than appended, so `player.buffs` keeps only one `SKILL_ENERGY_MAX`. But because of the Round 17 bug, `player.skillEnergyMax` still does not update.

### Suggested Fix (No Code Change Yet)

1. The `/upgrades` endpoint should accept the player's current enhancement buff types and pass them to `excludeTypes`:
   ```js
   generateUpgradePool(chosenElement, layer, alreadyOwnedTypes)
   ```
2. The frontend `getUpgradeOptions` call should pass the owned `buffTypes`, or `confirmEnhancement` should filter out already-owned unique buffs.

### Relation to Round 17
This issue is independent from Round 17. Even if Round 17 is fixed, repeated "unique" options would still appear unless the filter is corrected (though server-side merging may still collapse them later).

---

## Round 19 — Change Color Rank Changes Are Unstable (Supplement to Round 13)

### Time
2026-05-11 20:26 (UTC+12)

### User Follow-up
After change-color (`changeColor`), the rank sometimes stays the same and sometimes changes, which looks unstable rather than always changing the same way as in Round 13.

### Why It Appears Unstable — Mechanism Analysis

`skillChangeColor` uses a candidate pool of `deck + discardPile` (excluding cards already in hand):

```ts
filter: (c) => c.id !== target.id && c.element === newElement,
sortBy: (a, b) => Math.abs(a.rank - target.rank) - Math.abs(b.rank - target.rank),
```

There is only **one** card for each `(element, rank)` pair (for example `GRASS_2`). That unique card can be in one of three places:

| Location | Enter Candidate Pool? | Result |
|---|---|---|
| deck or discardPile | yes | distance 0, picked first -> rank unchanged |
| current hand (occupied by another slot) | no, filtered by `handIds` | next-nearest rank picked -> rank changes |
| already drawn and discarded earlier | yes, distance 0 | rank unchanged |

**Conclusion**: if the unique same-rank card of the target element is currently in hand, `candidates[0]` falls back to the nearest rank, which changes the cost. Otherwise the rank stays the same. This is not random; it depends on the exact current hand, which makes it feel unstable to players.

### Two Different "Unstable" Phenomena

| Type | Symptom | Mechanism |
|---|---|---|
| A. Built-in fallback | rank changes, but to the nearest available rank (for example 2 -> 3 or 2 -> 1) | same-rank card is in hand, so the pool picks the nearest alternative |
| B. The Round 13 report of jumping to 13 | rank changes and lands on a far rank such as 13 | still unconfirmed; could be target parsing or sort failure |

Type A is explainable but poor UX; Type B, if real, is an additional bug.

### Relation to Existing Notes
- Round 13: first report of the rank anomaly, with six hypotheses and a need for reproduction data
- Round 14: documented the shared change-cost / change-color "consume without effect" bug, which is separate

### Suggested Direction (No Code Change Yet)
- **Short-term UX fix for Type A**: show a tooltip in the change-color UI explaining that if the same-rank card is unavailable, the closest same-color card will be used.
- **Proper fix for Type A**: change `skillChangeColor` so that if the pool has no same-rank same-element card, it fails instead of silently falling back.
- **Type B**: add logging for `target.rank` and `candidates[0].rank` before trying to fix it.

---

## Round 20 — Hand Is Not Sorted, Making Selection Harder

### Time
2026-05-11 20:29 (UTC+12)

### Reported Symptoms
The hand is rendered in draw order and feels random: cards of the same color are not grouped, and within a color they are not sorted from high cost to low cost. Players have to scan the whole hand to find a target card.

### Related Components / Files
- `frontend/src/components/game/HandArea.jsx` line 125: `hand.map((card) => ...)` renders the backend order directly
- `frontend/src/pages/GamePage.jsx` lines 296-306: `hand` is passed straight from `useGameLogic`
- `frontend/src/pages/RogueGamePage.jsx` lines 271-274: same
- `frontend/src/socket/pveSocketAdapter.js`: `adaptServerCard` exposes `color` (`'red'|'blue'|'green'`) and `cost` (rank), which can be used for sorting

### Root Cause
The `hand` array returned by `useGameLogic.js` preserves the backend order, which in turn follows draw/replacement order. `HandArea` does not sort the data before rendering.

### Suggested Fix (No Code Change Yet)

Sort the hand for display only, without affecting ids or selection logic:

```js
// HandArea.jsx — sort before rendering, without changing props
const ELEMENT_ORDER = { red: 0, blue: 1, green: 2 };
const sortedHand = [...hand].sort((a, b) =>
  (ELEMENT_ORDER[a.color] ?? 3) - (ELEMENT_ORDER[b.color] ?? 3)
  || b.cost - a.cost   // within the same color, high cost first
);
// render sortedHand.map(...)
```

- This only changes display order; `selected` (which stores `card.id`), `toggleSelect`, and evaluation are not affected.
- The color order can be adjusted if needed.
- `GamePage` and `RogueGamePage` both use the same `HandArea`, so one change affects both.

---

## Round 21 — HP_BONUS Buff Does Not Apply, and HP Reset Behavior Is Inconsistent With the Buff Design

### Time
2026-05-11 20:31 (UTC+12)

### Reported Symptoms
After selecting the "health boost" (`HP_BONUS +5`), the saved payload still shows `playerHp` as 40 and HP does not change. The buff effect is not reflected, and the HP rules across layers are not consistent with the intended permanent bonus behavior.

### Related Components / Files
- `backend/src/utils/pveHandlers.ts` lines 284, 297-304 (`advanceLayer`)
- `backend/src/utils/pveHandlers.ts` lines 330, 333-340 (`restoreFromCheckpoint`)
- `backend/src/routes/rogue.js` lines 115-124 (`/floor-won`)
- `backend/src/lib/boss.ts` lines 30-33 (`playerHpForLayer`)
- `backend/src/types/buff.ts` lines 84-96 (`applyPlayerBuffs`)
- `backend/src/pve/runtime.ts` lines 76-79 (`applyPlayerBuffs` is correctly called during initialization)

### Root Cause

#### A. HP_BONUS is not applied at layer transitions (same root cause as Round 17)

`advanceLayer` builds `newCtx` like this:
```ts
const nextHp = playerHpForLayer(nextLayer);  // returns the layer base value (40)
player: { ...ctx.player, hp: nextHp, maxHp: nextHp, buffs }  // overwrites with base value, without applyPlayerBuffs
```

`applyPlayerBuffs` does support `HP_BONUS` (`maxHp += buff.bonusHp`), but it is not called in `advanceLayer`, `restoreFromCheckpoint`, or `/floor-won`, so the buff exists in `player.buffs` but has no effect on `player.maxHp`.

#### B. Layer HP reset and "permanent bonus" are not aligned at the design level

`playerHpForLayer` defines layer HP thresholds:
| Layer | Base HP |
|---|---|
| 1-3 | 20 |
| 4-6 | 30 |
| 7+ | 40 |

After each layer, HP is unconditionally reset to the layer standard (`/floor-won` explicitly notes that the previous layer's leftover HP is not carried over). That conflicts with the "max HP +5 (stackable)" semantics of `HP_BONUS`:

- Player expectation: "once I get it, my maximum HP is permanently +5 across later layers"
- Actual behavior: every layer resets HP to the layer base, so even if the buff is applied correctly it only affects the current layer

The result is that on layer 7+ the player already sits at 40 HP, but selecting `HP_BONUS +5` should yield 45. Because of the code bug it is not applied at all, and because of the layer-reset design the long-term meaning is unclear.

#### C. The same fix point needs to cover three places

| Location | Current State | Needed Change |
|---|---|---|
| `advanceLayer` (socket) | `hp/maxHp = playerHpForLayer(next)` | Call `applyPlayerBuffs(buffs, nextHp, BASE_ENERGY)` and then overwrite |
| `restoreFromCheckpoint` (socket) | same | same |
| `floor-won` (REST) | `playerHp/playerMaxHp = playerHpForLayer(next)` | Extract buffs from enhancements and call `applyPlayerBuffs` |

### Follow-up
1. **Code bug fix (A)**: call `applyPlayerBuffs` in all three places, together with the Round 17 `SKILL_ENERGY_MAX` fix.
2. **Design alignment (B)**: decide whether HP should keep the `HP_BONUS` bonus across layers, or whether the buff description should be changed to "max HP +5 for this layer" to avoid confusion.

---

## Round 22 — SkillBar Is Still Clickable During Boss Actions and Console Shows 401 After a Failed Run

### Time
2026-05-11 20:35 (UTC+12)

### 22.1 SkillBar stays active during boss attack/charge phases

#### Reported Symptoms
During boss attack/charge phases, `SkillBar` is still lit and clickable. It should be disabled when the player has no action window.

#### Related Components / Files
- `frontend/src/pages/RogueGamePage.jsx` lines 232-241: `SkillBar` does not receive `phase`
- `frontend/src/components/game/SkillBar.jsx` line 30: `const noCharges = skillCharges <= 0` is the only disable check, with no phase check
- `frontend/src/hooks/useGameLogic.js` line 482: `isActionPhase = phase === 'SKILL' || phase === 'SHUFFLE' || phase === 'PLAY'` already exists, but is only used for `canDiscard` / `canPlay`

#### Root Cause
`SkillBar` only checks whether charges are empty; it does **not** know about the current `phase`. `isActionPhase` is already computed in `useGameLogic`, but it is not passed through:

```jsx
// RogueGamePage.jsx:232-241 — missing phase / isActionPhase prop
<SkillBar
  hand={hand}
  skillCharges={skillCharges}
  maxCharges={maxCharges}
  skillCooldowns={skillCooldowns}
  ...
/>
```

`GamePage.jsx` has the same issue, so both modes are affected.

#### Suggested Fix (No Code Change Yet)
- Add `isActionPhase` to the `useGameLogic` return value, or pass `phase` directly.
- Add a `disabled` prop to `SkillBar` so all skill buttons are gray when `!isActionPhase`.
- Or conditionally render / overlay a mask at the `SkillBar` call site in both pages.

---

### 22.2 Console shows 401 after the run fails

#### Reported Symptoms
Once the failure screen appears, the console logs `AxiosError 401`.

#### Console Data (from this round)
| Request | Payload Summary | Status |
|---|---|---|
| `PUT /api/rogue/save` | `layer:8, playerHp:19, bossHp:552, totalRounds:5` | 401 |
| `PUT /api/rogue/save` | `layer:8, playerHp:19, bossHp:80, totalRounds:7` | 401 |

The token was the same as before (`iat=1778485825, exp=1778486725`, already expired), so the root cause is the same as Round 15-C.

#### Extra 401 Sources Unique to the Failure Path
1. **`notifyFloorLost()` itself**: `retryFloor` (`useRogueLikeLogic.js:120`) calls `notifyFloorLost()` and requires auth; with an expired token it returns 401, and the `catch(err)` only logs `Failed to retry floor` with no UI feedback.
2. **The final debounce save**: `useEffect` guards with `if (!gameLogic.bossHp || gameLogic.gameOver) return`; if `gameOver` becomes `'lose'` before the 3000ms debounce expires, the timer is cleared and no save is sent. But if `bossHp` hits 0 first and `gameOver` is set slightly later, there is a short window in which the save can still fire and return 401.

#### Suggested Follow-up
- Wire refresh token handling in (same recommendation as Round 15-C) to reduce all 401s.
- Show a UI message for 401 on `retryFloor` instead of only logging to the console.

---

# First Test Summary (Deep Dive)

> Test window: 2026-05-11 18:47 - 20:42 (UTC+12)  
> Scope: Login -> Lobby -> PvE -> Rogue Mode (layer 1-8)

---

## 1. Issue Overview

| Round | Title | Type | Severity | Status |
|---|---|---|---|---|
| 1 | Login page layout shift + Network Error | Bug / Config | High | Fixed |
| 2 | PvE socket handshake without token | Not a bug (history) | - | Confirmed not a bug |
| 3 | Lobby notification/brightness buttons not clickable | Placeholder | Low | Pending product decision |
| 4 | Profile page only shows placeholder `<h1>` | Unfinished feature | Medium | Pending implementation |
| 5 | Lobby recent matches header alignment | UX | Low | Pending fix |
| 6 | Hand area still visible after victory | UX | Low | Pending fix |
| 7 | Game page settings button does nothing | Placeholder | Low | Pending product decision |
| 8 | Rogue has no background music | Bug | Medium | Pending fix |
| 9 | Multiple Chinese strings in-game | Localization | Medium | Pending fix |
| 10 | Boss intent has no UX feedback | UX gap | High | Pending fix |
| 11 | Shield cooldown lacks UX feedback | UX gap | Medium | Pending fix |
| 13 | Change-color rank jumps to distant values | Bug | High | Root cause pending |
| 14 | Change-color/change-cost consume charge without effect | Bug | High | Pending fix |
| 15 | Full-house preview vs damage mismatch + token 401 | Bug + Config | High | Pending fix |
| 16 | Rogue buff tags too small / Chinese | Localization / UX | Medium | Pending fix |
| 17 | SKILL_ENERGY_MAX buff not applied | Bug | High | Pending fix |
| 18 | Unique buff can be selected repeatedly | Bug | Medium | Pending fix |
| 19 | Change-color rank changes appear unstable (extra analysis) | Bug | High | Root cause pending |
| 20 | Hand is unsorted, increasing cognitive load | UX | Medium | Pending fix |
| 21 | HP_BONUS not applied + layer HP reset design inconsistent | Bug + Design | High | Pending fix |
| 22 | SkillBar clickable during boss actions + 401 after failure | Bug / UX | High | Pending fix |

---

## 2. Root Cause Clusters

### Cluster A: `applyPlayerBuffs` was never called during layer transitions
**Impacted rounds**: 17, 21

`pve/runtime.ts` correctly calls:
```ts
const { maxHp, skillEnergyMax } = applyPlayerBuffs(buffs, baseMaxHp, 3);
```
But the following three places all missed it:

| Location | File | Line |
|---|---|---|
| `advanceLayer` socket handler | `pveHandlers.ts` | ~297 |
| `restoreFromCheckpoint` socket handler | `pveHandlers.ts` | ~333 |
| `POST /floor-won` REST route | `routes/rogue.js` | ~117 |

As a result, `SKILL_ENERGY_MAX` and `HP_BONUS` are stored in `player.buffs`, but `player.skillEnergyMax` and `player.maxHp` remain at the layer base value.

**Additional detail**: `freshRoundState(ctx.player.skillEnergyMax, shuffleCount)` in `advanceLayer` uses the old `ctx.player.skillEnergyMax`. Even if the value in `newCtx` is fixed later, `freshRoundState` still needs the new value.

**One fix can cover both buff types and all three call sites.**

---

### Cluster B: No silent refresh after JWT expiration
**Impacted rounds**: 15-C, 16.3, 17 (secondary 401s), 18 (secondary 401s), 22.2

- Access token TTL is 15 minutes, so long Rogue runs will eventually expire
- `authApi.login` returns `refreshToken` from the backend, but the frontend only stores `accessToken`
- No axios interceptor retries on 401
- Result: `/api/rogue/save`, `/api/rogue/choose-enhancement`, `/api/rogue/floor-won`, and `notifyFloorLost` can all fail
- `chooseEnhancement` only logs to the console on failure, so game progress can be lost silently; `retryFloor` gives no UI feedback

**Important detail**: `useRogueLikeLogic.js:105` calls `chooseEnhancement(enhancement).catch(console.error)` and does not stop `socket.emit('advanceLayer', ...)`. That means the socket state can progress normally while the REST save has already failed, leaving the player unaware until the next restart.

---

### Cluster C: Skill swap / energy consumption logic
**Impacted rounds**: 13, 14, 19

**C1 — Energy is deducted without checking whether a replacement exists (Round 14 root cause)**

In `actions.ts`, `doSkillChangeColor` / `doSkillChangeCost` deduct energy first and only then call `swapCard`:
```ts
ctx.roundState.skills.energy -= 1;       // unconditional deduction
const next = skillChangeColor(...);      // may return the original state if no card can be swapped
ctx.deckState = next;
```
When `swapCard` finds no candidate, it returns the original deck state, but energy was already spent.

**C2 — Rank after change-color appears unstable (Rounds 13, 19)**

Each `(element, rank)` combination is globally unique. If the same-rank card of the target element is currently in hand, `swapCard` filters it out and falls back to the next-nearest rank. That is deterministic, not random, but it looks unstable to players.

**Still-unconfirmed type B in C2**: if the replacement lands on a far rank like 13 instead of the nearest one, backend logs for `target.rank` and `candidates[0].rank` are needed to determine whether target parsing is broken or sort is failing.

---

### Cluster D: `SkillBar` does not know `phase`
**Impacted rounds**: 22.1

`isActionPhase` is already computed in `useGameLogic.js:482`, but it is only used for `canDiscard` / `canPlay` and not passed to `SkillBar`. `SkillBar` only checks `skillCharges <= 0`, so the buttons stay lit through `BOSS_ATTACK`, `BOSS_TELEGRAPH`, and `DRAW`.

**Additional note**: both `GamePage.jsx` and `RogueGamePage.jsx` are affected. Adding `isActionPhase` to the `useGameLogic` return value would be enough.

---

### Cluster E: Localization / Chinese strings
**Impacted rounds**: 9 (multiple places), 11, 16.1

| Component | Chinese Copy | Correct English |
|---|---|---|
| Rogue buff tag | `Water Mastery` | `Water Mastery` |
| Rogue buff tag | `Shuffle Guarantee` | `Shuffle Guarantee` |
| Rogue buff tag | `Chip Boost` | `Chip Boost` |
| Enhancement descriptions | all Chinese | translate all per `language.md` |
| Win/Lose overlay | `Victory!`, `Game Over`, `Play Again` | `Victory!`, `Game Over`, `Play Again` |

The buff descriptions are hard-coded in Chinese inside `buff.ts` and need to be translated at the data source.

---

### Cluster F: Frontend preview score does not include Rogue buffs
**Impacted rounds**: 15-A, 16.2

The reverse check confirms:
- Straight: `(220 + 5x2) x 1.1 = 253 ≈ 254` ✅ (backend includes buffs)
- The frontend `evaluateHand` has no buff input, so its preview score is only the base score

`HandTypeDisplay` and `ScorePanel` are showing the frontend-calculated value, which makes players make decisions based on an understated preview.

---

### Cluster G: The "unique" buff can be selected multiple times
**Impacted rounds**: 18

`GET /upgrades` calls `generateUpgradePool(chosenElement, layer)` with `excludeTypes` always set to `[]`, because the endpoint never receives or reads the player's current buff list. The `excludeTypes` parameter exists but is never populated.

**Additional detail**: in `advanceLayer`, the `buffKey` deduplication (`SKILL_ENERGY_MAX:` identical keys) overwrites existing entries instead of appending them, so the server-side `player.buffs` actually keeps one copy. However, the UI still shows duplicate choices and the frontend array still contains duplicates, which is a data-quality and UX issue.

---

## 3. Fix Priority and Dependencies

```txt
P0 — Blocks gameplay
├── Cluster A: add applyPlayerBuffs in three places (R17 + R21)
│     └── One PR, fixing pveHandlers.ts x2 + rogue.js x1
├── Cluster C1: link energy deduction to swap success (R14)
│     └── actions.ts: check whether swapCard succeeded before deducting energy
└── Cluster D: phase lock for SkillBar (R22.1)
      └── expose isActionPhase from useGameLogic -> SkillBar receives disabled prop

P1 — Affects data integrity
├── Cluster B: refresh token flow (R15-C and all 401s)
│     └── authApi.js stores refreshToken + axios 401 interceptor
└── Cluster G: repeated "unique" selection (R18)
      └── GET /upgrades accepts excludedTypes, or frontend deduplicates on confirmation

P2 — Affects decision quality
├── Cluster F: preview score includes Rogue buffs (R15-A, R16.2)
│     └── evaluateHand accepts enhancements and applies buffs
└── Cluster C2: explain fallback behavior when same-rank replacement is unavailable (R13, R19)
      └── Short term: tooltip; long term: reject with an error when no same-rank card is available

P3 — UX and polish
├── Boss intent UI (R10)
├── SkillBar cooldown visuals (R11)
├── Rogue BGM (R8)
├── Hand sorting (R20) — smallest change, can be done first
├── Localization leftovers (R9, R16.1, Cluster E)
└── HP reset design decision (R21-B)

P4 — Placeholder features (leave alone for now)
├── Profile page (R4)
├── Lobby notifications/brightness (R3)
└── In-game settings button (R7)
```

---

## 4. Cross-Layer Risk Points

1. **Cluster A + Cluster B combine badly**: even if `applyPlayerBuffs` is fixed, if token expiration causes `choose-enhancement` to fail before `advanceLayer`, the buff exists only in frontend memory and not in the DB. After restart, `restoreFromCheckpoint` reads the old save and all new buffs are lost. **Both clusters need to be fixed together for persistence to be reliable.**

2. **C2 (unstable change-color) and C1 (energy deduction without effect) share the same `swapCard` chain**: when fixing C1, make sure the C2 path is not broken. The best approach is to return a `{ state, replaced: boolean }` style result from `swapCard` and decide on energy deduction from `replaced`.

3. **Hand sorting (R20) is independent of `selectionIndex`**: sorting only changes the displayed `sortedHand`; `selected` still stores `card.id`, and the sequence number still comes from `selected.indexOf(card.id)`, so gameplay is unaffected.

4. **The localization issue originates in hard-coded Chinese strings in `buff.ts`**: `generateUpgradePool`'s `label` and `description` fields are all Chinese; translating only the frontend layer would make the UI and the underlying data disagree.

---

# Second Round: Claude Code CLI Change Verification (2026-05-11 23:30)

## 1. Overview: Issues the CLI attempted to fix

| Round / Cluster | Status | Notes |
|---|---|---|
| **R14 / Cluster C1** energy deduction linked to swap result | Fixed | `swapCard` returns `{state, replaced}`, and `actions.ts` only deducts energy when `replaced` is true |
| **R17 / Cluster A** SKILL_ENERGY_MAX not applied | Fixed | `pveHandlers.ts` three places + `rogue.js` `/floor-won` now all call `applyPlayerBuffs` |
| **R21 / Cluster A** HP_BONUS not applied | Fixed | Same as above; Cluster A is fully resolved |
| **R18 / Cluster G** repeated unique buff selection | Fixed | `/upgrades` accepts `excludeTypes`, and frontend `useRogueLikeLogic` passes owned types |
| **R22.1 / Cluster D** SkillBar phase lock | Fixed, after two CLI typos were corrected | `useGameLogic` exports `isActionPhase`, `SkillBar` accepts `disabled` |
| **R10** Boss intent UI | Fixed | `Battlefield` now shows `bossRound.intent` (ATTACK/CHARGE/DEFEND/BURST labels) |
| **R11** Shield cooldown UX | Fixed | `SkillSlot` shows a gold `CD` pulse badge and `cdPulse` animation while active |
| **R16.1** Buff tags too small | Fixed | `HandArea` now includes a `BuffTag` component with hover tooltip and an `Active Enhancements` details panel |
| **R14 user-facing feedback** | Improved | Backend emits a `skillWarning` socket event and frontend `useGameLogic` clears it after 2.5s |
| **R15-C / Cluster B** Refresh token | Partially fixed | `LoginPage` stores `refreshToken`, `authStore` has a `refreshToken` field, but `client.js` still lacks a 401 auto-refresh interceptor (`tokenUtils.js` is ready; the last step is missing) |

---

## 2. New Bugs Introduced by the CLI (Now Fixed Here)

### Bug X1: `RogueGamePage.jsx` line 234 had misplaced JSX and a stray `t`
```@d:\DESKTOP\auckland uni\2026 Semester 1\CompSci 732\team\CardGame\frontend\src\pages\RogueGamePage.jsx:233-234
        />
t          disabled={!isActionPhase}
```
`disabled` should have been a prop on `<SkillBar>` before `/>`, but the CLI wrote it after `<SkillBar />`, and there was also a stray leading `t`. This caused: 1) `SkillBar` never received `disabled`, so the phase lock failed; 2) an extra text node was rendered; 3) combined with Bug X2 below, it triggered a render crash. **Fixed.**

### Bug X2: `RogueGamePage.jsx` line 47 destructuring missed `bossRound`
```@d:\DESKTOP\auckland uni\2026 Semester 1\CompSci 732\team\CardGame\frontend\src\pages\RogueGamePage.jsx:47
    isActionPhase, connectionStatus, errorMessage,
```
But line 242 used `<Battlefield bossRound={bossRound} />`, which caused `ReferenceError: bossRound is not defined` -> React Router ErrorBoundary -> console log `Error handled by React Router default ErrorBoundary: {}` (the Error object becomes `{}` when JSON serialized) -> the whole `/rogue` page went white-screen. **Fixed** by adding `bossRound` to the destructuring.

### Bug X3: `GamePage.jsx` line 267 had the same misplaced JSX
PvE normal mode was affected by the same issue. **Fixed.**

### Bug X4: `backend/src/routes/rogue.js` `/floor-won` had a TDZ error
```@d:\DESKTOP\auckland uni\2026 Semester 1\CompSci 732\team\CardGame\backend\src\routes\rogue.js:121-125 (before fix)
    const allEnhancements = enhancements ?? save?.snapshot?.enhancements ?? [];
    const buffs = allEnhancements.map(...);
    const { maxHp } = applyPlayerBuffs(buffs, baseHp, 3);

    const save = await loadGame(userId);   // declared after it is used
```
`save` is a `const`, so using it before declaration threw `ReferenceError: Cannot access 'save' before initialization`. Every `/floor-won` call returned 500. **Fixed** by loading the save before using `save?.snapshot.enhancements`.

---

## 3. Issues Still Unfixed / Unchanged

| Round | Status | Notes |
|---|---|---|
| **R8** Rogue no BGM | Unfixed | `RogueGamePage` still does not call `audioManager.playBGM` |
| **R9 / R16.1 / Cluster E** non-English leftovers | Unfixed | `buff.ts` hard-coded labels/descriptions remain non-English; the Win/Lose overlay still needs a full English pass |
| **R13 / R19 / Cluster C2** rank jumps / unstable behavior | Partially mitigated | C1 stopped "energy spent but nothing happened", but the fallback UX when same-rank replacement is unavailable is still unresolved; the far-jump case in R13 still needs backend log confirmation |
| **R15-A / R16.2 / Cluster F** frontend preview does not include buffs | Unfixed | `evaluateHand` still does not receive enhancements |
| **R15-C / Cluster B** full refresh-token flow | 50% complete | `client.js` still lacks a 401 interceptor |
| **R20** hand sorting | Unfixed | `HandArea` still renders `hand.map` directly and does not sort by color + high cost |
| **R21-B** cross-layer HP reset design | Undecided | `applyPlayerBuffs` now works, but `playerHpForLayer` still resets to the layer base; the meaning of "+5 permanent" remains unclear and needs product decision |
| **R22.2** console 401 after failure | Partial | Cluster B remains incomplete; `/floor-won` no longer 500s after X4, but expired-token 401s still occur |

---

## 4. Suggested Re-test Path

1. **Enter Rogue mode**: confirm the page loads correctly (X1/X2/X3 fixed)
2. **Pass layer 1 -> choose "energy expansion" / "health boost"**: verify R17 / R21 - the next layer should show +1 SkillBar charge and +5 max HP
3. **Reach layer 4+ repeatedly**: verify R18 - unique buffs should no longer appear multiple times
4. **Reach a boss action phase**: verify R10 (ATTACK/CHARGE icons appear) and R22.1 (the three SkillBar buttons are grayed out)
5. **Spend energy, then try change-color/change-cost with no valid replacement**: verify R14 - energy should not be spent, and a short `No valid replacement found` message should appear
6. **Wait 15+ minutes and then act**: verify Cluster B - 401s still occur (which means the `client.js` interceptor is still missing and the user must log in again)

---

## 5. Code Changed in This Round

| File | Lines | Change |
|---|---|---|
| `frontend/src/pages/RogueGamePage.jsx` | 47 | Added `bossRound` to destructuring |
| `frontend/src/pages/RogueGamePage.jsx` | 233-234 | Removed the misplaced line and moved `disabled` into the SkillBar props |
| `frontend/src/pages/GamePage.jsx` | 266-267 | Removed the misplaced line and moved `disabled` into the SkillBar props |
| `backend/src/routes/rogue.js` | 121-125 | Reordered declarations: `await loadGame` first, then use `save?.snapshot.enhancements` |
