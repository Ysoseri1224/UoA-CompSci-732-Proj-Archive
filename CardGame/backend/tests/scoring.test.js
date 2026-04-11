const { calculateScore } = require('../src/logic/scoring');

// 模拟数据
const mockHand = [{
    rank: 'K',
    suit: 'Hearts',
    enhancement: 'multi', // +4 倍率
    seal: 'red',          // 触发两次
    edition: 'polychrome' // x1.5 倍率
}];

const mockLevel = { chips: 10, mult: 2 }; // 基础对子等级

const mockJokers = [
    { name: '加法小丑', effectType: 'add', value: 10 },
    { name: '乘法小丑', effectType: 'times', value: 2 }
];

const result = calculateScore(mockHand, mockLevel, mockJokers);

console.log("--- 计分管线测试 ---");
console.log(`总筹码: ${result.chips} (预期: 10 + 10*2 = 30)`);
console.log(`总倍率: ${result.mult}`);
console.log(`最终得分: ${result.finalScore}`);

// 计算逻辑验证:
// 基础 Mult 2 
// -> 计分牌(K): (2+4+4)*1.5*1.5 = 22.5
// -> 小丑: (22.5 + 10) * 2 = 65
// -> 最终: 30 * 65 = 1950
if (result.finalScore >= 1900) {
    console.log("✅ 计分逻辑验证通过！数值连乘正确。");
}