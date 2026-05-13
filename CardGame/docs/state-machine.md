# State Machine Design - Elemental Poker (v0.1)

> Tech stack: React 18 + Zustand 4 + XState (recommended to introduce)
> This document defines the complete turn state machine and can be mapped directly to XState v5 or a Zustand slice.

---

## 1. Global State Hierarchy

```txt
GameState (entire run)
  -> BattleState (single-layer boss fight)
        -> RoundState (single turn)
```

The three layers are separated and do not interfere with each other. Saving only requires serializing GameState.

---

## 2. GameState - Entire Run

```typescript
interface GameState {
  runId: string;                    // unique run identifier
  layer: number;                    // current layer (starts from 1)
  
  // persistent player data
  player: {
    hp: number;                     // current HP
    maxHp: number;                  // max HP
    buffs: Buff[];                  // permanently stacked enhancement effects
    chosenElement: Element | null;  // specialization chosen in layer 1
  };
  
  // persistent deck data (shared deck across turns)
  deck: Card[];                     // current deck (undrawn cards)
  discardPile: Card[];              // discard pile
  hand: Card[];                     // current hand (7 cards)
  
  // progress
  phase: 'BATTLE' | 'UPGRADE' | 'GAME_OVER' | 'RUN_COMPLETE';

  // UPGRADE sub-state (only valid when phase = 'UPGRADE')
  upgradePhase: 'GENERATING' | 'CHOOSING' | 'APPLYING' | null;
  upgradeOptions: Upgrade[];        // current candidate options shown to the player (present during CHOOSING)

  savepoint: SavePoint | null;      // most recent save point
}

// Save point (written after each layer)
interface SavePoint {
  layer: number;
  timestamp: number;
  gameState: Omit<GameState, 'savepoint'>;
}
```

### 2.1 UPGRADE Sub-state Flow

```txt
BATTLE_WIN triggered
  -> upgradePhase = 'GENERATING' (generate 3 candidate buffs and write them to upgradeOptions)
  -> upgradePhase = 'CHOOSING' (wait for the player's SELECT_UPGRADE event)
  -> upgradePhase = 'APPLYING' (write the selected buff into player.buffs)
  -> upgradePhase = null, GameState.phase = 'BATTLE', enter the next layer
```

---

## 3. BattleState - Single-Layer Boss Fight

```typescript
interface BattleState {
  boss: {
    hp: number;
    maxHp: number;
    attackPerRound: number;         // normal attack value for this layer
    chargeAttack: number;           // charged burst value (= attackPerRound x 2.2, rounded down)
    element: Element;               // element (for future advantage rules)

    behavior: {
      currentIntent: BossIntent;    // current turn intent (visible to the player)
      chargeStored: boolean;        // whether a charge is stored and waiting to be released
    };
    weights: BossWeights;           // behavior weights for this layer (read from config, does not change per turn)
  };
  round: number;                    // current turn number (starts from 1)
  roundState: RoundState;           // current turn sub-state
  result: 'ONGOING' | 'WIN' | 'LOSE';
}
```

```typescript
type BossIntent = 'ATTACK' | 'CHARGE' | 'DEFEND';

interface BossWeights {
  attack: number;   // example: 0.80
  charge: number;   // example: 0.15
  defend: number;   // example: 0.05
  // the three values must sum to 1.0
}
```

Weight table (hard-coded as constants, not stored in state):

```typescript
const BOSS_WEIGHTS_BY_LAYER: Record<number, BossWeights> = {
  1:  { attack: 0.80, charge: 0.15, defend: 0.05 },
  2:  { attack: 0.80, charge: 0.15, defend: 0.05 },
  3:  { attack: 0.80, charge: 0.15, defend: 0.05 },
  4:  { attack: 0.60, charge: 0.25, defend: 0.15 },
  5:  { attack: 0.60, charge: 0.25, defend: 0.15 },
  6:  { attack: 0.60, charge: 0.25, defend: 0.15 },
  7:  { attack: 0.45, charge: 0.30, defend: 0.25 },
  8:  { attack: 0.45, charge: 0.30, defend: 0.25 },
  9:  { attack: 0.45, charge: 0.30, defend: 0.25 },
  10: { attack: 0.45, charge: 0.30, defend: 0.25 },
};
```

---

## 4. RoundState - Single-Turn State Machine

### 4.1 State Enum

```typescript
type RoundPhase =
  | 'DRAW'            // draw phase (automatic)
  | 'BOSS_TELEGRAPH'  // boss intent display phase (automatic)
  | 'SKILL'           // skill phase (player action)
  | 'SHUFFLE'         // shuffle phase (player action, can alternate with SKILL)
  | 'PLAY'            // play phase (player selects cards -> plays them)
  | 'RESOLVE'         // resolution phase (calculate damage, automatic)
  | 'BOSS_ATTACK'     // boss attack phase (automatic)
  | 'ROUND_END';      // turn end (trigger next turn or victory/defeat check)
```

### 4.2 State Transition Diagram

```txt
            ┌─────────────────────────────────────────┐
            │              ROUND START                │
            └──────────────────┬──────────────────────┘
                               │ auto
                               ▼
                           ┌──────┐
                           │ DRAW │  draw up to 7 cards
                           └──┬───┘
                              │ done
                              ▼
                     ┌──────────────────┐
                     │  BOSS_TELEGRAPH  │  determine boss intent -> show to the player
                     └────────┬─────────┘
                              │ done
                              ▼
               ┌──────────────────────────┐
               │     SKILL / SHUFFLE      │◄──────────────┐
               │  (player can act freely,  │               │
               │   in any order, alternating)              │
               └──────────┬───────────────┘               │
                          │                               │
               ┌──────────┴───────────┐                   │
               │ player clicks "PLAY" │                   │
               └──────────┬───────────┘                   │
                          ▼                               │
                      ┌──────┐                            │
                      │ PLAY │  player selects cards (1-7)│
                      └──┬───┘                            │
                         │ confirm selection              │
                         ▼                               │
                    ┌─────────┐                          │
                    │ RESOLVE │  calculate damage, reduce boss HP
                    └────┬────┘                          │
                         │                               │
              ┌──────────┴──────────┐                    │
              │                     │                    │
          Boss HP <= 0         Boss HP > 0              │
              │                     │                    │
              ▼                     ▼                    │
          ┌─────────────────────┐  ┌─────────────┐      │
          │  WIN (shield void)  │  │ BOSS_ATTACK │      │
          └─────────────────────┘  └──────┬──────┘      │
                                    │                    │
                         ┌──────────┴──────────┐         │
                         │                     │         │
                    Player HP <= 0         Player HP > 0  │
                         │                     │         │
                         ▼                     ▼         │
                      ┌──────┐          ┌───────────┐    │
                      │ LOSE │          │ ROUND_END │────┘
                      └──────┘          └───────────┘
                                        (enter next turn)
```

### 4.2.1 BOSS_TELEGRAPH Phase Notes

- Triggers automatically; no player action required
- The system randomly samples the current turn's intent according to `boss.weights`
- If `boss.behavior.chargeStored === true`, intent is forced to `'ATTACK'` (release the charge) and the weights are ignored
- The result is written to `bossRound.intent`, `bossRound.isDefending`, and `bossRound.willReleaseCharge`
- After the player UI shows the current turn's intent, move into the SKILL / SHUFFLE phase

### 4.3 RoundState Data Structure

```typescript
interface RoundState {
  phase: RoundPhase;
  
  // skill cooldown and usage state (reset every turn)
  skills: {
    changeColor: { used: boolean };   // reset every turn
    changeCost:  { used: boolean };   // reset every turn
    shield: {
      active: boolean;                // whether shield is currently active
      onCooldown: boolean;            // whether the shield is cooling down (after breaking)
    };
  };
  
  // Shuffle state
  shuffle: {
    remaining: number;                // remaining uses this turn (starts at 2)
    pendingDiscard: CardId[];         // cards queued to be discarded (before confirmation)
  };
  
  // play state
  play: {
    selectedCards: CardId[];          // cards currently selected by the player
    handType: HandType | null;        // detected hand type
    score: number | null;             // computed damage value
  };

  // boss-turn state
  bossRound: {
    intent: BossIntent;               // current turn intent (determined and shown after DRAW)
    isDefending: boolean;             // when true, the player's damage this turn is halved
    willReleaseCharge: boolean;       // when true, the boss attack this turn is a charged burst
  };
}
```

---

## 5. Events (Actions / Events)

> The following are all events accepted by the state machine. They can map to either Zustand actions or XState events.

```typescript
// ── Skill events ──────────────────────────────
{ type: 'SKILL_CHANGE_COLOR'; cardId: CardId; newColor: Element }
{ type: 'SKILL_CHANGE_COST';  cardId: CardId; newCost: number  }
{ type: 'SKILL_SHIELD'                                         }

// ── Shuffle events ────────────────────────────
{ type: 'SHUFFLE_SELECT';   cardIds: CardId[] }  // select cards to discard
{ type: 'SHUFFLE_CONFIRM'                     }  // confirm shuffle
{ type: 'SHUFFLE_CANCEL'                      }  // cancel selection

// ── Play events ───────────────────────────────
{ type: 'PLAY_SELECT';   cardId: CardId }        // select / deselect one card
{ type: 'PLAY_CONFIRM'                  }        // confirm playing selected cards

// ── System events (automatic) ─────────────────
{ type: 'DRAW_COMPLETE'           }              // drawing finished
{ type: 'BOSS_TELEGRAPH_COMPLETE' }              // boss intent display finished
{ type: 'RESOLVE_COMPLETE'        }              // damage resolution finished
{ type: 'BOSS_ATTACK_COMPLETE'    }              // boss attack finished
{ type: 'ROUND_END_CONFIRM'       }              // proceed to next turn

// ── Victory / defeat events ───────────────────
{ type: 'BATTLE_WIN'    }
{ type: 'BATTLE_LOSE'   }

// ── Roguelike events ──────────────────────────
{ type: 'UPGRADE_OPTIONS_READY'                }  // candidate generation finished (GENERATING -> CHOOSING)
{ type: 'SELECT_UPGRADE'; upgradeId: string }     // player chooses an enhancement option
{ type: 'UPGRADE_APPLIED'                      }  // enhancement application finished (APPLYING -> BATTLE)
{ type: 'LOAD_SAVEPOINT'                   }     // load save point
```

---

## 6. Guards

```typescript
// whether a skill can be used
canUseChangeColor  = !skills.changeColor.used && phase === 'SKILL'
canUseChangeCost   = !skills.changeCost.used  && phase === 'SKILL'
canUseShield       = !skills.shield.active && !skills.shield.onCooldown && phase === 'SKILL'

// whether Shuffle can be used
canShuffle = shuffle.remaining > 0 && phase === 'SHUFFLE'

// whether play is valid
canPlay = play.selectedCards.length >= 1 && phase === 'PLAY'

// whether the boss attack is blocked by shield
shieldBlocksBossAttack = skills.shield.active

// whether shield is void when the boss dies
shieldVoided = bossHP <= 0   // if entering WIN, shield does not persist
```

---

## 7. Side Effects

| Trigger Condition | Side Effect |
|------------------|-------------|
| DRAW phase | If the deck is short, shuffle the discard pile back in first, then draw |
| SHUFFLE_CONFIRM | Stage the discard pile first, and only return it after drawing completes |
| After RESOLVE, boss HP <= 0 | Reset shield state (void it) and trigger WIN |
| BOSS_ATTACK + Shield | Shield breaks, `shield.active=false`, `onCooldown=true` |
| ROUND_END | Reset `skills.changeColor.used` / `changeCost.used` to `false`; reset `shuffle.remaining` to 2 |
| BOSS_TELEGRAPH: intent = CHARGE | `bossRound.willReleaseCharge = false`; skip BOSS_ATTACK this turn; `boss.behavior.chargeStored = true` |
| BOSS_TELEGRAPH: `chargeStored = true` | Force intent = ATTACK; `bossRound.willReleaseCharge = true`; `boss.behavior.chargeStored = false` |
| BOSS_TELEGRAPH: intent = DEFEND | `bossRound.isDefending = true` |
| RESOLVE phase: `bossRound.isDefending = true` | Halve the player's computed damage this turn (rounded down) before applying it to the boss |
| BOSS_ATTACK phase: `bossRound.willReleaseCharge = true` | Reduce player HP by `boss.chargeAttack`; shield can block it |
| BOSS_ATTACK phase: intent = ATTACK, no charge | Reduce player HP by `boss.attackPerRound`; shield can block it |
| BOSS_ATTACK phase: intent = CHARGE or DEFEND | Boss does not attack this turn; skip damage |
| ROUND_END | Reset `bossRound` to defaults (`intent='ATTACK'`, `isDefending=false`, `willReleaseCharge=false`) |
| BATTLE_WIN | Write a SavePoint and enter the UPGRADE phase |
| SELECT_UPGRADE | Push the Upgrade into `player.buffs` and enter the next BattleState |

---

## 8. PvP Reserved Interface

```typescript
// current PvP implementation is a future feature
// in the state machine design, player actions are abstracted as PlayerAction,
// and PvP mode only needs to inject "waiting for opponent" as an extra phase

type RoundPhaseExtended = RoundPhase | 'WAITING_OPPONENT'; // PvP only

interface PVPRoundState extends RoundState {
  opponentReady: boolean;
  opponentAction: PlayerAction | null;  // opponent action result in asynchronous alternating turns
}
```

---

## 9. Persistence Strategy

```typescript
// Persisted (written to SavePoint):
// - GameState.player (HP, buffs, chosenElement)
// - GameState.deck / discardPile / hand
// - GameState.layer

// Not persisted (rebuilt every turn / every layer):
// - RoundState (reset every turn)
// - BattleState.roundState (reset every turn)
// - skills.used flags (reset every turn)

// Save timing: after the BATTLE_WIN event triggers, before entering the UPGRADE phase
```
