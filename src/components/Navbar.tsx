import React from 'react';
import { Terminal, Shield, Award, Clock, Cpu, FileCode, Lock, AlertTriangle, Play, XSquare, GraduationCap } from 'lucide-react';
import { Difficulty, LanguageTrack } from '../types';

interface NavbarProps {
  participantName?: string;
  difficulty?: Difficulty;
  languageTrack?: LanguageTrack;
  score?: number;
  timerSeconds?: number;
  isContestActive?: boolean;
  violationsCount?: number;
  onNavigateHome?: () => void;
  onOpenBashModal: () => void;
  onOpenAdminModal: () => void;
  onOpenTieBreaker?: () => void;
  onAbortContest?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  participantName,
  difficulty,
  languageTrack,
  score = 0,
  timerSeconds = 0,
  isContestActive = false,
  violationsCount = 0,
  onNavigateHome,
  onOpenBashModal,
  onOpenAdminModal,
  onOpenTieBreaker,
  onAbortContest
}) => {
  const formatTime = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyBadge = (diff?: Difficulty) => {
    switch (diff) {
      case 'master':
        return 'bg-[#a371f722] border-[#a371f7] text-[#bc8cff] font-black';
      case 'hard':
        return 'bg-[#f8514922] border-[#f85149] text-[#f85149]';
      case 'medium':
        return 'bg-[#d2992222] border-[#d29922] text-[#d29922]';
      default:
        return 'bg-[#23863622] border-[#238636] text-[#3fb950]';
    }
  };

  const getLanguageTrackBadge = (track?: LanguageTrack) => {
    switch (track) {
      case 'python':
        return 'bg-[#d2992218] border-[#d29922] text-[#d29922]';
      case 'cpp':
        return 'bg-[#58a6ff18] border-[#58a6ff] text-[#58a6ff]';
      case 'java':
        return 'bg-[#f8514918] border-[#f85149] text-[#f85149]';
      default:
        return 'bg-[#a371f718] border-[#a371f7] text-[#bc8cff]';
    }
  };

  return (
    <header id="app-navbar" className="bg-[#010409] border-b border-[#30363d] text-[#c9d1d9] sticky top-0 z-40 font-mono shadow-sm">
      <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand & Systems Status */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div 
            onClick={onNavigateHome}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
            title="Return to home landing page"
          >
            <div className="w-2.5 h-2.5 bg-[#238636] rounded-full shadow-[0_0_8px_#238636] animate-pulse"></div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-[#58a6ff]" />
                <span className="text-xs sm:text-sm font-bold tracking-wider text-[#f0f6fc]">
                  GTMC // DEBUG_ARENA
                </span>
              </div>
              <span className="text-[9px] text-[#8b949e] uppercase tracking-wider hidden sm:inline">
                GOVERNMENT THIRUMAGAL MILLS COLLEGE
              </span>
            </div>
          </div>

          {isContestActive && participantName && (
            <>
              <div className="h-8 w-[1px] bg-[#30363d] hidden sm:block"></div>
              <div className="hidden sm:flex flex-col">
                <span className="text-[10px] text-[#8b949e] uppercase tracking-wider">Candidate</span>
                <span className="text-xs text-[#58a6ff] font-bold max-w-[140px] truncate">
                  {participantName.toUpperCase().replace(/\s+/g, '_')}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Center: Live Telemetry Session HUD */}
        {isContestActive && (
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-[#8b949e] uppercase tracking-wider">Session Time</span>
              <span className="text-base sm:text-lg text-[#f85149] font-bold tabular-nums">
                {formatTime(timerSeconds)}
              </span>
            </div>

            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] text-[#8b949e] uppercase tracking-wider">Score</span>
              <span className="text-xs font-bold text-[#3fb950] tabular-nums">
                {score} PTS
              </span>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[10px] text-[#8b949e] uppercase tracking-wider">Track</span>
              <span className={`text-[10px] sm:text-xs px-2 py-0.5 border font-bold uppercase ${getLanguageTrackBadge(languageTrack)}`}>
                {languageTrack === 'all' ? 'POLYGLOT' : (languageTrack || 'PYTHON').toUpperCase()}
              </span>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[10px] text-[#8b949e] uppercase tracking-wider">Level</span>
              <span className={`text-[10px] sm:text-xs px-2 py-0.5 border font-bold uppercase ${getDifficultyBadge(difficulty)}`}>
                {difficulty || 'EASY'}
              </span>
            </div>

            {violationsCount > 0 && (
              <div className="flex flex-col items-end animate-pulse">
                <span className="text-[10px] text-[#f85149] uppercase tracking-wider">Security</span>
                <span className="text-[10px] sm:text-xs px-1.5 py-0.5 bg-[#f8514922] border border-[#f85149] text-[#f85149] font-bold">
                  {violationsCount} FLAG{violationsCount > 1 ? 'S' : ''}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Right Navigation & Operational Tools */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onOpenTieBreaker && (
            <button
              id="view-tie-breaker-btn"
              onClick={onOpenTieBreaker}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#a371f722] hover:bg-[#a371f733] text-[#bc8cff] border border-[#a371f7] font-bold transition-colors cursor-pointer"
              title="Championship Tie-Breaker & Winners Resolution Arena"
            >
              <Award className="h-3.5 w-3.5 text-[#e3b341]" />
              <span className="hidden sm:inline">TIE-BREAKER</span>
              <span className="sm:hidden">TIE</span>
            </button>
          )}

          <button
            id="view-bash-script-btn"
            onClick={onOpenBashModal}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#161b22] hover:bg-[#21262d] text-[#c9d1d9] border border-[#30363d] hover:border-[#58a6ff] transition-colors"
            title="Inspect standalone bash orchestrator"
          >
            <FileCode className="h-3.5 w-3.5 text-[#3fb950]" />
            <span className="hidden sm:inline">debug_contest.sh</span>
            <span className="sm:hidden">.sh</span>
          </button>

          <button
            id="admin-console-btn"
            onClick={onOpenAdminModal}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#161b22] hover:bg-[#21262d] text-[#c9d1d9] hover:text-[#58a6ff] border border-[#30363d] hover:border-[#58a6ff] transition-colors"
            title="Admin dashboard & diagnostics"
          >
            <Lock className="h-3.5 w-3.5 text-[#58a6ff]" />
            <span className="hidden sm:inline">ADMIN</span>
          </button>

          {isContestActive && (
            <button
              id="abort-contest-btn"
              onClick={onAbortContest}
              className="text-xs px-3 py-1.5 border border-[#f85149] text-[#f85149] hover:bg-[#f8514911] transition-colors"
              title="Terminate session and generate final audit"
            >
              TERMINATE
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

