import { test, describe, before, after, afterEach } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { MatchReplay } from '../../src/models/MatchReplay.js';
import { connectTestDB, disconnectTestDB } from './setup.js';

describe('MatchReplay Model DB Tests', () => {
    before(async () => {
        await connectTestDB();
    });

    afterEach(async () => {
        await MatchReplay.deleteMany({});
    });

    after(async () => {
        await disconnectTestDB({ dropDatabase: true });
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
