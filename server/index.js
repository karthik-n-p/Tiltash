const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors({
  origin: [
    'https://f56f-2409-40f3-201d-7849-70f7-f361-637c-bbcd.ngrok-free.app',
    'http://localhost:3000' // Keep localhost for development
  ],
  methods: ['GET', 'POST'],
  credentials: true
}));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'https://f56f-2409-40f3-201d-7849-70f7-f361-637c-bbcd.ngrok-free.app',
      'http://localhost:3000'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  path: '/socket.io/', // Must match client path
  connectionStateRecovery: {
    maxDisconnectionDuration: 30000,
    skipMiddlewares: true
  }
});


// Room management
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Create new room
  socket.on('create-room', () => {
    const roomId = uuidv4().slice(0, 6).toUpperCase();
    rooms.set(roomId, {
      createdAt: Date.now(),
      mobileConnected: false
    });
    socket.join(roomId);
    socket.emit('room-created', roomId);
    console.log(`Room created: ${roomId}`);
  });

  // Join existing room
  socket.on('join-room', (roomId) => {
    if (!rooms.has(roomId)) {
      socket.emit('error-message', 'Invalid room ID');
      return;
    }

    socket.join(roomId);
    console.log(`Client ${socket.id} joined room ${roomId}`);
  });

  // Mobile device connection
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
    console.log(`Mobile device connected to room ${roomId}`);
  });

  // Motion data handling
  socket.on('send-motion', ({ roomId, y }) => {
    if (rooms.has(roomId)) {
      io.to(roomId).emit('receive-motion', { y });
    }
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Check if this was a mobile device and update room status
    for (const [roomId, room] of rooms.entries()) {
      if (room.mobileSocketId === socket.id) {
        room.mobileConnected = false;
        room.mobileSocketId = null;
        rooms.set(roomId, room);
        io.to(roomId).emit('mobile-disconnected');
        console.log(`Mobile device disconnected from room ${roomId}`);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});