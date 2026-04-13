/**
 * Balatro 计分管线核心逻辑 - 严格遵循文档 3.0 计分公式
 */

// 基础筹码映射表 (文档 1.3)
const CHIP_MAP = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    '10': 10, 'J': 10, 'Q': 10, 'K': 10, 'A': 11
};

/**
 * 计算最终得分
 * @param {Array} playedCards - 打出的计分牌 (文档 2.2: 仅核心牌参与计分)
 * @param {Object} handLevel - 牌型当前等级的 {chips, mult} (文档 2.1)
 * @param {Array} jokers - 当前持有的小丑牌序列 (文档 6.1: 有序)
 * @param {Array} heldCards - 手中未打出的牌 (用于结算钢铁牌等效果, 文档 5.1)
 */
export function calculateScore(playedCards, handLevel, jokers, heldCards = []) {
    let totalChips = handLevel.chips; // 牌型基础筹码 [cite: 35]
    let totalMult = handLevel.mult;   // 牌型基础倍率 [cite: 42]
    
    // 专门存储连乘因子的数组，确保在所有加法完成后结算 
    let xMults = [];

    // --- 步骤 1: 结算打出的计分牌 (Card-by-Card) ---
    playedCards.forEach(card => {
        // 1.1 添加卡牌基础筹码 (基础值仅加一次) [cite: 16, 36]
        totalChips += (CHIP_MAP[card.rank] || 0);

        // 1.2 结算增强、蜡封和版本 [cite: 97, 114]
        // 红蜡封令该牌所有效果额外触发一次 [cite: 105, 115]
        const triggerCount = card.seal === 'red' ? 2 : 1;

        for (let i = 0; i < triggerCount; i++) {
            // 筹码加成
            if (card.enhancement === 'bonus') totalChips += 30;   // 奖励牌 [cite: 102]
            if (card.edition === 'foil') totalChips += 50;        // 闪箔版本 [cite: 108]
            if (card.enhancement === 'stone') totalChips += 50;   // 石头牌 [cite: 102]

            // 倍率加法 (+Mult)
            if (card.enhancement === 'multi') totalMult += 4;     // 倍率牌 [cite: 102]
            if (card.edition === 'holographic') totalMult += 10;  // 多彩版本 [cite: 108]
            
            // 特殊逻辑：幸运牌概率触发 [cite: 102]
            if (card.enhancement === 'lucky' && Math.random() < 0.2) {
                totalMult += 20;
            }

            // 倍率乘法 (xMult) - 存入列表延迟结算 
            if (card.edition === 'polychrome') xMults.push(1.5);  // 幻彩版本 [cite: 108]
            if (card.enhancement === 'glass') xMults.push(2.0);   // 玻璃牌 [cite: 102]
        }
    });

    // --- 步骤 2: 结算手牌效果 (Held-in-Hand) ---
    heldCards.forEach(card => {
        const triggers = card.seal === 'red' ? 2 : 1;
        for (let i = 0; i < triggers; i++) {
            if (card.enhancement === 'steel') xMults.push(1.5);   // 钢铁牌 [cite: 54, 102]
        }
    });

    // --- 步骤 3: 结算小丑牌 (严格从左到右) [cite: 56, 65] ---
    jokers.forEach(joker => {
        // 小丑提供的基础筹码
        if (joker.chips) totalChips += joker.chips;

        // 小丑提供的加法倍率 
        if (joker.effectType === 'add') {
            totalMult += joker.value;
        } 
        // 小丑提供的乘法倍率 [cite: 40, 95]
        else if (joker.effectType === 'times') {
            xMults.push(joker.value);
        }
    });

    // --- 步骤 4: 执行最终连乘 (数值爆炸的核心) [cite: 43, 60] ---
    xMults.forEach(factor => {
        totalMult *= factor;
    });

    // 结果处理：确保倍率不低于 1，并向下取整 [cite: 32, 59]
    totalMult = Math.max(1, totalMult);
    
    return {
        chips: Math.floor(totalChips),
        mult: Math.floor(totalMult),
        finalScore: Math.floor(totalChips * totalMult)
    };
}