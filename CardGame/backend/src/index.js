import 'dotenv/config';

import express from 'express';
import http from 'http';
import cors from 'cors';

import {connectDB} from './db.js';
import {connectRedis} from './redis.js';
import initSocket from './socket.js';

import {loggerMiddleWare} from "./middleware/logger.js";
import errorHandler from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import matchRoutes from './routes/matches.js';
import achievementRoutes from './routes/achievements.js';

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

// Health check
app.get('/', (req, res) => res.json({ success: true, message: 'Backend API is running', data: null }));

// Global error handler (must be after all routes)
app.use(errorHandler);

async function start() {
  // 1. Connect to database
  await connectDB();

  // 2. Connect to Redis
  await connectRedis();

  // 3. Initialise Socket.io
  initSocket(server);

  // 4. Start server
  server.listen(PORT, () => {
    console.log(`Backend listening on ${PORT}`);
  });
}

start();
