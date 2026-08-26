import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  CheckCircle, 
  XCircle, 
  SkipForward, 
  Play, 
  Lightbulb, 
  RefreshCw, 
  AlertTriangle, 
  Code2, 
  Terminal, 
  Cpu, 
  ShieldAlert, 
  ChevronRight, 
  Send,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { Problem, QuestionAttempt, QuestionStatus, RunCodeResponse } from '../types';
import { evaluateAnswer } from '../utils/evaluator';
import { antiCheat } from '../utils/antiCheat';

interface ContestArenaProps {
  problems: Problem[];
  currentIndex: number;
  attempts: Record<string, QuestionAttempt>;
  onAnswerSubmit: (problemId: string, status: QuestionStatus, answer: string, feedback: string, hintsUsed?: number) => void;
  onSkipQuestion: (problemId: string) => void;
  participantName: string;
}

export const ContestArena: React.FC<ContestArenaProps> = ({
  problems,
  currentIndex,
  attempts,
  onAnswerSubmit,
  onSkipQuestion,
  participantName
}) => {
  const currentProblem = problems[currentIndex];
  const currentAttempt = attempts[currentProblem?.id];

  const [userFixInput, setUserFixInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'submit' | 'sandbox'>('submit');

  // Sandbox state
  const [sandboxCode, setSandboxCode] = useState('');
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [sandboxResult, setSandboxResult] = useState<RunCodeResponse | null>(null);

  // Hints state
  const [hint, setHint] = useState<string | null>(null);
  const [isLoadingHint, setIsLoadingHint] = useState(false);
  const [hintCount, setHintCount] = useState(0);

  // Per-question timer
  const [questionTimeSeconds, setQuestionTimeSeconds] = useState(0);
  const timerRef = useRef<any>(null);

  // Sync state when current question changes
  useEffect(() => {
    if (currentProblem) {
      setUserFixInput(currentAttempt?.userAnswer || '');
      setSandboxCode(currentProblem.buggyCode);
      setFeedback(null);
      setHint(null);
      setHintCount(0);
      setSandboxResult(null);
      setQuestionTimeSeconds(0);
      setActiveTab('submit');

      // Update anti-cheat context
      antiCheat.updateContext(currentProblem.id, currentProblem.title);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setQuestionTimeSeconds(s => s + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, currentProblem?.id]);

  if (!currentProblem) {
    return <div className="p-8 text-center text-slate-400">Loading problem...</div>;
  }

  const handleEvaluate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = userFixInput.trim();
    if (!trimmed) {
      setFeedback({
        isCorrect: false,
        text: 'Answer cannot be empty. Please identify the bug or provide the corrected code.'
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      // Fast client-side evaluation first
      const localResult = evaluateAnswer(currentProblem, trimmed);

      if (localResult.isCorrect) {
        // Trigger celebratory confetti
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });

        setFeedback({ isCorrect: true, text: localResult.feedback });
        onAnswerSubmit(currentProblem.id, 'correct', trimmed, localResult.feedback, hintCount);
      } else {
        // Fallback to server AI evaluation for nuanced fixes
        try {
          const res = await fetch('/api/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              problemId: currentProblem.id,
              userAnswer: trimmed,
              participantName,
              useAiEvaluation: true
            })
          });

          if (res.ok) {
            const data = await res.json();
            if (data.isCorrect) {
              confetti({
                particleCount: 50,
                spread: 60,
                origin: { y: 0.7 }
              });
              setFeedback({ isCorrect: true, text: data.feedback });
              onAnswerSubmit(currentProblem.id, 'correct', trimmed, data.feedback, hintCount);
              setIsSubmitting(false);
              return;
            }
          }
        } catch (serverErr) {
          console.warn('Server evaluate error:', serverErr);
        }

        // Keep on the same question for incorrect answers
        setFeedback({
          isCorrect: false,
          text: localResult.feedback || 'Incorrect fix. Please inspect the code carefully and try again, or skip to proceed.'
        });
        onAnswerSubmit(currentProblem.id, 'incorrect', trimmed, localResult.feedback, hintCount);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (window.confirm('Are you sure you want to skip this question? It will be marked as SKIPPED in your report.')) {
      onSkipQuestion(currentProblem.id);
    }
  };

  const handleRequestHint = async () => {
    setIsLoadingHint(true);
    try {
      const res = await fetch('/api/groq/ai-hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: currentProblem.id,
          hintIndex: hintCount
        })
      });
      if (res.ok) {
        const data = await res.json();
        setHint(data.hint);
        setHintCount(c => c + 1);
      }
    } catch (e) {
      setHint('Inspect memory boundaries, null safety, and parameter reference scopes.');
    } finally {
      setIsLoadingHint(false);
    }
  };

  const handleRunSandboxCode = async () => {
    setIsRunningCode(true);
    setSandboxResult(null);
    try {
      const res = await fetch('/api/run-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: currentProblem.language,
          code: sandboxCode
        })
      });
      const data: RunCodeResponse = await res.json();
      setSandboxResult(data);
    } catch (e: any) {
      setSandboxResult({
        success: false,
        output: '',
        error: 'Execution failed: ' + e.message
      });
    } finally {
      setIsRunningCode(false);
    }
  };

  const getLanguageColor = (lang: string) => {
    switch (lang) {
      case 'python': return 'text-[#d29922] bg-[#d2992218] border-[#d29922]';
      case 'cpp': return 'text-[#58a6ff] bg-[#58a6ff18] border-[#58a6ff]';
      case 'java': return 'text-[#f85149] bg-[#f8514918] border-[#f85149]';
      default: return 'text-[#c9d1d9] bg-[#161b22] border-[#30363d]';
    }
  };

  const lines = currentProblem.buggyCode.split('\n');

  return (
    <div id="contest-arena" className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5 font-mono">
      {/* Top Question Stepper & Status Bar */}
      <div className="bg-[#161b22] border border-[#30363d] p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold px-2.5 py-1 bg-[#010409] text-[#58a6ff] border border-[#30363d]">
              PROBLEM {currentIndex + 1} OF {problems.length}
            </span>
            <span className={`text-xs font-bold uppercase font-mono px-2 py-0.5 border ${getLanguageColor(currentProblem.language)}`}>
              {currentProblem.language === 'cpp' ? 'C++ 17' : currentProblem.language === 'python' ? 'Python 3' : 'Java 17'}
            </span>
            <span className="text-xs text-[#8b949e] font-medium hidden md:inline">
              CATEGORY: {currentProblem.category.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#8b949e]">
            <span>PROBLEM_TIMER: <strong className="text-[#f0f6fc]">{questionTimeSeconds}s</strong></span>
            {currentAttempt && currentAttempt.attemptsCount > 0 && (
              <span className="text-[#d29922]">
                [{currentAttempt.attemptsCount} ATTEMPT{currentAttempt.attemptsCount > 1 ? 'S' : ''}]
              </span>
            )}
          </div>
        </div>

        {/* Stepper Grid Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {problems.map((p, idx) => {
            const att = attempts[p.id];
            const isCurrent = idx === currentIndex;
            const isDone = att?.status === 'correct';
            const isSkipped = att?.status === 'skipped';
            const isFailed = att?.status === 'incorrect';

            let badgeClass = 'bg-[#010409] text-[#484f58] border-[#30363d]';
            if (isDone) badgeClass = 'bg-[#23863622] text-[#3fb950] border-[#238636] font-bold';
            else if (isSkipped) badgeClass = 'bg-[#d2992222] text-[#d29922] border-[#d29922] font-bold';
            else if (isFailed) badgeClass = 'bg-[#f8514922] text-[#f85149] border-[#f85149]';
            else if (isCurrent) badgeClass = 'bg-[#58a6ff22] text-[#58a6ff] border-[#58a6ff] ring-1 ring-[#58a6ff] font-bold';

            return (
              <div
                key={p.id}
                className={`flex-shrink-0 h-7 px-2.5 border text-xs flex items-center justify-center font-mono transition-all ${badgeClass}`}
                title={`Problem ${idx + 1}: ${p.title} (${att?.status || 'pending'})`}
              >
                {(idx + 1).toString().padStart(2, '0')}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Split View: Code Viewer & Answer Submission */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Problem Brief & Protected Buggy Code (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Problem Info Card */}
          <div className="bg-[#161b22] border border-[#30363d] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-[#f0f6fc] tracking-tight">
                {currentProblem.title}
              </h2>
              <span className="text-[10px] uppercase font-bold text-[#8b949e] border border-[#30363d] px-2 py-0.5 bg-[#010409]">
                ID: {currentProblem.id.toUpperCase()}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#c9d1d9] leading-relaxed">
              {currentProblem.description}
            </p>

            {/* Test Cases / Expected Behavior */}
            {currentProblem.testCases && currentProblem.testCases.length > 0 && (
              <div className="bg-[#010409] border border-[#30363d] p-3 text-xs space-y-2">
                <div className="text-[10px] text-[#8b949e] uppercase tracking-wider font-bold">
                  VERIFICATION TEST CASES:
                </div>
                {currentProblem.testCases.map((tc, i) => (
                  <div key={i} className="text-[#c9d1d9] flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-[#58a6ff] font-bold">INPUT:</span>
                    <span className="text-[#f0f6fc] bg-[#161b22] px-1.5 py-0.5 border border-[#30363d]">{tc.input}</span>
                    <span className="text-[#8b949e]">➔</span>
                    <span className="text-[#3fb950] font-bold">EXPECTED:</span>
                    <span className="text-[#3fb950] bg-[#161b22] px-1.5 py-0.5 border border-[#30363d]">{tc.expectedOutput}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Buggy Code Viewer with Anti-Cheat Protection & Terminal Chrome */}
          <div className="bg-[#010409] border border-[#30363d] overflow-hidden">
            {/* Terminal Window Header Bar */}
            <div className="bg-[#161b22] px-4 py-2.5 border-b border-[#30363d] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#8b949e]">
                  <Code2 className="h-3.5 w-3.5 text-[#58a6ff]" />
                  <span>source.{currentProblem.language === 'python' ? 'py' : currentProblem.language === 'cpp' ? 'cpp' : 'java'}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-[#d29922] uppercase tracking-wider">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>INTEGRITY_PROTECTED</span>
              </div>
            </div>

            {/* Code lines container - Protected from text copying */}
            <div className="no-copy-zone p-4 font-mono text-xs sm:text-sm overflow-x-auto select-none bg-[#010409] text-[#c9d1d9] leading-relaxed">
              {lines.map((line, idx) => {
                const lineNum = idx + 1;

                return (
                  <div
                    key={idx}
                    className="flex items-start gap-4 px-2 py-0.5 transition-colors hover:bg-[#161b22]"
                  >
                    <span className="text-[#484f58] select-none w-6 text-right shrink-0">
                      {lineNum.toString().padStart(2, '0')}
                    </span>
                    <span className="whitespace-pre">
                      {line || ' '}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Integrated Terminal Trace / AI Diagnostic Panel */}
            <div className="border-t border-[#30363d] bg-[#010409] p-3 text-xs space-y-1 text-[#8b949e]">
              <div className="flex items-center justify-between text-[10px] text-[#8b949e] uppercase pb-1 border-b border-[#21262d]">
                <span className="flex items-center gap-1.5 text-[#58a6ff]">
                  <Terminal className="h-3 w-3" />
                  <span>RUNTIME_EXECUTION_TRACE</span>
                </span>
                <span className="text-[#3fb950]">STANDALONE_RUNNER // READY</span>
              </div>
              <p className="text-[11px] text-[#c9d1d9] pt-1">
                Bug Type: <span className="text-[#d29922] font-bold">{currentProblem.category}</span> &nbsp;|&nbsp;
                Target Line: <span className="text-[#58a6ff] font-bold">Line {currentProblem.lineWithBug}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Technical Parameter / Fix Submission (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Action Tabs */}
          <div className="bg-[#161b22] border border-[#30363d] overflow-hidden">
            <div className="flex border-b border-[#30363d] bg-[#010409]">
              <button
                id="tab-submit-fix"
                onClick={() => setActiveTab('submit')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-t-2 transition-all ${
                  activeTab === 'submit'
                    ? 'border-[#58a6ff] text-[#58a6ff] bg-[#161b22]'
                    : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#161b22]/50'
                }`}
              >
                <Send className="h-3.5 w-3.5" />
                <span>SUBMIT BUG FIX</span>
              </button>
              <button
                id="tab-sandbox-test"
                onClick={() => setActiveTab('sandbox')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-t-2 transition-all ${
                  activeTab === 'sandbox'
                    ? 'border-[#58a6ff] text-[#58a6ff] bg-[#161b22]'
                    : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#161b22]/50'
                }`}
              >
                <Terminal className="h-3.5 w-3.5" />
                <span>LIVE SANDBOX</span>
              </button>
            </div>

            <div className="p-5">
              {activeTab === 'submit' ? (
                /* Submit Fix Mode */
                <form onSubmit={handleEvaluate} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="user-fix-input" className="block text-xs font-bold uppercase tracking-wider text-[#f0f6fc]">
                      ENTER CORRECTED STATEMENT / RESOLUTION:
                    </label>
                    <textarea
                      id="user-fix-input"
                      rows={4}
                      value={userFixInput}
                      onChange={(e) => setUserFixInput(e.target.value)}
                      placeholder="Type your corrected line or resolution statement here..."
                      className="w-full bg-[#010409] border border-[#30363d] focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] p-3 text-[#f0f6fc] font-mono text-xs outline-none resize-none placeholder-[#484f58] transition-colors"
                      disabled={isSubmitting}
                      autoFocus
                    />
                    <p className="text-[10px] text-[#8b949e] leading-tight">
                      * Auto-normalizes spacing, quotes, and trivial syntax formatting.
                    </p>
                  </div>

                  {/* Feedback Banner */}
                  {feedback && (
                    <div
                      className={`p-3 border text-xs flex items-start gap-2.5 animate-fadeIn ${
                        feedback.isCorrect
                          ? 'bg-[#23863622] border-[#238636] text-[#3fb950]'
                          : 'bg-[#f8514922] border-[#f85149] text-[#f85149]'
                      }`}
                    >
                      {feedback.isCorrect ? (
                        <CheckCircle className="h-4 w-4 text-[#3fb950] shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-4 w-4 text-[#f85149] shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1">
                        <div className="font-bold uppercase tracking-wider">
                          {feedback.isCorrect ? 'SUCCESS: BUG RESOLVED' : 'ERROR: INCORRECT RESOLUTION'}
                        </div>
                        <p className="text-[11px] leading-relaxed">{feedback.text}</p>
                      </div>
                    </div>
                  )}

                  {/* Hint Display */}
                  {hint && (
                    <div className="p-3 bg-[#bc8cff15] border border-[#bc8cff80] text-[#d2a8ff] text-xs flex items-start gap-2.5 animate-fadeIn">
                      <Lightbulb className="h-4 w-4 text-[#bc8cff] shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="font-bold uppercase tracking-wider text-[#bc8cff]">AI DIAGNOSTIC HINT:</span>
                        <p className="text-[11px] leading-relaxed">{hint}</p>
                      </div>
                    </div>
                  )}

                  {/* Hint Scoring Multiplier Indicator */}
                  <div className="flex items-center justify-between px-3 py-1.5 bg-[#010409] border border-[#30363d] text-[11px]">
                    <span className="text-[#8b949e] flex items-center gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                      <span>HINTS USED: <strong className="text-[#f0f6fc]">{hintCount}</strong></span>
                    </span>
                    <span className={`font-bold ${
                      hintCount === 0 ? 'text-[#3fb950]' :
                      hintCount === 1 ? 'text-[#58a6ff]' :
                      hintCount === 2 ? 'text-[#d29922]' : 'text-[#f85149]'
                    }`}>
                      {hintCount === 0 ? '100% MARKS + BONUS' :
                       hintCount === 1 ? '80% MARKS ELIGIBLE' :
                       hintCount === 2 ? '60% MARKS ELIGIBLE' : '40% MARKS ELIGIBLE'}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2.5 pt-1">
                    <button
                      id="submit-fix-button"
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-[#238636] hover:bg-[#2ea043] text-white font-bold text-xs uppercase tracking-wider border border-[#2ea043] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>EVALUATING SUBMISSION...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>SUBMIT SOLUTION</span>
                        </>
                      )}
                    </button>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={handleRequestHint}
                        disabled={isLoadingHint}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#010409] hover:bg-[#21262d] text-[#c9d1d9] hover:text-[#bc8cff] border border-[#30363d] text-xs font-bold uppercase transition-colors"
                      >
                        {isLoadingHint ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Lightbulb className="h-3.5 w-3.5 text-[#bc8cff]" />
                        )}
                        <span>AI HINT</span>
                      </button>

                      <button
                        id="skip-question-button"
                        type="button"
                        onClick={handleSkip}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#010409] hover:bg-[#21262d] text-[#c9d1d9] hover:text-[#d29922] border border-[#30363d] text-xs font-bold uppercase transition-colors"
                      >
                        <SkipForward className="h-3.5 w-3.5 text-[#d29922]" />
                        <span>SKIP PROBLEM</span>
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                /* Sandbox Execution Mode */
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#8b949e]">
                      <span>EDITABLE CODE SANDBOX:</span>
                      <button
                        onClick={() => setSandboxCode(currentProblem.buggyCode)}
                        className="text-[#58a6ff] hover:underline text-[11px]"
                      >
                        RESET
                      </button>
                    </div>
                    <textarea
                      rows={8}
                      value={sandboxCode}
                      onChange={(e) => setSandboxCode(e.target.value)}
                      className="w-full bg-[#010409] border border-[#30363d] focus:border-[#58a6ff] p-3 text-[#f0f6fc] font-mono text-xs outline-none"
                    />
                  </div>

                  <button
                    onClick={handleRunSandboxCode}
                    disabled={isRunningCode}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1f6feb] hover:bg-[#388bfd] text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
                  >
                    {isRunningCode ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>COMPILING & EXECUTING...</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 fill-white" />
                        <span>RUN IN SUBPROCESS</span>
                      </>
                    )}
                  </button>

                  {/* Sandbox Output Console */}
                  {sandboxResult && (
                    <div className="bg-[#010409] border border-[#30363d] p-3 font-mono text-xs space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-[#8b949e] border-b border-[#30363d] pb-1">
                        <span>STDOUT / STDERR:</span>
                        {sandboxResult.executionTimeMs !== undefined && (
                          <span>{sandboxResult.executionTimeMs} ms</span>
                        )}
                      </div>
                      {sandboxResult.output && (
                        <pre className="text-[#3fb950] whitespace-pre-wrap max-h-36 overflow-y-auto">
                          {sandboxResult.output}
                        </pre>
                      )}
                      {sandboxResult.error && (
                        <pre className="text-[#f85149] whitespace-pre-wrap max-h-36 overflow-y-auto">
                          {sandboxResult.error}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Rules reminder */}
          <div className="bg-[#161b22] border border-[#30363d] p-3.5 text-[11px] text-[#8b949e] space-y-1">
            <div className="font-bold text-[#f0f6fc] flex items-center gap-1.5 uppercase">
              <HelpCircle className="h-3.5 w-3.5 text-[#58a6ff]" />
              <span>RULES_MATRIX:</span>
            </div>
            <p>• <strong className="text-[#3fb950]">CORRECT:</strong> Awards 100 pts and advances immediately.</p>
            <p>• <strong className="text-[#d29922]">SKIP:</strong> Advances to next question (recorded as SKIPPED).</p>
            <p>• <strong className="text-[#f85149]">INCORRECT:</strong> Stay on current problem to retry or skip.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

