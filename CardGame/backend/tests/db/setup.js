import mongoose from 'mongoose';

const DEFAULT_TEST_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/balatro_test';

export async function connectTestDB(uri = DEFAULT_TEST_URI) {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }
  return mongoose.connection;
}

export async function clearDatabase() {
  if (mongoose.connection.readyState === 0) {
    await connectTestDB();
  }

  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

export async function disconnectTestDB({ dropDatabase = true } = {}) {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  if (dropDatabase) {
    await mongoose.connection.dropDatabase();
  }

  await mongoose.connection.close();
}
