import assert from 'node:assert';
import { test } from 'node:test';
import './setup.js';
import { User } from '../../src/models/User.js';

test('User Model: should hash password and compare correctly', async () => {
  const userData = {
    username: 'testplayer',
    email: 'test@example.com',
    password: 'securepassword123'
  };

  const user = await User.create(userData);
  
  // 密码应该被加密，不能等于明文
  assert.notStrictEqual(user.password, userData.password);
  
  // 验证比对功能
  const isMatch = await user.comparePassword(userData.password);
  assert.strictEqual(isMatch, true);
  
  const isWrong = await user.comparePassword('wrongpass');
  assert.strictEqual(isWrong, false);
});

test('User Model: should default stats to zero', async () => {
  const user = await User.create({
    username: 'statsplayer',
    email: 'stats@example.com',
    password: 'password123'
  });
  
  assert.strictEqual(user.stats.totalGames, 0);
  assert.strictEqual(user.stats.totalWins, 0);
  assert.strictEqual(user.avatar, 'default');
});