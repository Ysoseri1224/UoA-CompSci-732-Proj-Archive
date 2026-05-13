# Game Rules Prompt - Elemental Poker (v0.1)

> This document is used to describe the game rules to Claude / AI for generating bot decisions, enhancement options, boss behavior, and related scenarios.
> All field names remain aligned with the code.

---

## 1. World and Core Concepts

This is a card battler with roguelike progression. The player and the boss take turns, and the player attacks by forming poker hands from their cards. The game uses three elements: Water (WATER), Fire (FIRE), and Grass (GRASS). Element advantage (Water -> Fire -> Grass -> Water) is reserved for future features and does not affect damage calculation in the current stage.

---

## 2. Deck Structure

```txt
Total cards: 39 (no duplicates)
Composition: Water (WATER) 1-13, Fire (FIRE) 1-13, Grass (GRASS) 1-13
Visual rank mapping:
  1  -> A (Ace)
  2-10 -> 2-10
  11 -> J
  12 -> Q
  13 -> K
Rank scoring value:
  A(1)=1, 2-10=face value, J(11)=11, Q(12)=12, K(13)=13
```

Deck rules:
- The deck has no duplicates; cards in hand and discard pile are removed from the total pool.
- When the deck runs out, the discard pile is automatically shuffled back into the deck and drawing continues.
- Cards discarded by Shuffle must only return to the deck after that Shuffle action completes, to prevent drawing back cards that were just discarded.

---

## 3. Single-Turn Flow (Strict Order)

```txt
[Turn starts]
  |
  |- Draw phase: refill the hand to 7 cards from the deck (fill the previous turn's gap)
  |     If the deck is short, shuffle the discard pile in first and then draw
  |
  |- Boss intent display phase (automatic):
  |     The system randomly determines the boss intent for this turn according to its behavior weights (ATTACK / CHARGE / DEFEND)
  |     If the previous turn's charge was not released, this turn is forced to ATTACK (release the charged burst)
  |     The intent is visible to the player and affects their decision-making
  |
  |- Skill / Shuffle phase (player choice, free order, can alternate):
  |     |- skillChangeColor(cardId, newColor)  [once per turn]
  |     |- skillChangeRank(cardId, newRank)    [once per turn]
  |     |- skillShield()                       [see cooldown rules]
  |     |- Shuffle: discard any number of cards from hand -> draw the same number from the deck
  |          At most 2 times per turn; count resets each turn
  |
  |- Play phase:
  |     Play 1-7 cards from hand (must play; cannot skip); if N cards are played, draw N next turn
  |     The system recognizes the hand type -> calculates damage -> reduces boss HP
  |     Played cards go to the discard pile
  |     If Boss HP <= 0 -> victory, skip boss attack
  |
  `- Boss attack phase:
        Boss deals fixed damage each turn (this value grows with layers)
        If shield is active -> negate this damage and break the shield
        If player HP <= 0 -> defeat
[Turn ends, next turn begins]
```

---

## 4. Skill Rules in Detail

> In the data model, "Cost" corresponds to the card's `rank` (1-13). The two are equivalent.

### 4.1 Change Color skillChangeColor(cardId, newColor)
- Replace one hand card with the same-rank card of the target color.
- Search order: 1) same rank + target color; 2) the closest rank within the target color.
- The replacement card must not already be in the current hand (to prevent duplicate cards).
- Replace the original card with the found card (including the image).
- **Once per turn, automatically resets at turn end.**

### 4.2 Change Rank skillChangeRank(cardId, newRank)
- Replace one hand card with the target-rank card of the same color.
- Find the same color + target rank card in the deck and replace the original card (including the image).
- The replacement card must not already be in the current hand (to prevent duplicate cards).
- **Once per turn, automatically resets at turn end.**
- Change Color and Change Rank can each be used once in the same turn and are independent.

### 4.3 Shield skillShield()
- After activation, the next boss damage is negated and the shield breaks when damage is taken.
- **The shield persists across turns** until it is broken, then it enters cooldown.
- Exception: if the boss is killed that turn (player victory), the shield does **not** persist and is treated as void.
- Cooldown: after the shield breaks, it enters cooldown and cannot be activated again while cooling down (cooldown length pending numeric tuning).
- **It does not reset automatically**; it can only be used again after breaking.
- The boss has no shield-breaking skill (the shield only applies to boss attack damage).

---

## 5. Hand Recognition and Scoring

### 5.1 Hand Table (highest priority first)

| Hand Type           | Condition          | Base Chips | Multiplier |
|--------------------|--------------------|------------|------------|
| Straight Flush     | Same suit + straight | 100      | 8          |
| Four of a Kind     | 4 cards of same rank | 60       | 7          |
| Full House         | Three of a kind + pair | 40     | 6          |
| Flush              | 5 cards of same suit | 35      | 4          |
| Straight           | 5 consecutive ranks | 30       | 4          |
| Three of a Kind    | 3 cards of same rank | 30       | 3          |
| Two Pair           | Two pairs           | 20       | 2          |
| Pair               | 2 cards of same rank | 10       | 2          |
| High Card          | None of the above   | 5        | 1          |

> The base chip values are placeholders and will be tuned by numeric design.

### 5.2 Scoring Formula (Current Stage)

```txt
Damage = floor((hand base chips + Σ rank scoring values of played cards) x hand multiplier)
If the boss DEFENDs this turn, damage x 0.5
```

Example: play [FIRE-7, FIRE-9, FIRE-3, WATER-7, GRASS-7] (Three of a Kind)
- Base chips = 30, multiplier = 3
- Rank score = 7 + 9 + 3 + 7 + 7 = 33
- Damage = (30 + 33) x 3 = 189

Boss attack:
  Normal attack: player HP reduction = boss.attackPerRound
  Charged burst: player HP reduction = boss.chargeAttack (approx. attackPerRound x 2.2)
  CHARGE / DEFEND turns: Boss does not attack
  Shield can block attack damage

### 5.3 Future Expansion (Not Implemented Yet)
- More buff types (extra elemental chip, global chip bonus, hand base / multiplier buffs)
- Card upgrade effects (reward cards, multiplier cards, glass cards, etc.)
- Joker system
- Seal effects

---

## 6. Roguelike Progression System

### 6.1 Layer Structure
- Defeating one boss = clearing one layer / floor.
- After the first layer, choose a progression path (Water / Fire / Grass specialization).
- From the second layer onward, each cleared layer grants one enhancement choice (pick 1 of 3).
- Enhancement effects stack permanently and persist through the whole run.
- Progress is saved automatically after each layer; after defeat, the player can continue from the previous layer save.

### 6.2 Progression Paths

**First-layer reward (fixed): choose an element specialization**
```txt
Choose WATER  -> Water cards deal x 1.1 damage (permanent)
Choose FIRE   -> Fire cards deal x 1.1 damage (permanent)
Choose GRASS  -> Grass cards deal x 1.1 damage (permanent)
```
Note: elemental damage bonuses only count the contribution of cards of that element in the played hand (the exact application method still needs numeric design confirmation).

**From layer 2 onward (pick 1 of 3, only show enhancements matching the chosen element):**

Example enhancement pool (to be extended):
```txt
- [Element] damage x 1.1 (stackable)
- Gain one [Element] card on every Shuffle
- Gain one highest-cost (13) card on every Shuffle
- Shield automatically recovers at the start of each layer (future)
- Shuffle count +1 (future)
```

### 6.3 Boss Stat Scaling (Placeholder, Pending Numeric Design)
```javascript
// Reference formula for boss stats per layer (subject to tuning)
bossHP     = BASE_BOSS_HP     * (1 + 0.3 * (layer - 1))
bossAttack = BASE_BOSS_ATTACK * (1 + 0.2 * (layer - 1))
playerHP   = BASE_PLAYER_HP   // currently assumed not to grow with layers; compensated by enhancements
```

---

## 7. Victory / Defeat Conditions

| Condition         | Result      | Next Step |
|------------------|-------------|-----------|
| Boss HP <= 0     | Clear layer | Enter enhancement selection -> next layer |
| Player HP <= 0   | Fail layer  | Load the previous layer save (if the first layer fails, the run ends immediately) |

---

## 8. Future Features (Not Implemented Yet, Architecture Reserved)

- Element advantage (Water -> Fire -> Grass -> Water) damage bonus
- Boss armor / reduction / resistance
- Bot play AI (hand + hand type + betting logic)
- Asynchronous turn-based PvP (both sides resolve actions before final settlement)
- Skill window system (pre-flop / flop phases)
- More skill types (configurable architecture already reserved)
