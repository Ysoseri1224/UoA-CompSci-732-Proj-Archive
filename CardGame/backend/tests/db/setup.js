import mongoose from 'mongoose';
import { before, after, beforeEach } from 'node:test';
import dotenv from 'dotenv';

dotenv.config();

// 严格遵守你们 CI 中的配置
const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/balatro_test';

before(async () => {
  try {
    await mongoose.connect(TEST_MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ Connected to Test Database');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  }
});

after(async () => {
  await mongoose.connection.close();
});

// 每个测试用例执行前清空所有集合
beforeEach(async () => {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});