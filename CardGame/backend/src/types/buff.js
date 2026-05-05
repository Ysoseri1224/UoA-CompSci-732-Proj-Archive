// ══════════════════════════════════════════════════════════════════
//  Buff — 可扩展的 union type 系统
// ══════════════════════════════════════════════════════════════════

/**
 * @typedef {HandMultBonus|HandChipsBonus|AllChipsBonus|ElementChipMult|ElementChipsBonus|ElementDrawBuff|HighRankDrawBuff} Buff
 * future: ShuffleCountBuff | ShieldAutoRestoreBuff | HPBonus
 */

// ── Buff 类型常量 ────────────────────────────────────────────────
export const BUFF_TYPE = {
  // 方向A：直接伤害放大
  HAND_MULT_BONUS:          'HAND_MULT_BONUS',
  HAND_CHIPS_BONUS:         'HAND_CHIPS_BONUS',
  ALL_CHIPS_BONUS:          'ALL_CHIPS_BONUS',
  // 方向B：属性增伤
  ELEMENT_CHIP_MULT:        'ELEMENT_CHIP_MULT',
  ELEMENT_CHIPS_BONUS:      'ELEMENT_CHIPS_BONUS',
  // 方向C：操作空间扩展
  ELEMENT_DRAW_ON_SHUFFLE:  'ELEMENT_DRAW_ON_SHUFFLE',
  HIGH_RANK_DRAW_ON_SHUFFLE:'HIGH_RANK_DRAW_ON_SHUFFLE',
};

// ── 方向A：直接伤害放大 ─────────────────────────────────────────
/**
 * @typedef {{ type: 'HAND_MULT_BONUS', handType: import('./card.js').HandType, bonusMult: number }} HandMultBonus
 */

/**
 * @param {import('./card.js').HandType} handType
 * @param {number} bonusMult
 * @returns {HandMultBonus}
 */
export function createHandMultBonus(handType, bonusMult) {
  return { type: BUFF_TYPE.HAND_MULT_BONUS, handType, bonusMult };
}

/**
 * @typedef {{ type: 'HAND_CHIPS_BONUS', handType: import('./card.js').HandType, bonusChips: number }} HandChipsBonus
 */

/**
 * @param {import('./card.js').HandType} handType
 * @param {number} bonusChips
 * @returns {HandChipsBonus}
 */
export function createHandChipsBonus(handType, bonusChips) {
  return { type: BUFF_TYPE.HAND_CHIPS_BONUS, handType, bonusChips };
}

/**
 * @typedef {{ type: 'ALL_CHIPS_BONUS', bonusChips: number }} AllChipsBonus
 */

/**
 * @param {number} bonusChips
 * @returns {AllChipsBonus}
 */
export function createAllChipsBonus(bonusChips) {
  return { type: BUFF_TYPE.ALL_CHIPS_BONUS, bonusChips };
}

// ── 方向B：属性增伤 ─────────────────────────────────────────────
/**
 * @typedef {{ type: 'ELEMENT_CHIP_MULT', element: import('./card.js').Element, mult: number }} ElementChipMult
 */

/**
 * @param {import('./card.js').Element} element
 * @param {number} [mult]
 * @returns {ElementChipMult}
 */
export function createElementChipMult(element, mult = 1.1) {
  return { type: BUFF_TYPE.ELEMENT_CHIP_MULT, element, mult };
}

/**
 * @typedef {{ type: 'ELEMENT_CHIPS_BONUS', element: import('./card.js').Element, bonusChips: number }} ElementChipsBonus
 */

/**
 * @param {import('./card.js').Element} element
 * @param {number} bonusChips
 * @returns {ElementChipsBonus}
 */
export function createElementChipsBonus(element, bonusChips) {
  return { type: BUFF_TYPE.ELEMENT_CHIPS_BONUS, element, bonusChips };
}

// ── 方向C：操作空间扩展 ─────────────────────────────────────────
/**
 * @typedef {{ type: 'ELEMENT_DRAW_ON_SHUFFLE', element: import('./card.js').Element }} ElementDrawBuff
 */

/**
 * @param {import('./card.js').Element} element
 * @returns {ElementDrawBuff}
 */
export function createElementDrawBuff(element) {
  return { type: BUFF_TYPE.ELEMENT_DRAW_ON_SHUFFLE, element };
}

/**
 * @typedef {{ type: 'HIGH_RANK_DRAW_ON_SHUFFLE' }} HighRankDrawBuff
 */

/**
 * @returns {HighRankDrawBuff}
 */
export function createHighRankDrawBuff() {
  return { type: BUFF_TYPE.HIGH_RANK_DRAW_ON_SHUFFLE };
}

// ══════════════════════════════════════════════════════════════════
//  Upgrade — 强化选项
// ══════════════════════════════════════════════════════════════════

/**
 * @typedef {{ id: string, label: string, description: string, buff: Buff }} Upgrade
 */

/**
 * @param {string} id
 * @param {string} label
 * @param {string} description
 * @param {Buff} buff
 * @returns {Upgrade}
 */
export function createUpgrade(id, label, description, buff) {
  return { id, label, description, buff };
}

// ── 第一层：固定 3 选 1（属性专精）─────────────────────────────
/** @type {Upgrade[]} */
export const FIRST_LAYER_UPGRADES = [
  createUpgrade('water_spec', '水系专精', '水系牌 chip ×1.1', createElementChipMult('WATER')),
  createUpgrade('fire_spec',  '火系专精', '火系牌 chip ×1.1', createElementChipMult('FIRE')),
  createUpgrade('grass_spec', '草系专精', '草系牌 chip ×1.1', createElementChipMult('GRASS')),
];

// ── 后续层强化候选池生成 ────────────────────────────────────────
/**
 * 根据已选属性生成候选强化池（3选1）
 * @param {import('./card.js').Element} chosenElement
 * @param {number} layer
 * @returns {Upgrade[]}
 */
export function generateUpgradePool(chosenElement, layer) {
  const pool = [
    createUpgrade(
      `${chosenElement}_mult_${layer}`,
      `${chosenElement} 强化`,
      `${chosenElement} 系牌 chip ×1.1（可叠加）`,
      createElementChipMult(chosenElement)
    ),
    createUpgrade(
      `${chosenElement}_draw_${layer}`,
      'Shuffle 保底',
      `每次 Shuffle 保证获得一张 ${chosenElement} 系牌`,
      createElementDrawBuff(chosenElement)
    ),
    createUpgrade(
      `high_rank_draw_${layer}`,
      '高费保底',
      '每次 Shuffle 保证获得一张 K（13点）牌',
      createHighRankDrawBuff()
    ),
  ];
  // Fisher-Yates shuffle → 取 3 个
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}
