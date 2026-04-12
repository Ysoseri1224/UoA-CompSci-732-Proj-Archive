const { evaluateHand } = require('../src/logic/evaluator');

// 定义测试用例
const testCases = [
    {
        name: "对子 (Pair) 测试",
        cards: [
            { rank: 'A', suit: 'Spades' },
            { rank: 'A', suit: 'Hearts' },
            { rank: '2', suit: 'Clubs' }
        ],
        expected: "Pair"
    },
    {
        name: "同花 (Flush) 测试",
        cards: [
            { rank: '2', suit: 'Hearts' },
            { rank: '5', suit: 'Hearts' },
            { rank: '9', suit: 'Hearts' },
            { rank: 'J', suit: 'Hearts' },
            { rank: 'K', suit: 'Hearts' }
        ],
        expected: "Flush"
    },
    {
        name: "顺子 (Straight) 测试",
        cards: [
            { rank: '7', suit: 'Spades' },
            { rank: '8', suit: 'Hearts' },
            { rank: '9', suit: 'Clubs' },
            { rank: '10', suit: 'Diamonds' },
            { rank: 'J', suit: 'Spades' }
        ],
        expected: "Straight"
    }
];

console.log("--- 牌型判定引擎测试 ---");

testCases.forEach(t => {
    const result = evaluateHand(t.cards);
    if (result === t.expected) {
        console.log(`✅ ${t.name}: 判定正确 (${result})`);
    } else {
        console.error(`❌ ${t.name}: 错误！预期 ${t.expected} 但得到 ${result}`);
    }
});