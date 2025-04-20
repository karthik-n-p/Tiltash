import React, { useEffect, useRef } from 'react';
import SoundToggle from './SoundToggle';

const MobileController = ({ 
  isConnected,
  playerSide,
  gameState,
  inputRoomId,
  setInputRoomId,
  handleJoin,
  soundEnabled,
  toggleSound,
  roomId,
  socket,
  handleRestartGame
}) => {
  const paddleRef = useRef(null);
  const previousY = useRef(0);
  const threshold = 0.5;
  
  // Mobile motion detection
  useEffect(() => {
    if (!isConnected || !playerSide || gameState.gameOver) return;

    const handleMotion = (e) => {
      const y = e.accelerationIncludingGravity?.y || 0;
      if (Math.abs(y - previousY.current) > threshold) {
        socket.emit('paddle-move', { roomId, playerSide, y });
        previousY.current = y;
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [isConnected, playerSide, roomId, socket, gameState.gameOver]);

  // Join Game UI
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4 pixel-bg">
        <div className="bg-gray-900 p-6 rounded-lg border-4 border-yellow-400 max-w-md w-full pixel-corners">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-yellow-400 mb-2 pixel-font">AIR HOCKEY</h1>
            <p className="text-green-400 text-sm pixel-font">ARCADE EDITION</p>
          </div>
          
          <div className="mb-6">
            <input
              type="text"
              value={inputRoomId}
              onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
              placeholder="ENTER CODE"
              className="w-full px-4 py-3 text-center bg-black text-green-400 border-2 border-yellow-400 
                         pixel-font focus:outline-none pixel-corners"
              maxLength={6}
              style={{ letterSpacing: '2px' }}
            />
          </div>
          
          <div className="flex justify-between items-center mb-4">
            <SoundToggle soundEnabled={soundEnabled} toggleSound={toggleSound} pixelStyle />
            <div className="text-yellow-400 text-xs pixel-font">MAX: 2 PLAYERS</div>
          </div>
          
          <button
            onClick={handleJoin}
            className="w-full bg-yellow-400 text-black py-3 pixel-font-bold pixel-corners
                      hover:bg-yellow-300 transition-colors pixel-button"
          >
            START GAME
          </button>
        </div>
        
        <div className="mt-8 text-gray-500 text-xs pixel-font">
          TILT DEVICE TO CONTROL PADDLE
        </div>
      </div>
    );
  }

  // Controller UI
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4 pixel-bg">
      <div className="w-full max-w-md">
        {/* Game Header */}
        <div className="bg-gray-900 p-4 mb-4 border-2 border-yellow-400 pixel-corners">
          <div className="flex justify-between items-center">
            <div className={`text-lg pixel-font ${playerSide === 'left' ? 'text-red-400' : 'text-blue-400'}`}>
              {playerSide === 'left' ? 'PLAYER 1' : 'PLAYER 2'}
            </div>
            <SoundToggle soundEnabled={soundEnabled} toggleSound={toggleSound} pixelStyle />
          </div>
        </div>
        
        {/* Score Display */}
        <div className="bg-gray-900 p-4 mb-4 border-2 border-yellow-400 pixel-corners">
          <div className="flex justify-between items-center">
            <div className="text-center">
              <div className="text-red-400 text-3xl pixel-font-bold">{gameState.score.left}</div>
              <div className="text-gray-400 text-xs pixel-font">P1</div>
            </div>
            <div className="text-yellow-400 text-sm pixel-font">VS</div>
            <div className="text-center">
              <div className="text-blue-400 text-3xl pixel-font-bold">{gameState.score.right}</div>
              <div className="text-gray-400 text-xs pixel-font">P2</div>
            </div>
          </div>
        </div>
        
        {/* Controller Area */}
        <div className="bg-gray-900 p-4 mb-4 border-2 border-yellow-400 pixel-corners">
          <div className="h-48 relative bg-black mb-4 pixel-corners-inner">
            <div 
              ref={paddleRef}
              className="absolute w-16 h-8 pixel-corners"
              style={{
                backgroundColor: playerSide === 'left' ? '#ef4444' : '#3b82f6',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
              }}
            ></div>
          </div>
          
          <div className="text-center text-yellow-400 text-sm pixel-font mb-2">
            TILT TO MOVE
          </div>
          
          <div className="flex justify-center gap-4">
            <button 
              onClick={handleRestartGame}
              className="bg-red-500 text-white px-4 py-2 pixel-font-bold pixel-corners pixel-button"
              disabled={!gameState.gameOver}
            >
              RESTART
            </button>
          </div>
        </div>
        
        {/* Room Info */}
        <div className="bg-gray-900 p-3 text-center border-2 border-yellow-400 pixel-corners">
          <div className="text-yellow-400 text-sm pixel-font">ROOM: {roomId}</div>
        </div>
        
        {/* Game Over Overlay */}
        {gameState.gameOver && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4">
            <div className="bg-gray-900 p-6 border-4 border-yellow-400 pixel-corners text-center">
              <h2 className="text-3xl pixel-font-bold mb-4" style={{ 
                color: gameState.winner === playerSide ? '#10B981' : '#EF4444',
                textShadow: '0 0 8px currentColor'
              }}>
                {gameState.winner === playerSide ? 'YOU WIN!' : 'GAME OVER'}
              </h2>
              <div className="text-white text-lg pixel-font mb-6">
                FINAL SCORE: {gameState.score.left} - {gameState.score.right}
              </div>
              <button
                onClick={handleRestartGame}
                className="bg-yellow-400 text-black px-6 py-3 pixel-font-bold pixel-corners pixel-button"
              >
                PLAY AGAIN
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .pixel-bg {
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
          background-size: 20px 20px;
        }
        
        .pixel-font {
          font-family: 'Press Start 2P', cursive, sans-serif;
          letter-spacing: 1px;
        }
        
        .pixel-font-bold {
          font-family: 'Press Start 2P', cursive, sans-serif;
          letter-spacing: 1px;
          font-weight: bold;
        }
        
        .pixel-corners {
          border-radius: 0;
          box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.3);
        }
        
        .pixel-corners-inner {
          border-radius: 0;
        }
        
        .pixel-button {
          position: relative;
          overflow: hidden;
          border: 2px solid #000;
          box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.3);
          transition: all 0.1s ease;
        }
        
        .pixel-button:active {
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
        }
        
        .pixel-button:disabled {
          opacity: 0.5;
          transform: none;
          box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.3);
        }
        
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default MobileController;