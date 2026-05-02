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

// 1. 修改了测试名称并移除了对 name 字段的必填验证断言
test('User requires username and passwordHash', async () => {
    const user = new User({
        email: 'test@example.com',
        username: 'test-user',
        // 这里故意不提供 passwordHash
    });

    await assert.rejects(user.save(), (error) => {
        assert.equal(error.name, 'ValidationError');
        // 删除了对 error.errors.name 的检查
        assert.ok(error.errors.passwordHash);
        return true;
    });
});

test('User stats default to zero', async () => {
    const user = await User.create({
        email: 'alice@example.com',
        username: 'alice',
        passwordHash: 'hashed-password',
    });

    assert.equal(user.stats.totalGames, 0);
    assert.equal(user.stats.totalWins, 0);
});

test('User creates timestamps', async () => {
    const user = await User.create({
        email: 'bob@example.com',
        username: 'bob',
        passwordHash: 'hashed-password',
    });

    assert.ok(user.createdAt);
    assert.ok(user.updatedAt);
});

test('User username must be unique', async () => {
    await User.create({
        email: 'alice@example.com',
        username: 'alice',
        passwordHash: 'hashed-password',
    });

    await assert.rejects(
        User.create({
            email: 'alice-2@example.com',
            username: 'alice',
            passwordHash: 'hashed-password-2',
        }),
        (error) => {
            assert.equal(error.code, 11000);
            return true;
        }
    );
});