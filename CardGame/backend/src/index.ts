import 'dotenv/config';

import express from 'express';
import type { Request, Response } from 'express';
import http from 'node:http';
import cors from 'cors';

import { connectDB } from './db.js';
import { connectRedis } from './redis.js';
import initSocket from './socket.js';

import { loggerMiddleWare } from './middleware/logger.js';
import errorHandler from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import matchRoutes from './routes/matches.js';
import achievementRoutes from './routes/achievements.js';
import rogueRoutes from './routes/rogue.js';

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use(loggerMiddleWare);

// Route mounting
app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/rogue', rogueRoutes);

// Health check
app.get('/', (_req: Request, res: Response) =>
  res.json({ success: true, message: 'Backend API is running', data: null }),
);

// Global error handler
app.use(errorHandler);

async function start() {
  await connectDB();
  await connectRedis();
  initSocket(server);
  server.listen(PORT, () => {
    console.log(`Backend listening on ${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  start();
}

export { app };
