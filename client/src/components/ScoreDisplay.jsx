import React from 'react';
import './retro.css'; // Import the extracted retro CSS

const ScoreDisplay = ({ leftScore, rightScore, maxScore }) => {
  return (
    <div className="score-display">
      <div className="flex justify-between items-center">
        <div className="text-center">
          <div className="text-red-500 text-4xl pixel-font-bold arcade-glow">{leftScore}</div>
          <div className="text-gray-400 text-xs pixel-font">P1</div>
        </div>
        <div className="text-yellow-500 text-lg pixel-font blink-slow">VS</div>
        <div className="text-center">
          <div className="text-blue-500 text-4xl pixel-font-bold arcade-glow">{rightScore}</div>
          <div className="text-gray-400 text-xs pixel-font">P2</div>
        </div>
      </div>
      <div className="mt-4 text-center">
        <span className="text-green-400 text-sm pixel-font">FIRST TO {maxScore} WINS</span>
      </div>
    </div>
  );
};

export default ScoreDisplay;