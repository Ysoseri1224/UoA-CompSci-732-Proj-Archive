import 'dotenv/config';

import mongoose from 'mongoose';

import {connectDB, disconnectDB} from '../../src/db.js';

const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/balatro_test';
const EXPECTED_TEST_DB_NAME = 'balatro_test';

const connectTestDB = async () => {
    await connectDB(`${TEST_MONGO_URI}?serverSelectionTimeoutMS=1000`);
}

const clearDatabase = async () => {
    const currentDbName = mongoose.connection.name;
    if (currentDbName !== EXPECTED_TEST_DB_NAME) {
        throw new Error(`Refusing to clear non-test database: ${currentDbName}`);
    }

    const {collections} = mongoose.connection;

    for (const collection of Object.values(collections)) {
        await collection.deleteMany({});
    }
};

const disconnectTestDB = async () => {
    await disconnectDB();
};

export {connectTestDB, clearDatabase, disconnectTestDB};