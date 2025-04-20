import { useEffect, useState,useRef } from 'react';
import io from 'socket.io-client';
import DesktopGame from './components/DesktopGame';
import MobileController from './components/MobileController';
import { initializeSounds, playSound } from './utils/sounds';

// Create socket connection
const socket = io('wss://gamex-rs46.onrender.com', {
  secure: true,
  transports: ['websocket'],
  path: '/socket.io/',
  withCredentials: true
});


function App() {
  const wakeLockRef = useRef(null);

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

  // Device detection and socket setup
  useEffect(() => {
    setIsMobile(/Mobi|Android/i.test(navigator.userAgent));
    if (!isMobile) socket.emit('create-room');
  }, []);

  // Socket event handlers
  useEffect(() => {
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

    socket.on('room-created', handleRoomCreated);
    socket.on('player-connected', handlePlayerConnected);
    socket.on('game-state', handleGameStateUpdate);
    socket.on('error-message', console.error);

    return () => {
      socket.off('room-created');
      socket.off('player-connected');
      socket.off('game-state');
      socket.off('error-message');
    };
  }, [isMobile, previousGameState, soundEnabled]);

  const handleJoin = () => {
    if (inputRoomId.trim()) {
      playSound('button', soundEnabled);
      const cleanId = inputRoomId.trim().toUpperCase();
      setRoomId(cleanId);
      socket.emit('join-room', cleanId);
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
    socket.emit('restart-game', roomId);
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
      socket={socket}
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
    />
  );
}

export default App;
