import React from 'react';

const RoomCodeDisplay = ({ roomId }) => {
  return (
    <div className="mb-6 bg-gray-900 p-4 rounded-lg border-2 border-yellow-500">
      <p className="text-teal-300 text-sm mb-1 font-mono font-bold">ROOM CODE</p>
      <div className="text-3xl font-mono text-yellow-300 py-2 tracking-wider font-bold bg-gray-800 rounded-lg border border-gray-700 flicker-text">
        {roomId}
      </div>
      <p className="text-teal-400 text-sm mt-2 font-mono">
        Share this code with players
      </p>
      
      <style jsx>{`
        .flicker-text {
          animation: textFlicker 3s infinite alternate;
        }
        
        @keyframes textFlicker {
          0%, 19.999%, 22%, 62.999%, 64%, 97.999%, 99.999%, 100% {
            opacity: 1;
          }
          20%, 21.999%, 63%, 63.999%, 98%, 99.999% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
};

export default RoomCodeDisplay;