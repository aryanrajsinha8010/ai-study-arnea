import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, RefreshCcw, List, Swords, Crown, Shield } from 'lucide-react';
import { socket } from '../socket';

export default function Result() {
  const navigate = useNavigate();
  const [score, setScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [username, setUsername] = useState('');
  const [opponentName, setOpponentName] = useState('Opponent');
  const [roomData, setRoomData] = useState(null);
  const [outcome, setOutcome] = useState(null); // 'win' | 'loss' | 'draw'

  useEffect(() => {
    const finalScore = parseInt(sessionStorage.getItem('finalScore') || '0', 10);
    const user = sessionStorage.getItem('username') || 'Unknown';
    const data = JSON.parse(sessionStorage.getItem('roomData') || '{}');
    const opStats = JSON.parse(sessionStorage.getItem('opponentStats') || '{"score":0}');

    const myScore = finalScore;
    const oppScore = opStats.score || 0;
    const opponent = data.players?.find(p => p !== user) || 'Opponent';

    setScore(myScore);
    setOpponentScore(oppScore);
    setUsername(user);
    setOpponentName(opponent);
    setRoomData(data);

    if (myScore > oppScore) setOutcome('win');
    else if (myScore < oppScore) setOutcome('loss');
    else setOutcome('draw');

    // Save to leaderboard
    if (finalScore && user !== 'Unknown') {
      fetch('http://localhost:5000/api/leaderboard/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user,
          topic: data.topic || 'General Knowledge',
          score: myScore
        })
      }).catch(err => console.error('Failed to save score:', err));
    }
  }, []);

  const handlePlayAgain = () => {
    sessionStorage.removeItem('roomData');
    sessionStorage.removeItem('finalScore');
    sessionStorage.removeItem('opponentStats');
    sessionStorage.removeItem('chatHistory');
    socket.disconnect();
    navigate('/');
  };

  const outcomeConfig = {
    win: {
      icon: Crown,
      label: 'Victory!',
      sub: 'You outscored your rival. The archives acknowledge your dominance.',
      bannerClass: 'from-yellow-500/20 via-primary-500/10 to-transparent',
      badgeClass: 'bg-yellow-500/20 text-yellow-400 ring-yellow-500/40',
    },
    loss: {
      icon: Shield,
      label: 'Defeated',
      sub: 'Your rival had the edge this time. Return, study harder, reclaim glory.',
      bannerClass: 'from-blue-500/10 via-gray-700/10 to-transparent',
      badgeClass: 'bg-blue-500/20 text-blue-400 ring-blue-500/30',
    },
    draw: {
      icon: Swords,
      label: 'A Draw!',
      sub: 'Perfectly matched. The archives call it a stalemate.',
      bannerClass: 'from-purple-500/15 via-gray-700/10 to-transparent',
      badgeClass: 'bg-purple-500/20 text-purple-400 ring-purple-500/30',
    },
  };

  const cfg = outcomeConfig[outcome] || outcomeConfig.draw;
  const OutcomeIcon = cfg.icon;

  return (
    <div className="w-full max-w-lg glass-panel p-10 text-center animate-slide-up relative overflow-hidden">
      {/* Background glow */}
      <div className={`absolute top-0 inset-x-0 h-48 bg-gradient-to-b ${cfg.bannerClass} pointer-events-none`} />

      {/* Outcome Badge */}
      <div className={`relative inline-flex justify-center items-center w-24 h-24 rounded-full mb-5 ring-4 ${cfg.badgeClass}`}>
        <OutcomeIcon size={44} />
      </div>

      <h1 className="font-serif text-4xl font-bold tracking-tight mb-1 text-on-surface relative">
        {cfg.label}
      </h1>
      <p className="text-on-surface-variant font-body text-sm mb-8 italic max-w-sm mx-auto relative">
        {cfg.sub}
      </p>

      {/* Score Comparison */}
      <div className="relative flex gap-3 mb-8">
        {/* My score */}
        <div className={`flex-1 rounded-sm p-5 border ${outcome === 'win' ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-outline-variant/30 bg-surface-container'}`}>
          <div className="font-sans text-[10px] uppercase tracking-widest text-on-surface-variant mb-2">You</div>
          <div className="font-serif text-4xl font-bold text-primary mb-1">{score}</div>
          <div className="font-sans text-xs text-on-surface-variant truncate">{username}</div>
          {outcome === 'win' && <div className="mt-2 text-[10px] font-bold uppercase tracking-widest text-yellow-400">Winner ✦</div>}
        </div>

        {/* Divider */}
        <div className="flex flex-col items-center justify-center text-on-surface-variant font-serif font-bold text-lg px-1">
          VS
        </div>

        {/* Opponent score */}
        <div className={`flex-1 rounded-sm p-5 border ${outcome === 'loss' ? 'border-blue-500/40 bg-blue-500/5' : 'border-outline-variant/30 bg-surface-container'}`}>
          <div className="font-sans text-[10px] uppercase tracking-widest text-on-surface-variant mb-2">Opponent</div>
          <div className="font-serif text-4xl font-bold text-on-surface mb-1">{opponentScore}</div>
          <div className="font-sans text-xs text-on-surface-variant truncate">{opponentName}</div>
          {outcome === 'loss' && <div className="mt-2 text-[10px] font-bold uppercase tracking-widest text-blue-400">Winner ✦</div>}
        </div>
      </div>

      {/* Topic pill */}
      {roomData?.topic && (
        <div className="mb-8">
          <span className="font-sans text-[10px] uppercase tracking-widest text-primary border border-primary/30 bg-primary/5 px-4 py-2 rounded-sm">
            {roomData.topic}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 relative">
        <button
          onClick={() => navigate('/leaderboard')}
          className="w-full bg-primary/90 hover:bg-primary text-on-primary font-serif font-bold text-lg py-4 rounded-sm transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
        >
          <List size={20} /> View Leaderboard
        </button>

        <button
          onClick={handlePlayAgain}
          className="w-full bg-surface-container hover:bg-surface-container-high text-on-surface font-serif font-bold text-lg py-4 rounded-sm transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 border border-outline-variant/40 hover:border-outline-variant"
        >
          <RefreshCcw size={20} /> Play Again
        </button>
      </div>
    </div>
  );
}
