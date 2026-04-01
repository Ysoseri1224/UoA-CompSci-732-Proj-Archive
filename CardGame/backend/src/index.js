const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const redis = require('redis');
const jwt = require('jsonwebtoken');
const { Hand } = require('pokersolver');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// MongoDB 连接
mongoose.connect('mongodb://mongo:27017/cardgame', { useNewUrlParser: true, useUnifiedTopology: true });

// Redis 客户端
const redisClient = redis.createClient({ url: 'redis://redis:6379' });
redisClient.connect();

// 示例路由
app.get('/', (req, res) => res.send('Backend running'));

// Socket.io 示例
io.on('connection', (socket) => {
  console.log('a user connected');
});

server.listen(PORT, () => console.log(`Backend listening on ${PORT}`));