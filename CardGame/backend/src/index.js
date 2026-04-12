import 'dotenv/config';

import express from 'express';
import http from 'http';
import cors from 'cors';

import connectDB from './db.js';
import initSocket from './socket.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import matchRoutes from './routes/matches.js';
import achievementRoutes from './routes/achievements.js';

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// 路由挂载
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/achievements', achievementRoutes);

// 健康检查
app.get('/', (req, res) => res.json({ success: true, message: 'Backend API is running', data: null }));

async function start() {
  // 1. 初始化数据库
  await connectDB();

  // 2. 初始化 socket
  initSocket(server);

  // 3. 启动服务
  server.listen(PORT, () => {
    console.log(`Backend listening on ${PORT}`);
  });
}

start();