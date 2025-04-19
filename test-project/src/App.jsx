import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const socket = io('https://192.168.1.10:3001', {
  secure: true,
  transports: ['websocket'],
  path: '/socket.io/',
  withCredentials: true
});

// Sound effects
const SOUNDS = {
  paddleHit: new Audio('/sounds/paddle-hit.mp3'),
  wallHit: new Audio('/sounds/wall-hit.mp3'),
  score: new Audio('/sounds/score.mp3'),
  gameOver: new Audio('/sounds/game-over.mp3'),
  connect: new Audio('/sounds/connect.mp3'),
  button: new Audio('/sounds/button-click.mp3')
};

// Pre-load sounds with placeholders
const preSoundUrls = {
  paddleHit: 'https://assets.mixkit.co/active_storage/sfx/2052/2052-preview.mp3',
  wallHit: 'https://assets.mixkit.co/active_storage/sfx/1363/1363-preview.mp3',
  score: 'https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3',
  gameOver: 'https://assets.mixkit.co/active_storage/sfx/1908/1908-preview.mp3',
  connect: 'https://assets.mixkit.co/active_storage/sfx/220/220-preview.mp3',
  button: 'https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3'
};

function App() {
  const [roomId, setRoomId] = useState('');
  const [inputRoomId, setInputRoomId] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [playerSide, setPlayerSide] = useState(null); // 'left' or 'right'
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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [previousGameState, setPreviousGameState] = useState(null);
  
  const maxScore = 10;
  const gameAreaRef = useRef(null);
  const paddleRef = useRef(null);
  const requestRef = useRef();
  const previousY = useRef(0);
  const threshold = 0.5;

  // Load sound files
  useEffect(() => {
    Object.keys(SOUNDS).forEach(key => {
      SOUNDS[key].src = preSoundUrls[key];
      SOUNDS[key].load();
    });
  }, []);

  const playSound = (sound) => {
    if (soundEnabled && SOUNDS[sound]) {
      SOUNDS[sound].currentTime = 0;
      SOUNDS[sound].play().catch(err => console.log('Audio play error:', err));
    }
  };

  // Device detection and socket setup
  useEffect(() => {
    setIsMobile(/Mobi|Android/i.test(navigator.userAgent));
    if (!isMobile) socket.emit('create-room');
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  // Socket event handlers
  useEffect(() => {
    const handleRoomCreated = (id) => {
      setRoomId(id);
      if (!isMobile) {
        navigator.clipboard.writeText(id)
          .then(() => {
            console.log('Room ID copied');
            playSound('connect');
          })
          .catch(() => console.log('Failed to copy'));
      }
    };

    const handlePlayerConnected = (side) => {
      setPlayerSide(side);
      setIsConnected(true);
      playSound('connect');
      console.log(`Connected as ${side} player`);
    };

    const handleGameStateUpdate = (state) => {
      // Compare with previous state to trigger sounds
      if (previousGameState) {
        // Paddle hit detection (simplified - the server would ideally send this info)
        if (state.ballX !== previousGameState.ballX && 
            ((state.ballX <= 5 && previousGameState.ballX > 5) || 
             (state.ballX >= 95 && previousGameState.ballX < 95))) {
          playSound('paddleHit');
        }
        
        // Wall hit detection
        if (state.ballY <= 5 || state.ballY >= 95) {
          if (previousGameState.ballY > 5 && previousGameState.ballY < 95) {
            playSound('wallHit');
          }
        }
        
        // Score detection
        if (state.score.left !== previousGameState.score.left || 
            state.score.right !== previousGameState.score.right) {
          playSound('score');
        }
        
        // Game over detection
        if (state.gameOver && !previousGameState.gameOver) {
          playSound('gameOver');
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
  }, [isMobile, previousGameState]);

  // Mobile motion detection
  useEffect(() => {
   
      if (!isMobile || !isConnected || !playerSide || gameState.gameOver) return;
     
    let lastUpdateTime = Date.now();
    const updateInterval = 10; // Faster updates (10ms instead of 16ms)
    let animationFrameId = null;
    
    // Store recent motion values in an array
    const recentMotions = [];
    const maxMotionSamples = 3;
    
    // Use requestAnimationFrame for smoother motion handling
    const processMotion = () => {
      const currentTime = Date.now();
      
      // Only send updates at controlled intervals
      if (currentTime - lastUpdateTime >= updateInterval && recentMotions.length > 0) {
        // Average the recent motion samples to reduce jitter but maintain responsiveness
        const sum = recentMotions.reduce((acc, val) => acc + val, 0);
        const avgY = sum / recentMotions.length;
        
        // Apply minimal smoothing to keep responsive
        const smoothedY = avgY * 0.9 + previousY.current * 0.1;
        
        // Send the update
        socket.emit('paddle-move', { 
          roomId, 
          playerSide, 
          y: smoothedY,
          timestamp: currentTime // Send timestamp to help server identify packet order
        });
        
        previousY.current = smoothedY;
        lastUpdateTime = currentTime;
        recentMotions.length = 0; // Clear the samples after use
      }
      
      animationFrameId = requestAnimationFrame(processMotion);
    };
    
    const handleMotion = (e) => {
      if (!e.accelerationIncludingGravity) return;
      
      const y = e.accelerationIncludingGravity.y || 0;
      
      // Add current motion to recent samples
      recentMotions.push(y);
      
      // Keep only the most recent samples
      if (recentMotions.length > maxMotionSamples) {
        recentMotions.shift();
      }
    };
    
    // Start processing motion in animation frame
    animationFrameId = requestAnimationFrame(processMotion);
    
    // Handle iOS permission with better error handling
    if (typeof DeviceMotionEvent !== 'undefined' && 
        typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission()
        .then(permissionState => {
          if (permissionState === 'granted') {
            window.addEventListener('devicemotion', handleMotion, { passive: true });
          }
        })
        .catch(error => {
          console.error('Motion permission error:', error);
          // Fallback
          window.addEventListener('devicemotion', handleMotion, { passive: true });
        });
    } else {
      window.addEventListener('devicemotion', handleMotion, { passive: true });
    }
    
    // Cleanup
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isMobile, isConnected, playerSide, roomId, gameState.gameOver]);

  const handleJoin = () => {
    if (inputRoomId.trim()) {
      playSound('button');
      const cleanId = inputRoomId.trim().toUpperCase();
      setRoomId(cleanId);
      socket.emit('join-room', cleanId);
    }
  };

  // Helper function for player color
  const getPlayerColor = (side) => {
    return side === 'left' ? '#FF6B6B' : '#4ECDC4';
  };

  // Desktop UI (Game Field) - Retro Style
  if (!isMobile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-4">
        <div className="bg-gray-800 p-6 rounded-lg shadow-2xl max-w-2xl w-full text-center border-4 border-teal-500">
          <h1 className="text-4xl font-bold mb-4 text-yellow-300 flex items-center justify-center font-mono">
            <span className="mr-2">🕹️</span> RETRO AIR HOCKEY <span className="ml-2">🕹️</span>
          </h1>
          
          <div className="flex justify-end mb-2">
            <button 
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                playSound('button');
              }}
              className="flex items-center bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs font-mono"
            >
              {soundEnabled ? '🔊 SOUND ON' : '🔇 SOUND OFF'}
            </button>
          </div>
          
          {roomId && (
            <div className="mb-6 bg-gray-900 p-4 rounded-lg border-2 border-yellow-500">
              <p className="text-teal-300 text-sm mb-1 font-mono font-bold">ROOM CODE</p>
              <div className="text-3xl font-mono text-yellow-300 py-2 tracking-wider font-bold bg-gray-800 rounded-lg border border-gray-700 flicker-text">
                {roomId}
              </div>
              <p className="text-teal-400 text-sm mt-2 font-mono">
                Share this code with players
              </p>
            </div>
          )}
          
          <div 
            ref={gameAreaRef}
            className="relative w-full h-96 bg-black rounded-lg shadow-inner border-4 border-cyan-500 overflow-hidden glow-border"
          >
            {/* Game Field Design with Grid */}
            <div className="absolute inset-0 grid-bg"></div>
            
            {/* Center Circle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 rounded-full border-4 border-cyan-500 opacity-30"></div>
            </div>
            
            {/* Left Paddle - Neon Style */}
            <div 
              className="absolute w-5 h-24 rounded-full paddle-glow-red left-3" 
              style={{ top: `${gameState.leftPaddleY}%`, transform: 'translateY(-50%)' }}
            ></div>
            
            {/* Right Paddle - Neon Style */}
            <div 
              className="absolute w-5 h-24 rounded-full paddle-glow-teal right-3" 
              style={{ top: `${gameState.rightPaddleY}%`, transform: 'translateY(-50%)' }}
            ></div>
            
            {/* Ball with Glow Effect */}
            <div 
              className="absolute w-8 h-8 rounded-full ball-glow" 
              style={{ 
                left: `${gameState.ballX}%`, 
                top: `${gameState.ballY}%`, 
                transform: 'translate(-50%, -50%)'
              }}
            ></div>
            
            {/* Center Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-cyan-500 transform -translate-x-1/2 opacity-40 dash-line"></div>
            
            {/* Score - Arcade Style */}
            <div className="absolute top-4 left-0 right-0 flex justify-center items-center space-x-16 text-5xl font-bold font-mono">
              <span className="text-red-500 bg-black bg-opacity-70 px-4 py-1 rounded digital-glow-red">{gameState.score.left}</span>
              <span className="text-cyan-400 bg-black bg-opacity-70 px-4 py-1 rounded digital-glow-teal">{gameState.score.right}</span>
            </div>
            
            {/* Player Status Indicators */}
            <div className="absolute top-2 left-4">
              <div className={`h-3 w-3 rounded-full ${playerSide === 'left' ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}></div>
            </div>
            <div className="absolute top-2 right-4">
              <div className={`h-3 w-3 rounded-full ${playerSide === 'right' ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}></div>
            </div>
            
            {/* Game Over Overlay - Arcade Style */}
            {gameState.gameOver && (
              <div className="absolute inset-0 bg-black bg-opacity-85 flex items-center justify-center rounded-xl game-over-screen">
                <div className="text-center p-8 bg-gray-900 rounded-xl shadow-2xl border-4 border-yellow-500">
                  <div className="text-6xl mb-4">🏆</div>
                  <h2 className="text-4xl font-bold mb-4 font-mono game-over-text" style={{ 
                    color: gameState.winner === 'left' ? '#FF6B6B' : '#4ECDC4' 
                  }}>
                    {gameState.winner === 'left' ? 'P1 WINS!' : 'P2 WINS!'}
                  </h2>
                  <div className="text-2xl font-bold mb-6 font-mono">
                    <span className="text-red-500">{gameState.score.left}</span>
                    <span className="mx-2 text-gray-400">-</span>
                    <span className="text-cyan-400">{gameState.score.right}</span>
                  </div>
                  <button
                    onClick={() => {
                      socket.emit('restart-game', roomId);
                      playSound('button');
                    }}
                    className="bg-yellow-500 text-black px-8 py-3 rounded-lg text-lg font-mono hover:bg-yellow-400 transition-all transform hover:scale-105 font-bold retro-button"
                  >
                    PLAY AGAIN
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-6 flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-red-500 mr-2 glow-small-red"></div>
              <div className="text-sm font-medium text-red-400 font-mono">P1: {gameState.score.left}</div>
            </div>
            <div className="text-sm font-medium text-yellow-300 font-mono">FIRST TO {maxScore} WINS</div>
            <div className="flex items-center">
              <div className="text-sm font-medium text-cyan-400 font-mono">P2: {gameState.score.right}</div>
              <div className="w-4 h-4 rounded-full bg-cyan-500 ml-2 glow-small-teal"></div>
            </div>
          </div>
          
          <div className="mt-4 text-gray-400 text-sm italic font-mono px-4 py-2 bg-gray-800 rounded border border-gray-700">
            GAME HOST: Desktop displays gameplay. Players connect with mobile devices.
          </div>
        </div>
        
        {/* CSS for retro effects */}
        <style jsx>{`
          .glow-border {
            box-shadow: 0 0 10px 2px rgba(6, 182, 212, 0.5);
          }
          
          .digital-glow-red {
            text-shadow: 0 0 10px rgba(239, 68, 68, 0.7);
          }
          
          .digital-glow-teal {
            text-shadow: 0 0 10px rgba(45, 212, 191, 0.7);
          }
          
          .paddle-glow-red {
            background-color: #FF6B6B;
            box-shadow: 0 0 15px 5px rgba(239, 68, 68, 0.7);
          }
          
          .paddle-glow-teal {
            background-color: #4ECDC4;
            box-shadow: 0 0 15px 5px rgba(45, 212, 191, 0.7);
          }
          
          .ball-glow {
            background-color: #FFE66D;
            box-shadow: 0 0 15px 5px rgba(250, 204, 21, 0.7);
          }
          
          .glow-small-red {
            box-shadow: 0 0 5px 2px rgba(239, 68, 68, 0.5);
          }
          
          .glow-small-teal {
            box-shadow: 0 0 5px 2px rgba(45, 212, 191, 0.5);
          }
          
          .grid-bg {
            background-image: 
              linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px);
            background-size: 20px 20px;
          }
          
          .dash-line {
            background: repeating-linear-gradient(
              to bottom,
              rgba(6, 182, 212, 0.4) 0%,
              rgba(6, 182, 212, 0.4) 50%,
              transparent 50%,
              transparent 100%
            );
            background-size: 10px 10px;
          }
          
          .flicker-text {
            animation: textFlicker 3s infinite alternate;
          }
          
          .game-over-text {
            animation: textPulse 2s infinite;
          }
          
          .game-over-screen {
            animation: fadeIn 0.5s;
          }
          
          .retro-button {
            text-shadow: 1px 1px 0 rgba(0,0,0,0.3);
            box-shadow: 0 4px 0 #B45309, 0 0 10px rgba(250, 204, 21, 0.5);
          }
          
          .retro-button:active {
            transform: translateY(4px);
            box-shadow: 0 0 0 #B45309, 0 0 5px rgba(250, 204, 21, 0.5);
          }
          
          @keyframes textFlicker {
            0%, 19.999%, 22%, 62.999%, 64%, 97.999%, 99.999%, 100% {
              opacity: 1;
            }
            20%, 21.999%, 63%, 63.999%, 98%, 99.999% {
              opacity: 0.5;
            }
          }
          
          @keyframes textPulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // Mobile UI (Controller) - Retro Style
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      {!isConnected ? (
         <div className="bg-gray-800 p-6 rounded-xl border-2 border-cyan-500 max-w-md w-full">
         <h1 className="text-2xl font-bold text-center text-cyan-300 mb-6 font-mono">
           AIR HOCKEY CONTROLLER
         </h1>
         
         <div className="relative mb-6">
           <input
             type="text"
             value={inputRoomId}
             onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
             placeholder="ENTER CODE"
             className="w-full px-4 py-3 text-center font-mono bg-gray-700 text-cyan-300 rounded-lg border border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
             maxLength={6}
           />
         </div>
 
         <button
           onClick={handleJoin}
           className="w-full bg-cyan-600 text-white py-3 rounded-lg font-medium hover:bg-cyan-500 transition-colors flex items-center justify-center"
         >
           <span className="mr-2">CONNECT</span>
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
           </svg>
         </button>
       </div>
      ) : (
        <div className="w-full max-w-md">
        <div className="bg-gray-800 p-4 rounded-xl border-2 border-cyan-500 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${playerSide === 'left' ? 'bg-red-500' : 'bg-cyan-500'}`} />
              <span className="text-sm font-mono text-gray-300">
                {playerSide === 'left' ? 'RED TEAM' : 'CYAN TEAM'}
              </span>
            </div>
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
          </div>

          <div className="bg-gray-700 p-3 rounded-lg mb-4">
            <div className="flex justify-between items-center">
              <div className="text-center">
                <div className="text-red-500 font-mono text-2xl">{gameState.score.left}</div>
                <div className="text-xs text-gray-400">PLAYER 1</div>
              </div>
              <div className="text-gray-400 text-xl">VS</div>
              <div className="text-center">
                <div className="text-cyan-400 font-mono text-2xl">{gameState.score.right}</div>
                <div className="text-xs text-gray-400">PLAYER 2</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-700 p-4 rounded-lg text-center">
            <div className="text-sm text-cyan-300 mb-2">TILT TO MOVE</div>
            <div className="h-2 w-full bg-gray-600 rounded-full overflow-hidden">
              <div 
                className="h-full bg-cyan-500 transition-all duration-100"
                style={{
                  width: `${Math.min(100, Math.abs((gameState[`${playerSide}PaddleY`] - 50) * 2))}%`,
                  marginLeft: `${playerSide === 'left' ? '0' : 'auto'}`     }}
                  />
                </div>
              </div>
            </div>
    
            <div className="text-center text-sm text-gray-400">
              <p>First to {maxScore} points wins</p>
              <p className="mt-1">Room: {roomId}</p>
            </div>
          </div>
      )}
      
      {/* CSS for retro mobile effects */}
      <style jsx>{`
        .digital-glow-red {
          text-shadow: 0 0 10px rgba(239, 68, 68, 0.7);
        }
        
        .digital-glow-teal {
          text-shadow: 0 0 10px rgba(45, 212, 191, 0.7);
        }
        
        .glow-small-red {
          box-shadow: 0 0 5px 2px rgba(239, 68, 68, 0.5);
        }
        
        .glow-small-teal {
          box-shadow: 0 0 5px 2px rgba(45, 212, 191, 0.5);
        }
        
        .controller-bg {
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 20px 20px;
        }
        
        .controller-paddle {
          animation: pulse 2s infinite;
        }
        
        .game-over-mobile {
          animation: fadeIn 0.5s;
        }
        
        .retro-button {
          text-shadow: 1px 1px 0 rgba(0,0,0,0.3);
          box-shadow: 0 4px 0 #B45309, 0 0 10px rgba(250, 204, 21, 0.5);
        }
        
        .retro-button:active {
          transform: translateY(4px);
          box-shadow: 0 0 0 #B45309, 0 0 5px rgba(250, 204, 21, 0.5);
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 0.9;
          }
          50% {
            opacity: 0.7;
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default App;