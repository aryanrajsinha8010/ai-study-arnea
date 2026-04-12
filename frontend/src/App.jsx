import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Matchmaking from './pages/Matchmaking';
import StudyRoom from './pages/StudyRoom';
import QuizBattle from './pages/QuizBattle';
import Result from './pages/Result';
import Leaderboard from './pages/Leaderboard';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-bg-dark text-white font-sans selection:bg-primary-500 selection:text-white">
        {/* Background Ambient Glows */}
        <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
        
        <main className="relative z-10 w-full max-w-5xl mx-auto px-4 py-8 min-h-screen flex flex-col items-center justify-center">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/matchmaking" element={<Matchmaking />} />
            <Route path="/study" element={<StudyRoom />} />
            <Route path="/battle" element={<QuizBattle />} />
            <Route path="/result" element={<Result />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
