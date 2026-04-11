/**
 * Balatro 计分管线核心逻辑
 */

// 基础筹码映射表 (文档 1.3 节)
const CHIP_MAP = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    '10': 10, 'J': 10, 'Q': 10, 'K': 10, 'A': 11
};

/**
 * 计算最终得分
 * @param {Array} playedCards - 打出的计分牌 (最多5张)
 * @param {Object} handLevel - 牌型当前等级的 {chips, mult}
 * @param {Array} jokers - 当前持有的小丑牌序列 (有序)
 */
function calculateScore(playedCards, handLevel, jokers) {
    let totalChips = handLevel.chips; // 1. 牌型基础筹码
    let totalMult = handLevel.mult;   // 1. 牌型基础倍率

    // 2. 结算计分牌 (Card-by-Card)
    playedCards.forEach(card => {
        // --- 筹码阶段 ---
        let cardChips = CHIP_MAP[card.rank] || 0;
        if (card.enhancement === 'bonus') cardChips += 30; // 奖励牌
        if (card.edition === 'foil') cardChips += 50;      // 闪箔版本
        
        // 触发点：红蜡封令以上效果触发两次
        const triggerCount = card.seal === 'red' ? 2 : 1;
        
        for (let i = 0; i < triggerCount; i++) {
            totalChips += cardChips;
            
            // --- 倍率阶段 ---
            if (card.enhancement === 'multi') totalMult += 4;  // 倍率牌
            if (card.edition === 'holographic') totalMult += 10; // 多彩版本
            
            // 幻彩连乘 (文档 5.3: ×1.5)
            if (card.edition === 'polychrome') totalMult *= 1.5;
        }
    });

    // 3. 结算小丑牌 (严格从左到右)
    jokers.forEach(joker => {
        // 加法倍率通常先结算（小丑牌种类繁多，这里仅做示例逻辑）
        if (joker.effectType === 'add') {
            totalMult += joker.value;
        } 
        // 乘法倍率连乘是数值爆炸的关键
        else if (joker.effectType === 'times') {
            totalMult *= joker.value;
        }
    });

    // 4. 最终结算 (向下取整)
    return {
        chips: Math.floor(totalChips),
        mult: Math.max(1, Math.floor(totalMult)), // 倍率最低为 1
        finalScore: Math.floor(totalChips * Math.max(1, totalMult))
    };
}

module.exports = { calculateScore };