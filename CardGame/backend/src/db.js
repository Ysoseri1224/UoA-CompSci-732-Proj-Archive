const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // 在 Docker Compose 网络中，主机名使用服务名 'mongo'
    const conn = await mongoose.connect('mongodb://mongo:27017/balatro_db');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;