import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { socket } from '../socket';

export default function Matchmaking() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Searching for an opponent...');
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    const username = sessionStorage.getItem('username');
    const topic = sessionStorage.getItem('topic');

    if (!username || !topic) {
      navigate('/');
      return;
    }

    // Ping the server to find a match
    socket.emit('find_match', { username, topic });

    // FAIL-SAFE: If no match found in 30 seconds, force proceed
    const failSafeTimer = setTimeout(() => {
      console.log("[Matchmaking] Fail-safe triggered - manual match initiated.");
      const botNames = ['Aria_Zen', 'Liam_Study', 'Max_Archivist', 'Kyra_JS', 'Ben_Bio', 'Maya_Code', 'James_H', 'Luna_Dev', 'Alex_Smith', 'Jordan_K', 'Sasha_R', 'Sam_D', 'Casey_M', 'Zoe_Q', 'Noah_V'];
      const botName = botNames[Math.floor(Math.random() * botNames.length)];
      
      handleMatch({ 
        roomId: `room_bot_fail_safe_${Math.random().toString(36).substring(7)}`, 
        topic, 
        players: [username, botName],
        opponent: botName, 
        persona: 'The Analytical Monk' 
      });
    }, 30000);

    // Listen for match
    function handleMatch(roomData) {
      clearTimeout(failSafeTimer); // Cancel fail-safe if server responds
      
      // Small artificial delay for immersion
      setTimeout(() => {
        setStatus('Match Found!');
        sessionStorage.setItem('roomData', JSON.stringify(roomData));
        
        // Delay so user can see "Match Found!" before jumping
        setTimeout(() => {
          navigate('/study');
        }, 800);
      }, 1000); 
    }

    socket.on('match_found', handleMatch);

    return () => {
      clearTimeout(failSafeTimer);
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
      
      {countdown > 0 && status !== 'Match Found!' && (
        <div className="mt-4 text-primary-400 font-mono text-lg animate-pulse">
          Estimated wait: {countdown}s
        </div>
      )}

      <p className="mt-8 text-gray-400 max-w-sm text-center">
        Scanning the neural net for a worthy challenger... Finding the best match for your domain of focus.
      </p>
    </div>
  );
}
