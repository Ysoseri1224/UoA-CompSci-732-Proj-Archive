# Skill Texas Hold'em - Software Requirements Specification

**Version**: v2.0  
**Date**: 2026-03-19  
**Project Name**: Skill Texas Hold'em  
**Course**: COMPSCI 732 Software Tools and Techniques  
**Team**: Works on My Machine  
**Members**: Zengguang Feng · Zihan Zhao · Yi Lin · Manqi Wang · Zhihuan Wei · Sheng Xiao  
**Tech Stack**: MERN (MongoDB, Express, React, Node.js) + Socket.io  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [User System](#3-user-system)
4. [Rooms and Matchmaking](#4-rooms-and-matchmaking)
5. [Skill Selection](#5-skill-selection)
6. [Single-Hand Flow](#6-single-hand-flow)
7. [Betting System](#7-betting-system)
8. [Hand Evaluation and Settlement](#8-hand-evaluation-and-settlement)
9. [Energy System](#9-energy-system)
10. [Skill System](#10-skill-system)
11. [Event Log](#11-event-log)
12. [Disconnect and Reconnect](#12-disconnect-and-reconnect)
13. [Match History and Statistics Panel](#13-match-history-and-statistics-panel)
14. [Achievement Unlock System](#14-achievement-unlock-system)
15. [Match Replay Feature](#15-match-replay-feature)
16. [Non-Functional Requirements](#16-non-functional-requirements)
17. [Frontend UI Specification](#17-frontend-ui-specification)
18. [Data Model (MongoDB Schema)](#18-data-model-mongodb-schema)
19. [REST API Endpoints](#19-rest-api-endpoints)
20. [Socket.io Event Protocol](#20-socketio-event-protocol)
21. [Edge Case Handling](#21-edge-case-handling)
22. [Workload Estimation](#22-workload-estimation)

---

## 1. Project Overview

**Skill Texas Hold'em** is a browser-based multiplayer real-time competitive card game. It is built on standard multiplayer Texas Hold'em while preserving the full betting flow and hand-evaluation rules, then adds a **skill system** to increase strategic depth through information control and resource disruption.

**Core features:**
- Supports multiplayer matches (2-6 players). Each player starts with 1000 chips. A player is eliminated when their chips reach zero, and the last surviving player wins.
- Each hand provides a fixed 8 energy points, which are allocated across the 2 skills selected before the match starts.
- All game logic runs on the server; the frontend is responsible only for rendering.
- Complete user system: registration, login, and profile data persisted in MongoDB.
- Rich MongoDB-driven features such as match statistics, achievement unlocks, and match replays.

**Design motivation (from the course proposal):**  
Traditional online poker depends heavily on luck and psychological play, with limited controllable strategy. By introducing a skill system, players can make active decisions in every hand that affect information symmetry and pot size, giving the game both the familiarity of poker and the agency of a strategy game.

---

## 2. Tech Stack

| Layer | Technology | Description |
|------|------|------|
| **Frontend** | React + Tailwind CSS | Component-based UI, pure rendering layer, no game logic |
| **Backend Framework** | Node.js + Express | RESTful API service, user authentication, match-history and achievement endpoints |
| **Realtime Communication** | Socket.io | Real-time bidirectional sync of game state and skill events |
| **Hand Evaluation** | pokersolver (npm) | Automatically computes the best 5-card hand out of 7 cards |
| **Game State** | Server memory (Room object) | Single-match state exists in memory for the duration of the match |
| **Database** | MongoDB (Mongoose) | Persistent storage for users, match history, achievements, and replay data |
| **Authentication** | JWT (jsonwebtoken) | Stateless authentication, token stored on the client |
| **Quick Match Queue** | Redis | Maintains the waiting matchmaking queue, optional implementation |

---

## 3. User System

### 3.1 Registration and Login

**Registration (POST /api/auth/register)**
- Fields: `username` (unique, 3-20 characters), `email` (unique), `password` (>= 8 characters, stored with bcrypt hashing)
- Returns a JWT token after successful registration
- Duplicate username or duplicate email returns a clear error message

**Login (POST /api/auth/login)**
- Fields: `email` + `password`
- Returns a JWT token after successful verification (valid for 7 days)
- Wrong password and nonexistent user both return the same error message (to prevent enumeration attacks)

**Token Refresh (POST /api/auth/refresh)**
- Uses a refresh token to obtain a new access token

### 3.2 User Profile

**View Profile (GET /api/users/:userId)**
- Public fields: `username`, `avatar`, `createdAt`, `totalWins`, `totalGames`, `achievements` (unlocked list)

**Edit Profile (PUT /api/users/me)**
- Editable fields: `username` (with uniqueness check), `avatar` (avatar URL or preset avatar ID)
- Requires JWT authentication

**Change Password (PUT /api/users/me/password)**
- Requires verification of the old password

### 3.3 Frontend Pages

- **Registration Page**: form + real-time validation
- **Login Page**: form + remember me (LocalStorage token)
- **Profile Page**: avatar, username, win-rate donut chart, recent match list, unlocked achievements display
- **Navigation Bar**: shows username, avatar, and logout button after login; shows login/register entry when logged out

---

## 4. Rooms and Matchmaking

### 4.1 Room Code Invitation

- Logged-in users can create a room, and the server generates a unique 6-digit room code
- Other users join by entering the room code. Supports 2-6 players. The host can start manually, or the room automatically enters the skill-selection phase when full.
- Room state is stored in server memory (Room object) and is decoupled from MongoDB user data
- The room code becomes invalid after the match ends

### 4.2 Quick Match

- The user clicks **Quick Match** to enter the Redis waiting queue
- When another waiting player exists in the queue, they are matched immediately and a room is created; both sides receive the `matchFound` event at the same time
- The frontend shows a **Matching...** waiting UI with a cancel button (`cancelMatch` event)
- If Redis is unavailable, the system degrades to a polling in-memory queue

---

## 5. Skill Selection

- **Timing**: after both players enter the room and before cards are dealt, show the skill-selection screen
- **Rule**: each player selects **2** skills from **6 skills** (the skill pool is extensible; see Chapter 10)
- **Visibility**: after both sides finish selecting, each side can see the names of the opponent's selected skills
- **Constraint**: each skill can be used at most once per hand; if energy is insufficient, the button is disabled
- **Timeout**: the selection screen has a 30-second limit; if time runs out, 2 skills are assigned randomly

---

## 6. Single-Hand Flow

Each hand is played in the following order (standard Heads-Up Texas Hold'em flow):

| Stage | Action | Skill Window |
|------|------|----------|
| **Deal** | Each side receives 2 hole cards; energy resets to 8; blinds are collected | Window A (3 seconds): information-type skills may be used (`Clue Scan`) |
| **Pre-Flop Betting** | Standard Texas Hold'em betting flow; dealer acts first | `Double Pact` may be used (independent trigger) |
| **Flop** | Reveal 3 community cards | Window B (4 seconds): swap skills (`Desperate Draw`) and `Clue Scan` may be used |
| **Flop Betting** | Standard Texas Hold'em betting flow; big blind acts first | `Double Pact` may be used |
| **Turn** | Reveal the 4th community card | Window C (4 seconds): `Clue Scan` may be used |
| **Turn Betting** | Standard Texas Hold'em betting flow | `Double Pact` may be used |
| **River** | Reveal the 5th community card | Window D (4 seconds): `Clue Scan` may be used; last chance before showdown |
| **River Betting** | Standard Texas Hold'em betting flow | `Double Pact` may be used |
| **Showdown & Settlement** | `pokersolver` compares the best 5 out of 7 cards; show hand score; settle chips; reset energy; write replay record | - |

### Dealer Rules
- The dealer rotates clockwise each hand; the player to the dealer's left posts the small blind (SB), and the next player posts the big blind (BB)
- Pre-Flop: the player to the left of the big blind acts first, and action proceeds clockwise; after the Flop: the small blind (or the leftmost surviving player) acts first
- When skill conflicts occur, the player later in the action order has reaction priority

### Decision Time Limit
- Each action (bet/fold/check) has a **15-second** limit, with the countdown shown in the action area
- On timeout: auto-fold if there is a required call amount; auto-check if there is no required call amount
- If a skill window times out, that window is skipped with no skill use

---

## 7. Betting System

The game follows standard Texas Hold'em betting rules and supports the following actions:

| Action | Trigger Condition | Description |
|------|----------|------|
| **Check** | No one has bet in the current round | Keeps the current state and moves to the next stage or the opponent's turn |
| **Bet** | No one has bet in the current round | Enter an amount with a slider; minimum is the big blind amount |
| **Call** | The opponent has already bet or raised | Matches the current highest bet |
| **Raise** | The opponent has already bet | The raise amount must be at least 2x the current highest bet |
| **Fold** | Any time | Give up the current hand, and the opponent wins the pot |
| **All-in** | Any time | Push all remaining chips into the pot |

**Blind settings:**
- Small blind: 10 chips; big blind: 20 chips (fixed, does not change during the match)

---

## 8. Hand Evaluation and Settlement

The project uses the `pokersolver` npm package to automatically compute the best 5-card combination out of 7 cards.

### 8.1 Hand Ranking (Highest to Lowest)

| Rank | Hand Type | Base Score | Description |
|------|------|----------|------|
| 1 | Royal Flush | 30 | A-K-Q-J-10 of the same suit |
| 2 | Straight Flush | 25 | Five consecutive cards of the same suit (not ace-high royal) |
| 3 | Four of a Kind | 22 | Four cards of the same rank + 1 kicker |
| 4 | Full House | 18 | Three of a kind + one pair |
| 5 | Flush | 15 | Five cards of the same suit (not consecutive) |
| 6 | Straight | 14 | Five consecutive cards of mixed suits |
| 7 | Three of a Kind | 10 | Three cards of the same rank + 2 unrelated cards |
| 8 | Two Pair | 8 | Two different pairs + 1 kicker |
| 9 | One Pair | 5 | One pair + 3 unrelated cards |
| 10 | High Card | 2 | Does not form any of the above hand types |

> The base score comes from the PDF requirement and is used only to present an intuitive "hand strength score" in the UI during showdown. It does not affect win/loss determination, which is still decided by `pokersolver`.

### 8.2 Card Rank Bonus (Display Score Only)

Card rank bonuses are added on top of the base score to distinguish hands of the same type numerically. This is only for UI display and does not affect the winner.

| Hand Type | Bonus Formula |
|------|----------|
| High Card | Highest card rank / 4 (A=14, K=13, Q=12, J=11) |
| One Pair | Pair rank / 2 |
| Two Pair | Higher pair rank / 2 |
| Three of a Kind | Three-of-a-kind rank / 2 |
| Straight / Flush | Highest card rank / 3 |
| Full House / Four of a Kind / Straight Flush | Core rank / 2 |

### 8.3 Same-Hand Comparison (Kicker Rules, handled by pokersolver)

- **Four of a Kind**: compare the four-card rank first; if equal, compare the kicker
- **Full House**: compare the triple rank first; if equal, compare the pair rank
- **Flush / High Card**: compare from the highest card downward
- **Straight / Straight Flush**: compare the highest card; in A-2-3-4-5, ace counts as the lowest card
- **Three of a Kind**: compare the triple rank, then compare the two kickers in order
- **Two Pair**: compare the higher pair first, then the lower pair, then the kicker
- **One Pair**: compare the pair rank, then compare the three kickers in order

### 8.4 Special Rule for Ace

- Rank order: A > K > Q > J > 10 > ... > 2
- In a straight, ace can be the highest card (A-K-Q-J-10) or the lowest card (A-2-3-4-5)

### 8.5 Chip Settlement Logic

- The winner takes all chips in the pot for that hand
- **Tie**: the pot is split evenly; both sides gain +2 energy before the hand's energy reset
- If a player's chips reach zero, that player is eliminated; the last surviving player wins and a MongoDB match-history record is written

---

## 9. Energy System

| Condition | Energy Change |
|------|----------|
| Start of each hand | Reset to a fixed **8 points** |
| Tie | Both sides gain **+2 points** (settled before reset, capped at 8) |
| Skill usage | Deduct based on the skill's energy cost |
| Per-hand cap | **8 points** maximum |
| Insufficient energy | The corresponding skill button is disabled |

> Energy **does not carry across hands**. It fully resets after each hand. The fixed-energy system makes each hand's skill decisions more focused: when to spend energy and how much to spend is the core strategic choice.

---

## 10. Skill System

Before the match starts, each player selects **2** skills from **6 skills**. The skill pool is designed as an extensible array. New skills can be added by inserting new skill objects without changing the core settlement logic.

### 10.1 Skill Pool (6 Skills)

| Skill Name | Type | Energy Cost | Effect Description |
|--------|------|----------|----------|
| **Clue Scan** | Active | 3 points | View one random hole card from the opponent. The result is visible only to the user who cast it (targeted push). The opponent only knows that one hole card was viewed, not which card it was. |
| **Desperate Draw** | Active | 2 points | Replace one random hole card of your own with a random card from the deck. The result may be better or worse. The opponent knows a swap happened but not which card changed. The best 5-card hand is recalculated automatically after the swap. |
| **Double Pact** | Active | 3 points | Propose doubling the current hand's pot to the opponent. The opponent has 5 seconds to respond: if accepted, the pot is doubled for this hand; if rejected or timed out, the **responding side** loses 1 energy point, and the proposer spends no energy. |
| **Reflect Shield** | Reactive | 2 points | React immediately after the opponent uses a skill (within 5 seconds): negate that skill effect and reflect it back to the opponent. The opponent still pays the energy cost as normal. **Only `Clue Scan` and `Desperate Draw` can be reflected.** `Double Pact` cannot be reflected. |
| **Precision Swap** | Active | 4 points | Replace one **chosen** hole card of your own with a random card from the deck. This is more controllable than `Desperate Draw` because the user selects which card to replace. The opponent knows the swap happened. |
| **Information Lock** | Active | 3 points | During the current hand, the opponent's `Clue Scan` and `Precision Swap` cannot affect you. After activation, the effect is visible to both sides in the event log. |

### 10.2 Skill Availability Windows

| Skill | When It Can Be Used |
|------|-------------|
| **Clue Scan** | Any skill window (Window A after deal, Window B on the Flop, Window C on the Turn, Window D on the River) |
| **Desperate Draw** | Window A after deal, Window B on the Flop (swapping is more meaningful before more community cards appear) |
| **Precision Swap** | Window A after deal, Window B on the Flop |
| **Double Pact** | Before the start of any betting stage (independent trigger, does not occupy a skill window) |
| **Information Lock** | Any skill window |
| **Reflect Shield** | Within 5 seconds in the same window after the opponent uses `Clue Scan`, `Desperate Draw`, or `Precision Swap` |

### 10.3 Skill Trigger Order and Rules

- **Sequential trigger**: the player whose turn it is may use a skill, and the server processes skills in sequence without concurrent conflicts
- **Per-hand limit**: each skill can be used at most once per hand
- **Target selection**: in multiplayer matches, skills that require a target (such as `Clue Scan` and `Precision Swap`) require the player to manually choose the target player
- **Reflect Shield confirmation**: before the opponent's skill takes effect, the server pushes a confirmation modal to the player holding `Reflect Shield` (5-second countdown). If time runs out, it is treated as a pass and no energy is consumed for `Reflect Shield`.

---

## 11. Event Log

- Located on the right side of the game page and scrolls in real time to display all game events
- Format: `[HH:MM:SS] Event description`, with separate "you" and "opponent" perspectives
- All skill feedback is shown **only through event-log text**, with no animation effects
- After the match ends, the log content is written into MongoDB as part of the replay data

### Log Examples

| Trigger Event | Log Text (self perspective) |
|----------|---------------------|
| `Clue Scan` (caster) | "You used Clue Scan and saw the opponent's hole card: Ace of Spades" |
| `Clue Scan` (target) | "The opponent viewed one of your hole cards" |
| `Desperate Draw` (caster) | "You used Desperate Draw, and your hole card was replaced at random" |
| `Desperate Draw` (opponent side) | "The opponent replaced one of their hole cards" |
| `Precision Swap` (caster) | "You used Precision Swap and chose to replace the 3 of Hearts" |
| `Double Pact` (receiver) | "The opponent proposed Double Pact. Accept? (5 seconds)" |
| `Double Pact` (accepted) | "Double Pact succeeded. The pot for this hand is doubled" |
| `Double Pact` (rejected/timeout) | "Double Pact was rejected. The opponent lost 1 energy point" |
| `Reflect Shield` triggered | "Reflect Shield triggered! The opponent's Clue Scan was reflected back to them" |
| `Information Lock` | "The opponent activated Information Lock. You cannot inspect their hole cards during this hand" |
| Tie | "This hand ended in a tie. The pot was split, and both sides gained +2 energy" |
| Player eliminated | "Player X has run out of chips and has been eliminated" |
| Match ended | "Match over! You won the game and gained +1 win" |

---

## 12. Disconnect and Reconnect

- After a player disconnects, the server preserves that player's room state for **30 seconds**
- If the player reconnects within 30 seconds: restore the full game state through the `reconnectState` event and continue the match
- If the timeout expires (30 seconds): the current hand auto-folds for that player, the current pot is settled normally among the remaining players, and if only one player remains alive the match ends and the result is written to match history
- If it becomes the disconnected player's turn during the disconnect period, the 15-second timer still counts down normally and the timeout action is applied automatically

---

## 13. Match History and Statistics Panel

### 13.1 Match Record

After each match ends, the match result is written to MongoDB:

- winner and loser (`userId`)
- number of hands played
- selected skill lists for both sides
- usage counts for each side's skills
- match end timestamp
- match duration (seconds)
- final chip ratio (winner/loser)

### 13.2 Personal Statistics Panel

**Frontend page: Profile -> Statistics tab**

| Metric | Description |
|--------|------|
| Total Matches | Total number of matches played |
| Win Rate | Wins / total matches (percentage + donut chart) |
| Average Match Duration | Average duration across all matches |
| Top 3 Most Used Skills | Bar chart of skill usage frequency |
| Highest Win-Rate Skill | Win rate when using that skill |
| Recent 10 Match List | Participant list, result, hand count, date |

### 13.3 Global Leaderboard

**Frontend page: Leaderboard**

- Sorted by win rate (minimum 10 matches required to be listed, to prevent polluted rankings)
- Displayed fields: rank, avatar, username, win rate, total matches
- Supports switching sort order between **Win Rate** and **Total Wins**
- Updates in real time after each match ends

---

## 14. Achievement Unlock System

Achievement data is stored in MongoDB and linked to the user document after unlock. Unlocked achievements are displayed as badges on the profile page.

### 14.1 Achievement List

| Achievement Name | Unlock Condition | Type |
|----------|----------|------|
| **First Steps** | Complete the 1st match | Progress |
| **Three in a Row** | Win 3 matches in a row | Progress |
| **Consistent Winner** | Accumulate 10 wins | Progress |
| **Veteran of 100** | Participate in 100 matches | Progress |
| **Skill Master** | Use skills 5 times in a single match | Single Match |
| **Information Dominator** | Use `Clue Scan` 20 times in total | Progress |
| **True Gambler** | Use `Desperate Draw` 20 times in total | Progress |
| **Pact King** | Initiate `Double Pact` 10 times in total and have all of them accepted | Progress |
| **Iron Wall** | Trigger `Reflect Shield` 10 times in total | Progress |
| **Comeback Victory** | Win a match while your chips are below 100 | Single Match |
| **Royal Coronation** | Win a match with a Royal Flush | Single Match |
| **Perfect Defense** | Successfully reflect all opponent skills in a single match | Single Match |

### 14.2 Unlock Flow

1. After each match ends, the server checks whether achievement conditions were triggered
2. If a condition is satisfied, write it into the user's achievement record with the `unlockedAt` timestamp
3. Notify the frontend through the Socket.io `achievementUnlocked` event to display the unlock animation
4. The profile achievement tab shows both unlocked and locked achievements (locked achievements are shown in a locked state)

---

## 15. Match Replay Feature

### 15.1 Data Collection

During the match, the server writes the following key events into an in-memory buffer and batch-writes them into MongoDB after the match ends:

- deal results for each hand (both sides' hole cards and community-card order)
- every betting action (action type, amount, timestamp)
- every skill usage (skill name, caster, timestamp, effect result)
- showdown result for each hand (both sides' final hands, score, chip change)
- match-end event

### 15.2 Replay Viewing

**Frontend page: Match History List -> A Specific Match -> View Replay**

- Show an overview of the number of hands in the match
- View by hand index: both sides' hole cards, community-card reveal order, skill-usage timeline, and betting record for that hand
- The event timeline is replayed in the form of an **event log**, consistent with the live gameplay experience
- Replay data is read-only and does not support real gameplay actions

### 15.3 Storage Strategy

- Keep detailed replay data for only the most recent **50 matches** (sorted by `endedAt`; older records are deleted automatically when the limit is exceeded)
- Replay data is stored as BSON nested documents in the `MatchReplay` collection

---

## 16. Non-Functional Requirements

| Category | Requirement |
|------|------|
| **Realtime Performance** | Socket.io message round-trip latency < 500ms (local/LAN environment) |
| **Concurrency Safety** | Skills trigger in sequence, and the server event queue handles processing without race conditions |
| **Information Isolation** | `Clue Scan` results use targeted `socket.to(socketId).emit()` pushes and must not leak to other players |
| **Security** | All APIs that require login must use JWT authentication; passwords are stored with bcrypt salt hashing; prevent SQL/NoSQL injection |
| **Extensibility** | The skill pool is configured as an array, and adding skills does not require changes to the core settlement logic |
| **Browser Compatibility** | Supports the latest versions of Chrome, Firefox, and Edge |
| **Resolution** | Desktop-first, minimum resolution 1280x720 |
| **Error Handling** | All APIs return a unified error format: `{ success, message, data }` |

---

## 17. Frontend UI Specification

### 17.1 Page List

| Route | Page | Access Control |
|------|------|----------|
| `/` | Home page (game entry + login/register entry) | Public |
| `/login` | Login page | Accessible when logged out |
| `/register` | Registration page | Accessible when logged out |
| `/lobby` | Lobby (create/join room, quick match) | Login required |
| `/room/:roomId/skills` | Skill selection page | Login required + must be inside a room |
| `/room/:roomId/game` | Gameplay page | Login required + must be inside a room |
| `/profile/:userId` | Profile page (profile + statistics + achievements) | Public for viewing / login required to edit self |
| `/leaderboard` | Leaderboard | Public |
| `/match/:matchId/replay` | Match replay | Login required (only for matches the user participated in) |

### 17.3 React Component Structure

```text
App (Router + AuthContext)
|- pages/
|  |- HomePage
|  |- LoginPage / RegisterPage
|  |- LobbyPage
|  |- SkillSelectPage
|  |- GamePage
|  |  \- GameBoard
|  |     |- OpponentArea
|  |     |- CommunityCardsArea
|  |     |- SelfArea
|  |     |  |- BettingControls (bet slider + action buttons + countdown)
|  |     |  \- SkillPanel (2 skill buttons)
|  |     \- EventLog
|  |- ProfilePage (profile + statistics + achievements tab)
|  |- LeaderboardPage
|  \- ReplayPage
\- components/
   |- Navbar
   |- Card (single-card renderer)
   |- EnergyBar
   |- SkillButton (includes disabled-state logic)
   |- ShieldPromptModal (Reflect Shield confirmation modal)
   |- DoublePromptModal (Double Pact modal)
   |- AchievementToast (achievement unlock notification)
   \- CountdownTimer
```

### 17.4 Frontend Principles

- **The frontend does not own game logic**. All state changes are driven by the `gameState` event broadcast by the server.
- Styling uses **Tailwind CSS** utility classes and may include an additional UI component library
- Authentication state is managed globally through React Context (`AuthContext`), with the token stored in `localStorage`
- The Socket connection is established after entering the lobby and disconnected after the match ends

## 21. Edge Case Handling

| Edge Case | Handling |
|----------|----------|
| **Tie** | Split the pot evenly; both sides gain +2 energy before the hand reset, capped at 8 |
| **Double Pact timeout/rejection** | The proposer spends **no** energy; the responding side loses 1 energy point |
| **Reflect Shield timeout** | Treated as a pass; the opponent's skill resolves normally; `Reflect Shield` consumes **no** energy |
| **Reflect Shield vs Double Pact** | `Double Pact` is a proposal-type skill and cannot be reflected |
| **Both sides selected Reflect Shield** | The side that triggered first is reflected; `Reflect Shield` cannot reflect another `Reflect Shield` |
| **Information Lock vs Clue Scan** | If the target has already activated `Information Lock`, `Clue Scan` fails but still consumes energy |
| **After Desperate Draw / Precision Swap** | `pokersolver` automatically recalculates the best 5-card hand; no manual handling is required |
| **Energy exactly 0** | Skill buttons are disabled; no other effect |
| **Player times out without acting** | Auto-fold if there is a required call amount; auto-check if there is no required call amount |
| **Player disconnects** | Preserve state for 30 seconds; after timeout auto-fold or treat as a loss and write the result to match history |
| **All-in side pots** | Multiplayer matches must calculate side pots. An all-in player can only win the portion of the pot covered by their contribution; excess chips are settled among the remaining players. |
| **Skill selection timeout** | If not confirmed within 30 seconds, assign 2 random skills |
| **Room creator leaves** | If the match has not started, dissolve the room; if the match is in progress, handle it as a disconnect and let the remaining players continue |
| **Simultaneous Double Pact attempts** | The sequential trigger mechanism guarantees they cannot be initiated at the same time; the player earlier in turn order resolves first |
