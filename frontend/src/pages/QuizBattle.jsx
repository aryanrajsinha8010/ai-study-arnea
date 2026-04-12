import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function QuizBattle() {
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(10);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    const data = JSON.parse(sessionStorage.getItem('roomData') || 'null');
    if (!data) {
      navigate('/');
      return;
    }
    setRoomData(data);

    // Fetch AI questions
    fetch('http://localhost:3001/api/quiz/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        topic: data.topic,
        chatHistory: JSON.parse(sessionStorage.getItem('chatHistory') || '[]')
      })
    })
    .then(res => res.json())
    .then(data => {
      setQuestions(data);
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      // In a real app we might handle network errors differently.
      // But the backend falls back automatically if OpenAI fails.
    });
  }, [navigate]);

  useEffect(() => {
    if (loading || showAnswer || currentIdx >= questions.length) return;

    if (timeLeft <= 0) {
      handleAnswer(null); // Time's up
      return;
    }

    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, loading, showAnswer, currentIdx, questions]);

  const handleAnswer = (option) => {
    setSelectedOption(option);
    setShowAnswer(true);

    const isCorrect = option === questions[currentIdx].correctAnswer;
    if (isCorrect) setScore(s => s + Math.max(10, timeLeft * 10)); // Reward quick answers

    setTimeout(() => {
      if (currentIdx + 1 < questions.length) {
        setCurrentIdx(i => i + 1);
        setSelectedOption(null);
        setShowAnswer(false);
        setTimeLeft(10);
      } else {
        // End of quiz
        const finalScore = isCorrect ? score + Math.max(10, timeLeft * 10) : score;
        sessionStorage.setItem('finalScore', finalScore);
        navigate('/result');
      }
    }, 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center animate-slide-up h-[60vh]">
        <BrainCircuit size={64} strokeWidth={1} className="text-primary animate-pulse mb-8 opacity-80" />
        <h2 className="font-serif text-3xl font-bold text-on-surface mb-4">Consulting the Grand Archives...</h2>
        <p className="font-body text-on-surface-variant text-lg italic flex items-center gap-3">
          Synthesizing trial bounds from deliberation <Loader2 size={18} className="animate-spin text-primary" />
        </p>
      </div>
    );
  }

  const question = questions[currentIdx];

  return (
    <div className="w-full max-w-3xl glass-panel border border-outline-variant/30 p-10 animate-slide-up scholar-shadow relative">
      {/* Decorative Top Border */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary-container to-transparent opacity-40"></div>

      {/* Header */}
      <div className="flex justify-between items-end mb-10 pb-6 border-b border-outline-variant/30">
        <div>
          <div className="font-sans text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
            Trial Progress
          </div>
          <div className="font-serif font-bold text-on-surface tracking-wide">
            TEST {currentIdx + 1} OF {questions.length}
          </div>
        </div>
        <div className="text-right">
          <div className="font-sans text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
            Accumulated Prestige
          </div>
          <div className="font-serif text-3xl font-bold text-primary tracking-wider">{score}</div>
        </div>
      </div>

      {/* Progress & Timer (Scholar's Scroll) */}
      <div className="relative w-full h-1 bg-surface-container-highest mb-12 shadow-inner">
        <div 
          className="absolute inset-y-0 left-0 bg-primary transition-all duration-1000 ease-linear shadow-[0_0_8px_#d4af37]"
          style={{ width: `${(timeLeft / 10) * 100}%` }}
        />
      </div>

      {/* Question */}
      <h2 className="font-serif text-3xl font-medium mb-12 leading-relaxed text-on-surface tracking-[-0.01em]">
        {question.question}
      </h2>

      {/* Options */}
      <div className="space-y-4">
        {question.options.map((opt, i) => {
          let stateClass = "bg-surface-container-low border-outline-variant/30 hover:bg-surface-container-high hover:border-primary/50 text-on-surface";
          let Icon = null;

          if (showAnswer) {
            const isCorrect = opt === question.correctAnswer;
            const isSelected = opt === selectedOption;

            if (isCorrect) {
              stateClass = "bg-primary/10 border-primary text-primary-fixed shadow-[0_0_15px_rgba(212,175,55,0.1)]";
              Icon = CheckCircle2;
            } else if (isSelected && !isCorrect) {
              stateClass = "bg-error-container/10 border-error-container text-on-error-container opacity-90";
              Icon = XCircle;
            } else {
              stateClass = "opacity-40 border-outline-variant/20 bg-surface-container";
            }
          }

          return (
            <button
              key={i}
              disabled={showAnswer}
              onClick={() => handleAnswer(opt)}
              className={`w-full text-left p-5 rounded-sm border transition-all duration-300 flex justify-between items-center active:scale-[0.99] font-body text-lg ${stateClass}`}
            >
              <span>{opt}</span>
              {Icon && <Icon size={22} className={opt === question.correctAnswer ? "text-primary" : "text-error-container"} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
