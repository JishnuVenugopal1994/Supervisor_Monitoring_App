import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io: Server;

export const initSocket = (httpServer: import('http').Server): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN,
      credentials: true,
    },
  });

  // Verify JWT on every socket connection
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error('Unauthorized'));
      return;
    }
    try {
      jwt.verify(token, process.env.JWT_SECRET!);
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join('shop-floor');

    socket.on('disconnect', () => {
      // cleanup handled automatically
    });
  });

  return io;
};

export { io };
