import { test, describe, before, after, afterEach } from 'node:test';
import assert from 'node:assert';
import { SavePoint } from '../../src/models/SavePoint.js';
import { User } from '../../src/models/User.js';
import { connectTestDB, disconnectTestDB } from './setup.js';

describe('SavePoint Model DB Tests', () => {
    before(async () => {
        await connectTestDB();
    });

    afterEach(async () => {
        await SavePoint.deleteMany({});
        await User.deleteMany({});
    });

    after(async () => {
        await disconnectTestDB({ dropDatabase: true });
    });

    test('should save custom snapshot correctly', async () => {
        const user = await new User({ 
            username: 'saveplayer01', 
            email: 'save@example.com', 
            password: 'password123' 
        }).save();
        const mockSnapshot = { player: { hp: 150 }, layer: 2, deck: ['FIRE_1', 'WATER_2'] };
        const sp = new SavePoint({
            userId: user._id,
            roomId: 'room_123',
            snapshot: mockSnapshot,
            layer: 2
        });
        const saved = await sp.save();
        assert.deepStrictEqual(saved.snapshot.player, { hp: 150 });
        assert.strictEqual(saved.roomId, 'room_123');
        assert.strictEqual(saved.layer, 2);
    });
});
