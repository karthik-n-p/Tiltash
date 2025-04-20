import React, { useRef } from 'react';
import GameOverModal from './GameOverModal';

const GameBoard = ({ gameState, playerSide, gameOver, winner, handleRestartGame }) => {
  const gameAreaRef = useRef(null);
  
  return (
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
      
      {/* Game Over Overlay */}
      {gameOver && (
        <GameOverModal 
          winner={winner} 
          score={gameState.score} 
          handleRestartGame={handleRestartGame} 
        />
      )}

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
      `}</style>
    </div>
  );
};

export default GameBoard;