import { before, after } from 'node:test';
import mongoose from 'mongoose';

// Global setup for DB tests
before(async () => {
    const uri = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/balatro_test';
    await mongoose.connect(uri);
    console.log('Connected to Test DB:', uri);
});

after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    console.log('Test DB connection closed.');
});