import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '@/middlewares/auth.middleware';
import logger from '@/lib/logger';

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL ?? 'http://localhost:5175',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ─── Auth middleware for Socket.io ──────────────────────
  io.use((socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = verifyAccessToken(token);
      socket.data.userId = payload.userId;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const { userId, role } = socket.data as { userId: string; role: string };
    logger.info(`[Socket] Connected: ${userId} (${role})`);

    // Join personal room for targeted notifications
    socket.join(`user:${userId}`);

    socket.on('join:patient', (patientId: string) => {
      socket.join(`patient:${patientId}`);
    });

    socket.on('join:hospital', (hospitalId: string) => {
      socket.join(`hospital:${hospitalId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`[Socket] Disconnected: ${userId}`);
    });
  });

  logger.info('[Socket] Socket.io initialized');
  return io;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error('Socket.io not initialized — call initSocket first');
  return io;
}

// ─── Emit helpers ─────────────────────────────────────────
export function emitToUser(userId: string, event: string, data: unknown) {
  getIO().to(`user:${userId}`).emit(event, data);
}

export function emitToPatient(patientId: string, event: string, data: unknown) {
  getIO().to(`patient:${patientId}`).emit(event, data);
}

export function emitToHospital(
  hospitalId: string,
  event: string,
  data: unknown
) {
  getIO().to(`hospital:${hospitalId}`).emit(event, data);
}
