import { test, describe, before, afterEach } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { Achievement } from '../../src/models/Achievement.js';

describe('Achievement Model DB Tests', () => {
    before(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/balatro_test');
        }
    });

    afterEach(async () => {
        await Achievement.deleteMany({});
    });

    test('should create a valid achievement', async () => {
        const achievement = new Achievement({
            achievementId: 'DEAL_1000_DAMAGE',
            name: 'Heavy Hitter',
            description: 'Deal 1000 damage in a single turn',
            conditionType: 'maxDamage',
            conditionValue: 1000
        });
        const saved = await achievement.save();
        assert.strictEqual(saved.achievementId, 'DEAL_1000_DAMAGE');
    });

    test('should fail if required fields are missing', async () => {
        const achievement = new Achievement({ name: 'Incomplete' });
        await assert.rejects(achievement.save());
    });
});