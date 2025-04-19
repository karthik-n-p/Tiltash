import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const socket = io('https://192.168.37.113:3001', {
  secure: true,
  transports: ['websocket'],
  path: '/socket.io/',
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
  const position = useRef(200);
  const requestRef = useRef();
  const previousY = useRef(0);  // Keep track of the previous Y motion value for smoothing
  const threshold = 1;  // Threshold to ignore small movements

  // Device detection and socket setup
  useEffect(() => {
    setIsMobile(/Mobi|Android/i.test(navigator.userAgent));
    if (!isMobile) socket.emit('create-room');
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  // Socket event handlers
  useEffect(() => {
    const handleRoomCreated = (id) => {
      setRoomId(id);
      if (!isMobile) {
        navigator.clipboard.writeText(id)
          .then(() => console.log('Room ID copied'))
          .catch(() => console.log('Failed to copy'));
      }
    };

    const handleMobileConnected = () => setIsConnected(true);
    const handleMotionData = ({ y }) => {
      if (!isMobile) {
        velocity.current = -y * 3.5;
        setMotionData({ y });
      }
    };

    socket.on('room-created', handleRoomCreated);
    socket.on('mobile-connected', handleMobileConnected);
    socket.on('receive-motion', handleMotionData);
    socket.on('error-message', console.error);

    return () => {
      socket.off('room-created');
      socket.off('mobile-connected');
      socket.off('receive-motion');
      socket.off('error-message');
    };
  }, [isMobile]);

  // Mobile motion detection
  useEffect(() => {
    if (!isMobile || !isConnected) return;

    const handleMotion = (e) => {
      const y = e.accelerationIncludingGravity?.y || 0;

      // Apply threshold to filter out small movements
      if (Math.abs(y - previousY.current) > threshold) {
        socket.emit('send-motion', { roomId, y });
        setMotionData({ y });
        previousY.current = y;  // Update the previous Y value
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [isMobile, isConnected, roomId]);

  // Ball physics animation
  useEffect(() => {
    if (isMobile || !isConnected) return;

    const animate = () => {
      velocity.current += 0.2;
      velocity.current *= 0.5;
      position.current += velocity.current;

      const containerHeight = 400;
      const ballHeight = 64;

      if (position.current >= containerHeight - ballHeight) {
        position.current = containerHeight - ballHeight;
        velocity.current *= -0.75;
      }

      if (position.current <= 0) {
        position.current = 0;
        velocity.current *= -0.5;
      }

      if (ballRef.current) {
        ballRef.current.style.transform = `translate(-50%, ${position.current}px)`;
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(requestRef.current);
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
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-4">
        {!isConnected ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full text-center border border-gray-100">
            <h1 className="text-3xl font-light mb-6 text-gray-800">Bounce Control</h1>
            <div className="text-5xl font-mono text-gray-900 py-6 tracking-wider font-medium">
              {roomId || '...'}
            </div>
            <p className="text-gray-500 text-sm">Scan or share this code with your mobile device</p>
          </div>
        ) : (
          <div className="relative w-full max-w-md h-96 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div
              ref={ballRef}
              className="absolute w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md"
              style={{
                left: '50%',
                top: 0,
                transform: 'translate(-50%, 200px)',
                transition: 'transform 0.05s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            />
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <p className="text-xs text-gray-500 font-medium">
                TILT INTENSITY: {Math.abs(motionData.y).toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Mobile UI
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-4">
      {!isConnected ? (
        <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full border border-gray-100">
          <h1 className="text-3xl font-light mb-8 text-center text-gray-800">Controller</h1>
          <input
            type="text"
            value={inputRoomId}
            onChange={(e) => setInputRoomId(e.target.value)}
            placeholder="ENTER ROOM CODE"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg mb-6 text-center font-mono text-lg focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <button
            onClick={handleJoin}
            className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium text-lg hover:bg-gray-800 transition-colors"
          >
            CONNECT
          </button>
        </div>
      ) : (
        <div className="text-center p-6 max-w-md w-full">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
            <p className="text-sm text-gray-500 mb-1 uppercase tracking-wider">Connected to</p>
            <p className="text-xl font-mono text-gray-900 mb-4 font-medium">{roomId}</p>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 transition-all duration-75"
                style={{
                  width: `${Math.min(100, Math.abs(motionData.y * 25) + 5)}%`,
                  margin: '0 auto'
                }}
              />
            </div>
            <p className="text-xs text-gray-500 font-medium">
              TILT: {Math.abs(motionData.y).toFixed(2)}
            </p>
          </div>
          <p className="text-gray-500 text-sm">Tilt your device to control the ball</p>
        </div>
      )}
    </div>
  );
}

export default App;