import { test, describe, before, afterEach } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { User } from '../../src/models/User.js';

describe('User Model DB Tests', () => {
    before(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/balatro_test');
        }
    });

    afterEach(async () => {
        await User.deleteMany({});
    });

    test('should support password alias for passwordHash', async () => {
        const user = new User({
            username: 'testplayer',
            email: 'test@example.com',
            password: 'securepassword123' // Using alias
        });
        const saved = await user.save();
        // Check DB field
        assert.strictEqual(saved.passwordHash, 'securepassword123');
        // Check alias access
        assert.strictEqual((saved as any).password, 'securepassword123');
    });

    test('should hide passwordHash in toJSON', async () => {
        const user = new User({
            username: 'hidden',
            email: 'hidden@example.com',
            password: 'secret_hash_value'
        });
        const json = user.toJSON();
        assert.strictEqual(json.passwordHash, undefined);
        assert.strictEqual(json.username, 'hidden');
    });
});