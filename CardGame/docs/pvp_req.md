# PvP Match Design Document - Elemental Poker v0.1

---

## 1. Mode Overview

An asynchronous 1v1 match. Both players act independently, and the results are resolved once both sides confirm. Whoever's HP reaches zero loses one point and HP is reset. The first player to reach N points wins.

| Match Format | Target Score | Base HP | Buff Count |
|---|---|---|---|
| BO2 (best of 2) | 2 | 600 | 1 time (before the match starts) |
| BO3 (best of 3) | 3 | 600 | 2 times (before the match starts + after round 2) |
| BO5 (best of 5) | 5 | 600 | 3 times (before the match starts + after round 2 + after round 6) |

---

## 2. Turn Flow

```txt
[Turn starts]
  |- Both players draw up to 7 cards
  |- Skill / Shuffle phase (each player acts independently, hidden from the other)
  |- Both players confirm their plays -> both lock in
  |- Once both are locked -> resolve
  |     A's damage is dealt to B, and B's damage is dealt to A (applied simultaneously)
  |     Both players reveal hands and scores
  |- Check HP
  |     |- If both players have HP > 0 -> next turn
  |     |- If one player's HP <= 0 -> that player loses a point, the winner gains 1 point
  |     |        HP resets, enter the buff window (if any), and start the next point
  |     `- If both players have HP <= 0 at the same time -> A and B both lose a point, then proceed to the next point
  `- Once someone reaches the target score -> match ends
```

---

## 3. Match Damage Formula

Same as PvE:

```txt
Damage = floor((base chips + ΣcardChip) x multiplier)
```

- Both players deal damage to each other
- There is no DEFEND / CHARGE / boss behavior
- There is no charged burst

---

## 4. Skill System

Both players have independent energy pools. The same skill set is used:

| Skill | Cost | Effect |
|---|---|---|
| skillChangeColor(cardId, newColor) | 1 energy | Change color |
| skillChangeCost(cardId, newRank) | 1 energy | Change cost |
| skillShield() | 1 energy | Negate damage |

**Shield behavior in PvP**: after activation, it negates the opponent's damage for that turn. The shield lasts 1 turn, then breaks and enters a 3-turn cooldown. It costs 1 energy.

The energy pool is independent from PvE:
- Starts at 3
- Does not regenerate across turns
- Each time a point is won or lost, HP resets and energy is fully restored
- Shuffle remains 2 times per turn

---

## 5. Buff System

PvP does not use numeric buffs (all elemental damage bonuses, hand bonuses, fixed damage bonuses, etc. are disabled). Only utility buffs and PvP-specific interaction buffs remain.

### 5.1 Reuse PvE Utility Buffs (all common rarity)

| # | Buff | Effect | PvP Notes |
|---|---|---|---|
| 1 | Shuffle +1 | 3 shuffle actions per turn | Same as PvE |
| 2 | Energy +1 | Energy cap +1 | Same as PvE |
| 3 | Hand +1 | Hand cap 8 cards | Same as PvE |

### 5.2 PvP-Specific Buffs - Design Direction

PvE buffs are about "making the numbers bigger" - `ALL_CHIPS +2`, `multiplier +1`. If PvP uses the same type of buff, both sides simply scale damage and one-shot each other, which is not interesting.

PvP buffs should **change how the match is played** - information advantage, disruption, and comeback tools. There are three tiers:

| Tier | Frequency | Positioning | Count |
|---|---|---|---|
| **Common** | ~50% | Tactical disruption, stable value | 6 |
| **Rare** | ~40% | High-impact, changes match tempo | 8 |
| **Epic** | ~10% | Changes the rules of the game | 1 |

When selecting 1 of 3 each round, draw from a mix: 1-2 common + 1 rare, with about a 10% chance of one epic.

#### Common Tier

| # | Buff | Effect |
|---|---|---|
| P1 | **Shuffle Disruption** | Reduce the opponent's Shuffle count by 1 this turn (minimum 0) |
| P2 | **Steal** | After Shuffle, steal one random card from the opponent's hand into your own hand (they lose one, you gain one) |
| P3 | **Overdraft** | You may spend 1 energy even when you are short on energy (the next turn starts with -1 energy; cannot overdraft consecutively) |
| P4 | **Recharge** | Gain 1 extra energy |
| P5 | **Gambler** | Before each play, roll a die: 50% chance damage x1.5, 50% chance damage x0.7 |
| P6 | **Collector** | For every unplayed max-rank card (K/A) in hand, gain +15 damage this turn |

#### Rare Tier

| # | Buff | Effect |
|---|---|---|
| P7 | **Unbending** | When you take lethal damage, stay at 1 HP (once per point) |
| P8 | **Berserk** | When HP drops below 25%, the next play deals x1.5 damage (once per point) |
| P9 | **Copy** | After the opponent uses a skill, you may use it once for free (cost 0; once per point) |
| P10 | **Empty-Hand Karate** | When your energy is 0, your play deals x1.3 damage |
| P11 | **Interference** | On each resolution, randomly reduce one of the opponent's cards to cost 1 |
| P12 | **Desperation** | Reduce your HP to 1 manually, then your next play deals x3 damage (once per match) |
| P13 | **Reflect Shield** | When your shield is active, reflect the opponent's damage back 1:1 this turn (you take no damage; once per point) |
| P14 | **Seal** | Spend 1 energy to seal one of the opponent's skill slots; that skill cannot be used for the current point (once per point) |

#### Epic Tier (roughly 10% appearance, extremely rare in the buff window)

| # | Buff | Effect |
|---|---|---|
| P15 | **All-in** | Only when you play 1 card with rank <= 3, multiply it by the two highest-rank cards in your hand (example: play A(1), have Q(12) and K(13), damage = 1x12x13 = 156). Separate energy pool (starts with 1 point, recovers 1 point every 3 turns after use) |

### 5.3 Buff Timing

- BO2: choose once before the match starts (pick 1 of 3)
- BO3: choose once before the match starts + once after round 2 -> total 2 times
- BO5: choose once before the match starts + once after round 2 + once after round 6 -> total 3 times

Utility buffs (Shuffle +1, Energy +1, Hand +1) are unique choices and are removed from the pool after selection. PvP-specific buffs can stack repeatedly.

---

## 6. Room System

### 6.1 Create Room

Player A clicks "Create Room" -> a 6-digit room code is generated -> wait for Player B to join.

### 6.2 Join Room

Player B enters the room code -> joins -> both players are seated -> pre-match buff selection -> start.

### 6.3 Disconnect / Leave

- Either player disconnects or leaves voluntarily -> **immediate loss**, opponent wins
- Reconnect within 30 seconds -> continue (pending)

---

## 7. State Machine Design

The PvP state machine is independent and does not modify the existing PvE state machine.

### 7.1 PvPGameState

```typescript
interface PvPGameState {
  roomId: string;
  format: 'BO2' | 'BO3' | 'BO5';
  targetScore: number;  // 2, 3, or 5

  playerA: PvPPlayerState;
  playerB: PvPPlayerState;

  currentRound: number;
  phase: 'MATCHING' | 'BUFF_SELECT' | 'PLAYING' | 'RESOLVE' | 'ROUND_END' | 'MATCH_END';
}

interface PvPPlayerState {
  userId: string;
  socketId: string;
  hp: number;           // current HP
  maxHp: number;        // 600
  score: number;        // points already won
  energy: number;       // current energy
  energyMax: number;    // energy cap (starts at 3)
  buffs: PvPBuff[];
  hand: Card[];
  deck: Card[];
  discardPile: Card[];

  // within the turn
  locked: boolean;      // whether the player has confirmed the play
  selectedCards: CardId[];
  currentScore: number | null;
}
```

### 7.2 State Transitions

```txt
MATCHING (waiting for opponent)
  -> BUFF_SELECT (both players choose buffs)
    -> PLAYING (both players act)
      -> both locked -> RESOLVE (resolve, reveal cards, apply damage)
        -> if someone has HP <= 0 -> ROUND_END (score check)
          -> if someone reaches targetScore -> MATCH_END
          -> otherwise -> BUFF_SELECT (if a buff window is triggered) or PLAYING (next round)
        -> if no one has HP <= 0 -> PLAYING (next round)
```

---

## 8. Socket Events

| Client -> Server | Parameters | Description |
|---|---|---|
| `createPvpRoom` | `{ format }` | Create a room and return the roomId |
| `joinPvpRoom` | `{ roomId }` | Join a room |
| `pvpSelectBuff` | `{ buffId }` | Select a buff |
| `pvpUseSkill` | `{ skill, cardId, target }` | Use a skill |
| `pvpShuffle` | `{ cardIds }` | Shuffle |
| `pvpPlayConfirm` | `{ cardIds }` | Confirm play (lock in) |

| Server -> Client | Description |
|---|---|
| `pvpRoomState` | Room state changes (opponent joined, buff window starts, etc.) |
| `pvpGameState` | Game state push (after each action) |
| `pvpResolve` | Resolution result (both hands revealed + damage values) |
| `pvpScore` | Score update |
| `pvpMatchEnd` | Match ends |

---

## 9. Database

Write a Match record when the match ends:

```typescript
// Reuse the existing Match model, matchType='PVP'
{
  matchType: 'PVP',
  format: 'BO3',
  winnerId: userId,
  loserId: userId,
  score: { winner: 3, loser: 1 },
  rounds: [
    { roundNumber: 1, playerAScore: 143, playerBScore: 120, damageAtoB: 143, damageBtoA: 120 },
    // ...
  ],
  buffsA: ['shuffle+1', 'unbending'],
  buffsB: ['energy+1', 'gambler'],
  endedAt: Date,
}
```

MatchReplay reuses the existing structure, and the `turns` array records each round's actions and results.

---

## 10. Backend Implementation File Plan

```txt
backend/src/pvp/
  types.ts          <- PvPGameState, PvPPlayerState, PvPBuff, etc.
  machine.ts        <- custom PvP state machine transition(ctx, event)
  guards.ts         <- guard conditions (canLock, canResolve, canBuff, etc.)
  actions.ts        <- round resolution, HP reduction, score checks, buff application
  runtime.ts        <- room management (createRoom, sendEvent, stopRoom)
  buffs.ts          <- PvP buff pool (common / rare selection, uniqueness checks)
  index.ts          <- unified export
backend/src/utils/
  pvpHandlers.ts    <- Socket event handler (connects to the pvp/ module)
```

The state machine is separate from PvE and does not reuse `pve/roundMachine.ts`. Reused parts: `lib/deck.ts` (deck), `lib/hand.ts` (damage calculation), `lib/skills.ts` (skill logic).

---

## 11. Open Questions

- [ ] Is a 30-second reconnect window appropriate?
- [ ] Should BO2/BO3/BO5 matching eventually become a random queue?
- [ ] Is an in-match chat / emoji system needed?
- [ ] Should there be a PvP leaderboard (win rate, best win streak)?
