import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, 
  CheckCircle, 
  SkipForward, 
  XCircle, 
  Clock, 
  Download, 
  FileText, 
  RotateCcw, 
  ShieldCheck, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Terminal,
  Copy,
  Check,
  GraduationCap,
  Sparkles,
  Code2,
  Play,
  Heart,
  Quote,
  Trophy,
  History,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { ReportSummary, Difficulty, Language } from '../types';
import { getRandomQuote } from '../data/quotes';

// High-resolution visual assets generated
import trophyCrestImg from '../assets/images/gtmc_trophy_crest_1787663825059.jpg';
import trophyCelebrationImg from '../assets/images/trophy_celebration_1787663526343.jpg';
import completionBannerImg from '../assets/images/completion_banner_1787663546071.jpg';

interface ReportViewProps {
  report: ReportSummary;
  onRestart: () => void;
}

export const ReportView: React.FC<ReportViewProps> = ({ report, onRestart }) => {
  const [showRawReport, setShowRawReport] = useState(false);
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [selectedCodeLang, setSelectedCodeLang] = useState<Language>(
    report.languageTrack === 'all' ? 'python' : (report.languageTrack as Language) || 'python'
  );
  const [codeOutput, setCodeOutput] = useState<string | null>(null);
  const [isExecutingThankYou, setIsExecutingThankYou] = useState(false);
  const [quote] = useState(getRandomQuote);

  // User Cumulative History State
  const [userHistory, setUserHistory] = useState<any | null>(null);

  useEffect(() => {
    // Fetch latest user cumulative records
    if (report.participantName) {
      fetch(`/api/user-history/${encodeURIComponent(report.participantName)}`)
        .then(res => res.json())
        .then(data => {
          if (data.exists) {
            setUserHistory(data.record);
          }
        })
        .catch(err => console.warn('Could not fetch user history on report view:', err));
    }
  }, [report.participantName]);

  // Trigger rich multi-stage confetti on mount
  useEffect(() => {
    const count = 200;
    const defaults = { origin: { y: 0.7 } };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });

    const cannonTimer = setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 }
      });
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 }
      });
    }, 450);

    return () => clearTimeout(cannonTimer);
  }, []);

  const formatDuration = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs}s`;
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([report.rawTextReport || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GTMC_Report_${report.participantName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${report.difficulty}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyRaw = () => {
    if (report.rawTextReport) {
      navigator.clipboard.writeText(report.rawTextReport);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Calculate marks based on difficulty rule
  const marksEarned = report.marksEarned !== undefined 
    ? report.marksEarned 
    : report.difficulty === 'easy' 
      ? report.correctCount * 10 
      : (report.difficulty === 'intermediate' || report.difficulty === 'medium')
        ? report.correctCount * 20
        : report.correctCount * 100;

  const maxMarks = report.maxMarksPossible || (
    report.difficulty === 'easy' 
      ? 100 
      : (report.difficulty === 'intermediate' || report.difficulty === 'medium')
        ? 100 
        : 100
  );

  const getThankYouCode = (lang: Language) => {
    const candidate = report.participantName.replace(/"/g, '\\"');
    const score = marksEarned;
    const accuracy = report.scorePercentage;
    const timeTaken = formatDuration(report.totalTimeSeconds);

    if (lang === 'python') {
      return `# ==============================================================================
# GOVERNMENT THIRUMAGAL MILLS COLLEGE - COMPUTER SCIENCE DEPARTMENT
# OFFICIAL CODE-BASED CONGRATULATIONS & AUDIT VERIFICATION
# ==============================================================================

class GTMCChampionshipAudit:
    def __init__(self, candidate_name: str, institution: str):
        self.candidate = candidate_name
        self.institution = institution
        self.marks = "${score} / ${maxMarks}"
        self.accuracy = "${accuracy}%"
        self.time_taken = "${timeTaken}"
        self.status = "CHAMPIONSHIP_VERIFIED"

    def express_gratitude(self):
        message = f"""
        ================================================================
        🎓 GOVERNMENT THIRUMAGAL MILLS COLLEGE • GUDIYATTAM
        ----------------------------------------------------------------
        Dear {self.candidate},

        Thank you for participating in our Code Debugging Championship!
        Your analytical rigor, precision, and debugging mastery 
        distinguish you as an outstanding technologist.

        [PERFORMANCE AUDIT METRICS]
        - Marks Earned:   {self.marks}
        - Accuracy Rate:  {self.accuracy}
        - Total Duration: {self.time_taken}
        - Integrity:      PASSED (Proctor Verified)

        We wish you relentless success in your coding journey!
        ================================================================
        """
        print(message.strip())

# Execute audit certificate
audit = GTMCChampionshipAudit("${candidate}", "Government Thirumagal Mills College")
audit.express_gratitude()
`;
    }

    if (lang === 'cpp') {
      return `// ==============================================================================
// GOVERNMENT THIRUMAGAL MILLS COLLEGE - COMPUTER SCIENCE DEPARTMENT
// OFFICIAL CODE-BASED CONGRATULATIONS & AUDIT VERIFICATION
// ==============================================================================

#include <iostream>
#include <string>

struct ContestantProfile {
    std::string name = "${candidate}";
    std::string college = "Government Thirumagal Mills College";
    std::string marks = "${score} / ${maxMarks}";
    std::string accuracy = "${accuracy}%";
    std::string duration = "${timeTaken}";
};

void printInstitutionalGratitude(const ContestantProfile& profile) {
    std::cout << "================================================================\\n";
    std::cout << "🎓 GOVERNMENT THIRUMAGAL MILLS COLLEGE • GUDIYATTAM\\n";
    std::cout << "----------------------------------------------------------------\\n";
    std::cout << "Heartfelt Thanks and Congratulations to: " << profile.name << "\\n\\n";
    std::cout << "Thank you for challenging our Debugging Championship Arena.\\n";
    std::cout << "You demonstrated outstanding syntax awareness and memory safety!\\n\\n";
    std::cout << "[AUDIT METRICS]\\n";
    std::cout << "▸ Verified Marks:  " << profile.marks << "\\n";
    std::cout << "▸ Accuracy Rate:   " << profile.accuracy << "\\n";
    std::cout << "▸ Elapsed Time:    " << profile.duration << "\\n";
    std::cout << "================================================================\\n";
}

int main() {
    ContestantProfile candidate;
    printInstitutionalGratitude(candidate);
    return 0;
}
`;
    }

    // Java
    return `// ==============================================================================
// GOVERNMENT THIRUMAGAL MILLS COLLEGE - COMPUTER SCIENCE DEPARTMENT
// OFFICIAL CODE-BASED CONGRATULATIONS & AUDIT VERIFICATION
// ==============================================================================

public class GTMCThankYouMessage {
    private final String candidateName = "${candidate}";
    private final String institution = "Government Thirumagal Mills College";
    private final String finalMarks = "${score} / ${maxMarks}";
    private final String accuracyRate = "${accuracy}%";
    private final String timeElapsed = "${timeTaken}";

    public void deliverThanks() {
        System.out.println("================================================================");
        System.out.println("🎓 GOVERNMENT THIRUMAGAL MILLS COLLEGE • GUDIYATTAM");
        System.out.println("----------------------------------------------------------------");
        System.out.println("Official Congratulations, " + this.candidateName + "!");
        System.out.println();
        System.out.println("Thank you for your enthusiastic participation in our 2026 Code");
        System.out.println("Debugging Competition. Your analytical focus and debugging skill");
        System.out.println("reflect the highest standards of software craftsmanship.");
        System.out.println();
        System.out.println("[OFFICIAL RECORD]");
        System.out.println("• Marks:    " + this.finalMarks);
        System.out.println("• Accuracy: " + this.accuracyRate);
        System.out.println("• Duration: " + this.timeElapsed);
        System.out.println("================================================================");
    }

    public static void main(String[] args) {
        new GTMCThankYouMessage().deliverThanks();
    }
}
`;
  };

  const handleExecuteThankYou = () => {
    setIsExecutingThankYou(true);
    setCodeOutput(null);
    setTimeout(() => {
      setIsExecutingThankYou(false);
      if (selectedCodeLang === 'python') {
        setCodeOutput(`================================================================
🎓 GOVERNMENT THIRUMAGAL MILLS COLLEGE • GUDIYATTAM
----------------------------------------------------------------
Dear ${report.participantName},

Thank you for participating in our Code Debugging Championship!
Your analytical rigor, precision, and debugging mastery 
distinguish you as an outstanding technologist.

[PERFORMANCE AUDIT METRICS]
- Marks Earned:   ${marksEarned} / ${maxMarks}
- Accuracy Rate:  ${report.scorePercentage}%
- Total Duration: ${formatDuration(report.totalTimeSeconds)}
- Integrity:      PASSED (Proctor Verified)

We wish you relentless success in your coding journey!
================================================================
[Process exited with code 0]`);
      } else if (selectedCodeLang === 'cpp') {
        setCodeOutput(`================================================================
🎓 GOVERNMENT THIRUMAGAL MILLS COLLEGE • GUDIYATTAM
----------------------------------------------------------------
Heartfelt Thanks and Congratulations to: ${report.participantName}

Thank you for challenging our Debugging Championship Arena.
You demonstrated outstanding syntax awareness and memory safety!

[AUDIT METRICS]
▸ Verified Marks:  ${marksEarned} / ${maxMarks}
▸ Accuracy Rate:   ${report.scorePercentage}%
▸ Elapsed Time:    ${formatDuration(report.totalTimeSeconds)}
================================================================
[Process exited with code 0]`);
      } else {
        setCodeOutput(`================================================================
🎓 GOVERNMENT THIRUMAGAL MILLS COLLEGE • GUDIYATTAM
----------------------------------------------------------------
Official Congratulations, ${report.participantName}!

Thank you for your enthusiastic participation in our 2026 Code
Debugging Competition. Your analytical focus and debugging skill
reflect the highest standards of software craftsmanship.

[OFFICIAL RECORD]
• Marks:    ${marksEarned} / ${maxMarks}
• Accuracy: ${report.scorePercentage}%
• Duration: ${formatDuration(report.totalTimeSeconds)}
================================================================
[Process exited with code 0]`);
      }
    }, 600);
  };

  const handleCopyCode = () => {
    const code = getThankYouCode(selectedCodeLang);
    navigator.clipboard.writeText(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  return (
    <div id="report-view-container" className="max-w-5xl mx-auto px-4 py-8 sm:py-10 space-y-7 font-mono">
      {/* High-Resolution Visual Completion Banner Header */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="bg-[#161b22] border border-[#30363d] overflow-hidden shadow-2xl rounded-sm"
      >
        {/* Visual Hero Image */}
        <div className="relative w-full h-48 sm:h-64 bg-[#010409] border-b border-[#30363d] overflow-hidden">
          <img
            src={trophyCrestImg}
            alt="GTMC Championship Trophy"
            className="w-full h-full object-cover object-center opacity-90 filter brightness-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#161b22] via-[#161b22]/40 to-transparent flex flex-col justify-end p-6">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#010409]/90 border border-[#30363d] text-[#58a6ff] text-xs">
                <GraduationCap className="h-4 w-4 text-[#58a6ff]" />
                <span className="font-bold">GOVERNMENT THIRUMAGAL MILLS COLLEGE</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#010409]/90 border border-[#238636] text-[#3fb950] text-xs font-bold">
                <Sparkles className="h-3.5 w-3.5 text-[#3fb950]" />
                <span>OFFICIAL PERFORMANCE VERIFICATION</span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#f0f6fc] tracking-tight drop-shadow-md">
              COMPETITION ROUND COMPLETED
            </h1>
          </div>
        </div>

        <div className="p-6 sm:p-7 space-y-5">
          <p className="text-[#8b949e] text-xs sm:text-sm leading-relaxed">
            Official debugging audit for participant <strong className="text-[#58a6ff] font-bold">{report.participantName}</strong> in track{' '}
            <strong className="text-[#d29922] uppercase font-bold">{report.languageTrack === 'all' ? 'POLYGLOT' : report.languageTrack} ({report.difficulty.toUpperCase()})</strong>.
          </p>

          {/* Genuine Score & Marks Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* Marks Earned */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="bg-[#010409] border border-[#238636] p-4 text-center bg-[#23863610]"
            >
              <div className="text-2xl sm:text-3xl font-extrabold text-[#3fb950] font-mono">
                {marksEarned} <span className="text-xs text-[#8b949e]">/ {maxMarks}</span>
              </div>
              <div className="text-[10px] text-[#3fb950] font-bold uppercase tracking-wider mt-1">
                {report.difficulty === 'easy' ? 'MARKS (10 × 10 = 100)' : report.difficulty === 'intermediate' ? 'MARKS (5 × 20 = 100)' : 'TOTAL MARKS EARNED'}
              </div>
            </motion.div>

            {/* Accuracy Rate */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="bg-[#010409] border border-[#30363d] p-4 text-center"
            >
              <div className="text-2xl sm:text-3xl font-extrabold text-[#58a6ff] font-mono">
                {report.scorePercentage}%
              </div>
              <div className="text-[10px] text-[#8b949e] font-bold uppercase tracking-wider mt-1">
                ACCURACY RATE
              </div>
            </motion.div>

            {/* Questions Solved */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="bg-[#010409] border border-[#30363d] p-4 text-center"
            >
              <div className="text-2xl sm:text-3xl font-extrabold text-[#f0f6fc] font-mono">
                {report.correctCount} / {report.totalQuestions}
              </div>
              <div className="text-[10px] text-[#8b949e] font-bold uppercase tracking-wider mt-1">
                PROBLEMS RESOLVED
              </div>
            </motion.div>

            {/* Total Duration */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="bg-[#010409] border border-[#30363d] p-4 text-center"
            >
              <div className="text-2xl sm:text-3xl font-extrabold text-[#d29922] font-mono">
                {formatDuration(report.totalTimeSeconds)}
              </div>
              <div className="text-[10px] text-[#8b949e] font-bold uppercase tracking-wider mt-1">
                TOTAL TIME
              </div>
            </motion.div>
          </div>

          {/* User History Across All Past Rounds */}
          {userHistory && (
            <div className="bg-[#010409] border border-[#58a6ff]/40 p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#58a6ff] flex items-center gap-1.5">
                  <History className="h-4 w-4" />
                  <span>CUMULATIVE PARTICIPANT PROGRESS (ALL ROUNDS)</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff]">
                  {userHistory.roundsCount} ROUNDS COMPLETED
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                <div className="bg-[#161b22] p-2.5 border border-[#30363d]">
                  <span className="text-[#8b949e] block text-[9px] uppercase">TOTAL CUMULATIVE MARKS:</span>
                  <span className="text-[#3fb950] font-bold text-sm">{userHistory.cumulativeMarks} Marks</span>
                </div>
                <div className="bg-[#161b22] p-2.5 border border-[#30363d]">
                  <span className="text-[#8b949e] block text-[9px] uppercase">BEST ROUND ACCURACY:</span>
                  <span className="text-[#58a6ff] font-bold text-sm">{userHistory.bestRoundPercentage}%</span>
                </div>
                <div className="bg-[#161b22] p-2.5 border border-[#30363d]">
                  <span className="text-[#8b949e] block text-[9px] uppercase">TOTAL TIME INVESTED:</span>
                  <span className="text-[#c9d1d9] font-bold text-sm">{Math.floor(userHistory.totalTimeSpentSeconds / 60)}m {userHistory.totalTimeSpentSeconds % 60}s</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Motivational Quote Banner */}
      <div className="bg-[#010409] border border-[#30363d] p-4 flex items-center gap-3 text-xs">
        <Quote className="h-5 w-5 text-[#3fb950] shrink-0" />
        <div>
          <p className="text-[#c9d1d9] italic">"{quote.quote}"</p>
          <span className="text-[10px] text-[#8b949e] font-bold mt-0.5 inline-block">
            — {quote.author} ({quote.role})
          </span>
        </div>
      </div>

      {/* Code-Based Interactive Thank You Note Generator */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="bg-[#161b22] border border-[#30363d] overflow-hidden"
      >
        <div className="p-4 border-b border-[#30363d] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#010409]">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-[#f85149]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#f0f6fc]">
              GOVERNMENT THIRUMAGAL MILLS COLLEGE // CODE-BASED THANK YOU NOTE
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#8b949e] uppercase">Language:</span>
            <div className="flex items-center border border-[#30363d] bg-[#161b22]">
              {(['python', 'cpp', 'java'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    setSelectedCodeLang(lang);
                    setCodeOutput(null);
                  }}
                  className={`px-2.5 py-1 text-[10px] font-bold uppercase transition-colors ${
                    selectedCodeLang === lang
                      ? 'bg-[#58a6ff] text-[#010409]'
                      : 'text-[#8b949e] hover:text-[#f0f6fc]'
                  }`}
                >
                  {lang === 'cpp' ? 'C++' : lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Code Editor Body */}
        <div className="p-4 space-y-3">
          <div className="bg-[#010409] border border-[#30363d] overflow-hidden">
            <div className="bg-[#161b22] px-4 py-2 border-b border-[#30363d] flex items-center justify-between text-xs">
              <span className="text-[#8b949e] text-[11px]">
                GTMC_ThankYou.{selectedCodeLang === 'python' ? 'py' : selectedCodeLang === 'cpp' ? 'cpp' : 'java'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 text-[11px] text-[#58a6ff] hover:text-[#79c0ff] cursor-pointer"
                >
                  {codeCopied ? <Check className="h-3 w-3 text-[#3fb950]" /> : <Copy className="h-3 w-3" />}
                  <span>{codeCopied ? 'COPIED' : 'COPY CODE'}</span>
                </button>
              </div>
            </div>
            <pre className="p-4 text-xs font-mono text-[#c9d1d9] bg-[#010409] whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
              {getThankYouCode(selectedCodeLang)}
            </pre>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-[#8b949e]">
              * Executable code greeting generated specifically for <strong className="text-[#58a6ff]">{report.participantName}</strong>.
            </p>
            <button
              onClick={handleExecuteThankYou}
              disabled={isExecutingThankYou}
              className="flex items-center gap-2 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white font-bold text-xs uppercase tracking-wider border border-[#2ea043] transition-colors cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-white" />
              <span>{isExecutingThankYou ? 'RUNNING PROGRAM...' : 'EXECUTE THANK YOU PROGRAM'}</span>
            </button>
          </div>

          {/* Code Execution Terminal Output */}
          {codeOutput && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-[#010409] border border-[#238636] p-4 text-xs space-y-2"
            >
              <div className="flex items-center gap-2 text-[#3fb950] font-bold text-[10px] uppercase border-b border-[#21262d] pb-1">
                <Terminal className="h-3.5 w-3.5" />
                <span>TERMINAL OUTPUT // STDOUT</span>
              </div>
              <pre className="text-[#3fb950] whitespace-pre font-mono text-[11px] leading-relaxed overflow-x-auto">
                {codeOutput}
              </pre>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Secondary Metrics & File Persistence Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#161b22] border border-[#30363d] p-4 flex items-center gap-4">
          <div className="h-10 w-10 bg-[#010409] border border-[#d29922] flex items-center justify-center shrink-0">
            <SkipForward className="h-5 w-5 text-[#d29922]" />
          </div>
          <div>
            <div className="text-lg font-bold text-[#f0f6fc] font-mono">{report.skippedCount}</div>
            <div className="text-[10px] text-[#8b949e] uppercase tracking-wider">QUESTIONS SKIPPED</div>
          </div>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] p-4 flex items-center gap-4">
          <div className="h-10 w-10 bg-[#010409] border border-[#f85149] flex items-center justify-center shrink-0">
            <XCircle className="h-5 w-5 text-[#f85149]" />
          </div>
          <div>
            <div className="text-lg font-bold text-[#f0f6fc] font-mono">{report.incorrectCount}</div>
            <div className="text-[10px] text-[#8b949e] uppercase tracking-wider">INCORRECT ATTEMPTS</div>
          </div>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] p-4 flex items-center gap-4">
          <div className={`h-10 w-10 bg-[#010409] border flex items-center justify-center shrink-0 ${
            report.violationsCount > 0 ? 'border-[#f85149]' : 'border-[#238636]'
          }`}>
            {report.violationsCount > 0 ? (
              <AlertTriangle className="h-5 w-5 text-[#f85149]" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-[#3fb950]" />
            )}
          </div>
          <div>
            <div className="text-lg font-bold text-[#f0f6fc] font-mono">{report.violationsCount}</div>
            <div className="text-[10px] text-[#8b949e] uppercase tracking-wider">
              {report.violationsCount > 0 ? 'SECURITY FLAGS' : 'CLEAN INTEGRITY'}
            </div>
          </div>
        </div>
      </div>

      {/* Disk Storage & Report Download Banner */}
      <div className="bg-[#161b22] border border-[#30363d] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-[#010409] border border-[#30363d] flex items-center justify-center text-[#58a6ff] shrink-0">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#f0f6fc] flex items-center gap-2">
              <span>LOCAL DISK ARTIFACT PERSISTED</span>
              <span className="text-[9px] px-1.5 py-0.5 bg-[#010409] text-[#58a6ff] border border-[#30363d]">
                reports/*.txt
              </span>
            </div>
            <p className="text-[11px] text-[#8b949e] pt-0.5">
              PATH: <code className="text-[#c9d1d9]">{report.savedFilePath || 'reports/report_' + report.participantName + '.txt'}</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            id="download-report-btn"
            onClick={handleDownloadTxt}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white font-bold text-xs uppercase tracking-wider border border-[#2ea043] transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>DOWNLOAD .TXT</span>
          </button>

          <button
            id="toggle-raw-report-btn"
            onClick={() => setShowRawReport(!showRawReport)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#010409] hover:bg-[#21262d] text-[#c9d1d9] text-xs font-bold uppercase border border-[#30363d] transition-colors cursor-pointer"
          >
            <Terminal className="h-3.5 w-3.5 text-[#3fb950]" />
            <span>{showRawReport ? 'HIDE RAW' : 'VIEW RAW'}</span>
            {showRawReport ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Raw Text Report Preview */}
      {showRawReport && (
        <div className="bg-[#010409] border border-[#30363d] overflow-hidden shadow-lg animate-fadeIn">
          <div className="bg-[#161b22] px-4 py-2 border-b border-[#30363d] flex items-center justify-between">
            <span className="text-xs font-mono text-[#8b949e]">GTMC_report_output.txt</span>
            <button
              onClick={handleCopyRaw}
              className="flex items-center gap-1 text-xs text-[#58a6ff] hover:text-[#79c0ff] font-mono cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-[#3fb950]" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'COPIED' : 'COPY'}</span>
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-[#c9d1d9] bg-[#010409] whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
            {report.rawTextReport}
          </pre>
        </div>
      )}

      {/* Detailed Problem-by-Problem Table */}
      <div className="bg-[#161b22] border border-[#30363d] overflow-hidden">
        <div className="p-4 border-b border-[#30363d] flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#f0f6fc]">
            DETAILED PROBLEM AUDIT LOG & CANDIDATE ANSWERS
          </h3>
          <span className="text-xs text-[#8b949e]">
            {report.detailedQuestions.length} EVALUATED
          </span>
        </div>

        <div className="divide-y divide-[#30363d]">
          {report.detailedQuestions.map((q, idx) => (
            <div key={q.id} className="p-4 hover:bg-[#010409]/40 transition-colors space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#484f58] font-bold">
                    {(idx + 1).toString().padStart(2, '0')}
                  </span>
                  <span className="font-bold text-[#f0f6fc] text-xs sm:text-sm">
                    {q.title}
                  </span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 border ${
                    q.language === 'python' ? 'bg-[#d2992218] text-[#d29922] border-[#d29922]' :
                    q.language === 'cpp' ? 'bg-[#58a6ff18] text-[#58a6ff] border-[#58a6ff]' :
                    'bg-[#f8514918] text-[#f85149] border-[#f85149]'
                  }`}>
                    {q.language}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-[#8b949e]">{q.timeSeconds}s</span>
                  <span className={`font-mono font-bold uppercase px-2 py-0.5 border text-[10px] ${
                    q.status === 'correct' ? 'bg-[#23863622] text-[#3fb950] border-[#238636]' :
                    q.status === 'skipped' ? 'bg-[#d2992222] text-[#d29922] border-[#d29922]' :
                    'bg-[#f8514922] text-[#f85149] border-[#f85149]'
                  }`}>
                    {q.status}
                  </span>
                </div>
              </div>

              {/* Resolution details */}
              <div className="bg-[#010409] border border-[#30363d] p-3 text-xs space-y-1.5">
                {q.userAnswer && (
                  <div className="text-[#c9d1d9]">
                    <span className="text-[#8b949e] uppercase text-[10px] font-bold">SUBMITTED: </span>
                    <code className="text-[#58a6ff] bg-[#161b22] px-1.5 py-0.5 border border-[#30363d]">{q.userAnswer}</code>
                  </div>
                )}
                <div className="text-[#c9d1d9]">
                  <span className="text-[#8b949e] uppercase text-[10px] font-bold">REFERENCE: </span>
                  <code className="text-[#3fb950] bg-[#161b22] px-1.5 py-0.5 border border-[#30363d]">{q.expectedAnswer}</code>
                </div>
                {q.explanation && (
                  <div className="text-[#8b949e] text-[11px] pt-1 border-t border-[#21262d]">
                    <strong className="text-[#c9d1d9]">DIAGNOSIS:</strong> {q.explanation}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Restart Contest Action */}
      <div className="text-center pt-2">
        <button
          id="restart-contest-btn"
          onClick={onRestart}
          className="inline-flex items-center gap-2 px-8 py-3 bg-[#010409] hover:bg-[#21262d] text-[#f0f6fc] font-bold text-xs uppercase tracking-wider border border-[#30363d] hover:border-[#58a6ff] transition-colors cursor-pointer"
        >
          <RotateCcw className="h-4 w-4 text-[#58a6ff]" />
          <span>START NEW GTMC SESSION / NEXT ROUND</span>
        </button>
      </div>
    </div>
  );
};
