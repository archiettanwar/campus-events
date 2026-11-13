import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import { initSockets } from './sockets/index.js';
import authRoutes from './routes/auth.routes.js';
import resourceRoutes from './routes/resource.routes.js';
import scheduleRoutes from './routes/schedule.routes.js';
import requestRoutes from './routes/request.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

app.set('io', io);
initSockets(io);

app.use(express.json());
app.use(cors({ origin: allowedOrigins, credentials: true }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'CampusLab API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/requests', requestRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});