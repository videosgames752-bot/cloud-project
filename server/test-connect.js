import { io } from 'socket.io-client';

// Force websocket transport to check if polling is the issue
// Try both localhost and 127.0.0.1 if needed
const socket = io('http://127.0.0.1:3001', { reconnectionAttempts: 3, transports: ['websocket'] });

socket.on('connect', () => {
  console.log('Test client connected:', socket.id);
  setTimeout(() => socket.disconnect(), 1000);
});

socket.on('connect_error', (err) => {
  console.error('Connect error:', err);
});

socket.on('disconnect', () => {
  console.log('Test client disconnected');
  process.exit(0);
});
