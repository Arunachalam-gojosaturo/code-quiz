import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Shield, 
  Terminal, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  Check, 
  Send, 
  Sparkles,
  GraduationCap,
  Quote,
  RefreshCw,
  Code2,
  Cpu,
  Layers,
  History,
  Trophy,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Difficulty, LanguageTrack, SystemStatus, MotivationalQuote } from '../types';
import { MOTIVATIONAL_QUOTES, getRandomQuote } from '../data/quotes';

interface StartScreenProps {
  onStart: (name: string, difficulty: Difficulty, languageTrack: LanguageTrack) => void;
  systemStatus: SystemStatus | null;
  onOpenBashModal: () => void;
  onOpenTieBreaker?: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onStart,
  systemStatus,
  onOpenBashModal,
  onOpenTieBreaker
}) => {
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [languageTrack, setLanguageTrack] = useState<LanguageTrack>('python');
  const [error, setError] = useState('');
  const [currentQuote, setCurrentQuote] = useState<MotivationalQuote>(getRandomQuote);

  // User History State
  const [userHistory, setUserHistory] = useState<any | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const cycleQuote = () => {
    let next = getRandomQuote();
    while (next.id === currentQuote.id && MOTIVATIONAL_QUOTES.length > 1) {
      next = getRandomQuote();
    }
    setCurrentQuote(next);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      cycleQuote();
    }, 12000);
    return () => clearInterval(timer);
  }, [currentQuote.id]);

  // Debounced fetch for user past records
  useEffect(() => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setUserHistory(null);
      return;
    }

    const handler = setTimeout(async () => {
      setIsLoadingHistory(true);
      try {
        const res = await fetch(`/api/user-history/${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.exists) {
            setUserHistory(data.record);
          } else {
            setUserHistory(null);
          }
        }
      } catch (err) {
        console.warn('Could not fetch user history:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [name]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('ERROR: Participant identifier cannot be empty.');
      return;
    }
    setError('');
    onStart(trimmed, difficulty, languageTrack);
  };

  return (
    <div id="start-screen-container" className="max-w-5xl mx-auto px-4 py-8 sm:py-10 space-y-6 font-mono">
      {/* College & Department Institutional Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-[#161b22] border border-[#30363d] p-6 sm:p-7 text-center space-y-3 relative overflow-hidden"
      >
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#010409] border border-[#30363d] text-[#58a6ff] text-xs">
            <GraduationCap className="h-4 w-4 text-[#58a6ff]" />
            <span className="font-bold">GOVERNMENT THIRUMAGAL MILLS COLLEGE</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#010409] border border-[#238636] text-[#3fb950] text-xs">
            <Terminal className="h-3.5 w-3.5" />
            <span>DEPARTMENT OF COMPUTER SCIENCE</span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#f0f6fc]">
          CODE DEBUGGING CHAMPIONSHIP ARENA
        </h1>
        <p className="text-[#8b949e] max-w-2xl mx-auto text-xs sm:text-sm leading-relaxed">
          High-performance diagnostic evaluation sandbox with multi-round marks accumulation and administrative leaderboards. Choose your language track (<strong className="text-[#d29922]">Python 3</strong>, <strong className="text-[#58a6ff]">C++ 17</strong>, <strong className="text-[#f85149]">Java 17</strong>) or test all in <strong className="text-[#bc8cff]">Polyglot Track</strong>.
        </p>
      </motion.div>

      {/* Motivational Quote Live Rotator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="bg-[#010409] border border-[#30363d] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
      >
        <div className="flex items-start gap-3">
          <Quote className="h-5 w-5 text-[#d29922] shrink-0 mt-0.5" />
          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuote.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
              >
                <p className="text-[#c9d1d9] italic">"{currentQuote.quote}"</p>
                <span className="text-[10px] text-[#8b949e] font-bold mt-0.5 inline-block">
                  — {currentQuote.author} <span className="text-[#484f58]">({currentQuote.role})</span>
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <button
          type="button"
          onClick={cycleQuote}
          className="self-end sm:self-center shrink-0 flex items-center gap-1 text-[10px] text-[#8b949e] hover:text-[#58a6ff] border border-[#30363d] px-2 py-1 bg-[#161b22] hover:bg-[#21262d] transition-colors cursor-pointer"
          title="Inspire me with another quote"
        >
          <RefreshCw className="h-3 w-3" />
          <span>INSPIRATION</span>
        </button>
      </motion.div>

      {/* Main Registration & Configuration Form */}
      <form onSubmit={handleSubmit} className="bg-[#161b22] border border-[#30363d] p-6 sm:p-8 space-y-7 shadow-lg">
        {/* Step 1: Candidate Identification with Past Rounds History Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="participant-name-input" className="text-xs font-bold uppercase tracking-wider text-[#f0f6fc]">
              [01] PARTICIPANT / STUDENT IDENTIFIER <span className="text-[#f85149]">*</span>
            </label>
            <span className="text-[10px] text-[#8b949e]">PERMANENT PROFILE TRACKING</span>
          </div>
          <div className="relative">
            <input
              id="participant-name-input"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. GTMC_STUDENT_KUMAR or ALEX_DEVELOPER"
              className="w-full bg-[#010409] border border-[#30363d] focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] px-4 py-3 text-[#f0f6fc] placeholder-[#484f58] text-sm font-mono outline-none transition-colors"
              autoFocus
            />
          </div>

          {/* Existing User Past History Card */}
          {userHistory && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 bg-[#010409] border border-[#58a6ff]/40 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#58a6ff] flex items-center gap-1.5">
                  <History className="h-4 w-4" />
                  <span>WELCOME BACK, {userHistory.username}! (ROUND #{userHistory.roundsCount + 1})</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-[#238636]/20 text-[#3fb950] border border-[#238636]">
                  RETURNING CONTESTANT
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="bg-[#161b22] p-2 border border-[#30363d]">
                  <span className="text-[#8b949e] block text-[9px] uppercase">Past Cumulative Marks:</span>
                  <span className="text-[#3fb950] font-bold">{userHistory.cumulativeMarks} Marks</span>
                </div>
                <div className="bg-[#161b22] p-2 border border-[#30363d]">
                  <span className="text-[#8b949e] block text-[9px] uppercase">Rounds Completed:</span>
                  <span className="text-[#f0f6fc] font-bold">{userHistory.roundsCount} Rounds</span>
                </div>
                <div className="bg-[#161b22] p-2 border border-[#30363d]">
                  <span className="text-[#8b949e] block text-[9px] uppercase">Best Round Accuracy:</span>
                  <span className="text-[#58a6ff] font-bold">{userHistory.bestRoundPercentage}%</span>
                </div>
              </div>
              <p className="text-[10px] text-[#8b949e]">
                * Your marks in this session will accumulate into your overall championship leaderboard standing.
              </p>
            </motion.div>
          )}

          {error && (
            <p className="text-[#f85149] text-xs flex items-center gap-1.5 animate-fadeIn">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </p>
          )}
        </div>

        {/* Step 2: Language Track Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[#f0f6fc]">
              [02] SELECT PROGRAMMING LANGUAGE TRACK
            </label>
            <span className="text-[10px] text-[#3fb950] font-bold">PURE SINGLE-LANGUAGE OR MIXED</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Python Track */}
            <div
              id="track-python-btn"
              onClick={() => setLanguageTrack('python')}
              className={`cursor-pointer p-4 border transition-all relative ${
                languageTrack === 'python'
                  ? 'bg-[#d2992218] border-[#d29922] ring-1 ring-[#d29922]'
                  : 'bg-[#010409] border-[#30363d] hover:border-[#d29922]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-[#d29922] font-mono">PYTHON 3</span>
                {languageTrack === 'python' && <Check className="h-4 w-4 text-[#d29922]" />}
              </div>
              <div className="text-[10px] uppercase font-bold text-[#8b949e] tracking-wider mb-2">
                100% PURE PYTHON
              </div>
              <p className="text-[11px] text-[#8b949e] leading-snug">
                Slicing, closures, mutable defaults, dictionaries, generator iterators, and asyncio.
              </p>
            </div>

            {/* C++ Track */}
            <div
              id="track-cpp-btn"
              onClick={() => setLanguageTrack('cpp')}
              className={`cursor-pointer p-4 border transition-all relative ${
                languageTrack === 'cpp'
                  ? 'bg-[#58a6ff18] border-[#58a6ff] ring-1 ring-[#58a6ff]'
                  : 'bg-[#010409] border-[#30363d] hover:border-[#58a6ff]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-[#58a6ff] font-mono">C++ 17 (G++)</span>
                {languageTrack === 'cpp' && <Check className="h-4 w-4 text-[#58a6ff]" />}
              </div>
              <div className="text-[10px] uppercase font-bold text-[#8b949e] tracking-wider mb-2">
                100% PURE C++
              </div>
              <p className="text-[11px] text-[#8b949e] leading-snug">
                Pointers, references, memory leaks, iterator invalidation, virtual destructors, and lock-free CAS.
              </p>
            </div>

            {/* Java Track */}
            <div
              id="track-java-btn"
              onClick={() => setLanguageTrack('java')}
              className={`cursor-pointer p-4 border transition-all relative ${
                languageTrack === 'java'
                  ? 'bg-[#f8514918] border-[#f85149] ring-1 ring-[#f85149]'
                  : 'bg-[#010409] border-[#30363d] hover:border-[#f85149]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-[#f85149] font-mono">JAVA 17 (JAVAC)</span>
                {languageTrack === 'java' && <Check className="h-4 w-4 text-[#f85149]" />}
              </div>
              <div className="text-[10px] uppercase font-bold text-[#8b949e] tracking-wider mb-2">
                100% PURE JAVA
              </div>
              <p className="text-[11px] text-[#8b949e] leading-snug">
                .equals() vs ==, integer truncation, ConcurrentModificationException, autoboxing, volatile locks.
              </p>
            </div>

            {/* Polyglot / Mixed Track */}
            <div
              id="track-all-btn"
              onClick={() => setLanguageTrack('all')}
              className={`cursor-pointer p-4 border transition-all relative ${
                languageTrack === 'all'
                  ? 'bg-[#a371f718] border-[#a371f7] ring-1 ring-[#a371f7]'
                  : 'bg-[#010409] border-[#30363d] hover:border-[#a371f7]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-[#bc8cff] font-mono">POLYGLOT MIXED</span>
                {languageTrack === 'all' && <Check className="h-4 w-4 text-[#bc8cff]" />}
              </div>
              <div className="text-[10px] uppercase font-bold text-[#8b949e] tracking-wider mb-2">
                EQUAL 3-WAY SPREAD
              </div>
              <p className="text-[11px] text-[#8b949e] leading-snug">
                Evenly distributed questions from Python, C++, and Java in balanced succession.
              </p>
            </div>
          </div>
        </div>

        {/* Step 3: Difficulty Selection (Updated: Easy 10 Qs / 10 marks = 100/100, Intermediate 5 Qs / 20 marks = 100/100, Hard step-by-step scoring) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[#f0f6fc]">
              [03] SELECT DIFFICULTY LEVEL & MARKS WEIGHTAGE
            </label>
            <span className="text-[10px] text-[#8b949e]">MAX 100 MARKS BENCHMARK</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Easy Option: 10 questions, 10 marks each = 100/100 */}
            <div
              id="difficulty-easy-card"
              onClick={() => setDifficulty('easy')}
              className={`cursor-pointer p-4 border transition-all relative ${
                difficulty === 'easy'
                  ? 'bg-[#23863615] border-[#238636] ring-1 ring-[#238636]'
                  : 'bg-[#010409] border-[#30363d] hover:border-[#58a6ff]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#23863622] text-[#3fb950] border border-[#238636]">
                  LEVEL: EASY
                </span>
                <span className="text-xs font-bold text-[#3fb950]">100 / 100 MARKS</span>
              </div>
              <h3 className="text-sm font-bold text-[#f0f6fc] mb-1">10 Simple Questions</h3>
              <p className="text-[11px] text-[#8b949e] leading-relaxed mb-3">
                10 basic questions, 10 marks each (10 × 10 = 100 marks). Off-by-one loops, string slicing, and variable scope.
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-[#3fb950] font-bold">
                <Check className="h-3.5 w-3.5" />
                <span>10 Questions • 10 Marks Each</span>
              </div>
            </div>

            {/* Intermediate Option: 5 questions, 20 marks each = 100/100 */}
            <div
              id="difficulty-intermediate-card"
              onClick={() => setDifficulty('intermediate')}
              className={`cursor-pointer p-4 border transition-all relative ${
                difficulty === 'intermediate' || difficulty === 'medium'
                  ? 'bg-[#d2992215] border-[#d29922] ring-1 ring-[#d29922]'
                  : 'bg-[#010409] border-[#30363d] hover:border-[#58a6ff]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#d2992222] text-[#d29922] border border-[#d29922]">
                  LEVEL: INTERMEDIATE
                </span>
                <span className="text-xs font-bold text-[#d29922]">100 / 100 MARKS</span>
              </div>
              <h3 className="text-sm font-bold text-[#f0f6fc] mb-1">5 Intermediate Problems</h3>
              <p className="text-[11px] text-[#8b949e] leading-relaxed mb-3">
                5 moderately hard questions, 20 marks each (5 × 20 = 100 marks). Iterator safety, virtual destructors, and memory management.
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-[#d29922] font-bold">
                <Check className="h-3.5 w-3.5" />
                <span>5 Questions • 20 Marks Each (5X20)</span>
              </div>
            </div>

            {/* Hard Option: Step-by-Step Rubric Scoring */}
            <div
              id="difficulty-hard-card"
              onClick={() => setDifficulty('hard')}
              className={`cursor-pointer p-4 border transition-all relative ${
                difficulty === 'hard'
                  ? 'bg-[#f8514915] border-[#f85149] ring-1 ring-[#f85149]'
                  : 'bg-[#010409] border-[#30363d] hover:border-[#58a6ff]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#f8514922] text-[#f85149] border border-[#f85149]">
                  LEVEL: HARD
                </span>
                <span className="text-xs font-bold text-[#f85149]">STEP SCORING</span>
              </div>
              <h3 className="text-sm font-bold text-[#f0f6fc] mb-1">Advanced Step Rubric</h3>
              <p className="text-[11px] text-[#8b949e] leading-relaxed mb-3">
                Evaluates every correct step and key word. Granular marks computed for each diagnostic phase.
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-[#f85149] font-bold">
                <Zap className="h-3.5 w-3.5" />
                <span>Calculates Every Mark & Step</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Competition Rules Briefing */}
        <div className="bg-[#010409] border border-[#30363d] p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-[#58a6ff]">
            <Shield className="h-4 w-4 text-[#3fb950]" />
            <span className="tracking-wider uppercase">GOVERNMENT THIRUMAGAL MILLS COLLEGE ANTI-CHEAT ENGINE</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#8b949e]">
            <div className="flex items-center gap-2">
              <span className="text-[#58a6ff]">▸</span>
              <span>Copying (<code className="text-[#c9d1d9]">Ctrl+C</code>) strictly blocked</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#58a6ff]">▸</span>
              <span>Window defocus / Tab switches flagged</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#58a6ff]">▸</span>
              <span>Real-time Telegram proctor notifications</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#58a6ff]">▸</span>
              <span>Multi-round marks stored permanently in database</span>
            </div>
          </div>
        </div>

        {/* Submit & Start Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-[#30363d]">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onOpenBashModal}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-[#010409] hover:bg-[#21262d] text-[#c9d1d9] border border-[#30363d] text-xs font-bold uppercase transition-colors cursor-pointer"
            >
              <Terminal className="h-4 w-4 text-[#3fb950]" />
              <span>TERMINAL SCRIPT</span>
            </button>

            {onOpenTieBreaker && (
              <button
                type="button"
                onClick={onOpenTieBreaker}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-[#010409] hover:bg-[#21262d] text-[#bc8cff] border border-[#a371f7] text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                <Sparkles className="h-4 w-4 text-[#bc8cff]" />
                <span>TIE-BREAKER</span>
              </button>
            )}
          </div>

          <button
            id="start-exam-submit-btn"
            type="submit"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-[#238636] hover:bg-[#2ea043] text-white font-bold text-xs sm:text-sm uppercase tracking-wider border border-[#2ea043] transition-all transform active:scale-95 shadow-md cursor-pointer"
          >
            <Play className="h-4 w-4 fill-white" />
            <span>START COMPETITION ROUND</span>
          </button>
        </div>
      </form>
    </div>
  );
};
