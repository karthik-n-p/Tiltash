// Sound effect instances
const SOUNDS = {
    // Improved, more fitting sounds for the game
    paddleHit: new Audio(),  // Solid hit sound when ball hits paddle
    wallHit: new Audio(),    // Softer bounce sound for wall hits
    score: new Audio(),      // Triumphant scoring sound
    gameOver: new Audio(),   // Game over jingle
    connect: new Audio(),    // Connection success sound
    button: new Audio()      // UI button click sound
  };
  
  // Better sound URLs that fit the retro game theme
  // Note: In a production app, these would be local assets rather than external URLs
  const SOUND_URLS = {
    // A sharper, more percussive hit sound for paddles
    paddleHit: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // Crisp impact sound
    
    // Lighter bounce sound for walls
    wallHit: 'https://assets.mixkit.co/active_storage/sfx/2652/2652-preview.mp3',  // Softer, higher pitched bounce
    
    // Exciting success sound for scoring
    score: 'https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3',  // Achievement sound
    
    // Dramatic game over sound
    gameOver: 'https://assets.mixkit.co/active_storage/sfx/1908/1908-preview.mp3',  // Arcade game over
    
    // Positive connection sound
    connect: 'https://assets.mixkit.co/active_storage/sfx/220/220-preview.mp3',  // Positive notification sound
    
    // Arcade-style button click
    button: 'https://assets.mixkit.co/active_storage/sfx/2691/2691-preview.mp3'  // Digital button press
  };
  
  /**
   * Initialize all sound files and load them
   */
  export const initializeSounds = () => {
    Object.keys(SOUNDS).forEach(key => {
      SOUNDS[key].src = SOUND_URLS[key];
      
      // Lower volume for certain sounds
      if (key === 'wallHit') {
        SOUNDS[key].volume = 0.4; // Wall hits should be softer
      } else if (key === 'button') {
        SOUNDS[key].volume = 0.6; // UI sounds slightly quieter
      } else {
        SOUNDS[key].volume = 0.7; // Default volume
      }
      
      // Preload sounds
      SOUNDS[key].load();
    });
  };
  
  /**
   * Play a sound effect if sound is enabled
   * @param {string} soundName - The name of the sound to play
   * @param {boolean} soundEnabled - Whether sound is enabled
   */
  export const playSound = (soundName, soundEnabled) => {
    if (soundEnabled && SOUNDS[soundName]) {
      try {
        // Stop the sound if it's currently playing
        SOUNDS[soundName].pause();
        SOUNDS[soundName].currentTime = 0;
        
        // Play the sound
        const playPromise = SOUNDS[soundName].play();
        
        // Handle play promise (avoids uncaught promise errors)
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log('Audio play error:', error);
          });
        }
      } catch (err) {
        console.log('Error playing sound:', err);
      }
    }
  };
  
  /**
   * Preload a specific sound - can be used for loading sounds on demand
   * @param {string} soundName - The name of the sound to preload
   */
  export const preloadSound = (soundName) => {
    if (SOUNDS[soundName]) {
      SOUNDS[soundName].load();
    }
  };
  
  /**
   * Stop all currently playing sounds
   */
  export const stopAllSounds = () => {
    Object.values(SOUNDS).forEach(sound => {
      try {
        sound.pause();
        sound.currentTime = 0;
      } catch (err) {
        console.log('Error stopping sound:', err);
      }
    });
  };
  
  export default {
    initializeSounds,
    playSound,
    preloadSound,
    stopAllSounds
  };