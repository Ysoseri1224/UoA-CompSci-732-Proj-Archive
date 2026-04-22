import { Server } from 'socket.io';

export default function initSocket(server) {
  // Create Socket.io instance with CORS enabled for frontend connections
  const io = new Server(server, {
    cors: {
      origin: "*", 
      methods: ["GET", "POST"]
    }
  });

  // Listen for new connections
  io.on('connection', (socket) => {
    console.log('🚀 A user connected:', socket.id);

    // Listen for disconnections
    socket.on('disconnect', () => {
      console.log('👤 User disconnected:', socket.id);
    });
  });

  return io;
};