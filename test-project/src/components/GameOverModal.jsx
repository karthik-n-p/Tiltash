import React from 'react';

const GameOverModal = ({ winner, score, handleRestartGame }) => {
  return (
    <div className="absolute inset-0 bg-black bg-opacity-85 flex items-center justify-center rounded-xl game-over-screen">
      <div className="text-center p-8 bg-gray-900 rounded-xl shadow-2xl border-4 border-yellow-500">
        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-4xl font-bold mb-4 font-mono game-over-text" style={{ 
          color: winner === 'left' ? '#FF6B6B' : '#4ECDC4' 
        }}>
          {winner === 'left' ? 'P1 WINS!' : 'P2 WINS!'}
        </h2>
        <div className="text-2xl font-bold mb-6 font-mono">
          <span className="text-red-500">{score.left}</span>
          <span className="mx-2 text-gray-400">-</span>
          <span className="text-cyan-400">{score.right}</span>
        </div>
        <button
          onClick={handleRestartGame}
          className="bg-yellow-500 text-black px-8 py-3 rounded-lg text-lg font-mono hover:bg-yellow-400 transition-all transform hover:scale-105 font-bold retro-button"
        >
          PLAY AGAIN
        </button>
      </div>

      <style jsx>{`
        .game-over-screen {
          animation: fadeIn 0.5s;
          z-index: 1000;
        }
        
        .game-over-text {
          animation: textPulse 2s infinite;
          text-shadow: 0 0 10px ${winner === 'left' ? 'rgba(239, 68, 68, 0.7)' : 'rgba(45, 212, 191, 0.7)'};
        }
        
        .retro-button {
          text-shadow: 1px 1px 0 rgba(0,0,0,0.3);
          box-shadow: 0 4px 0 #B45309, 0 0 10px rgba(250, 204, 21, 0.5);
          transition: all 0.2s ease;
        }
        
        .retro-button:active {
          transform: translateY(4px) scale(0.98);
          box-shadow: 0 1px 0 #B45309, 0 0 5px rgba(250, 204, 21, 0.5);
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        
        @keyframes textPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }
      `}</style>
    </div>
  );
};

export default GameOverModal;