import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Trophy, 
  ShieldCheck, 
  Zap, 
  Lightbulb, 
  Terminal, 
  Code2, 
  GraduationCap, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  Award, 
  Clock, 
  Cpu, 
  Lock, 
  FileCode,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { motion } from 'motion/react';
import { SystemStatus } from '../types';
import heroImage from '../assets/images/arena_landing_hero_1787665556274.jpg';
import trophyCrest from '../assets/images/gtmc_trophy_crest_1787663825059.jpg';

interface LandingPageProps {
  onEnterArena: () => void;
  onNavigateToAdmin: () => void;
  onOpenTieBreaker: () => void;
  onOpenBashModal: () => void;
  systemStatus: SystemStatus | null;
}

interface LeaderboardPreviewItem {
  rank: number;
  username: string;
  cumulativeMarks: number;
  totalRounds: number;
  bestScorePercentage: number;
  totalQuestionsSolved: number;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterArena,
  onNavigateToAdmin,
  onOpenTieBreaker,
  onOpenBashModal,
  systemStatus
}) => {
  const [topUsers, setTopUsers] = useState<LeaderboardPreviewItem[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.leaderboard)) {
          setTopUsers(data.leaderboard.slice(0, 3));
        }
      })
      .catch(err => console.warn('Could not fetch leaderboard preview:', err))
      .finally(() => setLoadingLeaderboard(false));
  }, []);

  return (
    <div id="landing-page-root" className="min-h-screen bg-[#0d1117] text-[#c9d1d9] font-mono selection:bg-[#1f6feb44] selection:text-[#58a6ff]">
      {/* College Institutional Bar */}
      <div className="bg-[#010409] border-b border-[#30363d] py-2 px-4 sm:px-8 text-xs flex flex-wrap items-center justify-between gap-3 text-[#8b949e]">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-[#58a6ff]" />
          <span className="font-bold text-[#f0f6fc]">GOVERNMENT THIRUMAGAL MILLS COLLEGE</span>
          <span className="hidden md:inline text-[#30363d]">•</span>
          <span className="hidden md:inline text-[#8b949e]">DEPARTMENT OF COMPUTER SCIENCE</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5 text-[#3fb950]">
            <span className="w-2 h-2 rounded-full bg-[#238636] animate-pulse"></span>
            <span>SYSTEM ENGINES ACTIVE</span>
          </span>
          <span className="text-[#30363d]">|</span>
          <button 
            onClick={onNavigateToAdmin}
            className="hover:text-[#58a6ff] text-[#8b949e] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Lock className="h-3 w-3" />
            <span>ADMIN CONSOLE</span>
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-[#30363d] bg-gradient-to-b from-[#161b22] to-[#0d1117] px-4 sm:px-8 py-10 lg:py-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Headlines & Action CTAs */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-7 space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#010409] border border-[#238636] text-[#3fb950] text-xs font-bold uppercase tracking-wider rounded-sm">
              <Terminal className="h-3.5 w-3.5" />
              <span>ANNUAL INTER-COLLEGIATE DEBUGGING CHAMPIONSHIP</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-[#f0f6fc] tracking-tight leading-tight">
              CODE DEBUGGING <br />
              <span className="text-[#58a6ff]">COMPETITION ARENA</span>
            </h1>

            <p className="text-sm sm:text-base text-[#8b949e] leading-relaxed max-w-2xl">
              An institutional-grade code troubleshooting tournament with high-precision evaluation. Diagnose, debug, and resolve algorithmic defects across <span className="text-[#d29922] font-bold">Python 3</span>, <span className="text-[#58a6ff] font-bold">C++ 17</span>, and <span className="text-[#f85149] font-bold">Java 17</span> with hint-based scoring and persistent multi-round rankings.
            </p>

            {/* Quick Feature Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-[#010409] border border-[#30363d] p-3 text-xs space-y-1">
                <div className="text-[10px] text-[#8b949e] uppercase font-bold">EASY ROUND</div>
                <div className="text-sm font-bold text-[#3fb950]">10 Qs × 10 = 100 PTS</div>
                <div className="text-[10px] text-[#484f58]">Beginner Syntax & Logic</div>
              </div>
              <div className="bg-[#010409] border border-[#30363d] p-3 text-xs space-y-1">
                <div className="text-[10px] text-[#8b949e] uppercase font-bold">INTERMEDIATE</div>
                <div className="text-sm font-bold text-[#d29922]">5 Qs × 20 = 100 PTS</div>
                <div className="text-[10px] text-[#484f58]">Algorithmic Boundaries</div>
              </div>
              <div className="bg-[#010409] border border-[#30363d] p-3 text-xs space-y-1 col-span-2 sm:col-span-1">
                <div className="text-[10px] text-[#8b949e] uppercase font-bold">HARD LEVEL</div>
                <div className="text-sm font-bold text-[#bc8cff]">STEP RUBRIC MARKS</div>
                <div className="text-[10px] text-[#484f58]">Concurrency & Pointers</div>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-4">
              <button
                id="enter-arena-btn"
                onClick={onEnterArena}
                className="flex items-center gap-2.5 px-6 py-3.5 bg-[#238636] hover:bg-[#2ea043] text-white font-bold text-sm uppercase tracking-wider border border-[#2ea043] transition-all transform hover:-translate-y-0.5 shadow-lg shadow-[#238636]/20 cursor-pointer"
              >
                <Play className="h-4 w-4 fill-white" />
                <span>ENTER CONTEST ARENA</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                id="landing-leaderboard-btn"
                onClick={onNavigateToAdmin}
                className="flex items-center gap-2 px-5 py-3.5 bg-[#161b22] hover:bg-[#21262d] text-[#f0f6fc] border border-[#30363d] hover:border-[#58a6ff] font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                <Trophy className="h-4 w-4 text-amber-400" />
                <span>CHAMPIONSHIP LEADERBOARD</span>
              </button>

              <button
                onClick={onOpenBashModal}
                className="flex items-center gap-1.5 px-4 py-3.5 bg-[#010409] hover:bg-[#161b22] text-[#8b949e] hover:text-[#3fb950] border border-[#30363d] text-xs font-bold uppercase transition-colors"
                title="Inspect bash terminal runner script"
              >
                <FileCode className="h-3.5 w-3.5 text-[#3fb950]" />
                <span>.SH ORCHESTRATOR</span>
              </button>
            </div>
          </motion.div>

          {/* Right Column: Hero Visual Artwork */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-5 relative"
          >
            <div className="relative border-2 border-[#30363d] bg-[#010409] shadow-2xl overflow-hidden group">
              {/* Terminal Frame Header */}
              <div className="bg-[#161b22] px-4 py-2 border-b border-[#30363d] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div>
                  <span className="text-[11px] text-[#8b949e] font-mono ml-2">arena_championship_live.log</span>
                </div>
                <span className="text-[10px] text-[#3fb950] font-bold uppercase">PROCTOR_ACTIVE</span>
              </div>

              {/* Generated Hero Image */}
              <div className="relative aspect-video w-full overflow-hidden bg-black">
                <img 
                  src={heroImage} 
                  alt="Code Debugging Championship Arena" 
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#010409] via-transparent to-transparent opacity-80"></div>
                
                {/* Floating Academic Badge Overlay */}
                <div className="absolute bottom-3 left-3 right-3 p-3 bg-[#161b22]/90 backdrop-blur-md border border-[#30363d] flex items-center gap-3">
                  <img 
                    src={trophyCrest} 
                    alt="GTMC Trophy Crest" 
                    className="w-10 h-10 object-contain shrink-0 border border-[#58a6ff]/40 bg-[#010409] p-0.5"
                  />
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-[#f0f6fc] truncate">GTMC CODE TROPHY</div>
                    <div className="text-[10px] text-[#58a6ff]">Multi-Round Score Preservation</div>
                  </div>
                </div>
              </div>

              {/* Status Bar */}
              <div className="p-3 bg-[#010409] text-[11px] flex items-center justify-between text-[#8b949e]">
                <span>SANCTIONED BY: <strong className="text-[#f0f6fc]">GTMC CSE DEPT</strong></span>
                <span className="text-[#3fb950] font-bold">2026 EDITION</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Rules & Marks System Structure Section */}
      <section className="px-4 sm:px-8 py-12 max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs text-[#58a6ff] uppercase font-bold tracking-wider">
            <BookOpen className="h-3.5 w-3.5" />
            <span>OFFICIAL COMPETITION STRUCTURE & MARKING SYSTEM</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#f0f6fc]">
            HOW THE CHAMPIONSHIP EVALUATION WORKS
          </h2>
          <p className="text-xs sm:text-sm text-[#8b949e] max-w-2xl mx-auto">
            Every candidate is graded objectively using exact step matching, hint-based multipliers, and multi-round cumulative mark tracking.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Easy Difficulty */}
          <div className="bg-[#161b22] border border-[#30363d] hover:border-[#3fb950] transition-colors p-6 space-y-4 relative">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 text-xs font-bold uppercase bg-[#23863622] text-[#3fb950] border border-[#238636]">
                EASY TRACK
              </span>
              <span className="text-xs text-[#8b949e]">10 QUESTIONS</span>
            </div>
            <h3 className="text-lg font-bold text-[#f0f6fc]">100 / 100 Marks (10 × 10)</h3>
            <p className="text-xs text-[#8b949e] leading-relaxed">
              Designed for foundational problem solving. Each question presents a single crisp bug (e.g. range bounds, slice steps, accumulator resets, string casting) carrying exactly <strong className="text-[#3fb950]">10 Marks</strong>.
            </p>
            <div className="pt-2 text-xs text-[#c9d1d9] space-y-1.5 border-t border-[#30363d]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#3fb950]" />
                <span>1-Line Precise Syntax & Logic Fixes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#3fb950]" />
                <span>Zero Frustration Normalized Formatting</span>
              </div>
            </div>
          </div>

          {/* Card 2: Intermediate Difficulty */}
          <div className="bg-[#161b22] border border-[#30363d] hover:border-[#d29922] transition-colors p-6 space-y-4 relative">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 text-xs font-bold uppercase bg-[#d2992222] text-[#d29922] border border-[#d29922]">
                INTERMEDIATE TRACK
              </span>
              <span className="text-xs text-[#8b949e]">5 QUESTIONS</span>
            </div>
            <h3 className="text-lg font-bold text-[#f0f6fc]">100 / 100 Marks (5 × 20)</h3>
            <p className="text-xs text-[#8b949e] leading-relaxed">
              Medium-tier algorithmic questions. Candidates repair moderately complex edge cases, string manipulations, and data structures. Each question carries exactly <strong className="text-[#d29922]">20 Marks</strong>.
            </p>
            <div className="pt-2 text-xs text-[#c9d1d9] space-y-1.5 border-t border-[#30363d]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#d29922]" />
                <span>Memory, Range & State Validations</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#d29922]" />
                <span>5 Problems for Maximum Focus</span>
              </div>
            </div>
          </div>

          {/* Card 3: Hard Level & Step Rubric */}
          <div className="bg-[#161b22] border border-[#30363d] hover:border-[#bc8cff] transition-colors p-6 space-y-4 relative">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 text-xs font-bold uppercase bg-[#bc8cff22] text-[#bc8cff] border border-[#bc8cff]">
                HARD TRACK
              </span>
              <span className="text-xs text-[#8b949e]">STEP RUBRICS</span>
            </div>
            <h3 className="text-lg font-bold text-[#f0f6fc]">Word & Step Marks (100 Max)</h3>
            <p className="text-xs text-[#8b949e] leading-relaxed">
              In Hard mode, every correct step, token, and logic keyword is counted. Partial credit is awarded for identifying race conditions, ABA tags, or pointer lifetimes.
            </p>
            <div className="pt-2 text-xs text-[#c9d1d9] space-y-1.5 border-t border-[#30363d]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#bc8cff]" />
                <span>Detailed Granular Step Breakdown</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#bc8cff]" />
                <span>Concurrency & System Level Repairs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hint System & Multi-Round Rules Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div className="bg-[#010409] border border-[#30363d] p-6 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 text-sm font-bold uppercase">
              <Lightbulb className="h-4 w-4" />
              <span>DYNAMIC HINT-BASED SCORING</span>
            </div>
            <p className="text-xs text-[#8b949e] leading-relaxed">
              Earn maximum marks by diagnosing bugs independently without hints!
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs pt-2">
              <div className="bg-[#161b22] p-2.5 border border-[#30363d]">
                <div className="font-bold text-[#3fb950]">0 HINTS USED</div>
                <div className="text-[11px] text-[#8b949e]">100% Full Marks + Mastery Bonus</div>
              </div>
              <div className="bg-[#161b22] p-2.5 border border-[#30363d]">
                <div className="font-bold text-[#58a6ff]">1 HINT USED</div>
                <div className="text-[11px] text-[#8b949e]">80% Available Marks</div>
              </div>
              <div className="bg-[#161b22] p-2.5 border border-[#30363d]">
                <div className="font-bold text-[#d29922]">2 HINTS USED</div>
                <div className="text-[11px] text-[#8b949e]">60% Available Marks</div>
              </div>
              <div className="bg-[#161b22] p-2.5 border border-[#30363d]">
                <div className="font-bold text-[#f85149]">3+ HINTS USED</div>
                <div className="text-[11px] text-[#8b949e]">40% Available Marks</div>
              </div>
            </div>
          </div>

          <div className="bg-[#010409] border border-[#30363d] p-6 space-y-3">
            <div className="flex items-center gap-2 text-[#58a6ff] text-sm font-bold uppercase">
              <Users className="h-4 w-4" />
              <span>PERMANENT MULTI-ROUND PROFILE RETENTION</span>
            </div>
            <p className="text-xs text-[#8b949e] leading-relaxed">
              If a participant attends the exam for a 2nd round or subsequent attempts, their past round scores are preserved and aggregated in the global cumulative leaderboard!
            </p>
            <div className="p-3 bg-[#161b22] border border-[#30363d] text-xs space-y-1.5 text-[#c9d1d9]">
              <div className="flex items-center justify-between">
                <span>Total Cumulative Marks</span>
                <span className="text-[#3fb950] font-bold">Sum of all rounds</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Leaderboard Ranking</span>
                <span className="text-[#58a6ff] font-bold">Considers all past & current rounds</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Admin Audit Logs</span>
                <span className="text-[#bc8cff] font-bold">Every submission, answer & timestamp</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Leaderboard Podium Preview Section */}
      <section className="bg-[#161b22] border-y border-[#30363d] px-4 sm:px-8 py-12">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase">
                <Trophy className="h-4 w-4" />
                <span>CHAMPIONSHIP HALL OF FAME</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#f0f6fc]">
                TOP PARTICIPANTS & CUMULATIVE STANDINGS
              </h3>
            </div>
            <button
              onClick={onNavigateToAdmin}
              className="self-start sm:self-auto text-xs font-bold uppercase text-[#58a6ff] hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              <span>VIEW FULL LEADERBOARD</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {loadingLeaderboard ? (
            <div className="p-8 text-center text-xs text-[#8b949e] bg-[#010409] border border-[#30363d]">
              Syncing live tournament leaderboard records...
            </div>
          ) : topUsers.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8b949e] bg-[#010409] border border-[#30363d] space-y-2">
              <p>No contest rounds submitted yet.</p>
              <p className="text-[#58a6ff]">Be the first candidate to enter the Arena and claim the #1 Champion Rank!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topUsers.map((user, idx) => (
                <div 
                  key={user.username}
                  className={`bg-[#010409] border p-5 space-y-3 relative overflow-hidden ${
                    idx === 0 ? 'border-amber-500/60 shadow-lg shadow-amber-500/5' : 'border-[#30363d]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold px-2 py-0.5 border ${
                      idx === 0 ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' :
                      idx === 1 ? 'bg-slate-300/20 text-slate-300 border-slate-400/50' :
                      'bg-amber-700/20 text-amber-600 border-amber-700/50'
                    }`}>
                      {idx === 0 ? 'RANK #1 👑' : idx === 1 ? 'RANK #2 🥈' : 'RANK #3 🥉'}
                    </span>
                    <span className="text-[10px] text-[#8b949e] font-bold">
                      {user.totalRounds} ROUND{user.totalRounds > 1 ? 'S' : ''}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-[#f0f6fc] truncate">{user.username}</h4>
                    <p className="text-xs text-[#8b949e]">Solved {user.totalQuestionsSolved} Questions</p>
                  </div>

                  <div className="pt-2 border-t border-[#21262d] flex items-center justify-between text-xs">
                    <span className="text-[#8b949e]">Cumulative:</span>
                    <span className="font-bold text-[#3fb950] text-sm">{user.cumulativeMarks} MARKS</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="px-4 sm:px-8 py-12 max-w-5xl mx-auto text-center space-y-5">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-[#f0f6fc]">
          READY TO TEST YOUR CODE DEBUGGING SKILLS?
        </h3>
        <p className="text-xs sm:text-sm text-[#8b949e] max-w-xl mx-auto">
          Enter your name, pick your language track and difficulty level, and start solving against the clock with automated grading.
        </p>
        <div className="pt-2">
          <button
            onClick={onEnterArena}
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#238636] hover:bg-[#2ea043] text-white font-bold text-sm uppercase tracking-wider border border-[#2ea043] transition-all transform hover:-translate-y-0.5 shadow-xl shadow-[#238636]/30 cursor-pointer"
          >
            <Play className="h-4 w-4 fill-white" />
            <span>START YOUR CONTEST SESSION NOW</span>
          </button>
        </div>
      </section>
    </div>
  );
};
