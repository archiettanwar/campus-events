import { io } from 'socket.io-client';

const fallbackFromApi = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
  : 'http://localhost:5000';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || fallbackFromApi;

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  withCredentials: true,
  transports: ['websocket'],
});