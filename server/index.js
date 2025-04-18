const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

io.on('connection', socket => {
  console.log('User connected:', socket.id);

  // Generate room on request
  socket.on('create-room', () => {
    const roomId = uuidv4().slice(0, 6);
    socket.join(roomId);
    socket.emit('room-created', roomId);
    console.log(`Room created: ${roomId}`);
  });

  socket.on('join-room', roomId => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  socket.on('send-motion', ({ roomId, y }) => {
    socket.to(roomId).emit('receive-motion', { y });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(3001, () => {
  console.log('Server running at http://localhost:3001');
});
