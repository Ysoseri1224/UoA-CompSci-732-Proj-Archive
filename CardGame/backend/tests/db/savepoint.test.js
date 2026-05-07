import assert from 'node:assert';
import { test } from 'node:test';
import mongoose from 'mongoose';
import './setup.js';
import { SavePoint } from '../../src/models/SavePoint.js';

test('SavePoint Model: should save complex snapshot', async () => {
  const userId = new mongoose.Types.ObjectId();
  
  const save = await SavePoint.create({
    userId,
    roomId: 'room_123', // 替换了之前的 runId
    layer: 2,
    snapshot: {         // 替换了之前的 gameState
      value: 'BATTLE',
      context: {
        room: { roomId: 'room_123', pot: 100 },
        player: { health: 20 },
        bot: { health: 300 }
      }
    }
  });

  assert.strictEqual(save.layer, 2);
  assert.strictEqual(save.roomId, 'room_123');
  assert.strictEqual(save.snapshot.value, 'BATTLE');
});

test('SavePoint Model: should enforce unique userId index', async () => {
  const userId = new mongoose.Types.ObjectId();
  
  // 必须提供 roomId 和 snapshot 才能通过 Mongoose 的 required 校验
  await SavePoint.create({ 
    userId, 
    roomId: 'room_abc', 
    snapshot: { status: 'init' } 
  });

  try {
    // 尝试为同一个用户创建第二个存档，应该被 unique 索引阻止
    await SavePoint.create({ 
      userId, 
      roomId: 'room_def', 
      snapshot: { status: 'new' } 
    });
    assert.fail('Should have thrown unique index error');
  } catch (err) {
    assert.strictEqual(err.code, 11000); // 11000 是 MongoDB 的重复键错误码
  }
});