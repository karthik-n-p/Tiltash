import React from 'react';
import './retro.css'; // Import the extracted retro CSS

const RoomCodeDisplay = ({ roomId }) => {
  return (
    <div className="mb-6 bg-black p-4 rounded-lg border-2 border-yellow-400 pixel-corners">
      <p className="text-green-400 text-sm mb-2 pixel-font">ROOM CODE</p>
      <div className="text-3xl pixel-font text-yellow-400 py-3 tracking-wider bg-black rounded border-2 border-yellow-400 pixel-corners blink-slow arcade-glow">
        {roomId}
      </div>
      <p className="text-green-400 text-xs mt-2 pixel-font">
        SHARE THIS CODE WITH PLAYERS
      </p>
    </div>
  );
};

export default RoomCodeDisplay;