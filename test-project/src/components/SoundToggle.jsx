import React from 'react';

const SoundToggle = ({ soundEnabled, toggleSound }) => {
  return (
    <button 
      onClick={toggleSound}
      className="flex items-center bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs font-mono transition-colors duration-200"
      aria-label={soundEnabled ? "Mute sound" : "Enable sound"}
    >
      {soundEnabled ? '🔊 SOUND ON' : '🔇 SOUND OFF'}
    </button>
  );
};

export default SoundToggle;