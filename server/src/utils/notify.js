import { Notification } from '../models/Notification.js';
import { getIO } from '../sockets/io.js';

export async function notify({ userId, eventId, message, type, socketEvent, socketPayload }) {
  try {
    const notification = await Notification.create({
      user: userId,
      event: eventId,
      message,
      type,
    });

    const io = getIO();
    const room = userId.toString();

    io.to(room).emit('notification:new', { notification });

    if (socketEvent) {
      io.to(room).emit(socketEvent, socketPayload);
    }

    return notification;
  } catch (error) {
    console.error('Notification error:', error.message);
  }
}