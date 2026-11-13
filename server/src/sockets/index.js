import { setIO } from './io.js';
import { verifyToken } from '../utils/jwt.js';

export function initSockets(io) {
  setIO(io);

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Unauthorized'));
    }

    try {
      const payload = verifyToken(token);
      socket.user = { id: payload.id, role: payload.role };
      next();
    } catch {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(socket.user.id);

    if (socket.user.role === 'admin') {
      socket.join('admins');
    }
  });
}