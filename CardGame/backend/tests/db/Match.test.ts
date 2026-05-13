import { test, describe, before, after, afterEach } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { Match } from '../../src/models/Match.js';
import { User } from '../../src/models/User.js';
import { connectTestDB, disconnectTestDB } from './setup.js';

describe('Match Model DB Tests', () => {
    before(async () => {
        await connectTestDB();
    });

    afterEach(async () => {
        await Match.deleteMany({});
        await User.deleteMany({});
    });

    after(async () => {
        await disconnectTestDB({ dropDatabase: true });
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
