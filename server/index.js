const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Read SSL certs from test-project/certs/
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, '../test-project/certs/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../test-project/certs/cert.pem'))
};

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  credentials: true
}));

// Create HTTPS server
const server = https.createServer(sslOptions, app);

// Setup socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  path: '/socket.io/',
  connectionStateRecovery: {
    maxDisconnectionDuration: 30000,
    skipMiddlewares: true
  }
});

// Room management
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('create-room', () => {
    const roomId = uuidv4().slice(0, 6).toUpperCase();
    rooms.set(roomId, { createdAt: Date.now(), mobileConnected: false });
    socket.join(roomId);
    socket.emit('room-created', roomId);
    console.log(`Room created: ${roomId}`);
  });

  socket.on('join-room', (roomId) => {
    if (!rooms.has(roomId)) {
      socket.emit('error-message', 'Invalid room ID');
      return;
    }
    socket.join(roomId);
    console.log(`Client ${socket.id} joined room ${roomId}`);
  });

  socket.on('mobile-connect', (roomId) => {
    if (!rooms.has(roomId)) {
      socket.emit('error-message', 'Room not found');
      return;
    }
    const room = rooms.get(roomId);
    room.mobileConnected = true;
    room.mobileSocketId = socket.id;
    rooms.set(roomId, room);

    io.to(roomId).emit('mobile-connected');
    console.log(`Mobile connected to room ${roomId}`);
  });

  socket.on('send-motion', ({ roomId, y }) => {
    if (rooms.has(roomId)) {
      io.to(roomId).emit('receive-motion', { y });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    for (const [roomId, room] of rooms.entries()) {
      if (room.mobileSocketId === socket.id) {
        room.mobileConnected = false;
        room.mobileSocketId = null;
        rooms.set(roomId, room);
        io.to(roomId).emit('mobile-disconnected');
        console.log(`Mobile disconnected from room ${roomId}`);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ HTTPS server running at https://localhost:${PORT}`);
});