import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, RefreshCcw, User, List } from 'lucide-react';
import { socket } from '../socket';

export default function Result() {
  const navigate = useNavigate();
  const [score, setScore] = useState(0);
  const [username, setUsername] = useState('');
  const [roomData, setRoomData] = useState(null);

  useEffect(() => {
    const finalScore = sessionStorage.getItem('finalScore') || 0;
    const user = sessionStorage.getItem('username') || 'Unknown';
    const data = JSON.parse(sessionStorage.getItem('roomData') || '{}');
    
    setScore(Number(finalScore));
    setUsername(user);
    setRoomData(data);

    // In a full build, we would broadcast the score to the opponent
    // and wait for their score to determine a winner.
    // POST to Supabase Backend
    if (finalScore && user !== 'Unknown') {
      fetch('http://localhost:3001/api/leaderboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: user,
          topic: data.topic || 'General Knowledge',
          score: Number(finalScore)
        })
      }).catch(err => console.error("Failed to save score:", err));
    }
  }, []);

  const handlePlayAgain = () => {
    sessionStorage.removeItem('roomData');
    sessionStorage.removeItem('finalScore');
    socket.disconnect(); // clean up state
    navigate('/');
  };

  return (
    <div className="w-full max-w-md glass-panel p-10 text-center animate-slide-up relative overflow-hidden">
      {/* Background celebration flares */}
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-primary-500/20 to-transparent pointer-events-none" />

      <div className="inline-flex justify-center items-center w-24 h-24 rounded-full bg-yellow-500/20 text-yellow-400 mb-6 ring-4 ring-yellow-500/30">
        <Trophy size={48} />
      </div>

      <h1 className="text-4xl font-black tracking-tight mb-2 text-white">Battle Finished!</h1>
      <p className="text-gray-400 mb-8">You survived the context arena.</p>

      <div className="bg-gray-950/50 rounded-2xl p-6 mb-8 border border-gray-800 flex justify-between items-center">
        <div className="flex items-center gap-3 text-left">
          <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center">
            <User size={24} className="text-primary-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">{username}</div>
            <div className="text-xs text-gray-500">{roomData?.topic}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-gray-500 tracking-wider">SCORE</div>
          <div className="text-3xl font-mono font-bold text-primary-400">{score}</div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => navigate('/leaderboard')}
          className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold text-lg py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl shadow-primary-500/20"
        >
          <List size={20} /> View Leaderboard
        </button>

        <button
          onClick={handlePlayAgain}
          className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold text-lg py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 border border-gray-700 hover:border-gray-600 shadow-xl"
        >
          <RefreshCcw size={20} /> Play Again
        </button>
      </div>

      <div className="mt-6 text-xs text-gray-500">
        Results evaluated by standard local heuristics.
      </div>
    </div>
  );
}
