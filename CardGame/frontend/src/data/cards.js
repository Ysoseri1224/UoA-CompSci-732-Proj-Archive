// src/data/cards.js
// 3种颜色 × 13点数 = 39张，完整类扑克牌库
// cost 1-13 对应点数 A,2,3,4,5,6,7,8,9,10,J,Q,K

export const CARD_POOL = [
    // ── 红色 (red) 1-13 ──────────────────────────────
    { id:  1, name: 'Fire-A',  cost:  1, color: 'red',   image: '/cards/card_01.png' },
    { id:  2, name: 'Fire-2',  cost:  2, color: 'red',   image: '/cards/card_02.png' },
    { id:  3, name: 'Fire-3',  cost:  3, color: 'red',   image: '/cards/card_03.png' },
    { id:  4, name: 'Fire-4',  cost:  4, color: 'red',   image: '/cards/card_04.png' },
    { id:  5, name: 'Fire-5',  cost:  5, color: 'red',   image: '/cards/card_05.png' },
    { id:  6, name: 'Fire-6',  cost:  6, color: 'red',   image: '/cards/card_06.png' },
    { id:  7, name: 'Fire-7',  cost:  7, color: 'red',   image: '/cards/card_07.png' },
    { id:  8, name: 'Fire-8',  cost:  8, color: 'red',   image: '/cards/card_08.png' },
    { id:  9, name: 'Fire-9',  cost:  9, color: 'red',   image: '/cards/card_09.png' },
    { id: 10, name: 'Fire-10', cost: 10, color: 'red',   image: '/cards/card_10.png' },
    { id: 11, name: 'Fire-J',  cost: 11, color: 'red',   image: '/cards/card_11.png' },
    { id: 12, name: 'Fire-Q',  cost: 12, color: 'red',   image: '/cards/card_12.png' },
    { id: 13, name: 'Fire-K',  cost: 13, color: 'red',   image: '/cards/card_13.png' },
  
    // ── 蓝色 (blue) 1-13 ─────────────────────────────
    { id: 14, name: 'Water-A',  cost:  1, color: 'blue',  image: '/cards/card_14.jpg' },
    { id: 15, name: 'Water-2',  cost:  2, color: 'blue',  image: '/cards/card_15.jpg' },
    { id: 16, name: 'Water-3',  cost:  3, color: 'blue',  image: '/cards/card_16.jpg' },
    { id: 17, name: 'Water-4',  cost:  4, color: 'blue',  image: '/cards/card_17.jpg' },
    { id: 18, name: 'Water-5',  cost:  5, color: 'blue',  image: '/cards/card_18.png' },
    { id: 19, name: 'Water-6',  cost:  6, color: 'blue',  image: '/cards/card_19.png' },
    { id: 20, name: 'Water-7',  cost:  7, color: 'blue',  image: '/cards/card_20.png' },
    { id: 21, name: 'Water-8',  cost:  8, color: 'blue',  image: '/cards/card_21.png' },
    { id: 22, name: 'Water-9',  cost:  9, color: 'blue',  image: '/cards/card_22.png' },
    { id: 23, name: 'Water-10', cost: 10, color: 'blue',  image: '/cards/card_23.png' },
    { id: 24, name: 'Water-J',  cost: 11, color: 'blue',  image: '/cards/card_24.png' },
    { id: 25, name: 'Water-Q',  cost: 12, color: 'blue',  image: '/cards/card_25.png' },
    { id: 26, name: 'Water-K',  cost: 13, color: 'blue',  image: '/cards/card_26.png' },
  
    // ── 绿色 (green) 1-13 ────────────────────────────
    { id: 27, name: 'Grass-A',  cost:  1, color: 'green', image: '/cards/card_27.png' },
    { id: 28, name: 'Grass-2',  cost:  2, color: 'green', image: '/cards/card_28.png' },
    { id: 29, name: 'Grass-3',  cost:  3, color: 'green', image: '/cards/card_29.png' },
    { id: 30, name: 'Grass-4',  cost:  4, color: 'green', image: '/cards/card_30.png' },
    { id: 31, name: 'Grass-5',  cost:  5, color: 'green', image: '/cards/card_31.png' },
    { id: 32, name: 'Grass-6',  cost:  6, color: 'green', image: '/cards/card_32.png' },
    { id: 33, name: 'Grass-7',  cost:  7, color: 'green', image: '/cards/card_33.png' },
    { id: 34, name: 'Grass-8',  cost:  8, color: 'green', image: '/cards/card_34.png' },
    { id: 35, name: 'Grass-9',  cost:  9, color: 'green', image: '/cards/card_35.png' },
    { id: 36, name: 'Grass-10', cost: 10, color: 'green', image: '/cards/card_36.png' },
    { id: 37, name: 'Grass-J',  cost: 11, color: 'green', image: '/cards/card_37.png' },
    { id: 38, name: 'Grass-Q',  cost: 12, color: 'green', image: '/cards/card_38.png' },
    { id: 39, name: 'Grass-K',  cost: 13, color: 'green', image: '/cards/card_39.png' },
  ];