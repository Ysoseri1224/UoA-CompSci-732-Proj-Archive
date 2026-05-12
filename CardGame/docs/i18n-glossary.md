# i18n Glossary — User-Facing English Terminology

This document is the single source of truth for English strings shown to the user. Per `AGENTS.md`, all UI copy, API messages, and validation errors must be in English. Whenever a new piece of text is added, update the glossary first, then ship the code.

> Code comments (Chinese is fine), log lines, and internal identifiers (buff `type`, `id`) are NOT covered here.

## 1 · Core game vocabulary

| Concept | English | Notes |
|---|---|---|
| 层 / 楼层 | Floor | "Layer N" is reserved for internal types only |
| 回合 | Round | per-floor turn counter |
| 阶段 | Phase | Draw / Skill / Shuffle / Play / Resolve / Boss Attack |
| 出牌 | Play | verb on the action button |
| 弃牌 | Discard | verb on the action button |
| 牌型 | Hand Type | Pair / Two Pair / Flush etc. |
| 牌型底分 | Base Chips | the chip value attached to a hand type before card chips |
| 牌型倍率 | Multiplier (mult) | the `×N` factor |
| 攻击 / 伤害 | Damage | numeric output of a played hand |
| 出牌总分 / 累计积分 | Total Score | run-wide running total |
| 充能 | Energy | resource for skills (stylised "CHARGES" on the SkillBar) |
| 护盾 | Shield | one-shot block buff |
| 冷却 | Cooldown | short label `CD` |
| 强化 / Buff | Enhancement | top-level run-modifier card |
| 唯一 | Unique | tag on enhancements that cannot be picked twice |
| 可叠加 | Stackable | tag on enhancements with additive effect |

## 2 · Elements (cards)

| 中文 | English | Internal `Element` enum |
|---|---|---|
| 水系 | Water | `WATER` |
| 火系 | Fire | `FIRE` |
| 草系 | Grass | `GRASS` |

Card display names follow `${Element}-${Rank}`, e.g. `Fire-K`, `Water-3`.

## 3 · Hand types (already English in `data/handTypes.js`)

PAIR, TWO_PAIR, THREE_OF_A_KIND, STRAIGHT, FLUSH, FULL_HOUSE, FOUR_OF_A_KIND, STRAIGHT_FLUSH, HIGH_CARD.

## 4 · Buffs (data source: `backend/src/types/buff.ts`)

| `id` | label | description |
|---|---|---|
| `water_spec` | Water Specialization | Water cards: chip ×1.1 |
| `fire_spec` | Fire Specialization | Fire cards: chip ×1.1 |
| `grass_spec` | Grass Specialization | Grass cards: chip ×1.1 |
| `${E}_mult_N` | `${Element} Mastery` | `${Element} cards: chip ×1.1 (stackable)` |
| `${E}_chips_N` | `${Element} Surge` | `${Element} cards: +5 chip each (stackable)` |
| `${E}_draw_N` | Shuffle Pity | Each shuffle guarantees one ${Element} card |
| `high_rank_draw_N` | High-Rank Pity | Each shuffle guarantees one K (rank 13) card |
| `all_chips_N` | Flat Damage | +2 chip per played card (stackable) |
| `tiered_chips_N` | Hand Chip Boost | Common +10 / Rare +20 / Epic +35 base chips (stackable) |
| `tiered_mult_N` | Hand Mult Boost | Rare +2 / Epic +3 multiplier (Common +0, stackable) |
| `hp_boost_N` | Vitality | Max HP +5 (stackable) |
| `skill_energy_N` | Energy Expansion | Skill energy cap +1 (unique) |

## 5 · End-of-run / overlay strings

| 场景 | English |
|---|---|
| Rogue 全通关 | RUN COMPLETE! |
| 子标题 | All 10 floors cleared! |
| PvE 单层胜利 | VICTORY! |
| 失败标题 | GAME OVER |
| 失败子标题 | Reached Floor `<n>` · Total Score `<n>` |
| 再来一局 | Play Again |
| 重试本层 | Retry Floor |
| 返回主页 | Back to Home |

## 6 · Action / panel labels

| 中文 | English |
|---|---|
| 出牌攻击 | Play Attack |
| 弃牌补充 | Discard & Draw |
| 总积分 | Total Score |
| 已选 X / 5 | Selected `X` / 5 |
| 当前牌型 | Current Hand |
| 分 (score suffix) | pts |
| 牌堆 | DECK (already English) |
| Active Enhancements | Active Enhancements (already English) |

## 7 · Boss intent banner (Battlefield)

| Intent | Label | Sub-line when applicable |
|---|---|---|
| ATTACK | ATTACK | – |
| CHARGE | CHARGE | NEXT: BURST |
| DEFEND | DEFEND | DMG -50% |

## 8 · Style guide

- Buff labels: **Title Case**, ≤ 24 chars.
- Buff descriptions: sentence case, end without period unless multi-sentence.
- Action buttons: **Title Case**, no exclamation.
- Modal titles: **UPPERCASE** for victory / defeat banners (matches existing visual treatment).
- Numeric formatting: `Number.prototype.toLocaleString()` for scores.
- Pluralisation: spell out small numbers in copy (e.g. `Reached Floor 1`, not `Floor 1th`); template literals are fine for dynamic values.

## 9 · Outstanding (not yet translated)

- Code comments inside JSX / store files — **kept in Chinese** by design.
- `audioManager.js` console warn strings — internal dev-only logs, low priority.
- Backend log messages (`logger.info(..., 'pve room created')`) — already English.
