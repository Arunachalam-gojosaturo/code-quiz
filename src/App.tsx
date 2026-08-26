import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { StartScreen } from './components/StartScreen';
import { ContestArena } from './components/ContestArena';
import { ReportView } from './components/ReportView';
import { AdminPanel } from './components/AdminPanel';
import { BashScriptViewer } from './components/BashScriptViewer';
import { SecurityWarningModal } from './components/SecurityWarningModal';
import { TieBreakerPage } from './components/TieBreakerPage';
import { 
  Difficulty, 
  Problem, 
  QuestionAttempt, 
  QuestionStatus, 
  ReportSummary, 
  SecurityViolation, 
  SystemStatus,
  Language,
  LanguageTrack,
  DetailedQuestionResult,
  AppView
} from './types';
import { getProblems } from './data/problems';
import { antiCheat } from './utils/antiCheat';

export default function App() {
  const [gameState, setGameState] = useState<AppView>('landing');
  const [participantName, setParticipantName] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [languageTrack, setLanguageTrack] = useState<LanguageTrack>('python');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attempts, setAttempts] = useState<Record<string, QuestionAttempt>>({});
  const [score, setScore] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [violationsCount, setViolationsCount] = useState(0);
  const [activeViolation, setActiveViolation] = useState<SecurityViolation | null>(null);

  // Modals
  const [isBashModalOpen, setIsBashModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Report
  const [finalReport, setFinalReport] = useState<ReportSummary | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

  const globalTimerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  // Initial status check
  useEffect(() => {
    fetch('/api/status')
      .then(res => res.json())
      .then(data => setSystemStatus(data))
      .catch(err => console.warn('Could not fetch status:', err));

    // Listen for anti-cheat security violations
    const unsub = antiCheat.onViolation((violation) => {
      setViolationsCount(c => c + 1);
      setActiveViolation(violation);
    });

    return () => {
      unsub();
      if (globalTimerRef.current) clearInterval(globalTimerRef.current);
    };
  }, []);

  // Handle Contest Start
  const handleStartContest = (name: string, diff: Difficulty, track: LanguageTrack) => {
    const selectedProblems = getProblems(diff, track);
    setParticipantName(name);
    setDifficulty(diff);
    setLanguageTrack(track);
    setProblems(selectedProblems);
    setCurrentIndex(0);
    setAttempts({});
    setScore(0);
    setTimerSeconds(0);
    setViolationsCount(0);
    setGameState('contest');

    fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantName: name,
        difficulty: diff,
        languageTrack: track
      })
    }).catch(err => console.warn('Could not send attendance alert:', err));

    startTimeRef.current = Date.now();

    // Start global contest timer
    if (globalTimerRef.current) clearInterval(globalTimerRef.current);
    globalTimerRef.current = setInterval(() => {
      setTimerSeconds(s => s + 1);
    }, 1000);

    // Initialize anti-cheat
    antiCheat.init(name);
  };

  // Handle Answer Submit with Hint Scoring Engine
  const handleAnswerSubmit = (
    problemId: string,
    status: QuestionStatus,
    answer: string,
    feedbackText: string,
    hintsUsed: number = 0
  ) => {
    const prev = attempts[problemId] || {
      problemId,
      status: 'pending',
      userAnswer: '',
      attemptsCount: 0,
      timeSpentSeconds: 0,
      hintsUsed: 0
    };

    const isEasy = difficulty === 'easy';
    const isIntermediate = difficulty === 'intermediate' || difficulty === 'medium';
    const baseMarks = isEasy ? 10 : isIntermediate ? 20 : 100;

    // Hint multiplier: 0 hints = 100%, 1 hint = 80%, 2 hints = 60%, 3+ hints = 40%
    const hintMultiplier = hintsUsed === 0 ? 1.0 : hintsUsed === 1 ? 0.8 : hintsUsed === 2 ? 0.6 : 0.4;
    const marksAwarded = status === 'correct' ? Math.round(baseMarks * hintMultiplier) : 0;

    const updatedAttempt: QuestionAttempt = {
      problemId,
      status,
      userAnswer: answer,
      attemptsCount: prev.attemptsCount + 1,
      timeSpentSeconds: prev.timeSpentSeconds,
      hintsUsed,
      marksEarned: marksAwarded,
      maxMarks: baseMarks,
      feedback: feedbackText,
      answeredAt: Date.now()
    };

    setAttempts(prevMap => ({
      ...prevMap,
      [problemId]: updatedAttempt
    }));

    if (status === 'correct') {
      setScore(s => s + marksAwarded);
      // Advance to next problem or finish
      setTimeout(() => {
        advanceToNextQuestion();
      }, 1000);
    }
  };

  // Handle Question Skip
  const handleSkipQuestion = (problemId: string) => {
    const prev = attempts[problemId] || {
      problemId,
      status: 'pending',
      userAnswer: '',
      attemptsCount: 0,
      timeSpentSeconds: 0,
      hintsUsed: 0
    };

    const isEasy = difficulty === 'easy';
    const isIntermediate = difficulty === 'intermediate' || difficulty === 'medium';
    const baseMarks = isEasy ? 10 : isIntermediate ? 20 : 100;

    const updatedAttempt: QuestionAttempt = {
      ...prev,
      problemId,
      status: 'skipped',
      userAnswer: '(Skipped by participant)',
      marksEarned: 0,
      maxMarks: baseMarks,
      answeredAt: Date.now()
    };

    setAttempts(prevMap => ({
      ...prevMap,
      [problemId]: updatedAttempt
    }));

    advanceToNextQuestion();
  };

  // Advance or Finish Contest
  const advanceToNextQuestion = () => {
    if (currentIndex + 1 < problems.length) {
      setCurrentIndex(c => c + 1);
    } else {
      finishContest();
    }
  };

  // Finish Contest & Generate / Save Report & Persist to User Database
  const finishContest = async () => {
    if (globalTimerRef.current) clearInterval(globalTimerRef.current);
    antiCheat.stop();

    const totalDuration = Math.round((Date.now() - startTimeRef.current) / 1000);
    let correctCount = 0;
    let skippedCount = 0;
    let incorrectCount = 0;
    let totalAttempts = 0;
    let totalHintsUsed = 0;
    let cumulativeMarksEarned = 0;

    const languageBreakdown: Record<Language, { total: number; correct: number; skipped: number }> = {
      python: { total: 0, correct: 0, skipped: 0 },
      cpp: { total: 0, correct: 0, skipped: 0 },
      java: { total: 0, correct: 0, skipped: 0 }
    };

    const isEasy = difficulty === 'easy';
    const isIntermediate = difficulty === 'intermediate' || difficulty === 'medium';
    const marksPerQuestion = isEasy ? 10 : isIntermediate ? 20 : 100;

    const detailedQuestions: DetailedQuestionResult[] = problems.map(p => {
      const att = attempts[p.id] || { status: 'skipped', attemptsCount: 0, userAnswer: '', hintsUsed: 0, marksEarned: 0 };
      const isCorrect = att.status === 'correct';
      const isSkipped = att.status === 'skipped' || att.status === 'pending';
      const hints = att.hintsUsed || 0;
      totalHintsUsed += hints;

      if (isCorrect) correctCount++;
      else if (isSkipped) skippedCount++;
      else incorrectCount++;

      totalAttempts += att.attemptsCount || (isCorrect ? 1 : 0);

      if (languageBreakdown[p.language]) {
        languageBreakdown[p.language].total++;
        if (isCorrect) languageBreakdown[p.language].correct++;
        if (isSkipped) languageBreakdown[p.language].skipped++;
      }

      const hintMultiplier = hints === 0 ? 1.0 : hints === 1 ? 0.8 : hints === 2 ? 0.6 : 0.4;
      const earned = att.marksEarned !== undefined ? att.marksEarned : (isCorrect ? Math.round(marksPerQuestion * hintMultiplier) : 0);
      cumulativeMarksEarned += earned;

      return {
        id: p.id,
        title: p.title,
        language: p.language,
        status: isCorrect ? 'correct' : 'skipped',
        attempts: att.attemptsCount || (isCorrect ? 1 : 0),
        hintsUsed: hints,
        timeSeconds: Math.round(totalDuration / Math.max(problems.length, 1)),
        userAnswer: att.userAnswer || '(Skipped)',
        expectedAnswer: p.acceptedFixes[0] || p.buggyLineContent,
        explanation: p.explanation,
        marksAwarded: earned,
        marksEarned: earned,
        maxMarks: marksPerQuestion
      };
    });

    const maxMarksPossible = isEasy ? 100 : isIntermediate ? 100 : (problems.length * 100);
    const scorePercentage = maxMarksPossible > 0 ? Math.round((cumulativeMarksEarned / maxMarksPossible) * 100) : 0;
    const noHintBonusPoints = totalHintsUsed === 0 && correctCount > 0 ? 500 : 0;

    // Multi-factor Institutional Unique Scoring Engine for Tie-Breaking
    const basePts = cumulativeMarksEarned * 100;
    const speedBonus = Math.max(0, Math.round(100000 / (totalDuration + 5)));
    const attemptPenalty = Math.max(0, (totalAttempts - correctCount) * 50);
    const hintPenalty = totalHintsUsed * 100;
    const securityPenalty = violationsCount * 2000;
    const uniqueScore = Math.max(0, basePts + speedBonus + noHintBonusPoints - attemptPenalty - hintPenalty - securityPenalty);

    const report: ReportSummary = {
      id: 'rep_' + Date.now(),
      participantName: participantName || 'Candidate',
      difficulty,
      languageTrack,
      institutionName: 'Government Thirumagal Mills College',
      totalQuestions: problems.length,
      correctCount,
      skippedCount,
      incorrectCount,
      totalAttempts: Math.max(totalAttempts, correctCount + skippedCount),
      scorePercentage,
      totalHintsUsed,
      noHintBonusPoints,
      totalTimeSeconds: totalDuration,
      uniqueScore,
      completedAt: new Date().toISOString(),
      languageBreakdown,
      detailedQuestions,
      violationsCount,
      marksEarned: cumulativeMarksEarned,
      maxMarksPossible
    };

    // Save report to disk via server API
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      });
      if (res.ok) {
        const savedData = await res.json();
        report.savedFilePath = savedData.filePath;
        report.rawTextReport = savedData.content;
      }
    } catch (e) {
      console.warn('Could not persist report to disk:', e);
    }

    // Persist permanently into user history database & admin sessions
    try {
      await fetch('/api/user-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: participantName,
          roundData: {
            roundId: report.id,
            difficulty,
            languageTrack,
            totalQuestions: problems.length,
            correctCount,
            marksEarned: cumulativeMarksEarned,
            maxMarksPossible,
            scorePercentage,
            timeSeconds: totalDuration,
            violationsCount,
            questionSummaries: detailedQuestions
          }
        })
      });
    } catch (e) {
      console.warn('Could not save user round history to database:', e);
    }

    setFinalReport(report);
    setGameState('report');
  };

  const handleAbortContest = () => {
    if (window.confirm('Are you sure you want to end this contest early and generate the performance report?')) {
      finishContest();
    }
  };

  const handleRestart = () => {
    setGameState('start');
    setFinalReport(null);
    setScore(0);
    setTimerSeconds(0);
    setAttempts({});
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] flex flex-col font-mono selection:bg-[#1f6feb44] selection:text-[#58a6ff]">
      {/* Top Navigation */}
      <Navbar
        participantName={participantName}
        difficulty={difficulty}
        languageTrack={languageTrack}
        score={score}
        timerSeconds={timerSeconds}
        isContestActive={gameState === 'contest'}
        violationsCount={violationsCount}
        onNavigateHome={() => setGameState('landing')}
        onOpenBashModal={() => setIsBashModalOpen(true)}
        onOpenAdminModal={() => setGameState('admin')}
        onOpenTieBreaker={() => setGameState('tiebreaker')}
        onAbortContest={handleAbortContest}
      />

      {/* Main View Router */}
      <main className="flex-1 flex flex-col">
        {gameState === 'landing' && (
          <LandingPage
            onEnterArena={() => setGameState('start')}
            onNavigateToAdmin={() => setGameState('admin')}
            onOpenTieBreaker={() => setGameState('tiebreaker')}
            onOpenBashModal={() => setIsBashModalOpen(true)}
            systemStatus={systemStatus}
          />
        )}

        {gameState === 'start' && (
          <StartScreen
            onStart={handleStartContest}
            systemStatus={systemStatus}
            onOpenBashModal={() => setIsBashModalOpen(true)}
            onOpenTieBreaker={() => setGameState('tiebreaker')}
          />
        )}

        {gameState === 'contest' && (
          <ContestArena
            problems={problems}
            currentIndex={currentIndex}
            attempts={attempts}
            onAnswerSubmit={handleAnswerSubmit}
            onSkipQuestion={handleSkipQuestion}
            participantName={participantName}
          />
        )}

        {gameState === 'report' && finalReport && (
          <ReportView
            report={finalReport}
            onRestart={handleRestart}
          />
        )}

        {gameState === 'tiebreaker' && (
          <TieBreakerPage
            onBackToHome={() => setGameState('landing')}
          />
        )}

        {gameState === 'admin' && (
          <AdminPanel
            isStandalonePage={true}
            onClose={() => setGameState('landing')}
          />
        )}
      </main>

      {/* Technical Telemetry Dashboard Footer */}
      <footer className="h-9 bg-[#010409] border-t border-[#30363d] flex items-center px-4 sm:px-6 justify-between text-[10px] text-[#8b949e] font-mono select-none">
        <div className="flex items-center gap-4 overflow-x-auto">
          <span className="text-[#f0f6fc] font-bold">GTMC // DEPT OF COMPUTER SCIENCE</span>
          <span className="hidden sm:inline text-[#30363d]">|</span>
          <span>ENGINES: <span className="text-[#3fb950] font-bold">PYTHON • C++ • JAVA</span></span>
          <span className="hidden sm:inline text-[#30363d]">|</span>
          <span>TELEGRAM_PROCTOR: <span className={systemStatus?.telegramConfigured ? "text-[#3fb950] font-bold" : "text-[#d29922] font-bold"}>
            {systemStatus?.telegramConfigured ? 'ONLINE' : 'STANDBY'}
          </span></span>
        </div>
        <div className="hidden md:block text-[#8b949e]">
          CAMPUS: <span className="text-[#58a6ff]">GOVERNMENT THIRUMAGAL MILLS COLLEGE</span> &nbsp;|&nbsp; STATUS: <span className="text-[#3fb950]">ACCREDITED</span>
        </div>
      </footer>

      {/* Modals */}
      <BashScriptViewer
        isOpen={isBashModalOpen}
        onClose={() => setIsBashModalOpen(false)}
      />

      <AdminPanel
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />

      <SecurityWarningModal
        violation={activeViolation}
        onDismiss={() => setActiveViolation(null)}
      />
    </div>
  );
}
