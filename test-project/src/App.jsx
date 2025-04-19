import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const socket = io('https://192.168.1.10:3001', {
  secure: true,
  transports: ['websocket'],
  path: '/socket.io/',
  withCredentials: true
});

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
    score: { left: 0, right: 0 }
  });
  
  const gameAreaRef = useRef(null);
  const paddleRef = useRef(null);
  const requestRef = useRef();
  const previousY = useRef(0);
  const threshold = 1;

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
          .then(() => console.log('Room ID copied'))
          .catch(() => console.log('Failed to copy'));
      }
    };

    const handlePlayerConnected = (side) => {
      setPlayerSide(side);
      setIsConnected(true);
      console.log(`Connected as ${side} player`);
    };

    const handleGameStateUpdate = (state) => {
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
  }, [isMobile]);

  // Mobile motion detection
  useEffect(() => {
    if (!isMobile || !isConnected || !playerSide) return;

    const handleMotion = (e) => {
      const y = e.accelerationIncludingGravity?.y || 0;

      // Apply threshold to filter out small movements
      if (Math.abs(y - previousY.current) > threshold) {
        socket.emit('paddle-move', { roomId, playerSide, y });
        previousY.current = y;
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [isMobile, isConnected, playerSide, roomId]);

  const handleJoin = () => {
    if (inputRoomId.trim()) {
      const cleanId = inputRoomId.trim().toUpperCase();
      setRoomId(cleanId);
      socket.emit('join-room', cleanId);
    }
  };

  // Desktop UI (Game Field)
  if (!isMobile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-4">
        <div className="bg-white p-6 rounded-2xl shadow-md max-w-2xl w-full text-center border border-gray-200">
          <h1 className="text-3xl font-bold mb-6 text-blue-800">Air Hockey</h1>
          
          {roomId && (
            <div className="mb-6">
              <p className="text-gray-500 text-sm mb-2">Room Code</p>
              <div className="text-3xl font-mono text-gray-900 py-2 tracking-wider font-medium">
                {roomId}
              </div>
              <p className="text-gray-500 text-sm">Share this code with two players</p>
            </div>
          )}
          
          <div 
            ref={gameAreaRef}
            className="relative w-full h-96 bg-blue-100 rounded-2xl shadow-inner border-4 border-blue-700 overflow-hidden"
          >
            {/* Left Paddle */}
            <div 
              className="absolute w-4 h-20 bg-red-500 rounded-lg shadow-md left-2" 
              style={{ top: `${gameState.leftPaddleY}%`, transform: 'translateY(-50%)' }}
            ></div>
            
            {/* Right Paddle */}
            <div 
              className="absolute w-4 h-20 bg-green-500 rounded-lg shadow-md right-2" 
              style={{ top: `${gameState.rightPaddleY}%`, transform: 'translateY(-50%)' }}
            ></div>
            
            {/* Ball */}
            <div 
              className="absolute w-6 h-6 rounded-full bg-yellow-400 shadow-md" 
              style={{ 
                left: `${gameState.ballX}%`, 
                top: `${gameState.ballY}%`, 
                transform: 'translate(-50%, -50%)' 
              }}
            ></div>
            
            {/* Center Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-blue-300 transform -translate-x-1/2"></div>
            
            {/* Score */}
            <div className="absolute top-4 left-0 right-0 flex justify-center items-center space-x-12 text-3xl font-bold">
              <span className="text-red-500">{gameState.score.left}</span>
              <span className="text-green-500">{gameState.score.right}</span>
            </div>
          </div>
          
          <div className="mt-4 flex justify-between text-sm text-gray-600">
            <div>Red Player: {gameState.score.left}</div>
            <div>Green Player: {gameState.score.right}</div>
          </div>
        </div>
      </div>
    );
  }

  // Mobile UI (Controller)
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-4">
      {!isConnected ? (
        <div className="bg-white p-8 rounded-2xl shadow-md max-w-md w-full border border-gray-200">
          <h1 className="text-3xl font-bold mb-8 text-center text-blue-800">Air Hockey Controller</h1>
          <input
            type="text"
            value={inputRoomId}
            onChange={(e) => setInputRoomId(e.target.value)}
            placeholder="ENTER ROOM CODE"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-6 text-center font-mono text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleJoin}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium text-lg hover:bg-blue-700 transition-colors"
          >
            CONNECT TO GAME
          </button>
        </div>
      ) : (
        <div className="text-center p-6 max-w-md w-full">
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 mb-6">
            <p className="text-sm text-gray-500 mb-1 uppercase tracking-wider">Connected as</p>
            <p className="text-2xl font-bold mb-4" style={{ color: playerSide === 'left' ? '#EF4444' : '#10B981' }}>
              {playerSide === 'left' ? 'RED PLAYER' : 'GREEN PLAYER'}
            </p>
            
            <div className="w-full h-64 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-center mb-4">
              <div 
                ref={paddleRef}
                className="w-20 h-48 rounded-xl"
                style={{ 
                  backgroundColor: playerSide === 'left' ? '#EF4444' : '#10B981',
                  opacity: 0.8
                }}
              ></div>
            </div>
            
            <p className="text-lg font-semibold mb-1">Score</p>
            <div className="flex justify-center space-x-12 text-2xl font-bold">
              <span className="text-red-500">{gameState.score.left}</span>
              <span className="text-green-500">{gameState.score.right}</span>
            </div>
          </div>
          <p className="text-gray-600">Tilt your device to move your paddle</p>
        </div>
      )}
    </div>
  );
}

export default App;