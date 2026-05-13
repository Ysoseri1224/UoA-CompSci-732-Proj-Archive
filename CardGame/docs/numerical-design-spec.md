# Numeric Design: Considerations and Calculation Method
# Elemental Poker v0.1 - For AI-Generated Numeric Tables

Note: the calculations below were produced from the old base-chip table and need to be recalculated using A=1, 2-10=face value, J/Q/K=11,12,13.

---

## 1. Confirmed Fixed Parameters (Do Not Change)

```txt
Player initial HP     = 200
Boss HP at layer 1    = 300
Deck                  = Water / Fire / Grass, ranks 1-13, 39 cards total, no duplicates
Hand size             = 7
Shuffle per turn      = 2 (resets every turn)
Scoring formula       = floor((hand base chips + Σplayed card chip) x hand multiplier)
chip mapping          = A=1, 2-10=face value, J=11, Q=12, K=13
```

### Hand Score Table (Fixed)
```txt
Straight Flush  base 100  mult 8
Four of a Kind  base 60   mult 7
Full House      base 40   mult 6
Flush           base 35   mult 4
Straight        base 30   mult 4
Three of a Kind base 30   mult 3
Two Pair        base 20   mult 2
Pair            base 10   mult 2
High Card       base 5    mult 1
```

---

## 2. Known Baseline Numbers (from simulation, 50,000 runs, best 7-card play)

```txt
Expected player DPS without buffs = 147
Median DPS without buffs           = 128
P75 DPS without buffs              = 152
P90 DPS without buffs              = 280

Hand appearance probability (under optimal play):
  High Card     18.8%  avg damage   56
  Pair          42.5%  avg damage  123
  Two Pair      20.9%  avg damage  142
  Three of a Kind 3.2% avg damage  243
  Straight       4.3%  avg damage  278
  Flush          8.6%  avg damage  289
  Full House     1.6%  avg damage  544
  Four of a Kind  ~0%
  Straight Flush  0.1% avg damage 1066
```

### Key Conclusions
- The player spends 63% of the time in the "Pair / Two Pair" plateau, with average damage around 130.
- Element damage buffs (x1.1 per layer) have very little effect on average DPS:
  after 10 stacks, DPS only grows from 147 to 195 (+33%) because the bonus only applies to the chip portion of matching-color cards.
- **Conclusion: element damage buffs cannot be the main source of late-game growth; stronger buff types are required.**

---

## 3. Buff Growth Chain Requirements

### 3.1 Fixed Choice After Layer 1
```txt
Choose one of three specialization paths:
  Water specialization / Fire specialization / Grass specialization
  Effect: chip value of that element x 1.1 (the base element-damage buff for layer 1)
```

### 3.2 One Enhancement Per Layer from Layer 2 Onward (Pick 1 of 3)
**Design Requirements:**
- Each layer's buff pool should only show options related to the chosen element
- Buffs must materially improve player DPS; not all options can be weak
- Buffs should be split into three strength tiers: weak (behavior guidance) / medium (stable boost) / strong (high-risk, high-reward)
- After stacking across 10 layers, the player's average DPS should reach 400-600 (from 147 without buffs, a target growth of roughly 3-4x)

### 3.3 Buff Types That Need To Be Designed (At least 8, covering these directions)

**Direction A: direct damage amplification**
- Hand multiplier bonus (strongest, applies directly to the multiplier formula)
- Hand base-chip bonus (second strongest)
- All-hand chip bonus (stable)
- More to be added

**Direction B: element damage amplification (the current weak direction, used as support)**
- Element chip multiplier (already exists, weak)
- Element card base-chip bonus (new)
- More to be added

**Direction C: expanded action space**
- Shuffle count +1 (3 uses per turn)
- Shield cooldown reduction
- More to be added

**Direction D: conditional triggers**
- Extra damage +X% when forming a Flush
- Burst damage on two consecutive turns with the same hand type
- Damage +X% when HP is below 50%
- More to be added

### 3.4 DPS Growth Target Curve
```txt
Layer 1 (no buffs): avg DPS ~= 147
Layer 3 (2 buffs): avg DPS ~= 200-250
Layer 5 (4 buffs): avg DPS ~= 280-350
Layer 7 (6 buffs): avg DPS ~= 380-450
Layer 10 (9 buffs): avg DPS ~= 500-600
```
When generating the numeric table, each layer's buff effects must drive DPS toward these targets.

---

## 4. Boss Numeric Design Requirements

### 4.1 Boss HP Growth
```txt
Layer 1: 300 (fixed)
Growth method: designed independently, not tied to player DPS (because DPS growth is nonlinear)
Reference growth rate: x1.4 per layer for layers 2-3, x1.5 per layer for layers 4-6, x1.3-1.4 per layer for layers 7-10
Target: Layer 10 boss HP should be about 15-20x layer 1 (4500-6000)
```

### 4.2 Run Length Anchoring (by segment)
```txt
Layers 1-3: kill the boss in 3-5 turns (high forgiveness, easy pace)
Layers 4-6: kill the boss in 6-10 turns (pressure starts, requires management)
Layers 7-10: kill the boss in 10-15 turns (hard push, requires precise decisions)
```

Calculation method:
```txt
Effective DPS = avg_DPS x (1 - DEFEND frequency x 0.5)
  (DEFEND turns halve player damage rather than nullifying it, which reduces pressure)
Target kill turns = Boss HP / Effective DPS
```

### 4.3 Boss ATK Design
```txt
Anchor: the number of turns the player can survive in a "pure normal-attack mode"
Boss normal ATK = player_HP / survive_rounds

Target survive_rounds:
  Layers 1-3: 20-25 turns (the player is almost never killed)
  Layers 4-6: 9-12 turns (killing the player starts to become a risk)
  Layers 7-10: 6-9 turns (shield / management is needed to control damage taken)
```

### 4.4 Boss Behavior System

**Three behaviors and their effects:**
```txt
ATTACK (normal attack): deal the layer's Boss ATK damage
CHARGE (charge): do not attack this turn, then force ATTACK next turn with x2.2 damage
DEFEND (defense / damage reduction): boss does not attack this turn; player damage this turn is halved (not zeroed)
```

**Behavior weight table (configurable by development):**
```txt
Layer    ATTACK  CHARGE  DEFEND
1-3      80%     15%     5%
4-6      60%     25%     15%
7-10     45%     30%     25%
```

**Actual DPS impact of boss behavior (expected-value calculation):**
```txt
Effective damage coefficient = P(ATTACK)x1.0 + P(CHARGE)x1.0 + P(DEFEND)x0.5
  Layers 1-3: 0.80x1 + 0.15x1 + 0.05x0.5 = 0.975
  Layers 4-6: 0.60x1 + 0.25x1 + 0.15x0.5 = 0.925
  Layers 7-10: 0.45x1 + 0.30x1 + 0.25x0.5 = 0.875
```

**Expected boss attack damage (including charge):**
```txt
Expected boss attack = P(ATTACK)xATK + P(CHARGE)x0 + P(CHARGE_RELEASE)xATKx2.2
  (CHARGE_RELEASE is forced on the turn after charging)
  Simplified: expected damage per 2 turns ~= ATK x (P_ATTACK x 2 + P_CHARGE x 2.2)
```

---

## 5. Win-Rate Estimation Method

**Simplified ratio method (quick estimate):**
```txt
kill_rounds    = Boss HP / (avg_DPS x effective damage coefficient)
survive_rounds = player_HP / Boss_ATK

ratio = survive_rounds / kill_rounds

ratio > 2.5   -> win rate >99%
ratio 1.8-2.5 -> win rate ~95%
ratio 1.3-1.8 -> win rate ~90%
ratio 1.1-1.3 -> win rate ~80%
ratio 0.95-1.1 -> win rate ~70%
ratio 0.85-0.95 -> win rate ~60%
ratio 0.75-0.85 -> win rate ~55%
ratio < 0.75  -> win rate <50%
```

**Note: shield mechanics add about 5-10% to the win rate (not included above).**

---

## 6. Target Win-Rate Curve

```txt
Layer 1: >99% (guaranteed tutorial win)
Layer 2: ~98%
Layer 3: ~95%
Layer 4: ~80% (major difficulty spike)
Layer 5: ~72%
Layer 6: ~65%
Layer 7: ~58%
Layer 8: ~52%
Layer 9: ~47%
Layer 10: ~42%
```

---

Note: this win-rate curve is problematic. Since both sides scale up together, the win rate should not fall this quickly.

## 7. Numeric Table Format Requirements

The generated numeric table should contain the following columns:

```txt
Layer | Boss HP | Boss ATK | Charge Burst ATK | Player Expected DPS | Effective DPS | Kill Rounds (avg) | Survive Rounds | Win-Rate Ratio | Win-Rate Estimate | New Buff Effect | DPS After Buff Stacking
```

Each layer should also include:
- The boss behavior weights for that layer (ATTACK / CHARGE / DEFEND ratios)
- The 3-choice buff candidate pool for that layer
- Design notes (level experience positioning)

---

## 8. Calculation Script Interface Contract

If code is used to generate the numeric table, the function signatures should follow this contract:

```python
def calc_layer(
    layer: int,
    player_hp: int,          # Player current HP (including HP buffs)
    avg_dps: float,          # Player current avg DPS (including all stacked buffs)
    boss_hp: int,            # Boss HP for this layer
    boss_atk: int,           # Boss normal ATK for this layer
    defend_freq: float,      # Boss DEFEND frequency
    charge_freq: float,      # Boss CHARGE frequency
) -> dict:
    """
    Returns: {
      'effective_dps': float,       # Effective DPS (after DEFEND reduction)
      'kill_rounds': float,         # Average kill rounds
      'survive_rounds': float,      # Survival turns under pure normal attacks
      'ratio': float,               # survive/kill
      'win_rate_est': str,          # win-rate estimate string
      'charge_atk': int,            # charge burst damage
    }
    """

def apply_buff(
    buff_type: str,          # buff type identifier
    buff_value: float,       # buff numeric parameter
    current_dps: float,      # current avg DPS
    current_hand_scores: dict, # current hand score table (may be modified by buffs)
) -> tuple[float, dict]:
    """
    Returns: (new_avg_dps, new_hand_scores)
    Must rerun simulation or update DPS with an analytic formula
    """

def generate_layer_table(
    total_layers: int = 10,
    player_base_hp: int = 200,
    layer1_boss_hp: int = 300,
) -> list[dict]:
    """
    Generate the full numeric table
    For each layer, automatically: 1) choose the optimal buff combination 2) calculate boss HP 3) validate win rate
    Returns a full list of per-layer numeric dicts
    """
```

---

## 9. AI Generation Instructions

Use this document as context and ask the AI to complete the following:

1. **Design 8-10 buff types** covering the four directions in section 3.3, and for each buff provide:
   - Name and description (player-facing)
   - Effect formula (precise numeric calculation)
   - Strength tiers (weak / medium / strong)
   - Estimated improvement to avg DPS
2. **Generate a full 10-layer numeric table**, with every column listed in section 7
3. **Validate the DPS growth curve**: confirm that the stacked avg DPS for each layer matches the target curve in section 3.4
4. **Validate the win-rate curve**: confirm that each layer's win rate matches the target curve in section 6
5. If there is a numeric conflict, prioritize the win-rate curve first, then the DPS growth curve, and finally adjust Boss HP

## 10. Calculation Script and Notes

**Buff strength gaps are huge:**

- Fire specialization `ELEMENT_CHIP_MULT x1.1`: avg only +3 (+2%), almost negligible
- Flush multiplier +1: avg only +6 (+4%), also weak
- `ALL_CHIPS_BONUS +8` (+8 chip per card): avg +114 (**+78%**), the strongest buff type by a large margin

This means that when another AI designs the buff chain, the **main buffs should be `ALL_CHIPS_BONUS` and `HAND_MULT_BONUS`**. The element-damage buffs should only serve as guidance for specialization and should not be expected to drive the DPS growth curve. This conclusion should be attached alongside `numerical-design-spec.md` when you pass it to that AI, otherwise it may reverse the intended buff direction.

Script workflow:

1. Continue appending each layer's buff combination below `BUFFS_L2`
2. Uncomment the `simulate_avg_dps` block and run it to obtain the avg_dps for each layer
3. Fill avg_dps into `LAYER_CONFIGS`, and complete boss_hp and boss_atk
4. Run again and check whether the ratio and win-rate estimate columns match the target curve
5. For more precise validation, change `validate_layers=None` to `validate_layers=[1,4,7,10]`

The initial calculation script lives at: /scripts/calc.py
