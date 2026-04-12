import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { socket } from '../socket';

export default function Matchmaking() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Searching for an opponent...');

  useEffect(() => {
    const username = sessionStorage.getItem('username');
    const topic = sessionStorage.getItem('topic');

    if (!username || !topic) {
      navigate('/');
      return;
    }

    // Ping the server to find a match
    socket.emit('find_match', { username, topic });

    // Listen for match
    const handleMatch = (roomData) => {
      setStatus('Match Found!');
      sessionStorage.setItem('roomData', JSON.stringify(roomData));
      
      // Delay so user can see "Match Found!" before jumping
      setTimeout(() => {
        navigate('/study');
      }, 1000);
    };

    socket.on('match_found', handleMatch);

    return () => {
      socket.off('match_found', handleMatch);
    };
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center animate-slide-up">
      <div className="relative">
        {/* Radar Ping Animation */}
        <div className="absolute inset-0 border-4 border-primary-500 rounded-full animate-ping opacity-20" />
        <div className="absolute inset-0 -m-8 border-2 border-blue-500 rounded-full animate-ping opacity-10 animation-delay-500" />
        
        <div className="relative z-10 bg-bg-panel border border-gray-700/50 w-32 h-32 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.2)]">
          <Search size={40} className="text-primary-400 animate-pulse" />
        </div>
      </div>
      
      <h2 className="mt-12 text-2xl font-bold text-gray-200 tracking-wide">
        {status}
      </h2>
      <p className="mt-4 text-gray-400 max-w-sm text-center">
        Scanning the neural net for a worthy challenger...
      </p>
    </div>
  );
}
