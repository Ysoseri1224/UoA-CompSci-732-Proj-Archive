#!/usr/bin/env python3
"""
Elemental Poker - Numeric Calculation Script v0.2
Purpose: generate numeric tables, validate win rates, and simulate buff effects
Reusable: modify LAYER_CONFIGS and BUFF_CHAIN at the bottom, then rerun

Dependencies: Python 3.8+, no third-party libraries
"""

import random
import math
from itertools import combinations
from collections import Counter
from dataclasses import dataclass, field
from typing import Optional

# ════════════════════════════════════════════════
# 1. Fixed Constants (Do Not Modify)
# ════════════════════════════════════════════════

HAND_TABLE = {
    # hand_type: (base_chips, base_mult)
    'STRAIGHT_FLUSH':  (100, 8),
    'FOUR_OF_A_KIND':  (60,  7),
    'FULL_HOUSE':      (40,  6),
    'FLUSH':           (35,  4),
    'STRAIGHT':        (30,  4),
    'THREE_OF_A_KIND': (30,  3),
    'TWO_PAIR':        (20,  2),
    'PAIR':            (10,  2),
    'HIGH_CARD':       (5,   1),
}

HAND_ORDER = [
    'STRAIGHT_FLUSH','FOUR_OF_A_KIND','FULL_HOUSE',
    'FLUSH','STRAIGHT','THREE_OF_A_KIND',
    'TWO_PAIR','PAIR','HIGH_CARD'
]

ELEMENTS = ['W', 'F', 'G']  # Water Fire Grass
DECK_BASE = [(e, r) for e in ELEMENTS for r in range(1, 14)]  # 39 cards

PLAYER_BASE_HP   = 20
LAYER1_BOSS_HP   = 300

# Boss behavior weights (layer -> weights)
BOSS_WEIGHTS = {
    **{l: (0.80, 0.15, 0.05) for l in range(1, 4)},   # attack, charge, defend
    **{l: (0.60, 0.25, 0.15) for l in range(4, 7)},
    **{l: (0.45, 0.30, 0.25) for l in range(7, 11)},
}

# ════════════════════════════════════════════════
# 2. Hand Detection
# ════════════════════════════════════════════════

def chip_value(rank: int) -> int:
    """A=1, 2-10=face value, J=11, Q=12, K=13"""
    return rank

def detect_hand(cards: list[tuple]) -> str:
    """Detect the hand type, aligned with TS detectHandType() in lib/hand.ts."""
    ranks  = [c[1] for c in cards]
    colors = [c[0] for c in cards]
    n = len(cards)

    if n == 0:
        return 'HIGH_CARD'

    is_all_same = len(set(colors)) == 1
    is_straight = check_straight(cards)

    # Straight flush
    if n >= 5 and is_all_same and is_straight:
        return 'STRAIGHT_FLUSH'

    # Rank stats: maxCount, pairCount (ranks appearing exactly 2 times)
    rc = Counter(ranks)
    max_count = max(rc.values())
    pair_count = sum(1 for v in rc.values() if v == 2)

    if max_count == 4:                          return 'FOUR_OF_A_KIND'
    if max_count == 3 and pair_count >= 1:      return 'FULL_HOUSE'
    if n >= 5 and is_all_same:                  return 'FLUSH'
    if n >= 5 and is_straight:                  return 'STRAIGHT'
    if max_count == 3:                          return 'THREE_OF_A_KIND'
    if pair_count >= 2:                         return 'TWO_PAIR'
    if max_count == 2:                          return 'PAIR'
    return 'HIGH_CARD'


def check_straight(cards: list[tuple]) -> bool:
    """Straight detection, aligned with the TS code: dedupe, sort, then check consecutive ranks."""
    if len(cards) < 5:
        return False
    ranks = sorted(set(c[1] for c in cards))
    if len(ranks) < 5:
        return False
    for i in range(1, len(ranks)):
        if ranks[i] != ranks[i - 1] + 1:
            return False
    return True

# ════════════════════════════════════════════════
# 3. Buff Data Structures
# ════════════════════════════════════════════════

@dataclass
class Buff:
    type: str
    # HAND_MULT_BONUS:   hand_type + bonus_mult
    # HAND_CHIPS_BONUS:  hand_type + bonus_chips
    # ALL_CHIPS_BONUS:   bonus_chips
    # ELEMENT_CHIP_MULT: element + mult
    # ELEMENT_CHIPS_BONUS: element + bonus_chips
    hand_type:   Optional[str]   = None
    bonus_mult:  Optional[float] = None
    bonus_chips: Optional[int]   = None
    element:     Optional[str]   = None
    mult:        Optional[float] = None

@dataclass
class PlayerState:
    hp:      int
    max_hp:  int
    buffs:   list = field(default_factory=list)
    element: Optional[str] = None  # Selected element specialization

# ════════════════════════════════════════════════
# 4. Damage Calculation (with buffs)
# ════════════════════════════════════════════════

def calc_damage(
    cards: list[tuple],
    buffs: list[Buff],
    hand_table: dict = None,
    boss_defending: bool = False
) -> int:
    """
    Calculate the actual damage of one card play.
    If hand_table is provided, use it instead (allows a buff-modified table).
    """
    if hand_table is None:
        hand_table = HAND_TABLE

    hand_type = detect_hand(cards)
    base_chips, base_mult = hand_table[hand_type]

    # Step 2: HAND_CHIPS_BONUS
    for b in buffs:
        if b.type == 'HAND_CHIPS_BONUS' and b.hand_type == hand_type:
            base_chips += b.bonus_chips

    # Step 3: HAND_MULT_BONUS (additive stacking, not multiplicative)
    for b in buffs:
        if b.type == 'HAND_MULT_BONUS' and b.hand_type == hand_type:
            base_mult += b.bonus_mult

    # Step 4: chip value for each card
    total_card_chips = 0.0
    for card in cards:
        elem, rank = card
        c = float(chip_value(rank))

        for b in buffs:
            if b.type == 'ELEMENT_CHIP_MULT' and b.element == elem:
                c *= b.mult
            if b.type == 'ELEMENT_CHIPS_BONUS' and b.element == elem:
                c += b.bonus_chips
            if b.type == 'ALL_CHIPS_BONUS':
                c += b.bonus_chips

        total_card_chips += c

    damage = math.floor((base_chips + total_card_chips) * base_mult)

    # Step 6: Boss DEFEND halves damage
    if boss_defending:
        damage = math.floor(damage * 0.5)

    return damage

def best_damage(hand7: list[tuple], buffs: list[Buff], hand_table: dict = None) -> int:
    """Select the best playable combination from 7 hand cards and return the maximum damage."""
    best = 0
    for n in range(1, 8):
        for combo in combinations(hand7, n):
            d = calc_damage(list(combo), buffs, hand_table)
            if d > best:
                best = d
    return best

# ════════════════════════════════════════════════
# 5. Expected DPS Calculation (Monte Carlo)
# ════════════════════════════════════════════════

def simulate_avg_dps(
    buffs: list[Buff],
    hand_table: dict = None,
    n_sims: int = 8000,
    seed: int = 42
) -> dict:
    """
    Simulate n_sims runs and return DPS distribution statistics.
    Returns: {'avg', 'p25', 'p50', 'p75', 'p90', 'p10'}
    """
    random.seed(seed)
    scores = []
    for _ in range(n_sims):
        hand7 = random.sample(DECK_BASE, 7)
        scores.append(best_damage(hand7, buffs, hand_table))
    scores.sort()
    n = len(scores)
    return {
        'avg': sum(scores) / n,
        'p10': scores[int(n * 0.10)],
        'p25': scores[int(n * 0.25)],
        'p50': scores[int(n * 0.50)],
        'p75': scores[int(n * 0.75)],
        'p90': scores[int(n * 0.90)],
    }

# ════════════════════════════════════════════════
# 6. Per-Layer Numeric Calculation
# ════════════════════════════════════════════════

def calc_layer(
    layer:        int,
    player_hp:    int,
    avg_dps:      float,
    boss_hp:      int,
    boss_atk:     int,
    defend_freq:  float,
    charge_freq:  float,
) -> dict:
    """
    Compute key ratios and win-rate estimates from the current layer parameters.
    defend_freq / charge_freq come from BOSS_WEIGHTS.
    """
    attack_freq = 1.0 - defend_freq - charge_freq

    # Player damage is halved when Boss DEFENDs -> effective damage coefficient
    eff_coeff = attack_freq * 1.0 + charge_freq * 1.0 + defend_freq * 0.5
    effective_dps = avg_dps * eff_coeff

    kill_rounds    = boss_hp / effective_dps if effective_dps > 0 else 999
    survive_rounds = player_hp / boss_atk    if boss_atk > 0     else 999
    ratio          = survive_rounds / kill_rounds if kill_rounds > 0 else 999

    charge_atk = math.floor(boss_atk * 2.2)

    # Win-rate estimate (simplified ratio method, excluding the extra ~5-10% shield contribution)
    if   ratio > 2.5:  wr = ">99%"
    elif ratio > 1.8:  wr = "~95%"
    elif ratio > 1.3:  wr = "~90%"
    elif ratio > 1.1:  wr = "~80%"
    elif ratio > 0.95: wr = "~70%"
    elif ratio > 0.85: wr = "~60%"
    elif ratio > 0.75: wr = "~55%"
    else:              wr = "<50%"

    return {
        'layer':          layer,
        'boss_hp':        boss_hp,
        'boss_atk':       boss_atk,
        'charge_atk':     charge_atk,
        'player_hp':      player_hp,
        'avg_dps':        round(avg_dps, 1),
        'effective_dps':  round(effective_dps, 1),
        'eff_coeff':      round(eff_coeff, 3),
        'kill_rounds':    round(kill_rounds, 1),
        'survive_rounds': round(survive_rounds, 1),
        'ratio':          round(ratio, 2),
        'win_rate_est':   wr,
        'defend_freq':    defend_freq,
        'charge_freq':    charge_freq,
    }

# ════════════════════════════════════════════════
# 7. Win-Rate Monte Carlo Validation (Exact, Slow)
# ════════════════════════════════════════════════

def simulate_win_rate_with_shield(
    layer, player_hp, boss_hp, boss_atk, buffs, n_sims=800, seed=0
) -> float:
    """Win-rate simulation with a starting shield (the first Boss attack each layer is negated)."""
    random.seed(seed + layer * 19)
    atk_w, chg_w, def_w = BOSS_WEIGHTS[layer]
    charge_atk = math.floor(boss_atk * 2.2)
    wins = 0
    for _ in range(n_sims):
        php = player_hp; bhp = boss_hp
        charge_stored = False
        shield = True  # Starting shield
        rounds = 0
        while php > 0 and bhp > 0 and rounds < 100:
            rounds += 1
            if charge_stored:
                intent = 'ATTACK'; releasing = True; charge_stored = False
            else:
                r = random.random()
                if r < atk_w:       intent = 'ATTACK'; releasing = False
                elif r < atk_w+chg_w: intent = 'CHARGE'; releasing = False
                else:                 intent = 'DEFEND'; releasing = False
            hand7 = random.sample(DECK_BASE, 7)
            dmg = best_damage(hand7, buffs)
            if intent == 'DEFEND': dmg = math.floor(dmg * 0.5)
            bhp -= dmg
            if bhp <= 0: wins += 1; break
            if intent == 'ATTACK':
                d = charge_atk if releasing else boss_atk
                if shield: shield = False; d = 0
                php -= d
            elif intent == 'CHARGE':
                charge_stored = True
        if rounds >= 100: wins += 0
    return wins / n_sims


def simulate_win_rate(
    layer:     int,
    player_hp: int,
    boss_hp:   int,
    boss_atk:  int,
    buffs:     list[Buff],
    hand_table: dict = None,
    n_sims:    int = 5000,
    seed:      int = 0,
) -> float:
    """
    Monte Carlo simulation of the actual win rate (including Boss behavior randomness).
    Slower, intended for validating key layers only (recommended: layers 1, 4, 7, and 10).
    """
    random.seed(seed + layer * 17)
    atk_w, chg_w, def_w = BOSS_WEIGHTS[layer]
    charge_atk = math.floor(boss_atk * 2.2)
    wins = 0

    for _ in range(n_sims):
        php = player_hp
        bhp = boss_hp
        charge_stored = False
        rounds = 0

        while php > 0 and bhp > 0 and rounds < 100:
            rounds += 1

            # BOSS_TELEGRAPH: determine intent for this round
            if charge_stored:
                intent = 'ATTACK'
                releasing_charge = True
                charge_stored = False
            else:
                r = random.random()
                if r < atk_w:
                    intent = 'ATTACK';  releasing_charge = False
                elif r < atk_w + chg_w:
                    intent = 'CHARGE';  releasing_charge = False
                else:
                    intent = 'DEFEND';  releasing_charge = False

            # Player turn
            hand7 = random.sample(DECK_BASE, 7)
            dmg = best_damage(hand7, buffs, hand_table)
            if intent == 'DEFEND':
                dmg = math.floor(dmg * 0.5)
            bhp -= dmg

            if bhp <= 0:
                wins += 1
                break

            # Boss attack
            if intent == 'ATTACK':
                php -= (charge_atk if releasing_charge else boss_atk)
            elif intent == 'CHARGE':
                charge_stored = True
            # DEFEND: Boss does not attack this round

    return wins / n_sims

# ════════════════════════════════════════════════
# 8. Full Numeric Table Generation Entry
# ════════════════════════════════════════════════

def generate_table(layer_configs: list[dict], validate_layers: list[int] = None):
    """
    layer_configs: config dict for each layer, format shown in LAYER_CONFIGS at the bottom
    validate_layers: layers that need exact win-rate simulation (None = fast estimation for all)
    """
    print("=" * 100)
    print(f"{'Lyr':>3} | {'BossHP':>7} | {'BossATK':>8} | {'ChargeATK':>9} | "
          f"{'PlayerHP':>8} | {'avgDPS':>7} | {'effDPS':>7} | "
          f"{'KillRnd':>7} | {'LiveRnd':>7} | {'Ratio':>5} | {'WR Est':>8}")
    print("-" * 100)

    results = []
    for cfg in layer_configs:
        layer    = cfg['layer']
        atk_w, chg_w, def_w = BOSS_WEIGHTS[layer]

        row = calc_layer(
            layer       = layer,
            player_hp   = cfg['player_hp'],
            avg_dps     = cfg['avg_dps'],
            boss_hp     = cfg['boss_hp'],
            boss_atk    = cfg['boss_atk'],
            defend_freq = def_w,
            charge_freq = chg_w,
        )

        # Optional: exact simulation
        if validate_layers and layer in validate_layers:
            exact_wr = simulate_win_rate(
                layer=layer, player_hp=cfg['player_hp'],
                boss_hp=cfg['boss_hp'], boss_atk=cfg['boss_atk'],
                buffs=cfg.get('buffs', []),
            )
            row['win_rate_exact'] = f"{exact_wr:.1%}"
        else:
            row['win_rate_exact'] = '-'

        results.append(row)

        print(f"{row['layer']:3d} | {row['boss_hp']:7d} | {row['boss_atk']:8d} | "
              f"{row['charge_atk']:8d} | {row['player_hp']:7d} | "
              f"{row['avg_dps']:7.0f} | {row['effective_dps']:7.0f} | "
              f"{row['kill_rounds']:7.1f} | {row['survive_rounds']:7.1f} | "
              f"{row['ratio']:5.2f} | {row['win_rate_est']:>8}"
              + (f" (actual {row['win_rate_exact']})" if row['win_rate_exact'] != '-' else ''))

    print("=" * 100)
    return results

# ════════════════════════════════════════════════
# 9. [Entry] Fill In Values Here and Run the Script to Generate the Table
# ════════════════════════════════════════════════
#
# Usage:
#   1. Use simulate_avg_dps(buffs) to calculate avg_dps for each layer
#   2. Fill the results into LAYER_CONFIGS below
#   3. Run the script and check the 'Ratio' and 'WR Est' columns
#   4. If the win-rate deviation is > 10%, adjust boss_hp or boss_atk and rerun
#
# Buff examples:
#   Buff(type='ELEMENT_CHIP_MULT', element='F', mult=1.1)   # Fire chip x1.1
#   Buff(type='HAND_MULT_BONUS', hand_type='FLUSH', bonus_mult=1.0)  # Flush multiplier +1
#   Buff(type='ALL_CHIPS_BONUS', bonus_chips=5)              # All cards +5 chip
#   Buff(type='HAND_CHIPS_BONUS', hand_type='PAIR', bonus_chips=20)  # Pair base chips +20
# ────────────────────────────────────────────────

# Layer 1: baseline without buffs
BUFFS_L1 = []

# Starting from layer 2: append a new buff on top of the previous layer (cumulative)
# Example: chose Fire specialization, then selected "Flush multiplier +1" in layer 2
BUFFS_L2 = BUFFS_L1 + [
    Buff(type='ELEMENT_CHIP_MULT', element='F', mult=1.1),  # Gained after layer 1
]
# (Follow the same pattern for later layers: previous layer buffs + new buff)

# -- Quickly compute avg_dps for each layer (uncomment to run) --
# if __name__ == '__main__':
#     for i, buffs in enumerate([BUFFS_L1, BUFFS_L2], start=1):
#         d = simulate_avg_dps(buffs, n_sims=1500)
#         print(f"Layer {i} avg_dps={d['avg']:.0f}, p50={d['p50']:.0f}, p75={d['p75']:.0f}")

# -- Numeric table configuration (enable after filling avg_dps) --
LAYER_CONFIGS = [
    # Layer 1 (easy baseline stage)
    {'layer':1, 'player_hp':200, 'avg_dps':147, 'boss_hp':300,  'boss_atk':8,  'buffs':BUFFS_L1},

    # Layers 2-10: avg_dps to be filled in (run simulate_avg_dps above first)
    # The buff chain and boss values should be filled in by game balance design according to numerical-design-spec.md
    # {'layer':2, 'player_hp':200, 'avg_dps':???, 'boss_hp':???, 'boss_atk':???, 'buffs':BUFFS_L2},
    # ...
]

if __name__ == '__main__':
    BASELINE = simulate_avg_dps([], n_sims=8000)

    # ════════════════════════════════════════════════
    #  Full 10-layer numeric table generation
    #  Utility buff uniqueness: once selected, it disappears from the pool

    TIER_CHIPS2 = {
        'PAIR': 10, 'TWO_PAIR': 10, 'THREE_OF_A_KIND': 10,
        'STRAIGHT': 20, 'FLUSH': 20,
        'FULL_HOUSE': 35, 'FOUR_OF_A_KIND': 35, 'STRAIGHT_FLUSH': 35,
    }
    TIER_MULT4 = {
        'PAIR': 0, 'TWO_PAIR': 0, 'THREE_OF_A_KIND': 0,
        'STRAIGHT': 2, 'FLUSH': 2,
        'FULL_HOUSE': 3, 'FOUR_OF_A_KIND': 3, 'STRAIGHT_FLUSH': 3,
    }

    ELE_SPEC = Buff(type='ELEMENT_CHIP_MULT', element='F', mult=1.1)
    S1 = Buff(type='ELEMENT_CHIPS_BONUS', element='F', bonus_chips=5)
    S2_list = [Buff(type='HAND_CHIPS_BONUS', hand_type=ht, bonus_chips=bc) for ht, bc in TIER_CHIPS2.items()]
    S3_list = [Buff(type='HAND_MULT_BONUS', hand_type=ht, bonus_mult=bm) for ht, bm in TIER_MULT4.items()]

    # High-risk buff path
    B1 = Buff(type='ELEMENT_CHIP_MULT', element='F', mult=1.5)  # Can stack with specialization
    # Flat damage +20 and heal +2 are outside the Buff system and handled separately in win_rate simulation

    # Utility buffs (unique)
    TOOLS = [
        ('Shuffle+1', 'shuffle'),
        ('Charge+1',  'energy'),
        ('Hand+1',    'handsize'),
    ]

    # Mixed path: 3 stable -> 3 risky -> 3 utility (simulates a typical balanced player)
    # Simulated DPS growth path: stack one major buff each layer
    DUMMY = Buff(type='ELEMENT_CHIP_MULT', element='F', mult=1.05)  # Simulate minor stacking from secondary buffs

    BALANCED_BUFFS = [
        ([], 'No buffs'),                                                    # L1
        ([ELE_SPEC], 'Specialization'),                                      # L2
        ([ELE_SPEC] + [S1], 'Specialization + element chip'),                # L3
        ([ELE_SPEC] + [S1] + S2_list, 'Specialization + element chip + tiered base chips'),          # L4
        ([ELE_SPEC] + [S1] + S2_list + S3_list, 'Specialization + element chip + base chips + multiplier'), # L5
        ([ELE_SPEC] + [S1] + S2_list + S3_list + [B1], 'Above + element multiplier x1.5'),           # L6
        ([ELE_SPEC] + [S1] + S2_list + S3_list + [B1, DUMMY], 'Above + secondary'),                  # L7
        ([ELE_SPEC] + [S1] + S2_list + S3_list + [B1, DUMMY, DUMMY], 'Above + secondary x2'),        # L8
        ([ELE_SPEC] + [S1] + S2_list + S3_list + [B1, DUMMY, DUMMY, DUMMY], 'Above + secondary x3'), # L9
        ([ELE_SPEC] + [S1] + S2_list + S3_list + [B1, DUMMY, DUMMY, DUMMY, DUMMY], 'Above + secondary x4'), # L10
    ]

    print("\n" + "=" * 110)
    print("Full 10-Layer Numeric Table")
    print("=" * 110)

    LAYER_DPS = []
    for i, (buffs, desc) in enumerate(BALANCED_BUFFS, start=1):
        d = simulate_avg_dps(buffs, n_sims=1500)
        LAYER_DPS.append(d['avg'])
        print(f"  L{i} [{desc}]: avg={d['avg']:.0f}, p50={d['p50']:.0f}, p90={d['p90']:.0f}")

    # ════════════════════════════════════════════════
    #  Boss numeric design
    #  Anchor: kill_rounds=3~5
    #  boss_hp = avg_dps * target_rounds
    # ════════════════════════════════════════════════
    print(f"\n{'Lyr':>3} | {'PlayerDPS':>9} | {'TargetRnd':>9} | {'BossHP':>7} | {'bossATK':>8} | {'LiveRnd':>7} | {'Ratio':>6} | {'WR Est':>8}")
    print("-" * 100)

    TARGET_WIN_RATES = [0.99, 0.98, 0.95, 0.80, 0.72, 0.65, 0.58, 0.52, 0.48, 0.50]
    TARGET_ROUNDS = [4.0, 3.8, 3.6, 3.8, 4.0, 4.2, 4.4, 4.5, 4.5, 4.5]  # Layer 1 tutorial stage is slightly faster

    for layer in range(1, 11):
        dps = LAYER_DPS[layer - 1]
        target_r = TARGET_ROUNDS[layer - 1]
        boss_hp = int(dps * target_r)

        atk_w, chg_w, def_w = BOSS_WEIGHTS[layer]
        # boss_atk: keep survive rounds generous for layers 1-3 (20+), moderate for layers 4-6 (9-12), tight for layers 7-10 (6-9)
        if layer <= 3:   target_survive = 22 - layer * 2
        elif layer <= 6: target_survive = 14 - layer
        else:            target_survive = 11 - (layer - 7) * 0.5

        boss_atk = max(3, int(PLAYER_BASE_HP / target_survive * (atk_w + chg_w * 2.2 * 0.5)))

        # Account for utility buffs (flat damage +20, heal +2) on survivability - conservatively estimate effective HP +4
        effective_hp = PLAYER_BASE_HP
        if layer >= 7: effective_hp += 8   # heal +2 * 4 rounds ≈ 8 extra HP
        survive_rounds = effective_hp / (boss_atk * atk_w) if (boss_atk * atk_w) > 0 else 99
        kill_rounds = boss_hp / dps
        ratio = survive_rounds / kill_rounds if kill_rounds > 0 else 99
        target_wr = TARGET_WIN_RATES[layer - 1]

        # ratio -> win_rate mapping
        if ratio > 2.5: wr_est = ">99%"
        elif ratio > 1.8: wr_est = "~95%"
        elif ratio > 1.3: wr_est = "~90%"
        elif ratio > 1.1: wr_est = "~80%"
        elif ratio > 0.95: wr_est = "~70%"
        elif ratio > 0.85: wr_est = "~60%"
        elif ratio > 0.75: wr_est = "~55%"
        else: wr_est = "<50%"

        print(f"{layer:3d} | {dps:7.0f} | {target_r:6.1f} rnds | {boss_hp:7d} | {boss_atk:8d} | {survive_rounds:7.1f} | {ratio:5.2f} | {wr_est:>8} (target {target_wr*100:.0f}%)")

    # ════════════════════════════════════════════════
    #  Exact win-rate validation (key layers)
    # ════════════════════════════════════════════════
    print("\n=== Exact Win-Rate Validation (Monte Carlo, 3000 simulations) ===")
    for layer in [1, 4, 7, 10]:
        boss_hp = int(LAYER_DPS[layer - 1] * TARGET_ROUNDS[layer - 1])
        atk_w, chg_w, def_w = BOSS_WEIGHTS[layer]
        boss_atk = max(3, int(PLAYER_BASE_HP / (22 - layer * 2) * (atk_w + chg_w * 2.2 * 0.5)))
        if layer >= 7: boss_atk -= 2  # Utility buff damage-reduction effect
        wr = simulate_win_rate(layer, PLAYER_BASE_HP, boss_hp, boss_atk, [], n_sims=800)
        print(f"  Layer {layer}: HP={PLAYER_BASE_HP} bossHP={boss_hp} bossATK={boss_atk} -> win rate ≈ {wr:.1%}")
    print("=== Baseline DPS ===")
    print(f"avg={BASELINE['avg']:.1f}, p50={BASELINE['p50']:.0f}, p75={BASELINE['p75']:.0f}, p90={BASELINE['p90']:.0f}")

    # ════════════════════════════════════════════════
    #  Option A: single hand-type buff (for comparison)
    # ════════════════════════════════════════════════
    print("\n=== Option A: Single Hand-Type Buff ===")
    SINGLE = {
        'PAIR +1 mult':      Buff(type='HAND_MULT_BONUS', hand_type='PAIR',    bonus_mult=1),
        'FLUSH +2 mult':     Buff(type='HAND_MULT_BONUS', hand_type='FLUSH',   bonus_mult=2),
        'STRAIGHT +3 mult':  Buff(type='HAND_MULT_BONUS', hand_type='STRAIGHT',bonus_mult=3),
        'ALL_CHIPS +2':      Buff(type='ALL_CHIPS_BONUS', bonus_chips=2),
    }
    for name, b in SINGLE.items():
        d = simulate_avg_dps([b], n_sims=1500)
        pct = (d['avg'] - BASELINE['avg']) / BASELINE['avg'] * 100
        print(f"  {name:<20} avg={d['avg']:6.1f}  +{pct:.1f}%  p90={d['p90']:.0f}")

    # ════════════════════════════════════════════════
    #  Option B: tiered multiplier buffs for all hand types (one buff covers every hand type)
    #  Common hands (PAIR/TWO_PAIR/THREE): +1 mult
    #  Rare hands (STRAIGHT/FLUSH):        +2 mult
    #  Epic hands (FULL_HOUSE/FOUR/SF):    +3 mult
    # ════════════════════════════════════════════════
    print("\n=== Option B: Tiered Multiplier Buff for All Hand Types ===")
    TIER_MULT = {
        'PAIR': 1, 'TWO_PAIR': 1, 'THREE_OF_A_KIND': 1,
        'STRAIGHT': 2, 'FLUSH': 2,
        'FULL_HOUSE': 3, 'FOUR_OF_A_KIND': 3, 'STRAIGHT_FLUSH': 3,
    }
    tier_buffs = []
    for ht, bm in TIER_MULT.items():
        tier_buffs.append(Buff(type='HAND_MULT_BONUS', hand_type=ht, bonus_mult=bm))

    d_tier = simulate_avg_dps(tier_buffs, n_sims=8000)
    pct = (d_tier['avg'] - BASELINE['avg']) / BASELINE['avg'] * 100
    print(f"  avg={d_tier['avg']:.1f}  +{pct:.1f}%  p90={d_tier['p90']:.0f}")

    # ════════════════════════════════════════════════
    #  Option C: tiered base-chip buffs for all hand types (same logic, different axis)
    # ════════════════════════════════════════════════
    print("\n=== Option C: Tiered Base-Chip Buff for All Hand Types ===")
    TIER_CHIPS = {
        'PAIR': 15, 'TWO_PAIR': 15, 'THREE_OF_A_KIND': 15,
        'STRAIGHT': 30, 'FLUSH': 30,
        'FULL_HOUSE': 50, 'FOUR_OF_A_KIND': 50, 'STRAIGHT_FLUSH': 50,
    }
    tier_chip_buffs = []
    for ht, bc in TIER_CHIPS.items():
        tier_chip_buffs.append(Buff(type='HAND_CHIPS_BONUS', hand_type=ht, bonus_chips=bc))

    d_tc = simulate_avg_dps(tier_chip_buffs, n_sims=8000)
    pct = (d_tc['avg'] - BASELINE['avg']) / BASELINE['avg'] * 100
    print(f"  avg={d_tc['avg']:.1f}  +{pct:.1f}%  p90={d_tc['p90']:.0f}")

    # ════════════════════════════════════════════════
    #  Option C tuning: lower base-chip values
    # ════════════════════════════════════════════════
    print("\n=== Option Cv2: Tiered Base Chips (Lower Values) ===")
    TIER_CHIPS2 = {
        'PAIR': 10, 'TWO_PAIR': 10, 'THREE_OF_A_KIND': 10,
        'STRAIGHT': 20, 'FLUSH': 20,
        'FULL_HOUSE': 35, 'FOUR_OF_A_KIND': 35, 'STRAIGHT_FLUSH': 35,
    }
    tc2 = [Buff(type='HAND_CHIPS_BONUS', hand_type=ht, bonus_chips=bc) for ht, bc in TIER_CHIPS2.items()]
    d_tc2 = simulate_avg_dps(tc2, n_sims=8000)
    pct = (d_tc2['avg'] - BASELINE['avg']) / BASELINE['avg'] * 100
    print(f"  avg={d_tc2['avg']:.1f}  +{pct:.1f}%  p90={d_tc2['p90']:.0f}")

    # ════════════════════════════════════════════════
    #  Option B halved: tiered multiplier for all hand types (common 0 / rare +1 / epic +2)
    # ════════════════════════════════════════════════
    print("\n=== Option Bv2: Tiered Multiplier (Halved) ===")
    TIER_MULT2 = {
        'PAIR': 0, 'TWO_PAIR': 0, 'THREE_OF_A_KIND': 0,
        'STRAIGHT': 1, 'FLUSH': 1,
        'FULL_HOUSE': 2, 'FOUR_OF_A_KIND': 2, 'STRAIGHT_FLUSH': 2,
    }
    tb2 = [Buff(type='HAND_MULT_BONUS', hand_type=ht, bonus_mult=bm) for ht, bm in TIER_MULT2.items()]
    d_tb2 = simulate_avg_dps(tb2, n_sims=8000)
    pct_b2 = (d_tb2['avg'] - BASELINE['avg']) / BASELINE['avg'] * 100
    print(f"  Common hands +0 / rare +1 / epic +2")
    print(f"  avg={d_tb2['avg']:.1f}  +{pct_b2:.1f}%  p90={d_tb2['p90']:.0f}")

    # ════════════════════════════════════════════════
    #  Option Bv3: tiered multiplier (common +1 / rare +1 / epic +2)
    # ════════════════════════════════════════════════
    print("\n=== Option Bv3: Tiered Multiplier (Common +1) ===")
    TIER_MULT3 = {
        'PAIR': 1, 'TWO_PAIR': 1, 'THREE_OF_A_KIND': 1,
        'STRAIGHT': 1, 'FLUSH': 1,
        'FULL_HOUSE': 2, 'FOUR_OF_A_KIND': 2, 'STRAIGHT_FLUSH': 2,
    }
    tb3 = [Buff(type='HAND_MULT_BONUS', hand_type=ht, bonus_mult=bm) for ht, bm in TIER_MULT3.items()]
    d_tb3 = simulate_avg_dps(tb3, n_sims=8000)
    pct_b3 = (d_tb3['avg'] - BASELINE['avg']) / BASELINE['avg'] * 100
    print(f"  Common +1 / rare +1 / epic +2")
    print(f"  avg={d_tb3['avg']:.1f}  +{pct_b3:.1f}%  p90={d_tb3['p90']:.0f}")

    # ════════════════════════════════════════════════
    #  Dual-element card bonus (when a played set contains 2+ elements, each card gets +N chip)
    # ════════════════════════════════════════════════
    # ════════════════════════════════════════════════
    #  Option Bv4: tiered multiplier (common +0 / rare +2 / epic +3)
    # ════════════════════════════════════════════════
    print("\n=== Option Bv4: Tiered Multiplier (Common 0 / Rare 2 / Epic 3) ===")
    TIER_MULT4 = {
        'PAIR': 0, 'TWO_PAIR': 0, 'THREE_OF_A_KIND': 0,
        'STRAIGHT': 2, 'FLUSH': 2,
        'FULL_HOUSE': 3, 'FOUR_OF_A_KIND': 3, 'STRAIGHT_FLUSH': 3,
    }
    tb4 = [Buff(type='HAND_MULT_BONUS', hand_type=ht, bonus_mult=bm) for ht, bm in TIER_MULT4.items()]
    d_tb4 = simulate_avg_dps(tb4, n_sims=8000)
    pct_b4 = (d_tb4['avg'] - BASELINE['avg']) / BASELINE['avg'] * 100
    print(f"  avg={d_tb4['avg']:.1f}  +{pct_b4:.1f}%  p90={d_tb4['p90']:.0f}")

    # ════════════════════════════════════════════════
    #  Option Bv5: tiered multiplier (common +1 / rare +2 / epic +3)
    # ════════════════════════════════════════════════
    print("\n=== Option Bv5: Tiered Multiplier (Common 1 / Rare 2 / Epic 3) ===")
    TIER_MULT5 = {
        'PAIR': 1, 'TWO_PAIR': 1, 'THREE_OF_A_KIND': 1,
        'STRAIGHT': 2, 'FLUSH': 2,
        'FULL_HOUSE': 3, 'FOUR_OF_A_KIND': 3, 'STRAIGHT_FLUSH': 3,
    }
    tb5 = [Buff(type='HAND_MULT_BONUS', hand_type=ht, bonus_mult=bm) for ht, bm in TIER_MULT5.items()]
    d_tb5 = simulate_avg_dps(tb5, n_sims=8000)
    pct_b5 = (d_tb5['avg'] - BASELINE['avg']) / BASELINE['avg'] * 100
    print(f"  avg={d_tb5['avg']:.1f}  +{pct_b5:.1f}%  p90={d_tb5['p90']:.0f}")

    # ════════════════════════════════════════════════
    #  Final summary
    # ════════════════════════════════════════════════
    print("\n" + "=" * 60)
    print("=== Final Pool Candidates ===")
    print("=" * 60)
    FINAL = {}
    FINAL['ALL_CHIPS +2']                 = 171.9
    FINAL['Tiered Base Chips Cv2(10/20/35)'] = d_tc2['avg']
    FINAL['Tiered Multiplier Bv4(0/2/3)']    = d_tb4['avg']
    FINAL['Tiered Multiplier Bv5(1/2/3)']    = d_tb5['avg']
    FINAL['ELEM_CHIPS +5']                = simulate_avg_dps([Buff(type='ELEMENT_CHIPS_BONUS', element='F', bonus_chips=5)], n_sims=1500)['avg']
    FINAL['ELEM_CHIP_MULT x1.4']          = simulate_avg_dps([Buff(type='ELEMENT_CHIP_MULT', element='F', mult=1.4)], n_sims=1500)['avg']
    FINAL['ELEM_CHIP_MULT x1.5']          = simulate_avg_dps([Buff(type='ELEMENT_CHIP_MULT', element='F', mult=1.5)], n_sims=1500)['avg']

    print(f"\n{'Buff':<30} {'avg':>6} {'+%':>6}  {'Role'}")
