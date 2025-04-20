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
  socket
}) => {
  const paddleRef = useRef(null);
  const previousY = useRef(0);
  const threshold = 0.5;
  
  // Mobile motion detection
  useEffect(() => {
    if (!isConnected || !playerSide) return;

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
  }, [isConnected, playerSide, roomId, socket]);

  // Join Game UI
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-4">
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full border-4 border-yellow-500">
          <h1 className="text-3xl font-bold mb-4 text-center text-yellow-300 flex items-center justify-center font-mono">
            <span className="mr-2">🕹️</span> RETRO AIR HOCKEY <span className="ml-2">🕹️</span>
          </h1>
          <p className="text-cyan-400 text-center mb-6 font-mono">ENTER THE ROOM CODE TO JOIN</p>
          
          <div className="relative mb-6">
            <input
              type="text"
              value={inputRoomId}
              onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
              placeholder="ENTER CODE"
              className="w-full px-4 py-4 border-2 border-cyan-500 rounded-lg text-center font-mono text-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-gray-900 text-cyan-300"
              maxLength={6}
            />
            <div className="absolute right-3 top-4 text-xl">🎮</div>
          </div>
          
          <div className="flex justify-end mb-4">
            <SoundToggle soundEnabled={soundEnabled} toggleSound={toggleSound} />
          </div>
          
          <button
            onClick={handleJoin}
            className="w-full bg-yellow-500 text-black py-4 rounded-lg font-bold text-lg hover:bg-yellow-400 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center font-mono retro-button"
          >
            <span className="mr-2">INSERT COIN</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Controller UI
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-4">
      <div className="text-center p-4 max-w-md w-full">
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl border-4 border-cyan-500 mb-6">
          <div className="mb-4">
            <p className="text-sm text-gray-400 uppercase tracking-wider font-mono">PLAYER</p>
            <p className="text-3xl font-bold font-mono" style={{ 
              color: playerSide === 'left' ? '#FF6B6B' : '#4ECDC4',
              textShadow: playerSide === 'left' 
                ? '0 0 10px rgba(239, 68, 68, 0.7)' 
                : '0 0 10px rgba(45, 212, 191, 0.7)'
            }}>
              {playerSide === 'left' ? 'PLAYER 1' : 'PLAYER 2'}
            </p>
          </div>
          
          <div className="flex justify-end mb-2">
            <SoundToggle soundEnabled={soundEnabled} toggleSound={toggleSound} />
          </div>
          
          <div className="w-full h-64 rounded-lg flex items-center justify-center mb-6 relative overflow-hidden controller-bg" 
            style={{ 
              background: 'linear-gradient(135deg, #2D3748, #1A202C)',
              borderWidth: '2px',
              borderStyle: 'solid',
              borderColor: playerSide === 'left' ? '#FF6B6B' : '#4ECDC4',
              boxShadow: playerSide === 'left' 
                ? '0 0 15px rgba(239, 68, 68, 0.5)' 
                : '0 0 15px rgba(45, 212, 191, 0.5)'
            }}
          >
            <div 
              ref={paddleRef}
              className="w-20 h-48 rounded-lg shadow-lg transform transition-transform controller-paddle"
              style={{ 
                backgroundColor: playerSide === 'left' ? '#FF6B6B' : '#4ECDC4',
                boxShadow: playerSide === 'left' 
                  ? '0 0 20px rgba(239, 68, 68, 0.7)' 
                  : '0 0 20px rgba(45, 212, 191, 0.7)',
                opacity: 0.9
              }}
            ></div>
            
            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
              <div className="text-sm px-3 py-1 rounded-full font-medium font-mono"
                style={{ 
                  backgroundColor: playerSide === 'left' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(45, 212, 191, 0.2)',
                  color: playerSide === 'left' ? '#FF6B6B' : '#4ECDC4',
                  border: '1px solid',
                  borderColor: playerSide === 'left' ? '#FF6B6B' : '#4ECDC4',
                }}
              >
                TILT TO MOVE
              </div>
            </div>
          </div>
          
          <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
            <p className="text-lg font-medium mb-2 text-yellow-300 font-mono">SCORE</p>
            <div className="flex justify-center items-center">
              <div className="flex flex-col items-center p-2">
                <div className="w-6 h-6 rounded-full bg-red-500 mb-1 glow-small-red"></div>
                <p className="text-2xl font-bold text-red-500 font-mono digital-glow-red">{gameState.score.left}</p>
              </div>
              <div className="text-xl font-bold text-gray-400 mx-6 font-mono">VS</div>
              <div className="flex flex-col items-center p-2">
                <div className="w-6 h-6 rounded-full bg-cyan-500 mb-1 glow-small-teal"></div>
                <p className="text-2xl font-bold text-cyan-400 font-mono digital-glow-teal">{gameState.score.right}</p>
              </div>
            </div>
          </div>
          
          {/* Game Over Message for Mobile */}
          {gameState.gameOver && (
            <div className="mt-4 p-4 rounded-lg border-2 game-over-mobile" style={{ 
              backgroundColor: gameState.winner === playerSide ? '#1E3A8A' : '#7F1D1D',
              borderColor: gameState.winner === playerSide ? '#60A5FA' : '#EF4444'
            }}>
              <p className="font-bold font-mono" style={{
                color: gameState.winner === playerSide ? '#60A5FA' : '#EF4444',
                textShadow: gameState.winner === playerSide 
                  ? '0 0 5px rgba(96, 165, 250, 0.7)' 
                  : '0 0 5px rgba(239, 68, 68, 0.7)'
              }}>
                {gameState.winner === playerSide ? 'YOU WIN! 🏆' : 'GAME OVER'}
              </p>
              <p className="text-sm text-gray-300 font-mono">
                {gameState.winner === playerSide 
                  ? 'HIGH SCORE ACHIEVED!' 
                  : 'INSERT COIN TO CONTINUE'}
              </p>
            </div>
          )}
        </div>
        
        <div className="p-3 bg-gray-800 bg-opacity-90 rounded-lg text-cyan-300 text-sm border border-gray-700">
          <p className="font-medium font-mono">HOW TO PLAY:</p>
          <p className="font-mono">TILT DEVICE TO MOVE PADDLE UP AND DOWN</p>
        </div>
      </div>

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
};

export default MobileController;