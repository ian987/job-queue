import express from 'express';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import { redis } from './config/redis';
import { db } from './config/db';
import jobRoutes from './routes/jobs';

const app = express();
const server = http.createServer(app);

export const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors({ origin: '*' }));
app.use(express.json());

// Serve dashboard as static files
app.use(express.static(path.join(__dirname, '../../dashboard')));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/jobs', jobRoutes);

app.get('/stats', async (_req, res) => {
  try {
    const result = await db.query(`SELECT status, COUNT(*) as count FROM jobs GROUP BY status`);
    const stats: Record<string, number> = { pending: 0, processing: 0, completed: 0, failed: 0 };
    result.rows.forEach((row) => { stats[row.status] = parseInt(row.count); });
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

const subscriber = redis.duplicate();
subscriber.subscribe('job:events', (err) => {
  if (err) console.error('Redis subscribe error:', err);
  else console.log('Subscribed to job:events channel');
});

subscriber.on('message', (_channel, message) => {
  try {
    const event = JSON.parse(message);
    io.emit('job:update', event);
  } catch (e) {
    console.error('Failed to parse job event:', e);
  }
});

io.on('connection', (socket) => {
  console.log(`Dashboard connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`Dashboard disconnected: ${socket.id}`));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Producer API running on port ${PORT}`);
  console.log(`Dashboard available at http://localhost:${PORT}`);
});