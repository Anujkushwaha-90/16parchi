import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { CONFIG } from './config.js';
import { setupGameSockets } from './sockets/gameSocket.js';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import friendsRoutes from './routes/friends.routes.js';
import roomsRoutes from './routes/rooms.routes.js';
import matchesRoutes from './routes/matches.routes.js';
import duoRoutes from './routes/duo.routes.js';

const app = express();
const server = http.createServer(app);

// Cross-Origin Resource Sharing configuration
app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/duo', duoRoutes);

// Health check endpoint
app.get(['/health', '/api/health'], (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), game: '16 PARCHI' });
});

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  },
});

setupGameSockets(io);

// Start server only in non-serverless environments
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  server.listen(CONFIG.PORT, () => {
    console.log(`===============================================`);
    console.log(`🎴 16 PARCHI Real-time Multiplayer Server`);
    console.log(`🚀 Server listening on http://localhost:${CONFIG.PORT}`);
    console.log(`📡 Socket.IO initialized for real-time play`);
    console.log(`===============================================`);
  });
}

export default app;
export { app, server };
