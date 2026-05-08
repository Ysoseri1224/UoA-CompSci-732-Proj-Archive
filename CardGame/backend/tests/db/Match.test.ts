import { test, describe, before, afterEach } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { Match } from '../../src/models/Match.js';
import { User } from '../../src/models/User.js';

describe('Match Model DB Tests', () => {
    before(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/balatro_test');
        }
    });

    afterEach(async () => {
        await Match.deleteMany({});
        await User.deleteMany({});
    });

    test('should create a PVE match record', async () => {
        const user = await new User({ 
            username: 'testplayer01', 
            email: 'test@example.com', 
            password: 'password123' 
        }).save();
        const match = new Match({
            matchType: 'PVE',
            userId: user._id,
            bossId: 'boss_layer_1',
            layer: 1,
            chosenElement: 'FIRE'
        });
        const saved = await match.save();
        assert.strictEqual(saved.matchType, 'PVE');
        assert.strictEqual(saved.chosenElement, 'FIRE');
    });
});