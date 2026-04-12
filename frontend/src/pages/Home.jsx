import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords, BookOpen, User } from 'lucide-react';
import { socket } from '../socket';

export default function Home() {
  const [username, setUsername] = useState('');
  const [topic, setTopic] = useState('');
  const [filteredTopics, setFilteredTopics] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isValidSelection, setIsValidSelection] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (topic.trim().length < 2) {
      setFilteredTopics([]);
      return;
    }

    if (!showDropdown) return; // Don't search if they just selected one

    setIsTyping(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const response = await fetch('http://localhost:3001/api/quiz/suggest-topics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: topic })
        });
        const data = await response.json();
        setFilteredTopics(data || []);
      } catch (err) {
        setFilteredTopics([]);
      } finally {
        setIsTyping(false);
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [topic, showDropdown]);

  const handleTopicChange = (e) => {
    setTopic(e.target.value);
    setShowDropdown(true);
    setIsValidSelection(false); // Reset validation since they typed something new
  };

  const selectTopic = (t) => {
    setTopic(t);
    setShowDropdown(false);
    setIsValidSelection(true);
  };

  const handleStart = (e) => {
    e.preventDefault();
    if (!username || !topic) return;

    if (!isValidSelection) {
      alert("Please select a topic precisely from the AI-generated suggestions list to continue.");
      return;
    }

    // Connect socket if not connected
    if (!socket.connected) {
      socket.connect();
    }

    // Set user info locally
    sessionStorage.setItem('username', username);
    sessionStorage.setItem('topic', topic);

    navigate('/matchmaking');
  };

  return (
    <div className="w-full max-w-lg animate-slide-up mx-auto">
      <div className="text-center mb-10">
        <div className="mb-6">
          <BookOpen strokeWidth={1} size={56} className="text-primary mx-auto opacity-80" />
        </div>
        <h1 className="font-serif text-5xl md:text-6xl tracking-[-0.02em] mb-3 text-on-surface">
          AI Study Arena
        </h1>
        <p className="font-body text-on-surface-variant text-xl italic mb-8">
          Enter the Digital Scriptorium. Match. Confer. Battle.
        </p>
        
        {/* How It Works Guide */}
        <div className="scholar-card border border-outline-variant/20 rounded-sm p-6 text-left mx-auto max-w-md">
          <h2 className="font-sans text-xs font-semibold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
             The Ordeal
          </h2>
          <ol className="font-body text-on-surface-variant space-y-4">
            <li className="flex items-start gap-4">
              <span className="font-serif text-primary font-bold">I.</span>
              <span>Declare your scholarly intent and domain of study.</span>
            </li>
            <li className="flex items-start gap-4">
              <span className="font-serif text-primary font-bold">II.</span>
              <span>Match dynamically into a 30-second deliberation room.</span>
            </li>
            <li className="flex items-start gap-4">
              <span className="font-serif text-primary font-bold">III.</span>
              <span>Survive the ensuing trial to establish your dominance.</span>
            </li>
          </ol>
        </div>
      </div>

      <form onSubmit={handleStart} className="glass-panel border border-outline-variant/40 p-8 space-y-8 rounded-sm mx-auto max-w-md scholar-shadow relative overflow-hidden">
        {/* Subtle decorative top border */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary-container to-transparent opacity-50"></div>

        <div className="space-y-2">
          <label className="font-sans text-xs font-semibold tracking-wider text-on-surface uppercase flex items-center gap-2">
            Scholar Identity
          </label>
          <input
            type="text"
            className="w-full bg-transparent border-b border-outline-variant/50 px-0 py-3 text-on-surface font-body text-lg focus:border-primary focus:ring-0 outline-none transition-colors placeholder:text-surface-container-highest placeholder:italic"
            placeholder="e.g., Scholar Vane"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2 relative">
          <label className="font-sans text-xs font-semibold tracking-wider text-on-surface uppercase flex items-center gap-2">
            Domain of Focus
          </label>
          <input
            type="text"
            className="w-full bg-transparent border-b border-outline-variant/50 px-0 py-3 text-on-surface font-body text-lg focus:border-primary focus:ring-0 outline-none transition-colors placeholder:text-surface-container-highest placeholder:italic"
            placeholder="e.g., Quantum Mechanics, Ancient History"
            value={topic}
            onChange={handleTopicChange}
            onFocus={() => topic.trim() && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            required
          />
          
          {showDropdown && isTyping && (
            <div className="absolute z-50 w-full mt-2 bg-surface-container-high border border-outline-variant/30 rounded-sm shadow-2xl px-4 py-3 text-primary font-body text-sm italic flex items-center gap-3">
              <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
              Consulting the archives...
            </div>
          )}

          {showDropdown && !isTyping && filteredTopics.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-surface-container-high border border-outline-variant/30 rounded-sm shadow-2xl overflow-hidden font-body">
              {filteredTopics.map((t, i) => (
                <div 
                  key={i}
                  className="px-4 py-3 hover:bg-surface-container-highest cursor-pointer text-on-surface transition-colors border-b last:border-b-0 border-outline-variant/20"
                  onClick={() => selectTopic(t)}
                >
                  {t}
                </div>
              ))}
            </div>
          )}
          
          {showDropdown && !isTyping && topic.trim().length >= 2 && filteredTopics.length === 0 && (
            <div className="absolute z-50 w-full mt-2 bg-error-container/20 border border-error-container rounded-sm shadow-xl px-4 py-3 text-on-error-container font-body text-sm italic">
              Unrecognized domain. Please enter a valid academic subject.
            </div>
          )}
        </div>

        <button
          type="submit"
          className="w-full group bg-gradient-to-r from-primary-fixed to-primary-container hover:from-primary hover:to-primary-fixed-dim text-on-primary font-serif font-bold tracking-wide text-lg py-4 rounded-sm transition-all shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] flex justify-center items-center gap-3"
        >
          <span>Begin Trial</span>
          <Swords size={20} className="opacity-80 group-hover:opacity-100 transition-opacity" />
        </button>
      </form>
    </div>
  );
}
