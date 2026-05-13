import { test, describe, before, after, afterEach } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { Achievement } from '../../src/models/Achievement.js';
import { connectTestDB, disconnectTestDB } from './setup.js';

describe('Achievement Model DB Tests', () => {
    before(async () => {
        await connectTestDB();
    });

    afterEach(async () => {
        await Achievement.deleteMany({});
    });

    after(async () => {
        await disconnectTestDB({ dropDatabase: true });
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
