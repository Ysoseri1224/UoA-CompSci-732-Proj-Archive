const Hand = require('pokersolver').Hand;

/**
 * 判定牌型名称
 * @param {Array} cards - 玩家选中的卡牌对象数组
 * @returns {string} - 对应 pokerLevels 中的键名
 */
function evaluateHand(cards) {
    // 1. 将我们的卡牌格式转换为 pokersolver 识别的格式 (如: {rank:'A', suit:'Spades'} -> 'As')
    const gameToSolverMap = { '10': 'T' }; // pokersolver 用 T 表示 10
    const solverCards = cards.map(c => {
        const r = gameToSolverMap[c.rank] || c.rank;
        const s = c.suit[0].toLowerCase(); // 'Spades' -> 's'
        return r + s;
    });

    // 2. 使用 pokersolver 判定
    const solvedHand = Hand.solve(solverCards);
    
    // 3. 将其名称映射回我们游戏的名称
    // pokersolver 的名称包括: 'Pair', 'Three of a Kind', 'Flush', 'Straight' 等
    const nameMap = {
        'Pair': 'Pair',
        'Two Pair': 'Two Pair',
        'Three of a Kind': 'Three of a Kind',
        'Full House': 'Full House',
        'Flush': 'Flush',
        'Straight': 'Straight',
        'Four of a Kind': 'Four of a Kind',
        'Straight Flush': 'Straight Flush',
        'High Card': 'High Card'
    };

    return nameMap[solvedHand.name] || 'High Card';
}

module.exports = { evaluateHand };