import { test, describe, before, afterEach } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { SavePoint } from '../../src/models/SavePoint.js';
import { User } from '../../src/models/User.js';

describe('SavePoint Model DB Tests', () => {
    before(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/balatro_test');
        }
    });

    afterEach(async () => {
        await SavePoint.deleteMany({});
        await User.deleteMany({});
    });

    test('should save custom gameState correctly', async () => {
        const user = await new User({ 
            username: 'saveplayer01', 
            email: 'save@example.com', 
            password: 'password123' 
        }).save();
        const mockState = { player: { hp: 150 }, layer: 2, deck: ['FIRE_1', 'WATER_2'] };
        const sp = new SavePoint({
            userId: user._id,
            runId: 'run_123',
            gameState: mockState,
            layer: 2
        });
        const saved = await sp.save();
        assert.deepStrictEqual(saved.gameState.player, { hp: 150 });
        assert.strictEqual(saved.layer, 2);
    });
});