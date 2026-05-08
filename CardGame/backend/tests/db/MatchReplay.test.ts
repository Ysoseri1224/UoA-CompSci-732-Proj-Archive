import { test, describe, before, afterEach } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { MatchReplay } from '../../src/models/MatchReplay.js';

describe('MatchReplay Model DB Tests', () => {
    before(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/balatro_test');
        }
    });

    afterEach(async () => {
        await MatchReplay.deleteMany({});
    });

    test('should store Elemental Poker turn data', async () => {
        const replay = new MatchReplay({
            matchId: new mongoose.Types.ObjectId(),
            turns: [{
                turnNumber: 1,
                initialHand: ['WATER_1', 'FIRE_10', 'GRASS_13'],
                events: [{ type: 'SHUFFLE', actor: 'player' }],
                result: { handType: 'PAIR', totalDamage: 50, chips: 20 }
            }]
        });
        const saved = await replay.save();
        assert.strictEqual(saved.turns[0].initialHand.length, 3);
        assert.strictEqual(saved.turns[0]!.initialHand.length, 3);
        assert.strictEqual(saved.turns[0]!.result!.handType, 'PAIR');
    });
});