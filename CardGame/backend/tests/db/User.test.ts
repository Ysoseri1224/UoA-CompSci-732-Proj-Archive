import { test, describe, before, after, afterEach } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../../src/models/User.js';
import { connectTestDB, disconnectTestDB } from './setup.js';

describe('User Model DB Tests', () => {
    before(async () => {
        await connectTestDB();
    });

    afterEach(async () => {
        await User.deleteMany({});
    });

    after(async () => {
        await disconnectTestDB({ dropDatabase: true });
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

    test('should compare plaintext password against passwordHash', async () => {
        const passwordHash = await bcrypt.hash('Password123!', 10);
        const user = new User({
            username: 'compare-user',
            email: 'compare@example.com',
            passwordHash,
        });
        await user.save();

        assert.strictEqual(await user.comparePassword('Password123!'), true);
        assert.strictEqual(await user.comparePassword('WrongPassword!'), false);
    });
});
