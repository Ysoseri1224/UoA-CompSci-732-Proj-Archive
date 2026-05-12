import http from 'node:http';
import { Server } from 'socket.io';
import type { Socket } from 'socket.io';
import { registerPveHandlers } from './utils/pveHandlers.js';

export default function initSocket(server: http.Server) {
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket: Socket) => {
    registerPveHandlers(socket);
  });

  return io;
}
