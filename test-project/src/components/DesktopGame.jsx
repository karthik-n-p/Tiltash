import React from 'react';
import GameBoard from './Gameboard';
import ScoreDisplay from './ScoreDisplay';
import GameOverModal from './GameOverModal';
import RoomCodeDisplay from './RoomCodeDisplay';
import SoundToggle from './SoundToggle';

const DesktopGame = ({ 
  roomId, 
  gameState, 
  playerSide, 
  soundEnabled, 
  toggleSound, 
  handleRestartGame 
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-4">
      <div className="bg-gray-800 p-6 rounded-lg shadow-2xl max-w-2xl w-full text-center border-4 border-teal-500">
        <h1 className="text-4xl font-bold mb-4 text-yellow-300 flex items-center justify-center font-mono">
          <span className="mr-2">🕹️</span> RETRO AIR HOCKEY <span className="ml-2">🕹️</span>
        </h1>
        
        <div className="flex justify-end mb-2">
          <SoundToggle soundEnabled={soundEnabled} toggleSound={toggleSound} />
        </div>
        
        {roomId && <RoomCodeDisplay roomId={roomId} />}
        
        <GameBoard 
          gameState={gameState} 
          playerSide={playerSide}
          gameOver={gameState.gameOver}
          winner={gameState.winner}
          handleRestartGame={handleRestartGame}
        />
        
        <ScoreDisplay 
          leftScore={gameState.score.left} 
          rightScore={gameState.score.right} 
          maxScore={10}
        />
        
        <div className="mt-4 text-gray-400 text-sm italic font-mono px-4 py-2 bg-gray-800 rounded border border-gray-700">
          GAME HOST: Desktop displays gameplay. Players connect with mobile devices.
        </div>
      </div>
      
      {/* Retro CSS Effects */}
      <style jsx>{`
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
};

export default DesktopGame;