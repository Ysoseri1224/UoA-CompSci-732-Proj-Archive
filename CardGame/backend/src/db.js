import mongoose from 'mongoose';

const connectDB = async (uri = process.env.MONGO_URI || 'mongodb://mongo:27017/balatro_db') => {
  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn.connection;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    throw error;
  }
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

export {connectDB, disconnectDB};