import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

// Configure socket with proper Ngrok settings
const socket = io('https://43ec-2409-40f3-201d-7849-70f7-f361-637c-bbcd.ngrok-free.app', {
  transports: ['websocket'],
  secure: true,
  rejectUnauthorized: false, // Needed for Ngrok's self-signed cert
  path: '/socket.io/', // Ensure this matches your server path
  withCredentials: true
});

function App() {
  const [roomId, setRoomId] = useState('');
  const [inputRoomId, setInputRoomId] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [motionData, setMotionData] = useState({ y: 0 });
  const ballRef = useRef(null);
  const velocity = useRef(0);
  const position = useRef(200); // Initial position (middle of container)
  const requestRef = useRef();

  // 1. Detect device & setup socket
  useEffect(() => {
    const mobileCheck = /Mobi|Android/i.test(navigator.userAgent);
    setIsMobile(mobileCheck);

    // Desktop: Create room immediately
    if (!mobileCheck) {
      socket.emit('create-room');
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // 2. Socket event listeners
  useEffect(() => {
    const handleRoomCreated = (id) => {
      setRoomId(id);
      if (!isMobile) {
        navigator.clipboard.writeText(id)
          .then(() => alert(`Room ID: ${id}\nCopied to clipboard!`))
          .catch(() => console.log('Failed to copy'));
      }
    };

    const handleMobileConnected = () => {
      setIsConnected(true);
      console.log('Mobile connected - starting game');
      console.log('d',)
    };

    const handleMotionData = ({ y }) => {
      if (!isMobile) {
        // Apply more sensitive motion control
        velocity.current = -y * 3; // Increased multiplier for better response
        setMotionData(prev => ({ ...prev, y }));
        console.log(motionData)
      }
    };

    socket.on('room-created', handleRoomCreated);
    socket.on('mobile-connected', handleMobileConnected);
    socket.on('receive-motion', handleMotionData);
    socket.on('error-message', (msg) => alert(msg));

    return () => {
      socket.off('room-created');
      socket.off('mobile-connected');
      socket.off('receive-motion');
      socket.off('error-message');
    };
  }, [isMobile]);

  // 3. Mobile: Motion sensor handler
  useEffect(() => {
    if (isMobile && isConnected) {
      const handleMotion = (e) => {
        const y = e.accelerationIncludingGravity?.y || 0;
        console.log("y",y)
        socket.emit('send-motion', { roomId, y });
        setMotionData(prev => ({ ...prev, y }));
      };

      window.addEventListener('devicemotion', handleMotion);
      return () => window.removeEventListener('devicemotion', handleMotion);
    }
  }, [isMobile, isConnected, roomId]);

  // 4. Desktop: Ball physics animation
  useEffect(() => {
    if (!isMobile && isConnected) {
      const containerHeight = 400; // Match your container height
      const ballHeight = 64; // Match your ball size

      const animate = () => {
        // Apply gravity
        velocity.current += 0.4;
        
        // Update position
        position.current += velocity.current;
        
        // Floor collision (bottom)
        if (position.current >= containerHeight - ballHeight) {
          position.current = containerHeight - ballHeight;
          velocity.current *= -0.7; // Bounce with energy loss
        }
        
        // Ceiling collision (top)
        if (position.current <= 0) {
          position.current = 0;
          velocity.current *= -0.5;
        }

        // Apply to ball
        if (ballRef.current) {
          ballRef.current.style.transform = `translate(-50%, ${position.current}px)`;
        }

        requestRef.current = requestAnimationFrame(animate);
      };

      animate();
      return () => cancelAnimationFrame(requestRef.current);
    }
  }, [isMobile, isConnected]);

  const handleJoin = () => {
    if (inputRoomId.trim()) {
      const cleanId = inputRoomId.trim().toUpperCase();
      setRoomId(cleanId);
      socket.emit('join-room', cleanId);
      socket.emit('mobile-connect', cleanId);
    }
  };

  // Desktop UI
  if (!isMobile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-4">
        {!isConnected ? (
          <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full text-center">
            <h1 className="text-2xl font-bold mb-4">Motion Bounce Game</h1>
            <div className="text-4xl font-mono text-blue-600 py-4">
              {roomId || 'Creating room...'}
            </div>
            <p className="text-gray-500 animate-pulse">Waiting for mobile connection...</p>
          </div>
        ) : (
          <div className="relative w-full max-w-md h-96 bg-white rounded-lg shadow-md overflow-hidden">
            {/* Ball element */}
            <div
              ref={ballRef}
              className="absolute w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-pink-500 shadow-lg"
              style={{
                left: '50%',
                top: 0,
                transform: 'translate(-50%, 200px)'
              }}
            />
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <p className="text-green-600 font-medium">Mobile connected!</p>
              <p className="text-sm text-gray-600">
                Tilt strength: {Math.abs(motionData.y).toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Mobile UI
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-4">
      {!isConnected ? (
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold mb-6 text-center">Motion Controller</h1>
          <input
            type="text"
            value={inputRoomId}
            onChange={(e) => setInputRoomId(e.target.value)}
            placeholder="Enter Room ID"
            className="w-full px-4 py-2 border rounded-lg mb-4"
          />
          <button
            onClick={handleJoin}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold"
          >
            Connect
          </button>
        </div>
      ) : (
        <div className="text-center p-6 max-w-md w-full">
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded">
            <p className="font-bold">Connected to Room:</p>
            <p className="font-mono">{roomId}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <p className="text-lg mb-4">Tilt your phone to control the ball</p>
            <div className="h-4 w-full bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-100"
                style={{
                  width: `${Math.min(100, Math.abs(motionData.y * 30) + 10)}%`,
                  marginLeft: motionData.y > 0 ? '0' : 'auto'
                }}
              />
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Current tilt: {motionData.y.toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
