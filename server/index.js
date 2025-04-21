const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');
const url = require('url');

const app = express();

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  credentials: true
}));

// Create HTTP server (no SSL for production readiness)
const server = http.createServer(app);

// WebSocket server setup
const wss = new WebSocket.Server({ server });

// Room management
const rooms = new Map();

// Game constants
const PADDLE_MOVE_BUFFER_SIZE = 5;
const GAME_WIDTH = 100;
const GAME_HEIGHT = 100;
const BALL_RADIUS = 3;
const PADDLE_HEIGHT = 20;
const BALL_SPEED = 1.2;
const MAX_SCORE = 10;

// Game loop interval (ms)
const GAME_TICK = 16;

// Client connections map to track socket info and rooms
const clients = new Map();

function sendToClient(client, type, data) {
  if (client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify({ type, data }));
  }
}

function broadcastToRoom(roomId, type, data, excludeClient = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  room.players.forEach((playerData, clientId) => {
    const client = clients.get(clientId);
    if (client && client !== excludeClient && client.readyState === WebSocket.OPEN) {
      sendToClient(client, type, data);
    }
  });
}

wss.on('connection', (ws, req) => {
  const id = uuidv4();
  clients.set(id, ws);
  console.log('Client connected:', id);
  
  // Parse query parameters
  const parameters = url.parse(req.url, true).query;
  const initialRoomId = parameters.roomId;
  
  // If roomId is provided in query params, attempt to join that room
  if (initialRoomId && rooms.has(initialRoomId)) {
    handleJoinRoom(ws, id, initialRoomId);
  }

  ws.on('message', (message) => {
    try {
      const { type, data } = JSON.parse(message);
      
      switch (type) {
        case 'create-room':
          handleCreateRoom(ws, id);
          break;
        case 'join-room':
          handleJoinRoom(ws, id, data);
          break;
        case 'paddle-move':
          handlePaddleMove(id, data);
          break;
        case 'restart-game':
          handleRestartGame(data);
          break;
        default:
          console.log('Unknown message type:', type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    handleDisconnect(id);
    clients.delete(id);
    console.log('Client disconnected:', id);
  });

  // Add ping/pong for connection health monitoring
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });
});

// Handle room creation
function handleCreateRoom(ws, socketId) {
  const roomId = uuidv4().slice(0, 6).toUpperCase();
  
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
    hostSocketId: socketId,
    players: new Map(),
    gameLoopInterval: null,
    leftPaddleMoves: [],
    rightPaddleMoves: []
  });
  
  // Add player to the room's players map
  const room = rooms.get(roomId);
  room.players.set(socketId, { roomId });
  
  sendToClient(ws, 'room-created', roomId);
  console.log(`Room created: ${roomId}`);
}

// Handle room joining
function handleJoinRoom(ws, socketId, roomId) {
  if (!rooms.has(roomId)) {
    sendToClient(ws, 'error-message', 'Invalid room ID');
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
    sendToClient(ws, 'error-message', 'Room is full');
    return;
  }
  
  // Add player to room
  room.players.set(socketId, { side: playerSide, roomId });
  
  // Notify player about assigned side
  sendToClient(ws, 'player-connected', playerSide);
  console.log(`Player ${socketId} joined room ${roomId} as ${playerSide}`);
  
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
    broadcastToRoom(roomId, 'game-state', room.gameState);
    console.log(`Game started in room ${roomId}`);
  }
}

// Handle paddle movement
function handlePaddleMove(socketId, { roomId, playerSide, y, timestamp }) {
  if (!rooms.has(roomId)) return;
  
  const room = rooms.get(roomId);
  const normalizedY = Math.max(0, Math.min(100, 50 - y * 5));
  
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
}

// Handle game restart
function handleRestartGame(roomId) {
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
      leftPlayerConnected: true,  // Keep existing player states
      rightPlayerConnected: true, // Keep existing player states
      lastUpdateTime: Date.now()
    };

    // Start new game loop
    room.gameLoopInterval = setInterval(() => gameLoop(roomId), GAME_TICK);
    
    broadcastToRoom(roomId, 'game-state', room.gameState);
  }
}

// Handle client disconnection
function handleDisconnect(socketId) {
  // Find which room this socket was in
  for (const [roomId, room] of rooms.entries()) {
    // Check if socket was a player
    if (room.players.has(socketId)) {
      const playerData = room.players.get(socketId);
      const playerSide = playerData.side;
      
      // Mark player as disconnected
      if (playerSide === 'left') {
        room.gameState.leftPlayerConnected = false;
      } else if (playerSide === 'right') {
        room.gameState.rightPlayerConnected = false;
      }
      
      room.players.delete(socketId);
      
      // Stop game if any player disconnects
      if (room.gameLoopInterval) {
        clearInterval(room.gameLoopInterval);
        room.gameLoopInterval = null;
      }
      
      room.gameState.gameRunning = false;
      
      // Notify remaining players about disconnection
      broadcastToRoom(roomId, 'player-disconnected', playerSide);
      broadcastToRoom(roomId, 'game-state', room.gameState);
      
      console.log(`Player ${playerSide} disconnected from room ${roomId}`);
    }
    
    // Clean up empty rooms
    if (room.players.size === 0 && socketId === room.hostSocketId) {
      if (room.gameLoopInterval) {
        clearInterval(room.gameLoopInterval);
      }
      rooms.delete(roomId);
      console.log(`Room ${roomId} deleted`);
    }
  }
}

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
  if (state.ballX < 0) {
    if (!state.gameOver) {
      state.score.right += 1;
      if (state.score.right >= MAX_SCORE) {
        state.gameOver = true;
        state.winner = 'right';
        state.gameRunning = false;
      }
      resetBall(state, 'left');
    }
  } else if (state.ballX > GAME_WIDTH) {
    if (!state.gameOver) {
      state.score.left += 1;
      if (state.score.left >= MAX_SCORE) {
        state.gameOver = true;
        state.winner = 'left';
        state.gameRunning = false;
      }
      resetBall(state, 'right');
    }
  }
  
  // Send game state to all players
  broadcastToRoom(roomId, 'game-state', state);
}

// Reset ball function
function resetBall(state, direction) {
  state.ballX = 50;
  state.ballY = 50;
  state.ballVelocityX = BALL_SPEED * (direction === 'left' ? 1 : -1);
  state.ballVelocityY = BALL_SPEED * (Math.random() * 2 - 1);
}

// Health check interval for WebSocket connections
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});

// Add basic route for checking server status
app.get('/health', (req, res) => {
  res.json({ status: 'ok', activeRooms: rooms.size, clients: wss.clients.size });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
