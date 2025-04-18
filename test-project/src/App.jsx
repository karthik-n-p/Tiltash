import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://192.168.37.113:3001'); // Replace with your IP

function App() {
  const [roomId, setRoomId] = useState(null);
  const [joined, setJoined] = useState(false);
  const [isMobileUI, setIsMobileUI] = useState(false);

  const ballRef = useRef(null);
  const velocity = useRef(0);
  const position = useRef(200);
  const requestRef = useRef();

  // 📱 Detect screen width
  useEffect(() => {
    const checkMobile = () => setIsMobileUI(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 💻 LAPTOP: create room & listen to motion
  useEffect(() => {
    if (!isMobileUI) {
      socket.emit('create-room');
      socket.on('room-created', id => setRoomId(id));

      socket.on('receive-motion', ({ y }) => {
        if (Math.abs(y) > 1.5) velocity.current = -10 * (y / 10);
      });
    }
  }, [isMobileUI]);

  // 💻 Animate ball
  useEffect(() => {
    if (!isMobileUI) {
      const animate = () => {
        velocity.current += 0.5;
        position.current += velocity.current;
        if (position.current >= 300) {
          position.current = 300;
          velocity.current *= -0.6;
        }
        if (ballRef.current) {
          ballRef.current.style.top = `${position.current}px`;
        }
        requestRef.current = requestAnimationFrame(animate);
      };
      animate();
      return () => cancelAnimationFrame(requestRef.current);
    }
  }, [isMobileUI]);

  // 📱 MOBILE: handle motion and send to server
  useEffect(() => {
    if (isMobileUI && joined && roomId) {
      const handleMotion = e => {
        const y = e.accelerationIncludingGravity?.y || 0;
        socket.emit('send-motion', { roomId, y });
      };
      window.addEventListener('devicemotion', handleMotion);
      return () => window.removeEventListener('devicemotion', handleMotion);
    }
  }, [isMobileUI, joined, roomId]);

  // 📱 Join room
  const handleJoin = () => {
    if (roomId?.trim()) {
      socket.emit('join-room', roomId);
      setJoined(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-4">
      {isMobileUI ? (
        !joined ? (
          <div className="space-y-4 w-full max-w-sm">
            <h2 className="text-lg font-bold text-center">🎮 Join as Controller</h2>
            <input
              type="text"
              placeholder="Enter Room ID"
              value={roomId || ''}
              onChange={e => setRoomId(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <button
              onClick={handleJoin}
              className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
            >
              Connect
            </button>
          </div>
        ) : (
          <p className="text-green-700 text-xl">Controller Active ✅</p>
        )
      ) : (
        <div className="relative w-full max-w-md h-96 bg-white border rounded shadow flex items-start justify-center">
          <div
            ref={ballRef}
            className="w-12 h-12 rounded-full bg-red-500 absolute"
            style={{ top: 200 }}
          />
          <div className="absolute bottom-4 text-center text-gray-700 w-full px-4">
            Room ID: <strong>{roomId}</strong><br />
            Open this site on your phone and enter the code to join.
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
