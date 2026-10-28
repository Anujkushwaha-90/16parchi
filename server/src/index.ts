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

const app = express();
const server = http.createServer(app);

// Cross-Origin Resource Sharing configuration
app.use(
  cors({
    origin: [CONFIG.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);

app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/matches', matchesRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), game: '16 PARCHI' });
});

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: [CONFIG.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  },
});

setupGameSockets(io);

// Start server
server.listen(CONFIG.PORT, () => {
  console.log(`===============================================`);
  console.log(`🎴 16 PARCHI Real-time Multiplayer Server`);
  console.log(`🚀 Server listening on http://localhost:${CONFIG.PORT}`);
  console.log(`📡 Socket.IO initialized for real-time play`);
  console.log(`===============================================`);
});

export { app, server };
