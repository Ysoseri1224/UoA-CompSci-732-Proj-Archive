// src/data/handTypes.js
// 牌型按标准扑克规则，用卡牌 cost 作为点数，color 作为花色
// score = (基础攻击力 + baseBonus) × multiplier
// 基础攻击力 = 所选牌 cost 之和

export const HAND_TYPES = [
    {
      id: 'royal_flush',
      name: '皇家同花顺',
      description: 'A-K-Q-J-10 同花色',
      baseBonus: 30,
      multiplier: 8.0,
    },
    {
      id: 'straight_flush',
      name: '同花顺',
      description: '同花色连续五张（非A高）',
      baseBonus: 25,
      multiplier: 6.0,
    },
    {
      id: 'four_of_a_kind',
      name: '铁支（四条）',
      description: '四张相同点数 + 1张杂牌',
      baseBonus: 22,
      multiplier: 5.0,
    },
    {
      id: 'full_house',
      name: '葫芦',
      description: '三条 + 一对',
      baseBonus: 18,
      multiplier: 4.0,
    },
    {
      id: 'flush',
      name: '同花',
      description: '五张相同花色（不连续）',
      baseBonus: 15,
      multiplier: 3.5,
    },
    {
      id: 'straight',
      name: '顺子',
      description: '五张连续点数（不同花色）',
      baseBonus: 14,
      multiplier: 3.0,
    },
    {
      id: 'three_of_a_kind',
      name: '三条',
      description: '三张相同点数 + 2张不同杂牌',
      baseBonus: 10,
      multiplier: 2.5,
    },
    {
      id: 'two_pair',
      name: '二对',
      description: '两组不同点数的对子 + 1张杂牌',
      baseBonus: 8,
      multiplier: 2.0,
    },
    {
      id: 'one_pair',
      name: '对子',
      description: '一对相同点数 + 3张杂牌',
      baseBonus: 5,
      multiplier: 1.5,
    },
    {
      id: 'high_card',
      name: '散牌（高牌）',
      description: '无法构成以上任意牌型',
      baseBonus: 2,
      multiplier: 1.0,
    },
  ];