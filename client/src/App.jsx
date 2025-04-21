import { useEffect, useState, useRef } from 'react';
import DesktopGame from './components/DesktopGame';
import MobileController from './components/MobileController';
import { initializeSounds, playSound } from './utils/sounds';

function App() {
  const wakeLockRef = useRef(null);
  const socketRef = useRef(null);
  
  const [roomId, setRoomId] = useState('');
  const [inputRoomId, setInputRoomId] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [playerSide, setPlayerSide] = useState(null); // 'left' or 'right'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [gameState, setGameState] = useState({
    leftPaddleY: 50,
    rightPaddleY: 50,
    ballX: 50,
    ballY: 50,
    score: { left: 0, right: 0 },
    gameOver: false,
    winner: null,
    lastScorer: null
  });
  const [previousGameState, setPreviousGameState] = useState(null);

  // Initialize sound files
  useEffect(() => {
    initializeSounds();
  }, []);

  // Wake lock to prevent screen from sleeping
  useEffect(() => {
    const requestWakeLock = async () => {
      if (isConnected && isMobile && 'wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          console.log('Wake Lock active');
        } catch (err) {
          console.log('Wake Lock error:', err);
        }
      }
    };

    requestWakeLock();

    // Release wake lock when component unmounts or disconnects
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release()
          .then(() => console.log('Wake Lock released'))
          .catch((err) => console.log('Wake Lock release error:', err));
        wakeLockRef.current = null;
      }
    };
  }, [isConnected, isMobile]);

  // Initialize WebSocket connection
  useEffect(() => {
    const serverUrl = window.location.hostname === 'localhost' 
      ? 'ws://localhost:3001' 
      : `https://tiltash.onrender.com`;
    
    socketRef.current = new WebSocket(serverUrl);
    
    socketRef.current.onopen = () => {
      console.log('WebSocket connection established');
      setIsConnected(true);
    };

    socketRef.current.onclose = () => {
      console.log('WebSocket connection closed');
      setIsConnected(false);
    };

    socketRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socketRef.current.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data);
        handleSocketMessage(type, data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  // Handle WebSocket messages
  const handleSocketMessage = (type, data) => {
    switch (type) {
      case 'room-created':
        handleRoomCreated(data);
        break;
      case 'player-connected':
        handlePlayerConnected(data);
        break;
      case 'game-state':
        handleGameStateUpdate(data);
        break;
      case 'error-message':
        console.error('Server error:', data);
        break;
      default:
        console.log('Unknown message type:', type, data);
    }
  };

  // Device detection and room creation
  useEffect(() => {
    setIsMobile(/Mobi|Android/i.test(navigator.userAgent));
    
  // Only auto-create room on desktop when socket is connected AND no room exists yet
  if (!isMobile && socketRef.current && socketRef.current.readyState === WebSocket.OPEN && !roomId) {
    sendToServer('create-room');
  }
}, [isMobile, roomId]); 

  // Monitor socket connection status and create room if needed
// Update this useEffect as well
useEffect(() => {
  if (!isMobile && isConnected && !roomId) {
    sendToServer('create-room');
  }
}, [isMobile, isConnected, roomId]);

  // Helper function to send messages to the server
  const sendToServer = (type, data = null) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, data }));
    } else {
      console.error('WebSocket is not connected');
    }
  };

  const handleRoomCreated = (id) => {
    setRoomId(id);
    if (!isMobile) {
      navigator.clipboard.writeText(id)
        .then(() => {
          console.log('Room ID copied');
          playSound('connect', soundEnabled);
        })
        .catch(() => console.log('Failed to copy'));
    }
  };

  const handlePlayerConnected = (side) => {
    setPlayerSide(side);
    setIsConnected(true);
    playSound('connect', soundEnabled);
    console.log(`Connected as ${side} player`);
  };

  const handleGameStateUpdate = (state) => {
    // Compare with previous state to trigger sounds
    if (previousGameState) {
      // Paddle hit detection
      if (state.ballX !== previousGameState.ballX && 
          ((state.ballX <= 5 && previousGameState.ballX > 5) || 
           (state.ballX >= 95 && previousGameState.ballX < 95))) {
        playSound('paddleHit', soundEnabled);
      }
      
      // Wall hit detection - top and bottom walls
      if ((state.ballY <= 5 && previousGameState.ballY > 5) || 
          (state.ballY >= 95 && previousGameState.ballY < 95)) {
        playSound('wallHit', soundEnabled);
      }
      
      // Score detection
      if (state.score.left !== previousGameState.score.left || 
          state.score.right !== previousGameState.score.right) {
        playSound('score', soundEnabled);
      }
      
      // Game over detection
      if (state.gameOver && !previousGameState.gameOver) {
        playSound('gameOver', soundEnabled);
      }
    }
    
    setPreviousGameState(state);
    setGameState(state);
  };

  const handleJoin = () => {
    if (inputRoomId.trim()) {
      playSound('button', soundEnabled);
      const cleanId = inputRoomId.trim().toUpperCase();
      setRoomId(cleanId);
      sendToServer('join-room', cleanId);
    }
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    if (soundEnabled) {
      // Still play the toggle sound before turning off
      playSound('button', true);
    } else {
      playSound('button', true);
    }
  };

  const handleRestartGame = () => {
    playSound('button', soundEnabled);
    sendToServer('restart-game', roomId);
  };

  // Function to update paddle position (for use in child components)
  const updatePaddlePosition = (y, timestamp) => {
    if (playerSide && roomId) {
      sendToServer('paddle-move', {
        roomId,
        playerSide,
        y,
        timestamp: timestamp || Date.now()
      });
    }
  };

  // Choose between Desktop or Mobile UI
  return isMobile ? (
    <MobileController 
      isConnected={isConnected}
      playerSide={playerSide}
      gameState={gameState}
      inputRoomId={inputRoomId}
      setInputRoomId={setInputRoomId}
      handleJoin={handleJoin}
      soundEnabled={soundEnabled}
      toggleSound={toggleSound}
      roomId={roomId}
      updatePaddlePosition={updatePaddlePosition}
      handleRestartGame={handleRestartGame}
    />
  ) : (
    <DesktopGame 
      roomId={roomId}
      gameState={gameState}
      playerSide={playerSide}
      soundEnabled={soundEnabled}
      toggleSound={toggleSound}
      handleRestartGame={handleRestartGame}
      updatePaddlePosition={updatePaddlePosition}
    />
  );
}

export default App;
