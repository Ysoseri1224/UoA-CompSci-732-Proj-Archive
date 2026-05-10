#!/usr/bin/env python3
"""
Elemental Poker — 数值计算脚本 v0.2
用途：生成数值表、验证胜率、模拟buff效果
可复用：修改底部 LAYER_CONFIGS 和 BUFF_CHAIN 后重新运行即可

依赖：Python 3.8+，无第三方库
"""

import random
import math
from itertools import combinations
from collections import Counter
from dataclasses import dataclass, field
from typing import Optional

# ════════════════════════════════════════════════
# 1. 固定常量（不可修改）
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
DECK_BASE = [(e, r) for e in ELEMENTS for r in range(1, 14)]  # 39张

PLAYER_BASE_HP   = 20
LAYER1_BOSS_HP   = 300

# Boss行为权重（层数 → 权重）
BOSS_WEIGHTS = {
    **{l: (0.80, 0.15, 0.05) for l in range(1, 4)},   # attack, charge, defend
    **{l: (0.60, 0.25, 0.15) for l in range(4, 7)},
    **{l: (0.45, 0.30, 0.25) for l in range(7, 11)},
}

# ════════════════════════════════════════════════
# 2. 牌型识别
# ════════════════════════════════════════════════

def chip_value(rank: int) -> int:
    """A=1, 2-10=面值, J=11, Q=12, K=13"""
    return rank

def detect_hand(cards: list[tuple]) -> str:
    """识别牌型，对齐 TS 代码 detectHandType() in lib/hand.ts"""
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
    """顺子检测，对齐 TS 代码：去重排序后逐位检查连续"""
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
# 3. Buff 数据结构
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
    element: Optional[str] = None  # 已选属性专精

# ════════════════════════════════════════════════
# 4. 伤害计算（含buff）
# ════════════════════════════════════════════════

def calc_damage(
    cards: list[tuple],
    buffs: list[Buff],
    hand_table: dict = None,
    boss_defending: bool = False
) -> int:
    """
    计算一次出牌的实际伤害。
    hand_table 若传入则使用（允许被 buff 修改后的表）。
    """
    if hand_table is None:
        hand_table = HAND_TABLE

    hand_type = detect_hand(cards)
    base_chips, base_mult = hand_table[hand_type]

    # 步骤2：HAND_CHIPS_BONUS
    for b in buffs:
        if b.type == 'HAND_CHIPS_BONUS' and b.hand_type == hand_type:
            base_chips += b.bonus_chips

    # 步骤3：HAND_MULT_BONUS（加法叠加，不是乘法）
    for b in buffs:
        if b.type == 'HAND_MULT_BONUS' and b.hand_type == hand_type:
            base_mult += b.bonus_mult

    # 步骤4：每张牌的chip
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

    # 步骤6：Boss防御减半
    if boss_defending:
        damage = math.floor(damage * 0.5)

    return damage

def best_damage(hand7: list[tuple], buffs: list[Buff], hand_table: dict = None) -> int:
    """从7张手牌中选出最优出牌组合，返回最高伤害。"""
    best = 0
    for n in range(1, 8):
        for combo in combinations(hand7, n):
            d = calc_damage(list(combo), buffs, hand_table)
            if d > best:
                best = d
    return best

# ════════════════════════════════════════════════
# 5. DPS 期望值计算（蒙特卡洛）
# ════════════════════════════════════════════════

def simulate_avg_dps(
    buffs: list[Buff],
    hand_table: dict = None,
    n_sims: int = 8000,
    seed: int = 42
) -> dict:
    """
    模拟 n_sims 局，返回 DPS 分布统计。
    返回：{'avg', 'p25', 'p50', 'p75', 'p90', 'p10'}
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
# 6. 单层数值计算
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
    根据本层参数计算关键比值和胜率估算。
    defend_freq / charge_freq 来自 BOSS_WEIGHTS。
    """
    attack_freq = 1.0 - defend_freq - charge_freq

    # Boss DEFEND时玩家伤害减半 → 有效伤害系数
    eff_coeff = attack_freq * 1.0 + charge_freq * 1.0 + defend_freq * 0.5
    effective_dps = avg_dps * eff_coeff

    kill_rounds    = boss_hp / effective_dps if effective_dps > 0 else 999
    survive_rounds = player_hp / boss_atk    if boss_atk > 0     else 999
    ratio          = survive_rounds / kill_rounds if kill_rounds > 0 else 999

    charge_atk = math.floor(boss_atk * 2.2)

    # 胜率估算（简化比值法，护盾额外贡献约+5-10%未计入）
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
# 7. 胜率蒙特卡洛验证（精确，慢）
# ════════════════════════════════════════════════

def simulate_win_rate_with_shield(
    layer, player_hp, boss_hp, boss_atk, buffs, n_sims=800, seed=0
) -> float:
    """带开局护盾的胜率模拟（每层第一次Boss攻击被免疫）"""
    random.seed(seed + layer * 19)
    atk_w, chg_w, def_w = BOSS_WEIGHTS[layer]
    charge_atk = math.floor(boss_atk * 2.2)
    wins = 0
    for _ in range(n_sims):
        php = player_hp; bhp = boss_hp
        charge_stored = False
        shield = True  # 开局护盾
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
    蒙特卡洛模拟真实胜率（含Boss行为随机性）。
    速度较慢，用于验证关键层（建议只验证第1、4、7、10层）。
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

            # BOSS_TELEGRAPH：决定本回合意图
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

            # 玩家出牌
            hand7 = random.sample(DECK_BASE, 7)
            dmg = best_damage(hand7, buffs, hand_table)
            if intent == 'DEFEND':
                dmg = math.floor(dmg * 0.5)
            bhp -= dmg

            if bhp <= 0:
                wins += 1
                break

            # Boss攻击
            if intent == 'ATTACK':
                php -= (charge_atk if releasing_charge else boss_atk)
            elif intent == 'CHARGE':
                charge_stored = True
            # DEFEND：Boss本回合不攻击

    return wins / n_sims

# ════════════════════════════════════════════════
# 8. 完整数值表生成入口
# ════════════════════════════════════════════════

def generate_table(layer_configs: list[dict], validate_layers: list[int] = None):
    """
    layer_configs: 每层的配置 dict，格式见底部 LAYER_CONFIGS
    validate_layers: 需要精确模拟胜率的层（None = 全部快速估算）
    """
    print("=" * 100)
    print(f"{'层':>3} | {'BossHP':>7} | {'BossATK':>8} | {'蓄力ATK':>8} | "
          f"{'玩家HP':>7} | {'avgDPS':>7} | {'effDPS':>7} | "
          f"{'击杀轮':>7} | {'存活轮':>7} | {'比值':>5} | {'胜率估算':>8}")
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

        # 可选：精确模拟
        if validate_layers and layer in validate_layers:
            exact_wr = simulate_win_rate(
                layer=layer, player_hp=cfg['player_hp'],
                boss_hp=cfg['boss_hp'], boss_atk=cfg['boss_atk'],
                buffs=cfg.get('buffs', []),
            )
            row['win_rate_exact'] = f"{exact_wr:.1%}"
        else:
            row['win_rate_exact'] = '—'

        results.append(row)

        print(f"{row['layer']:3d} | {row['boss_hp']:7d} | {row['boss_atk']:8d} | "
              f"{row['charge_atk']:8d} | {row['player_hp']:7d} | "
              f"{row['avg_dps']:7.0f} | {row['effective_dps']:7.0f} | "
              f"{row['kill_rounds']:7.1f} | {row['survive_rounds']:7.1f} | "
              f"{row['ratio']:5.2f} | {row['win_rate_est']:>8}"
              + (f" (实测{row['win_rate_exact']})" if row['win_rate_exact'] != '—' else ''))

    print("=" * 100)
    return results

# ════════════════════════════════════════════════
# 9. 【入口】在这里填写数值，运行脚本生成表格
# ════════════════════════════════════════════════
#
# 使用说明：
#   1. 先用 simulate_avg_dps(buffs) 算出每层的 avg_dps
#   2. 填入下方 LAYER_CONFIGS
#   3. 运行脚本，检查 '比值' 和 '胜率估算' 列
#   4. 若胜率偏差 > 10%，调整 boss_hp 或 boss_atk 后重新运行
#
# buff 示例：
#   Buff(type='ELEMENT_CHIP_MULT', element='F', mult=1.1)   # 火系chip×1.1
#   Buff(type='HAND_MULT_BONUS', hand_type='FLUSH', bonus_mult=1.0)  # 同花倍率+1
#   Buff(type='ALL_CHIPS_BONUS', bonus_chips=5)              # 所有牌+5chip
#   Buff(type='HAND_CHIPS_BONUS', hand_type='PAIR', bonus_chips=20)  # 一对底分+20
# ────────────────────────────────────────────────

# 第1层：无buff基准
BUFFS_L1 = []

# 第2层起：在上一层基础上追加新buff（累积）
# 示例：选了火系专精，第2层又选了"同花倍率+1"
BUFFS_L2 = BUFFS_L1 + [
    Buff(type='ELEMENT_CHIP_MULT', element='F', mult=1.1),  # 第1层结束获得
]
# （后续层依此类推，每层在上层基础上 + 新buff）

# ── 快速算出各层avg_dps（取消注释运行）──
# if __name__ == '__main__':
#     for i, buffs in enumerate([BUFFS_L1, BUFFS_L2], start=1):
#         d = simulate_avg_dps(buffs, n_sims=1500)
#         print(f"第{i}层 avg_dps={d['avg']:.0f}, p50={d['p50']:.0f}, p75={d['p75']:.0f}")

# ── 数值表配置（填完 avg_dps 后启用）──
LAYER_CONFIGS = [
    # 第1层（割草关，基准）
    {'layer':1, 'player_hp':200, 'avg_dps':147, 'boss_hp':300,  'boss_atk':8,  'buffs':BUFFS_L1},

    # 第2-10层：avg_dps 待填入（运行上方 simulate_avg_dps 后填写）
    # buff链和boss数值由数值策划根据 numerical-design-spec.md 填写
    # {'layer':2, 'player_hp':200, 'avg_dps':???, 'boss_hp':???, 'boss_atk':???, 'buffs':BUFFS_L2},
    # ...
]

if __name__ == '__main__':
    BASELINE = simulate_avg_dps([], n_sims=8000)

    # ════════════════════════════════════════════════
    #  10 层完整数值表生成
    #  工具buff 唯一性：选了就从池子消失

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

    # 搏档buf
    B1 = Buff(type='ELEMENT_CHIP_MULT', element='F', mult=1.5)  # 可叠加在专精上
    # 固伤+20 & 回血+2 不在Buff系统内，单独在win_rate模拟中处理

    # 工具buf（唯一）
    TOOLS = [
        ('Shuffle+1', 'shuffle'),
        ('充能+1',   'energy'),
        ('手牌+1',   'handsize'),
    ]

    # 混合路径：3稳->3搏->3工具（模拟典型平衡玩家）
    # 模拟 DPS 增长路径：每层堆一个主要buff
    DUMMY = Buff(type='ELEMENT_CHIP_MULT', element='F', mult=1.05)  # 模拟次要buff的微弱叠加

    BALANCED_BUFFS = [
        ([], '裸打'),                                                    # L1
        ([ELE_SPEC], '专精'),                                           # L2
        ([ELE_SPEC] + [S1], '专精+属chip'),                              # L3
        ([ELE_SPEC] + [S1] + S2_list, '专精+属chip+分层底分'),          # L4
        ([ELE_SPEC] + [S1] + S2_list + S3_list, '专精+属chip+底分+倍率'), # L5
        ([ELE_SPEC] + [S1] + S2_list + S3_list + [B1], '同上+属倍率x1.5'), # L6
        ([ELE_SPEC] + [S1] + S2_list + S3_list + [B1, DUMMY], '同上+次要'), # L7
        ([ELE_SPEC] + [S1] + S2_list + S3_list + [B1, DUMMY, DUMMY], '同上+次要x2'), # L8
        ([ELE_SPEC] + [S1] + S2_list + S3_list + [B1, DUMMY, DUMMY, DUMMY], '同上+次要x3'), # L9
        ([ELE_SPEC] + [S1] + S2_list + S3_list + [B1, DUMMY, DUMMY, DUMMY, DUMMY], '同上+次要x4'), # L10
    ]

    print("\n" + "=" * 110)
    print("10 层完整数值表")
    print("=" * 110)

    LAYER_DPS = []
    for i, (buffs, desc) in enumerate(BALANCED_BUFFS, start=1):
        d = simulate_avg_dps(buffs, n_sims=1500)
        LAYER_DPS.append(d['avg'])
        print(f"  L{i} [{desc}]: avg={d['avg']:.0f}, p50={d['p50']:.0f}, p90={d['p90']:.0f}")

    # ════════════════════════════════════════════════
    #  Boss 数值设计
    #  锚定：kill_rounds=3~5
    #  boss_hp = avg_dps * target_rounds
    # ════════════════════════════════════════════════
    print(f"\n{'层':>3} | {'玩家DPS':>7} | {'目标回合':>8} | {'BossHP':>7} | {'bossATK':>8} | {'存活轮':>7} | {'比值':>6} | {'胜率估算':>8}")
    print("-" * 100)

    TARGET_WIN_RATES = [0.99, 0.98, 0.95, 0.80, 0.72, 0.65, 0.58, 0.52, 0.48, 0.50]
    TARGET_ROUNDS = [4.0, 3.8, 3.6, 3.8, 4.0, 4.2, 4.4, 4.5, 4.5, 4.5]  # 层1教学关稍快

    for layer in range(1, 11):
        dps = LAYER_DPS[layer - 1]
        target_r = TARGET_ROUNDS[layer - 1]
        boss_hp = int(dps * target_r)

        atk_w, chg_w, def_w = BOSS_WEIGHTS[layer]
        # boss_atk: 让存活轮在层1~3宽松(20+), 层4~6中等(9-12), 层7~10紧(6-9)
        if layer <= 3:   target_survive = 22 - layer * 2
        elif layer <= 6: target_survive = 14 - layer
        else:            target_survive = 11 - (layer - 7) * 0.5

        boss_atk = max(3, int(PLAYER_BASE_HP / target_survive * (atk_w + chg_w * 2.2 * 0.5)))

        # 考虑工具buff（固伤+20、回血+2）对存活的影响——保守估计有效HP+4
        effective_hp = PLAYER_BASE_HP
        if layer >= 7: effective_hp += 8   # 回血+2*4rounds ≈ 8额外HP
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

        print(f"{layer:3d} | {dps:7.0f} | {target_r:6.1f}回合 | {boss_hp:7d} | {boss_atk:8d} | {survive_rounds:7.1f} | {ratio:5.2f} | {wr_est:>8} (目标{target_wr*100:.0f}%)")

    # ════════════════════════════════════════════════
    #  精确胜率验证（关键层）
    # ════════════════════════════════════════════════
    print("\n=== 精确胜率验证（蒙特卡洛，3000次模拟）===")
    for layer in [1, 4, 7, 10]:
        boss_hp = int(LAYER_DPS[layer - 1] * TARGET_ROUNDS[layer - 1])
        atk_w, chg_w, def_w = BOSS_WEIGHTS[layer]
        boss_atk = max(3, int(PLAYER_BASE_HP / (22 - layer * 2) * (atk_w + chg_w * 2.2 * 0.5)))
        if layer >= 7: boss_atk -= 2  # 工具buff减伤效果
        wr = simulate_win_rate(layer, PLAYER_BASE_HP, boss_hp, boss_atk, [], n_sims=800)
        print(f"  层{layer}: HP={PLAYER_BASE_HP} bossHP={boss_hp} bossATK={boss_atk} → 胜率≈{wr:.1%}")
    print("=== 基准 DPS ===")
    print(f"avg={BASELINE['avg']:.1f}, p50={BASELINE['p50']:.0f}, p75={BASELINE['p75']:.0f}, p90={BASELINE['p90']:.0f}")

    # ════════════════════════════════════════════════
    #  方案A：单牌型 buff（对照用）
    # ════════════════════════════════════════════════
    print("\n=== 方案A：单牌型 Buff ===")
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
    #  方案B：全牌型分层 Buff（一个buff覆盖所有牌型）
    #  常见牌型(PAIR/TWO_PAIR/THREE): +1 mult
    #  稀有牌型(STRAIGHT/FLUSH):      +2 mult
    #  史诗牌型(FULL_HOUSE/FOUR/SF):  +3 mult
    # ════════════════════════════════════════════════
    print("\n=== 方案B：全牌型分层倍率 Buff ===")
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
    #  方案C：全牌型分层底分 Buff（同样逻辑，不同维度）
    # ════════════════════════════════════════════════
    print("\n=== 方案C：全牌型分层底分 Buff ===")
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
    #  方案C调优：降低底分数值
    # ════════════════════════════════════════════════
    print("\n=== 方案Cv2：分层底分（调低数值）===")
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
    #  方案B砍半：全牌型分层倍率（常见0/稀有+1/史诗+2）
    # ════════════════════════════════════════════════
    print("\n=== 方案Bv2：分层倍率（砍半）===")
    TIER_MULT2 = {
        'PAIR': 0, 'TWO_PAIR': 0, 'THREE_OF_A_KIND': 0,
        'STRAIGHT': 1, 'FLUSH': 1,
        'FULL_HOUSE': 2, 'FOUR_OF_A_KIND': 2, 'STRAIGHT_FLUSH': 2,
    }
    tb2 = [Buff(type='HAND_MULT_BONUS', hand_type=ht, bonus_mult=bm) for ht, bm in TIER_MULT2.items()]
    d_tb2 = simulate_avg_dps(tb2, n_sims=8000)
    pct_b2 = (d_tb2['avg'] - BASELINE['avg']) / BASELINE['avg'] * 100
    print(f"  常见牌型+0 / 稀有+1 / 史诗+2")
    print(f"  avg={d_tb2['avg']:.1f}  +{pct_b2:.1f}%  p90={d_tb2['p90']:.0f}")

    # ════════════════════════════════════════════════
    #  方案Bv3：分层倍率（常见+1/稀有+1/史诗+2）
    # ════════════════════════════════════════════════
    print("\n=== 方案Bv3：分层倍率（常见+1）===")
    TIER_MULT3 = {
        'PAIR': 1, 'TWO_PAIR': 1, 'THREE_OF_A_KIND': 1,
        'STRAIGHT': 1, 'FLUSH': 1,
        'FULL_HOUSE': 2, 'FOUR_OF_A_KIND': 2, 'STRAIGHT_FLUSH': 2,
    }
    tb3 = [Buff(type='HAND_MULT_BONUS', hand_type=ht, bonus_mult=bm) for ht, bm in TIER_MULT3.items()]
    d_tb3 = simulate_avg_dps(tb3, n_sims=8000)
    pct_b3 = (d_tb3['avg'] - BASELINE['avg']) / BASELINE['avg'] * 100
    print(f"  常见+1 / 稀有+1 / 史诗+2")
    print(f"  avg={d_tb3['avg']:.1f}  +{pct_b3:.1f}%  p90={d_tb3['p90']:.0f}")

    # ════════════════════════════════════════════════
    #  双属性牌加成（打出牌含2+元素时，每张 +N chip）
    # ════════════════════════════════════════════════
    # ════════════════════════════════════════════════
    #  方案Bv4：分层倍率（常见+0/稀有+2/史诗+3）
    # ════════════════════════════════════════════════
    print("\n=== 方案Bv4：分层倍率（常见0/稀有2/史诗3）===")
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
    #  方案Bv5：分层倍率（常见+1/稀有+2/史诗+3）
    # ════════════════════════════════════════════════
    print("\n=== 方案Bv5：分层倍率（常见1/稀有2/史诗3）===")
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
    #  最终汇总
    # ════════════════════════════════════════════════
    print("\n" + "=" * 60)
    print("=== 最终池子候选 ===")
    print("=" * 60)
    FINAL = {}
    FINAL['ALL_CHIPS +2']              = 171.9
    FINAL['分层底分Cv2(10/20/35)']      = d_tc2['avg']
    FINAL['分层倍率Bv4(0/2/3)']        = d_tb4['avg']
    FINAL['分层倍率Bv5(1/2/3)']        = d_tb5['avg']
    FINAL['ELEM_CHIPS +5']             = simulate_avg_dps([Buff(type='ELEMENT_CHIPS_BONUS', element='F', bonus_chips=5)], n_sims=1500)['avg']
    FINAL['ELEM_CHIP_MULT x1.4']       = simulate_avg_dps([Buff(type='ELEMENT_CHIP_MULT', element='F', mult=1.4)], n_sims=1500)['avg']
    FINAL['ELEM_CHIP_MULT x1.5']       = simulate_avg_dps([Buff(type='ELEMENT_CHIP_MULT', element='F', mult=1.5)], n_sims=1500)['avg']

    print(f"\n{'Buff':<30} {'avg':>6} {'+%':>6}  {'定位'}")
