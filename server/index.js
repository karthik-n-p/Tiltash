const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Read SSL certs
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
  pingInterval: 10000, // More frequent pings
  pingTimeout: 5000,   // Faster disconnect detection
  transports: ['websocket'], // Force websocket only for less overhead
  perMessageDeflate: true,   // Enable compression
  connectionStateRecovery: {
    maxDisconnectionDuration: 30000,
    skipMiddlewares: true,
  }
});

// Room management
const rooms = new Map();

// Game constants
 // Add this at the top of your server file where other constants are defined
 const PADDLE_MOVE_BUFFER_SIZE = 5;
const GAME_WIDTH = 100;
const GAME_HEIGHT = 100;
const BALL_RADIUS = 3;
const PADDLE_HEIGHT = 20;
const BALL_SPEED = 1.2;

// Game loop interval (ms)
const GAME_TICK = 16;

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('create-room', () => {
    const roomId = uuidv4().slice(0, 1).toUpperCase();
    
    // Initialize game state
    const gameState = {
      leftPaddleY: 50,
      rightPaddleY: 50,
      ballX: 50,
      ballY: 50,
      ballVelocityX: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      ballVelocityY: BALL_SPEED * (Math.random() * 2 - 1),
      score: { left: 0, right: 0 },
      leftPlayerConnected: false,
      rightPlayerConnected: false,
      gameRunning: false,
      lastUpdateTime: Date.now()
    };
    
    rooms.set(roomId, {
      gameState,
      createdAt: Date.now(),
      hostSocketId: socket.id,
      players: new Map(),
      gameLoopInterval: null
    });
    
    socket.join(roomId);
    socket.emit('room-created', roomId);
    console.log(`Room created: ${roomId}`);
  });

  socket.on('join-room', (roomId) => {
    if (!rooms.has(roomId)) {
      socket.emit('error-message', 'Invalid room ID');
      return;
    }
    
    const room = rooms.get(roomId);
    
    // Assign player to a side (left or right)
    let playerSide = null;
    
    if (!room.gameState.leftPlayerConnected) {
      playerSide = 'left';
      room.gameState.leftPlayerConnected = true;
    } else if (!room.gameState.rightPlayerConnected) {
      playerSide = 'right';
      room.gameState.rightPlayerConnected = true;
    } else {
      socket.emit('error-message', 'Room is full');
      return;
    }
    
    // Add player to room
    room.players.set(socket.id, { side: playerSide });
    socket.join(roomId);
    
    // Notify player about assigned side
    socket.emit('player-connected', playerSide);
    console.log(`Player ${socket.id} joined room ${roomId} as ${playerSide}`);
    
    // Start game if both players are connected
    if (room.gameState.leftPlayerConnected && room.gameState.rightPlayerConnected) {
      room.gameState.gameRunning = true;
      
      // Reset ball position
      room.gameState.ballX = 50;
      room.gameState.ballY = 50;
      room.gameState.ballVelocityX = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
      room.gameState.ballVelocityY = BALL_SPEED * (Math.random() * 2 - 1);
      
      // Start game loop if not already running
      if (!room.gameLoopInterval) {
        room.gameLoopInterval = setInterval(() => gameLoop(roomId), GAME_TICK);
      }
      
      // Broadcast initial game state
      io.to(roomId).emit('game-state', room.gameState);
      console.log(`Game started in room ${roomId}`);
    }
  });

  socket.on('paddle-move', ({ roomId, playerSide, y, timestamp }) => {
    if (!rooms.has(roomId)) return;
    
    const room = rooms.get(roomId);
    
    // Initialize move buffers if they don't exist
    if (!room.leftPaddleMoves) {
      room.leftPaddleMoves = [];
      room.rightPaddleMoves = [];
    }
    
    const normalizedY = Math.max(0, Math.min(100, 50 - y * 3));
    
    // Add move to appropriate buffer with timestamp
    const moveData = { y: normalizedY, timestamp: timestamp || Date.now() };
    
    if (playerSide === 'left') {
      room.leftPaddleMoves.push(moveData);
      
      // Keep buffer at appropriate size
      if (room.leftPaddleMoves.length > PADDLE_MOVE_BUFFER_SIZE) {
        room.leftPaddleMoves.shift();
      }
      
      // Set paddle position to latest value for immediate response
      room.gameState.leftPaddleY = normalizedY;
    } else if (playerSide === 'right') {
      room.rightPaddleMoves.push(moveData);
      
      // Keep buffer at appropriate size
      if (room.rightPaddleMoves.length > PADDLE_MOVE_BUFFER_SIZE) {
        room.rightPaddleMoves.shift();
      }
      
      // Set paddle position to latest value for immediate response
      room.gameState.rightPaddleY = normalizedY;
    }
  });


  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Find which room this socket was in
    for (const [roomId, room] of rooms.entries()) {
      // Check if socket was a player
      if (room.players.has(socket.id)) {
        const playerSide = room.players.get(socket.id).side;
        
        // Mark player as disconnected
        if (playerSide === 'left') {
          room.gameState.leftPlayerConnected = false;
        } else if (playerSide === 'right') {
          room.gameState.rightPlayerConnected = false;
        }
        
        room.players.delete(socket.id);
        
        // Stop game if any player disconnects
        if (room.gameLoopInterval) {
          clearInterval(room.gameLoopInterval);
          room.gameLoopInterval = null;
        }
        
        room.gameState.gameRunning = false;
        
        // Notify remaining players about disconnection
        io.to(roomId).emit('player-disconnected', playerSide);
        io.to(roomId).emit('game-state', room.gameState);
        
        console.log(`Player ${playerSide} disconnected from room ${roomId}`);
      }
      
      // Clean up empty rooms
      if (room.players.size === 0 && socket.id === room.hostSocketId) {
        if (room.gameLoopInterval) {
          clearInterval(room.gameLoopInterval);
        }
        rooms.delete(roomId);
        console.log(`Room ${roomId} deleted`);
      }
    }
  });
});
const MAX_SCORE = 10;

// Game update logic
function gameLoop(roomId) {
  const room = rooms.get(roomId);
  if (!room || !room.gameState.gameRunning) return;
  const state = room.gameState;
  const now = Date.now();
  const deltaTime = Math.min((now - state.lastUpdateTime) / 1000, 0.1); 
  state.lastUpdateTime = now;

  const frameFactor = deltaTime * 60;
  state.ballX += state.ballVelocityX * frameFactor;
  state.ballY += state.ballVelocityY * frameFactor;


  // Process paddle movement buffers to apply smoothing if needed
  if (room.leftPaddleMoves && room.leftPaddleMoves.length > 0) {
    // Just use the most recent value for responsiveness
    state.leftPaddleY = room.leftPaddleMoves[room.leftPaddleMoves.length - 1].y;
  }
  
  if (room.rightPaddleMoves && room.rightPaddleMoves.length > 0) {
    // Just use the most recent value for responsiveness
    state.rightPaddleY = room.rightPaddleMoves[room.rightPaddleMoves.length - 1].y;
  }
  

  // Ball collision with top and bottom walls
  if (state.ballY - BALL_RADIUS <= 0 || state.ballY + BALL_RADIUS >= GAME_HEIGHT) {
    state.ballVelocityY *= -1;
    state.ballY = Math.max(BALL_RADIUS, Math.min(GAME_HEIGHT - BALL_RADIUS, state.ballY));
  }
  
  // Ball collision with left paddle
  if (state.ballX - BALL_RADIUS <= 3 && // Left paddle x position
      state.ballY >= state.leftPaddleY - PADDLE_HEIGHT/2 && 
      state.ballY <= state.leftPaddleY + PADDLE_HEIGHT/2) {
    
    // Calculate reflection angle based on where ball hits paddle
    const hitPosition = (state.ballY - state.leftPaddleY) / (PADDLE_HEIGHT/2);
    const angle = hitPosition * (Math.PI/4); // Max 45 degree angle
    
    state.ballVelocityX = BALL_SPEED * Math.cos(angle);
    state.ballVelocityY = BALL_SPEED * Math.sin(angle) * (state.ballVelocityY > 0 ? 1 : -1);
    state.ballX = 3 + BALL_RADIUS; // Move ball outside paddle
  }
  
  // Ball collision with right paddle
  if (state.ballX + BALL_RADIUS >= GAME_WIDTH - 3 && // Right paddle x position
      state.ballY >= state.rightPaddleY - PADDLE_HEIGHT/2 && 
      state.ballY <= state.rightPaddleY + PADDLE_HEIGHT/2) {
    
    // Calculate reflection angle based on where ball hits paddle
    const hitPosition = (state.ballY - state.rightPaddleY) / (PADDLE_HEIGHT/2);
    const angle = hitPosition * (Math.PI/4); // Max 45 degree angle
    
    state.ballVelocityX = -BALL_SPEED * Math.cos(angle);
    state.ballVelocityY = BALL_SPEED * Math.sin(angle) * (state.ballVelocityY > 0 ? 1 : -1);
    state.ballX = GAME_WIDTH - 3 - BALL_RADIUS; // Move ball outside paddle
  }
  
  // Score points when ball hits left or right edge
// Server-side fix (index.js) - Update the scoring logic
if (state.ballX < 0) {
  if (!state.gameOver) {
    state.score.right += 1;
    if (state.score.right >= MAX_SCORE) {
      state.gameOver = true;
      state.winner = 'right';
      state.gameRunning = false; // Add this line to stop the game
    }
    resetBall(state, 'left');
  }
} else if (state.ballX > GAME_WIDTH) {
  if (!state.gameOver) {
    state.score.left += 1;
    if (state.score.left >= MAX_SCORE) {
      state.gameOver = true;
      state.winner = 'left';
      state.gameRunning = false; // Add this line to stop the game
    }
    resetBall(state, 'right');
  }
}




  
  // Send game state to all players
  io.to(roomId).emit('game-state', state);
}

io.on('connection', (socket) => {
  // ... existing handlers ...

 // In your server code (index.js)
 socket.on('restart-game', (roomId) => {
  const room = rooms.get(roomId);
  if (room) {
    // Clear any existing game loop
    if (room.gameLoopInterval) {
      clearInterval(room.gameLoopInterval);
    }

    // Reset game state
    room.gameState = {
      leftPaddleY: 50,
      rightPaddleY: 50,
      ballX: 50,
      ballY: 50,
      ballVelocityX: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      ballVelocityY: BALL_SPEED * (Math.random() * 2 - 1),
      score: { left: 0, right: 0 },
      gameOver: false,
      winner: null,
      lastScorer: null,
      gameRunning: true,
      lastUpdateTime: Date.now()  // Add this to ensure smooth movement
    };

    // Start new game loop
    room.gameLoopInterval = setInterval(() => gameLoop(roomId), GAME_TICK);
    
    io.to(roomId).emit('game-state', room.gameState);
  }
});
});

// Fix resetBall function
function resetBall(state, direction) {
  state.ballX = 50;
  state.ballY = 50;
  state.ballVelocityX = BALL_SPEED * (direction === 'left' ? 1 : -1);
  state.ballVelocityY = BALL_SPEED * (Math.random() * 2 - 1);
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ HTTPS server running at https://localhost:${PORT}`);
});