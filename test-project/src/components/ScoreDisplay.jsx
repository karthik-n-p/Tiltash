import React from 'react';

const ScoreDisplay = ({ leftScore, rightScore, maxScore }) => {
  return (
    <div className="mt-6 flex justify-between items-center">
      <div className="flex items-center">
        <div className="w-4 h-4 rounded-full bg-red-500 mr-2 glow-small-red"></div>
        <div className="text-sm font-medium text-red-400 font-mono">P1: {leftScore}</div>
      </div>
      <div className="text-sm font-medium text-yellow-300 font-mono">FIRST TO {maxScore} WINS</div>
      <div className="flex items-center">
        <div className="text-sm font-medium text-cyan-400 font-mono">P2: {rightScore}</div>
        <div className="w-4 h-4 rounded-full bg-cyan-500 ml-2 glow-small-teal"></div>
      </div>

      <style jsx>{`
        .glow-small-red {
          box-shadow: 0 0 5px 2px rgba(239, 68, 68, 0.5);
        }
        
        .glow-small-teal {
          box-shadow: 0 0 5px 2px rgba(45, 212, 191, 0.5);
        }
      `}</style>
    </div>
  );
};

export default ScoreDisplay;