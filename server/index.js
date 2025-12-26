import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

app.use(express.json());

// ---------- Socket.IO ----------
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// ---------- Paths ----------
const PORT = 3001;
const sessions = new Map();
const distPath = join(__dirname, '../dist');
const publicPath = join(__dirname, 'public');

// ---------- Serve static files ----------
if (fs.existsSync(distPath)) app.use(express.static(distPath));
if (fs.existsSync(publicPath)) app.use(express.static(publicPath));

// ---------- ICE API ----------
app.get('/api/ice', (req, res) => {
  res.json({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });
});

// Accept client-side HTTP logs (useful when browser console is inaccessible)
app.post('/api/client-log', express.json(), (req, res) => {
  const { msg } = req.body || {};
  console.log('[client-http-log]', msg);
  res.status(204).end();
});

// ---------- Socket.IO logic ----------
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('create-room', (roomId) => {
    socket.join(roomId);
    sessions.set(roomId, { host: socket.id, clients: new Map() });
    console.log(`Room created: ${roomId} by ${socket.id}`);
  });

  socket.on('join-room', ({ roomId, userName }) => {
    const session = sessions.get(roomId);
    if (!session) {
      socket.emit('error', 'Invalid room');
      return;
    }

    socket.join(roomId);
    session.clients.set(socket.id, { name: userName });
    socket.emit('room-joined');
    io.to(session.host).emit('client-joined', { id: socket.id, name: userName });
    console.log(`Client ${userName} joined ${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    sessions.forEach((session, roomId) => {
      if (session.host === socket.id) {
        io.to(roomId).emit('error', 'Host disconnected');
        sessions.delete(roomId);
      } else if (session.clients.has(socket.id)) {
        session.clients.delete(socket.id);
        io.to(session.host).emit('client-left', socket.id);
      }
    });
  });

  // Receive client-side logs to help debugging when browser console isn't available
  socket.on('client-log', (msg) => {
    console.log(`[client ${socket.id}] ${msg}`);
  });

  // --- Signaling relay for WebRTC ---
  socket.on('offer', ({ offer, roomId, target }) => {
    console.log(`Relaying offer from ${socket.id} to ${target || roomId}`);
    if (target) {
      io.to(target).emit('offer', { offer, sender: socket.id });
    } else if (roomId) {
      socket.to(roomId).emit('offer', { offer, sender: socket.id });
    }
  });

  socket.on('answer', ({ answer, roomId, target }) => {
    console.log(`Relaying answer from ${socket.id} to ${target || roomId}`);
    if (target) {
      io.to(target).emit('answer', { answer, sender: socket.id });
    } else if (roomId) {
      socket.to(roomId).emit('answer', { answer, sender: socket.id });
    }
  });

  socket.on('ice-candidate', ({ candidate, roomId, target }) => {
    console.log(`Relaying ICE candidate from ${socket.id} to ${target || roomId}`);
    if (target) {
      io.to(target).emit('ice-candidate', { candidate, sender: socket.id });
    } else if (roomId) {
      socket.to(roomId).emit('ice-candidate', { candidate, sender: socket.id });
    }
  });

  // Chat messages forwarded to the room
  socket.on('chat-message', ({ roomId, message, senderName }) => {
    console.log(`Chat message from ${socket.id} in ${roomId}: ${message}`);
    if (roomId) {
      io.to(roomId).emit('chat-message', { message, senderName, timestamp: Date.now() });
    }
  });

  // Host can kick a specific client
  socket.on('kick-client', ({ clientId, roomId }) => {
    const session = sessions.get(roomId);
    if (session && session.host === socket.id) {
      console.log(`Host ${socket.id} kicking client ${clientId} from ${roomId}`);
      io.to(clientId).emit('kicked');
      session.clients.delete(clientId);
      io.to(session.host).emit('client-left', clientId);
    }
  });
});

// ---------- SPA fallback ----------
app.use((req, res) => {
  const reactIndex = join(distPath, 'index.html');
  const vanillaIndex = join(publicPath, 'index.html');

  if (fs.existsSync(reactIndex)) {
    res.sendFile(reactIndex);
  } else if (fs.existsSync(vanillaIndex)) {
    res.sendFile(vanillaIndex);
  } else {
    res.status(404).send('No frontend found');
  }
});

// ---------- Start server ----------
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
