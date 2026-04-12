import { Server } from 'socket.io';

export default function initSocket(server) {
  // 创建 Socket.io 实例，并允许跨域（方便前端连接）
  const io = new Server(server, {
    cors: {
      origin: "*", 
      methods: ["GET", "POST"]
    }
  });

  // 监听连接事件
  io.on('connection', (socket) => {
    console.log('🚀 A user connected:', socket.id);

    // 基础断开连接监听
    socket.on('disconnect', () => {
      console.log('👤 User disconnected:', socket.id);
    });
  });

  return io;
};