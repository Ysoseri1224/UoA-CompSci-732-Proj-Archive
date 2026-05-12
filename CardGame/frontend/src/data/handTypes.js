// src/data/handTypes.js
// 牌型按标准扑克规则，用卡牌 cost 作为点数，color 作为花色
// score = (基础攻击力 + baseBonus) × multiplier
// 基础攻击力 = 所选牌 cost 之和

export const HAND_TYPES = [
    {
      id: 'royal_flush',
      name: 'Royal Flush',
      description: 'A-K-Q-J-10 same suit',
      baseBonus: 30,
      multiplier: 8.0,
    },
    {
      id: 'straight_flush',
      name: 'Straight Flush',
      description: '5 consecutive same suit (non-ace high)',
      baseBonus: 25,
      multiplier: 6.0,
    },
    {
      id: 'four_of_a_kind',
      name: 'Four of a Kind',
      description: '4 same rank + 1 kicker',
      baseBonus: 22,
      multiplier: 5.0,
    },
    {
      id: 'full_house',
      name: 'Full House',
      description: 'Three of a Kind + One Pair',
      baseBonus: 18,
      multiplier: 4.0,
    },
    {
      id: 'flush',
      name: 'Flush',
      description: '5 same suit (non-consecutive)',
      baseBonus: 15,
      multiplier: 3.5,
    },
    {
      id: 'straight',
      name: 'Straight',
      description: '5 consecutive ranks (mixed suits)',
      baseBonus: 14,
      multiplier: 3.0,
    },
    {
      id: 'three_of_a_kind',
      name: 'Three of a Kind',
      description: '3 same rank + 2 different kickers',
      baseBonus: 10,
      multiplier: 2.5,
    },
    {
      id: 'two_pair',
      name: 'Two Pair',
      description: '2 pairs of different ranks + 1 kicker',
      baseBonus: 8,
      multiplier: 2.0,
    },
    {
      id: 'one_pair',
      name: 'One Pair',
      description: '1 pair same rank + 3 kickers',
      baseBonus: 5,
      multiplier: 1.5,
    },
    {
      id: 'high_card',
      name: 'High Card',
      description: 'No hand type matched',
      baseBonus: 2,
      multiplier: 1.0,
    },
  ];