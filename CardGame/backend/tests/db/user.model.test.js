import assert from 'node:assert/strict';
import test, {before, beforeEach, after} from 'node:test';

import {User} from '../../src/models/User.js';
import {connectTestDB, clearDatabase, disconnectTestDB} from './setup.js';

before(async () => {
    await connectTestDB();
});

beforeEach(async () => {
    await clearDatabase();
});

after(async () => {
    await disconnectTestDB();
});

test('User requires name, username, and passwordHash', async () => {
    const user = new User({
        username: 'missing-name',
    });

    await assert.rejects(user.save(), (error) => {
        assert.equal(error.name, 'ValidationError');
        assert.ok(error.errors.name);
        assert.ok(error.errors.passwordHash);
        return true;
    });
});

test('User stats default to zero', async () => {
    const user = await User.create({
        name: 'Alice',
        username: 'alice',
        passwordHash: 'hashed-password',
    });

    assert.equal(user.stats.totalGames, 0);
    assert.equal(user.stats.totalWins, 0);
});

test('User creates timestamps', async () => {
    const user = await User.create({
        name: 'Bob',
        username: 'bob',
        passwordHash: 'hashed-password',
    });

    assert.ok(user.createdAt);
    assert.ok(user.updatedAt);
});

test('User username must be unique', async () => {
    await User.create({
        name: 'Alice',
        username: 'alice',
        passwordHash: 'hashed-password',
    });

    await assert.rejects(
        User.create({
            name: 'Alice 2',
            username: 'alice',
            passwordHash: 'hashed-password-2',
        }),
        (error) => {
            assert.equal(error.code, 11000);
            return true;
        }
    );
});

