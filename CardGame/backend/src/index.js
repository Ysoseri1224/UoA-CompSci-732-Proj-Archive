const express = require('express');
const http = require('http');

const connectDB = require('./db');
const initSocket = require('./socket');
const routes = require('./routes'); // 引入路由模块 (Node 会自动寻找 routes/index.js)

const app = express();
const server = http.createServer(app);

const PORT = 3000;

// 中间件：允许解析前端发来的 JSON 数据
app.use(express.json());

// 挂载路由模块
app.use('/', routes); 

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