export type Difficulty = 'easy' | 'intermediate' | 'medium' | 'hard' | 'master';
export type Language = 'python' | 'cpp' | 'java';
export type LanguageTrack = 'all' | 'python' | 'cpp' | 'java';
export type QuestionStatus = 'pending' | 'correct' | 'skipped' | 'incorrect';

export interface MotivationalQuote {
  id: string;
  quote: string;
  author: string;
  role: string;
}

export interface TestCase {
  input: string;
  expectedOutput: string;
  description?: string;
}

export interface StepEvaluation {
  stepName: string;
  marks: number;
  maxMarks: number;
  matched: boolean;
  explanation: string;
}

export interface Problem {
  id: string;
  title: string;
  difficulty: Difficulty;
  language: Language;
  description: string;
  buggyCode: string;
  fixedCode: string;
  lineWithBug: number;
  buggyLineContent: string;
  acceptedFixes: string[];
  explanation: string;
  testCases: TestCase[];
  hints: string[];
  entrypoint?: string;
  category: string;
  marksValue?: number; // Marks per problem (e.g. 10 for Easy, 20 for Intermediate)
  stepRubric?: Array<{ stepName: string; maxMarks: number; keywords: string[]; description: string }>;
}

export type AppView = 'landing' | 'start' | 'contest' | 'report' | 'tiebreaker' | 'admin';

export interface QuestionAttempt {
  problemId: string;
  status: QuestionStatus;
  userAnswer: string;
  attemptsCount: number;
  timeSpentSeconds: number;
  hintsUsed?: number;
  hintPenaltyPercent?: number;
  feedback?: string;
  answeredAt?: number;
  marksEarned?: number;
  maxMarks?: number;
  stepBreakdown?: StepEvaluation[];
}

export interface ContestSession {
  sessionId: string;
  participantName: string;
  difficulty: Difficulty;
  languageTrack: LanguageTrack;
  startTime: number;
  endTime?: number;
  currentQuestionIndex: number;
  attempts: Record<string, QuestionAttempt>;
  score: number;
  totalMarksEarned?: number;
  maxMarksPossible?: number;
  roundNumber?: number;
  uniqueScore?: number;
  isCompleted: boolean;
  violationsCount: number;
}

export interface DetailedQuestionResult {
  id: string;
  title: string;
  language: Language;
  status: QuestionStatus;
  attempts: number;
  timeSeconds: number;
  hintsUsed?: number;
  userAnswer: string;
  expectedAnswer: string;
  explanation: string;
  marksEarned?: number;
  marksAwarded?: number;
  maxMarks?: number;
  stepBreakdown?: StepEvaluation[];
}

export interface RoundHistoryItem {
  roundNumber: number;
  date: string;
  difficulty: Difficulty;
  languageTrack: LanguageTrack;
  marksEarned: number;
  maxMarks: number;
  scorePercentage: number;
  correctCount: number;
  totalQuestions: number;
  totalTimeSeconds: number;
  totalAttempts: number;
  violationsCount: number;
  uniqueScore: number;
  detailedAnswers?: DetailedQuestionResult[];
}

export interface UserHistoryRecord {
  participantName: string;
  totalRounds: number;
  highestMarks: number;
  latestMarks: number;
  highestScorePercentage: number;
  bestRoundNumber: number;
  lastAttemptDate: string;
  rounds: RoundHistoryItem[];
}

export interface ReportSummary {
  id: string;
  participantName: string;
  difficulty: Difficulty;
  languageTrack: LanguageTrack;
  institutionName: string;
  totalQuestions: number;
  correctCount: number;
  skippedCount: number;
  incorrectCount: number;
  totalAttempts: number;
  scorePercentage: number;
  totalHintsUsed?: number;
  noHintBonusPoints?: number;
  marksEarned?: number;
  maxMarks?: number;
  maxMarksPossible?: number;
  roundNumber?: number;
  pastRounds?: RoundHistoryItem[];
  uniqueScore?: number;
  totalTimeSeconds: number;
  completedAt: string;
  languageBreakdown: Record<Language, { total: number; correct: number; skipped: number }>;
  detailedQuestions: DetailedQuestionResult[];
  savedFilePath?: string;
  rawTextReport?: string;
  violationsCount: number;
}

export interface SecurityViolation {
  id: string;
  timestamp: string;
  participantName: string;
  problemId?: string;
  problemTitle?: string;
  violationType: 'copy_attempt' | 'tab_switch' | 'devtools_open' | 'right_click' | 'unauthorized_access';
  details: string;
  telegramNotified: boolean;
}

export interface SystemStatus {
  pythonAvailable: boolean;
  cppAvailable: boolean;
  javaAvailable: boolean;
  groqConfigured: boolean;
  geminiConfigured: boolean;
  telegramConfigured: boolean;
  reportsCount: number;
}

export interface EvaluateRequest {
  problemId: string;
  userAnswer: string;
  participantName: string;
  useAiEvaluation?: boolean;
}

export interface EvaluateResponse {
  isCorrect: boolean;
  feedback: string;
  normalizedUserAnswer: string;
  matchedPattern?: string;
  aiExplanation?: string;
  diffSummary?: string;
}

export interface RunCodeRequest {
  language: Language;
  code: string;
  input?: string;
}

export interface RunCodeResponse {
  success: boolean;
  output: string;
  error?: string;
  executionTimeMs?: number;
}
