import { Server } from 'socket.io';
import { registerSocketHandlers } from "./utils/socketHandlers.js";

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
    registerSocketHandlers(socket);
  });

  return io;
};
