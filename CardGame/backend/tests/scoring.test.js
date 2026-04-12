const { calculateScore } = require('../src/logic/scoring');

/**
 * 严格对齐文档的测试用例
 * 场景：打出一张 K（对子牌型中的计分牌），带有红蜡封和幻彩版本
 */

// 1. 模拟打出的计分牌 (符合文档 5.4 叠加规则)
const mockHand = [{
    rank: 'K',            // 基础筹码: 10 [cite: 16]
    suit: 'Hearts',
    enhancement: 'multi', // 增强：倍率牌 (+4 倍率) [cite: 102]
    seal: 'red',          // 蜡封：红蜡封 (触发两次效果) 
    edition: 'polychrome' // 版本：幻彩 (x1.5 倍率) [cite: 108]
}];

// 2. 模拟牌型等级 (文档 2.1: 1级对子)
const mockLevel = { chips: 10, mult: 2 }; 

// 3. 模拟小丑牌 (文档 6.1: 有序结算)
const mockJokers = [
    { name: '加法小丑', effectType: 'add', value: 10 }, // 提供 +10 倍率
    { name: '乘法小丑', effectType: 'times', value: 2 }  // 提供 x2 倍率
];

// 执行计算
const result = calculateScore(mockHand, mockLevel, mockJokers);

/**
 * 详细计算逻辑说明 (文档 3.0):
 * * 筹码 (Chips):
 * - 牌型基础: 10 [cite: 20]
 * - 卡牌点数 (K): 10 (基础属性不触发红蜡封) [cite: 16, 105]
 * - 总筹码 = 10 + 10 = 20
 * * 倍率 (Mult):
 * - 第一步 (加法累加 [cite: 42]):
 * 基础(2) + 计分牌增强(+4) + 红蜡封触发(+4) + 小丑加法(+10) = 20
 * - 第二步 (乘法连乘 [cite: 43]):
 * 累计倍率(20) * 幻彩(1.5) * 红蜡封幻彩(1.5) * 小丑乘法(2) = 90 [cite: 60]
 * * 最终得分:
 * - 20 * 90 = 1800 [cite: 32]
 */

console.log("--- 计分管线测试 (遵循文档规则) ---");
console.log(`总筹码: ${result.chips} (预期: 20)`);
console.log(`总倍率: ${result.mult} (预期: 90)`);
console.log(`最终得分: ${result.finalScore} (预期: 1800)`);

// 验证逻辑
if (result.finalScore === 1800) {
    console.log("✅ 计分逻辑验证通过！严格执行：先加后乘、红蜡封重复触发、基础筹码不重复。");
} else {
    console.error("❌ 计分逻辑验证失败，请检查逻辑顺序。");
}