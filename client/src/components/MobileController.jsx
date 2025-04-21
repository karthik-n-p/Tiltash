import React, { useEffect, useRef } from 'react';
import SoundToggle from './SoundToggle';
import './retro.css'
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
  updatePaddlePosition, // Receive this instead of socket
  handleRestartGame
}) => {
  const paddleRef = useRef(null);
  const previousY = useRef(0);
  const threshold = 0.5;
  
  // Update the motion handler to use updatePaddlePosition instead of socket
  useEffect(() => {
    if (!isConnected || !playerSide || gameState.gameOver) return;

    const handleMotion = (e) => {
      const y = e.accelerationIncludingGravity?.y || 0;
      if (Math.abs(y - previousY.current) > threshold) {
        updatePaddlePosition(y); // Use the passed function
        previousY.current = y;
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [isConnected, playerSide, roomId, updatePaddlePosition, gameState.gameOver]);

  // Join Game UI (first section - onboarding)
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black p-6 pixel-bg">
  <div className="bg-gray-900 p-8 rounded-lg border-4 border-yellow-400 max-w-md w-full pixel-corners shadow-lg transform-gpu">
    {/* Logo Area - Made more prominent */}
    <div className="arcade-logo text-center mb-8">
      <h1 className="text-4xl font-bold text-yellow-500 mb-2 tracking-wider pixel-font arcade-glow">AIR HOCKEY</h1>
      <div className="flex justify-center items-center gap-3">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
        <p className="text-green-400 text-sm tracking-widest pixel-font">ARCADE EDITION</p>
        <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
      </div>
    </div>
    
    {/* Input Area - Better spacing */}
    <div className="mb-8">
      <label className="block text-gray-400 text-xs pixel-font mb-2 text-center">GAME CODE</label>
      <input
        type="text"
        value={inputRoomId}
        onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
        placeholder="ENTER CODE"
        className="w-full px-4 py-4 text-center bg-black text-green-400 border-2 border-yellow-400 
                 pixel-font focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-transparent pixel-corners"
        maxLength={6}
        style={{ letterSpacing: '4px' }}
      />
    </div>
    
    {/* Control Area - Better aligned */}
    <div className="flex justify-between items-center mb-8">
      <div className="flex items-center">
        <SoundToggle soundEnabled={soundEnabled} toggleSound={toggleSound} pixelStyle />
      
      </div>
      <div className="text-yellow-400 text-xs pixel-font px-3 py-1 border border-yellow-400 rounded ml-10">MAX: 2 PLAYERS</div>
    </div>
    
    {/* CTA Button - More prominence */}
    <button
      onClick={handleJoin}
      className="w-full bg-yellow-400 text-black py-4 pixel-font-bold pixel-corners
                hover:bg-yellow-300 transition-colors pixel-button relative overflow-hidden group"
    >
      <span className="relative z-10">START GAME</span>
      <span className="absolute inset-0 bg-yellow-300 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
    </button>
  </div>
  
  {/* Instruction - Better positioned */}
  <div className="mt-10 text-gray-400 text-[10px] pixel-font flex items-center">
    
    TILT DEVICE TO CONTROL
   
  </div>
  
  {/* Version info */}
  <div className="absolute bottom-4 text-gray-600 text-xs pixel-font">
    V1.0.2
  </div>

  
</div>
    );
  }

  // Controller UI (second section - gameplay)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4 arcade-cabinet">
      {/* Arcade cabinet frame */}
      <div className="w-full max-w-md relative arcade-screen-container">
        {/* Cabinet top panel */}
        <div className="bg-gray-800 p-3 border-t-8 border-x-8 border-yellow-500 rounded-t-lg flex justify-center items-center">
          <div className="arcade-logo text-center">
            <h1 className="text-3xl font-bold text-yellow-500 mb-1 tracking-wider pixel-font arcade-glow">AIR HOCKEY</h1>
            <div className="flex justify-center items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
              <p className="text-green-400 text-xs tracking-widest pixel-font">ARCADE EDITION</p>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
            </div>
          </div>
        </div>
        
        {/* Main screen */}
        <div className="bg-black p-4 border-x-8 border-yellow-500 relative overflow-hidden">
          {/* CRT scanlines effect */}
          <div className="absolute inset-0 pointer-events-none scanlines"></div>
          
          {/* Score Display */}
          <div className="mb-6 score-display">
            <div className="flex justify-between items-center">
              <div className="text-center">
                <div className="text-red-500 text-4xl pixel-font-bold arcade-glow">{gameState.score.left}</div>
                <div className="text-gray-400 text-xs pixel-font">P1</div>
              </div>
              <div className="text-yellow-500 text-lg pixel-font blink-slow">VS</div>
              <div className="text-center">
                <div className="text-blue-500 text-4xl pixel-font-bold arcade-glow">{gameState.score.right}</div>
                <div className="text-gray-400 text-xs pixel-font">P2</div>
              </div>
            </div>
          </div>
          
          {/* Player indicator */}
          <div className="mb-4 text-center">
            <div className={`inline-block px-4 py-2 border-2 ${playerSide === 'left' ? 'border-red-500 text-red-500' : 'border-blue-500 text-blue-500'} pixel-font arcade-glow`}>
              {playerSide === 'left' ? 'PLAYER 1' : 'PLAYER 2'}
            </div>
          </div>
          
          {/* Controller Area */}
          <div className="mb-6">
            <div className="h-48 relative bg-gray-900 mb-4 arcade-field">
              {/* Grid lines for playfield */}
              <div className="absolute inset-0 arcade-grid"></div>
              
              <div 
                ref={paddleRef}
                className="absolute w-16 h-8"
                style={{
                  backgroundColor: playerSide === 'left' ? '#ef4444' : '#3b82f6',
                  boxShadow: playerSide === 'left' ? '0 0 12px #ef4444' : '0 0 12px #3b82f6',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '0',
                  border: '2px solid #fff'
                }}
              ></div>
            </div>
            
            <div className="text-center text-yellow-500 text-sm pixel-font mb-4 blink-slow">
              TILT TO MOVE
            </div>
          </div>
          
          {/* Control panel */}
          <div className="flex justify-between items-center mb-2">
            <SoundToggle soundEnabled={soundEnabled} toggleSound={toggleSound} pixelStyle />
            <div className="text-yellow-500 text-xs pixel-font">ROOM: {roomId}</div>
          </div>
        </div>
        
        {/* Cabinet control panel */}
        <div className="bg-gray-800 p-4 border-b-8 border-x-8 border-yellow-500 rounded-b-lg">
          <button 
            onClick={handleRestartGame}
            className="w-full bg-red-600 text-white py-3 pixel-font-bold arcade-button"
            disabled={!gameState.gameOver}
          >
            {gameState.gameOver ? "INSERT COIN TO CONTINUE" : "GAME IN PROGRESS"}
          </button>
        </div>
        
        {/* Game Over Overlay */}
        {gameState.gameOver && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 p-6 border-4 border-yellow-500 text-center relative overflow-hidden">
              {/* CRT scanlines effect */}
              <div className="absolute inset-0 pointer-events-none scanlines"></div>
              
              <h2 className="text-4xl pixel-font-bold mb-6" style={{ 
                color: gameState.winner === playerSide ? '#10B981' : '#EF4444',
                textShadow: `0 0 10px ${gameState.winner === playerSide ? '#10B981' : '#EF4444'}`
              }}>
                {gameState.winner === playerSide ? 'YOU WIN!' : 'GAME OVER'}
              </h2>
              
              <div className="text-white text-xl pixel-font mb-8">
                FINAL SCORE
                <div className="flex justify-center items-center gap-6 mt-4">
                  <span className="text-red-500 text-3xl">{gameState.score.left}</span>
                  <span className="text-gray-400">-</span>
                  <span className="text-blue-500 text-3xl">{gameState.score.right}</span>
                </div>
              </div>
              
              <button
                onClick={handleRestartGame}
                className="bg-yellow-500 text-black px-8 py-4 pixel-font-bold arcade-button blink-fast"
              >
           PLAY AGAIN
              </button>
            </div>
          </div>
        )}
      </div>

     
    </div>
  );
};

export default MobileController;
