import React from 'react';
import GameBoard from './GameBoard';
import ScoreDisplay from './ScoreDisplay';
import GameOverModal from './GameOverModal';
import RoomCodeDisplay from './RoomCodeDisplay';
import SoundToggle from './SoundToggle';
import './retro.css'; // Import the extracted retro CSS

const DesktopGame = ({ 
  roomId, 
  gameState, 
  playerSide, 
  soundEnabled, 
  toggleSound, 
  handleRestartGame 
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen pixel-bg arcade-cabinet p-6">
      <div className="bg-gray-900 p-8 rounded-lg shadow-2xl max-w-2xl w-full text-center border-4 border-yellow-400 pixel-corners arcade-screen-container">
        <div className="arcade-logo text-center mb-6">
          <h1 className="text-4xl font-bold text-yellow-500 mb-2 tracking-wider pixel-font arcade-glow">AIR HOCKEY</h1>
          <div className="flex justify-center items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
            <p className="text-green-400 text-sm tracking-widest pixel-font">ARCADE EDITION</p>
            <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
          </div>
        </div>
        
        <div className="flex justify-end mb-4">
          <SoundToggle soundEnabled={soundEnabled} toggleSound={toggleSound} pixelStyle />
        </div>
        
        {roomId && <RoomCodeDisplay roomId={roomId} />}
        
        <div className="relative overflow-hidden arcade-field mb-6">
          <div className="absolute inset-0 arcade-grid"></div>
          <div className="absolute inset-0 pointer-events-none scanlines"></div>
          
          <GameBoard 
            gameState={gameState} 
            playerSide={playerSide}
            gameOver={gameState.gameOver}
            winner={gameState.winner}
            handleRestartGame={handleRestartGame}
          />
        </div>
        
        <ScoreDisplay 
          leftScore={gameState.score.left} 
          rightScore={gameState.score.right} 
          maxScore={10}
        />
        
        <div className="mt-6 text-gray-400 text-sm pixel-font px-4 py-3 bg-black rounded-lg border-2 border-gray-700 blink-slow">
          GAME HOST: DESKTOP DISPLAYS GAMEPLAY. PLAYERS CONNECT WITH MOBILE DEVICES.
        </div>
        
        {gameState.gameOver && (
          <button
            onClick={handleRestartGame}
            className="mt-6 w-full bg-yellow-400 text-black py-4 pixel-font-bold pixel-corners
                    hover:bg-yellow-300 transition-colors arcade-button blink-fast"
          >
           Enter Room Code
          </button>
        )}
      </div>
      
      <div className="mt-6 text-gray-500 text-xs pixel-font">
        V1.0.2
      </div>
    </div>
  );
};

export default DesktopGame;
