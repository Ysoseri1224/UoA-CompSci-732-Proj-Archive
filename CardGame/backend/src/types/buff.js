// ══════════════════════════════════════════════════════════════════
//  Buff — 可扩展的 union type 系统
// ══════════════════════════════════════════════════════════════════

/**
 * @typedef {ElementDamageBuff|ElementDrawBuff|HighRankDrawBuff} Buff
 * future: ShuffleCountBuff | ShieldAutoRestoreBuff
 */

// ── Buff 类型常量 ────────────────────────────────────────────────
export const BUFF_TYPE = {
  ELEMENT_DAMAGE_MULT:        'ELEMENT_DAMAGE_MULT',
  ELEMENT_DRAW_ON_SHUFFLE:    'ELEMENT_DRAW_ON_SHUFFLE',
  HIGH_RANK_DRAW_ON_SHUFFLE:  'HIGH_RANK_DRAW_ON_SHUFFLE',
};

// ── 属性伤害加成 Buff ───────────────────────────────────────────
/**
 * @typedef {{ type: 'ELEMENT_DAMAGE_MULT', element: import('./card.js').Element, value: number }} ElementDamageBuff
 */

/**
 * @param {import('./card.js').Element} element
 * @param {number} [value]
 * @returns {ElementDamageBuff}
 */
export function createElementDamageBuff(element, value = 1.1) {
  return { type: BUFF_TYPE.ELEMENT_DAMAGE_MULT, element, value };
}

// ── Shuffle 属性保底 Buff ───────────────────────────────────────
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

// ── Shuffle 高费保底 Buff ───────────────────────────────────────
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
  createUpgrade('water_spec', '水系专精', '水系牌伤害 ×1.1', createElementDamageBuff('WATER')),
  createUpgrade('fire_spec',  '火系专精', '火系牌伤害 ×1.1', createElementDamageBuff('FIRE')),
  createUpgrade('grass_spec', '草系专精', '草系牌伤害 ×1.1', createElementDamageBuff('GRASS')),
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
      `${chosenElement}_dmg_${layer}`,
      `${chosenElement} 强化`,
      `${chosenElement} 系牌伤害再 ×1.1`,
      createElementDamageBuff(chosenElement)
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
