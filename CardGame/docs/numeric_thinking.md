# Numeric Design Notes - Elemental Poker v1.0

> A complete end-to-end numeric design process from scratch. Player HP = 20, element specialization, 9 buff types (3 already connected to the upgrade pool, 6 defined but not yet connected), and 2 utility buffs not implemented yet.

---

## 1. Base Constraints

| Parameter | Value | Notes |
|---|---|---|
| Total cards | 39 (13 each of Water / Fire / Grass) | Fixed |
| Hand size | 7 | Fixed |
| Rank mapping | A=1, 2-10=face value, J=11, Q=12, K=13 | rank is the chipValue |
| Damage formula | `(base chips + ΣcardChip) x multiplier`, rounded down | x0.5 if the boss DEFENDs |
| Turn target | Kill the boss in 3-5 turns | All boss HP is designed around this |
| Minimum survival | >= 3.5 turns | Ensures the player can play at least 3 hands |

---

## 2. Player HP Growth

| Layer | Base HP |
|---|---|
| 1-3 | 20 |
| 4-6 | 30 |
| 7-10 | 40 |

- HP fully restores when moving to the next layer; it does not carry over
- Optional HP+5 buff that permanently increases max HP
- Layer progression grows in integer steps and does not rely on buffs to stay alive

---

## 3. Hand Frequency and Scoring

| Hand Type | Frequency | Base Chips | Multiplier |
|---|---|---|---|
| STRAIGHT_FLUSH | 0.1% | 100 | 8 |
| FOUR_OF_A_KIND | ~0% | 60 | 7 |
| FULL_HOUSE | 1.6% | 40 | 6 |
| FLUSH | 8.6% | 35 | 4 |
| STRAIGHT | 4.3% | 30 | 4 |
| THREE_OF_A_KIND | 3.2% | 30 | 3 |
| TWO_PAIR | 20.9% | 20 | 2 |
| PAIR | 42.5% | 10 | 2 |
| HIGH_CARD | 18.8% | 5 | 1 |

Baseline DPS (raw play, 20,000 Monte Carlo runs): avg=143, p50=124, p90=272

---

## 4. Current Buff Pool Implementation (v1.0)

The current code (`backend/src/types/buff.ts`) defines 9 buff types. Among them, the upgrade pool currently offers 6 in practice (the first layer gives a fixed 1-of-3 specialization choice, and later layers randomly draw 3 choices from 3 types). The remaining types are defined but not yet connected to the upgrade pool and are reserved for future iterations.

### Already Connected to the Upgrade Pool

| Buff Interface | Value | Notes |
|---|---|---|
| `ELEMENT_CHIP_MULT` | x1.1 (stackable) | Multiplies chip value for specialized element cards. The first layer is a fixed 3-way choice (Water / Fire / Grass specialization) |
| `ELEMENT_DRAW_ON_SHUFFLE` | One guaranteed specialized-element card per Shuffle | Improves Shuffle control |
| `HIGH_RANK_DRAW_ON_SHUFFLE` | One guaranteed K (rank 13) card per Shuffle | Stable source of high ranks |

### Defined but Not Yet Connected to the Upgrade Pool

| Buff Interface | Expected Value | Notes |
|---|---|---|
| `HAND_CHIPS_BONUS` | Common +10 / Rare +20 / Epic +35 | Adds base chips by hand rarity; type already defined |
| `HAND_MULT_BONUS` | Common +0 / Rare +2 / Epic +3 | Adds multiplier by hand rarity; type already defined |
| `ELEMENT_CHIPS_BONUS` | +5 per specialized-element card | Stable DPS increase; type already defined |
| `ALL_CHIPS_BONUS` | +N chip per card | Generic damage bonus; type already defined |
| `HP_BONUS` | Max HP +5 | Survival-focused; type already defined |
| `SKILL_ENERGY_MAX` | Skill energy cap +1 | Expands the energy pool; type already defined |

### Unimplemented Utility Buffs

| Buff | Effect | Status |
|---|---|---|
| Shuffle +1 | 3 shuffle actions per turn | Not implemented, see 7.8 |
| Hand +1 | Hand cap 8 cards | Not implemented, see 7.8 |

The current first-layer upgrade pool is the specialization 3-way choice (`water_spec` / `fire_spec` / `grass_spec`), all of which are `ELEMENT_CHIP_MULT x1.1`. Later layers draw from `ELEMENT_CHIP_MULT` (stackable), `ELEMENT_DRAW_ON_SHUFFLE`, and `HIGH_RANK_DRAW_ON_SHUFFLE`, then return 3 choices. The same buff can be picked repeatedly (stacking).

---

## 5. Boss Behavior Weights

| Layer | ATTACK | CHARGE | DEFEND |
|---|---|---|---|
| 1-3 | 80% | 15% | 5% |
| 4-6 | 60% | 25% | 15% |
| 7-10 | 45% | 30% | 25% |

Charged burst damage = Boss ATK x 2.2 (rounded down). DEFEND halves player damage.

---

## 6. Final 10-Layer Boss Stat Table

| Layer | PlayerHP | DPS | BossHP | BossATK | Charge | Kill Turn | Survival Turns | Ratio | Estimated Win Rate |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 20 | 143 | 543 | 3 | 6 | 3.8 | 8.3 | 2.19 | ~95% |
| 2 | 20 | 150 | 570 | 4 | 8 | 3.8 | 6.2 | 1.64 | ~85% |
| 3 | 20 | 175 | 647 | 4 | 8 | 3.7 | 6.2 | 1.69 | ~85% |
| 4 | 30 | 200 | 780 | 9 | 19 | 3.9 | 5.6 | 1.42 | ~75% |
| 5 | 30 | 230 | 966 | 10 | 22 | 4.2 | 5.0 | 1.19 | ~65% |
| 6 | 30 | 260 | 1144 | 10 | 22 | 4.4 | 5.0 | 1.14 | ~65% |
| 7 | 40 | 275 | 1292 | 19 | 41 | 4.7 | 4.7 | 1.00 | ~55% |
| 8 | 40 | 290 | 1450 | 21 | 46 | 5.0 | 4.2 | 0.85 | ~50% |
| 9 | 40 | 305 | 1586 | 22 | 48 | 5.2 | 4.0 | 0.78 | ~50% |
| 10 | 40 | 320 | 1760 | 23 | 50 | 5.5 | 3.9 | 0.70 | <50% |

---

## 7. Design Tradeoff Log

### 7.1 Keep ALL_CHIPS_BONUS as a type, but do not include it in the pool for now

**Original plan**: each played card gets +2 chip, with a measured DPS gain of about +20%.

**Problem**: the first layer must choose an element specialization (Water / Fire / Grass), and all later buffs revolve around that specialization. If the pool also contains a generic "all cards +2" buff, the specialization difference disappears. A Fire-specialization player and a non-specialized player could receive the same buff, which dilutes the value of the specialization choice.

**Decision**: keep `ALL_CHIPS_BONUS` in `buff.ts` for later use, but do not return this type from `generateUpgradePool` for now. In v1.0, the core damage buff in the upgrade pool is `ELEMENT_CHIP_MULT` (element specialization x1.1), which preserves the exclusive value of specialization. A player who chooses Fire specialization gets Fire card chip x1.1 and is therefore more motivated to build Fire-based hands, forming a closed loop.

---

### 7.2 Abandon single-hand-type buffs -> replace with layered buffs for all hand types (types defined, not yet in pool)

**Original plan**: one separate buff per hand type (`HAND_MULT +1 (PAIR)`, `HAND_MULT +2 (FLUSH)`, `HAND_CHIPS +30 (FLUSH)`, etc.).

**Problem**:
- Frequency is highly imbalanced: PAIR appears 42.5% of the time (giving +1 mult is about a +21% DPS boost), while STRAIGHT appears 4.3% of the time (even +3 mult only gives about a +6% DPS boost). Buff values inside the same pool differ by 3-4x.
- It occupies too many slots: with 9 slots, hand-type buffs alone would take 6-8, leaving no space for other directions.

**Decision**: use one buff to cover all 9 hand types and layer it by rarity: common hands (pair / two pair / three of a kind) get smaller boosts, rare hands (straight / flush) get larger boosts, and epic hands (full house / four of a kind / straight flush) get the largest boosts. One buff = the work of 8 original buffs.

**Derived design**:
- Layered base-chip buff: common +10 / rare +20 / epic +35 chip. Type `HAND_CHIPS_BONUS` already exists in `buff.ts`.
- Layered multiplier buff: common +0 / rare +2 / epic +3 mult. Type `HAND_MULT_BONUS` already exists in `buff.ts`.
- The multiplier version's "common +0" is intentional: PAIR already appears 42.5% of the time; if it got +1 mult, it would move to another tier (+38%, too strong). Giving it 0 means common hands do not receive the bonus, which encourages players to aim for stronger hands.

**v1.0 status**: both layered buff interfaces are defined and wired into `calculateDamage`, but `generateUpgradePool` does not yet return them. The current upgrade pool only contains `ELEMENT_CHIP_MULT`, `ELEMENT_DRAW_ON_SHUFFLE`, and `HIGH_RANK_DRAW_ON_SHUFFLE`.

---

### 7.3 Additional Straight-specific buffs were abandoned

**Original plan**: give Straight a dedicated high-power scaling buff.

**Problem**: Straight only appears 4.3% of the time, which is one of the lowest frequencies among all hands except Four of a Kind and Straight Flush. Even if the multiplier is raised by +3 (from the unbuffed 4 to 7), the measured DPS increase is only about +6.2%. Compared with Flush (8.6% frequency, and +2 mult already gives +8.9%), Straight is naturally weaker.

**Deeper reason**: the 39-card deck (3 elements x 13 ranks) requires 5 consecutive ranks for a straight, and each card is drawn randomly. In 7 cards, the chance of getting 5 consecutive ranks is far lower than getting 5 cards of the same suit. Flush can be helped by Shuffle and Change Color, while Straight can only rely on Shuffle.

**Decision**: do not create a dedicated Straight buff. Straight is a rare hand and can be covered by the layered buffs; it is not worth its own buff slot.

---

### 7.4 Reflect damage was abandoned

**Original plan**: return N% of boss attack damage back to the boss.

**Problem**: the designed Boss ATK values are 3-23. Even with 50% reflect, the amount returned per layer is about 7.5 damage (roughly equal to DPS +2 per turn). By comparison, the fixed-damage buff gives +20 per turn, an order of magnitude larger. More importantly, reflect conflicts with shield - if the shield negates damage, reflect does not trigger.

**Decision**: do not implement it. The boss ATK system is not a good fit for a reflect mechanic.

---

### 7.5 Lifesteal -> not implemented

**Original plan**: restore N% of dealt damage as HP.

**Problem**: player damage is around 140 per turn, while HP is only 20. Even 1% lifesteal means about 1.4 HP per turn, or roughly 5.6 HP per 4-turn run, which is about 28% of max HP. At 5% lifesteal the player would heal to full immediately. HP and damage are not on the same scale, so percentage lifesteal would either be too weak (0.1%) to matter or too strong (1%+) to be balanced.

**v1.0 status**: lifesteal and flat healing are not implemented. There is no healing-related buff type in `buff.ts`, and no HP recovery logic in `calculateDamage` / `doRoundEndConfirm` or related flows. Survival currently depends entirely on shield and the boss ATK curve (HP in three tiers: 20 -> 30 -> 40). Healing will be reconsidered in a later iteration.

---

### 7.6 HP grows in three tiers: 20 -> 30 -> 40

**Original plan**: player HP stays fixed at 20 and is extended via buffs.

**Problem**: L7-L10 boss ATK reaches 19-23. If player HP stays 20, survival is under 2 turns, meaning the player cannot even play three hands before dying. If survival depends entirely on buffs (HP+5, healing+2), then players who do not pick them are doomed, which goes against rogue-like design principles.

**Decision**: make HP grow naturally in three tiers - L1-3 = 20 (tutorial), L4-6 = 30 (growth), L7-10 = 40 (peak). Growth is an integer tier jump rather than a noisy +2 every layer. The HP+5 buff remains optional; players who pick it become tankier (similar to getting the next tier early), but players who do not pick it can still win.

---

### 7.7 Three revisions of the win-rate curve

**First version**: the spec said L1 >99%, L4 ~80%, L10 ~42%. It was pointed out that "both sides scale up together, so the win rate should not fall that quickly" - which is correct. If the player picks buffs every layer, their growth speed should roughly track the boss's growth speed.

**Second version**: L10 was adjusted to 50%, with the earlier layers adjusted accordingly. But when win-rate was estimated using a survive/kill ratio, the mapping from ratio to win-rate was too coarse - jumping from "~90%" to "~95%" meant a large tier jump.

**Third version** (final): after HP is split into three tiers, survival turns stay >= 3.5 throughout. The win-rate curve becomes 95% -> 85% -> 75% -> 65% -> 55% -> 50% -> <50%, with no oscillation. The early 3 layers are slightly lower than the original spec (85-95% vs 95-99%), because HP = 20 means even the tutorial has a tiny chance of failure. Monte Carlo testing tends to show 5-10% higher win rates than the ratio-based estimate, because shield, healing, and player decisions are not included in the simple formula.

---

### 7.8 Utility Buff Status

**Original plan**: three utility buffs (Shuffle +1, energy +1, hand +1), each only selectable once and removed from the pool after selection.

**v1.0 status**:
- **Energy +1**: implemented. `SKILL_ENERGY_MAX` is defined in `buff.ts` and wired into `calculateDamage` and skill-energy logic. However, `generateUpgradePool` does not return this type yet, so players cannot get it from the upgrade pool. The current energy cap is fixed at 3.
- **Shuffle +1**: not implemented. There is no corresponding buff interface in `buff.ts`. The number of Shuffle actions per turn is hard-coded to 2 (`state.ts:99`: `createShuffleState` returns `{ remaining: 2 }`).
- **Hand +1**: not implemented. There is no corresponding buff interface in `buff.ts`. The hand cap is hard-coded to 7 (`actions.ts:42`: `drawCards(deckState(ctx), 7 - ctx.hand.length)`).

Why Shuffle +1 and Hand +1 are not implemented:
- Shuffle +1, when stacked, makes card-finding too easy and completely breaks the hand-type probability distribution (see the flush vs straight frequency difference in 7.2 - flush already gets heavily amplified by shuffle, and after 3 shuffles you can almost "pick any flush you want").
- Hand +1 (7 -> 8) seems mild, but it significantly increases the odds of Four of a Kind / Full House and shifts the DPS curve away from the simulation baseline.

Among the three utility buffs, only Energy +1 provides resource flexibility without changing the hand-type probability distribution, so it is prioritized. Shuffle +1 and Hand +1 need to wait until we can control how stacking affects hand-type probabilities.
