import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { exec } from 'child_process';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { PROBLEMS_DATABASE, getProblemById, getProblems } from './src/data/problems';
import { evaluateAnswerWithMarks } from './src/utils/evaluator';
import type { Difficulty, LanguageTrack, Problem } from './src/types';

dotenv.config();
dotenv.config({ path: '.env.local' });

function normalizeEnvValue(value: string | undefined): string {
  const trimmed = (value || '').trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1).trim();
    }
  }
  return trimmed;
}

function loadEnvironmentAliases() {
  const aliases: Record<string, string[]> = {
    ADMIN_SECRET: ['ADMIN_PASSWORD', 'ADMIN_PASSPHRASE', 'ADMIN_PASS_PHRASE'],
    GEMINI_API_KEY: ['GOOGLE_API_KEY', 'GOOGLE_GEMINI_API_KEY'],
    GROQ_API_KEY: ['GROQ_APIKEY']
  };

  for (const [canonical, alternatives] of Object.entries(aliases)) {
    const source = process.env[canonical] || alternatives.map(name => process.env[name]).find(Boolean);
    if (source) process.env[canonical] = normalizeEnvValue(source);
  }
}

loadEnvironmentAliases();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const IS_VERCEL = Boolean(process.env.VERCEL);
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || IS_VERCEL;

const SCRIPT_DIR = process.cwd();
const WRITABLE_ROOT = IS_VERCEL ? '/tmp' : SCRIPT_DIR;
const REPORTS_DIR = path.join(WRITABLE_ROOT, 'reports');
const DATA_DIR = path.join(WRITABLE_ROOT, 'data');
const USER_HISTORY_FILE = path.join(DATA_DIR, 'user_history.json');
const SESSIONS_HISTORY_FILE = path.join(DATA_DIR, 'all_sessions.json');
const REPORTS_INDEX_FILE = path.join(DATA_DIR, 'reports_index.json');

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const HAS_KV = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

try {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (e) {
  console.warn('Could not create data directories:', e);
}

app.use(express.json({ limit: '5mb' }));

interface SecurityViolationLog {
  id: string;
  timestamp: string;
  participantName: string;
  problemTitle: string;
  violationType: string;
  details: string;
  ip?: string;
  telegramNotified: boolean;
}

interface StoredReport {
  fileName: string;
  content: string;
  createdAt: string;
  modifiedAt: string;
  sizeBytes: number;
}

const securityViolations: SecurityViolationLog[] = [];
let memoryUserHistory: Record<string, any> | null = null;
let memorySessions: any[] | null = null;
let memoryReports: StoredReport[] | null = null;

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (e) {
      console.warn('Gemini client init error:', e);
    }
  }
  return aiClient;
}

function getAdminSecret(): string {
  return (process.env.ADMIN_SECRET || '').trim();
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function createAdminToken(): string {
  const ts = String(Date.now());
  const sig = crypto.createHmac('sha256', getAdminSecret()).update(ts).digest('hex').slice(0, 24);
  return `${ts}.${sig}`;
}

function verifyAdminToken(token: string | undefined): boolean {
  const secret = getAdminSecret();
  if (!secret || !token) return false;
  const [ts, sig] = token.split('.');
  if (!ts || !sig) return false;
  const issued = Number(ts);
  if (!Number.isFinite(issued) || Date.now() - issued > 12 * 60 * 60 * 1000) return false;
  const expected = crypto.createHmac('sha256', secret).update(ts).digest('hex').slice(0, 24);
  return timingSafeEqual(sig, expected);
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ success: false, error: 'Admin authentication required.' });
  }
  next();
}

function sanitizeProblem(p: Problem) {
  return {
    id: p.id,
    title: p.title,
    difficulty: p.difficulty,
    language: p.language,
    category: p.category,
    description: p.description,
    buggyCode: p.buggyCode,
    lineWithBug: p.lineWithBug,
    buggyLineContent: p.buggyLineContent,
    hints: p.hints,
    testCases: p.testCases,
    marksValue: p.marksValue
  };
}

function normalizeHistoryRecord(record: any) {
  if (!record) return null;
  return {
    ...record,
    roundsCount: record.totalRounds ?? record.rounds?.length ?? 0,
    bestRoundPercentage: record.bestScorePercentage ?? 0
  };
}

async function kvCommand(args: (string | number)[]): Promise<any> {
  if (!HAS_KV) return null;
  try {
    const res = await fetch(UPSTASH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args)
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    return data.result;
  } catch (e) {
    console.warn('KV command failed:', e);
    return null;
  }
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
    }
  } catch (e) {
    console.error('Error reading', filePath, e);
  }
  return fallback;
}

function writeJsonFile(filePath: string, data: unknown) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing', filePath, e);
  }
}

async function readUserHistory(): Promise<Record<string, any>> {
  if (HAS_KV) {
    const kv = await kvCommand(['GET', 'arena:user_history']);
    if (kv) {
      try {
        memoryUserHistory = typeof kv === 'string' ? JSON.parse(kv) : kv;
        return memoryUserHistory || {};
      } catch {}
    }
  }
  if (memoryUserHistory) return memoryUserHistory;
  memoryUserHistory = readJsonFile<Record<string, any>>(USER_HISTORY_FILE, {});
  return memoryUserHistory;
}

async function writeUserHistory(data: Record<string, any>) {
  memoryUserHistory = data;
  writeJsonFile(USER_HISTORY_FILE, data);
  if (HAS_KV) {
    await kvCommand(['SET', 'arena:user_history', JSON.stringify(data)]);
  }
}

async function readAllSessions(): Promise<any[]> {
  if (HAS_KV) {
    const kv = await kvCommand(['GET', 'arena:sessions']);
    if (kv) {
      try {
        memorySessions = typeof kv === 'string' ? JSON.parse(kv) : kv;
        return memorySessions || [];
      } catch {}
    }
  }
  if (memorySessions) return memorySessions;
  memorySessions = readJsonFile<any[]>(SESSIONS_HISTORY_FILE, []);
  return memorySessions;
}

async function writeAllSessions(sessions: any[]) {
  memorySessions = sessions;
  writeJsonFile(SESSIONS_HISTORY_FILE, sessions);
  if (HAS_KV) {
    await kvCommand(['SET', 'arena:sessions', JSON.stringify(sessions)]);
  }
}

async function readReports(): Promise<StoredReport[]> {
  if (HAS_KV) {
    const kv = await kvCommand(['GET', 'arena:reports']);
    if (kv) {
      try {
        memoryReports = typeof kv === 'string' ? JSON.parse(kv) : kv;
        return memoryReports || [];
      } catch {}
    }
  }
  if (memoryReports) return memoryReports;

  const indexed = readJsonFile<StoredReport[]>(REPORTS_INDEX_FILE, []);
  if (indexed.length > 0) {
    memoryReports = indexed;
    return indexed;
  }

  const fromDisk: StoredReport[] = [];
  try {
    if (fs.existsSync(REPORTS_DIR)) {
      const files = fs.readdirSync(REPORTS_DIR).filter(f => f.endsWith('.txt'));
      for (const file of files) {
        const fullPath = path.join(REPORTS_DIR, file);
        const stat = fs.statSync(fullPath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        fromDisk.push({
          fileName: file,
          content,
          createdAt: stat.birthtime.toISOString(),
          modifiedAt: stat.mtime.toISOString(),
          sizeBytes: stat.size
        });
      }
    }
  } catch (e) {
    console.warn('Could not list reports directory:', e);
  }
  memoryReports = fromDisk.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
  return memoryReports;
}

async function writeReports(reports: StoredReport[]) {
  memoryReports = reports;
  writeJsonFile(REPORTS_INDEX_FILE, reports);
  if (HAS_KV) {
    await kvCommand(['SET', 'arena:reports', JSON.stringify(reports)]);
  }
}

async function exportData() {
  const [userHistory, sessions, reports] = await Promise.all([
    readUserHistory(),
    readAllSessions(),
    readReports()
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    userHistory,
    sessions,
    reports
  };
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function checkCommand(cmd: string): Promise<boolean> {
  if (IS_VERCEL) return Promise.resolve(false);
  return new Promise((resolve) => {
    exec(cmd, { timeout: 2500 }, (err) => resolve(!err));
  });
}

function escapeTelegramHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function sendTelegramMessageToChat(chatId: string, text: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken || !chatId) return false;

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
    });
    if (!response.ok) {
      console.warn('Telegram API returned error:', (await response.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (error) {
    console.warn('Telegram dispatch failure:', error);
    return false;
  }
}

async function sendTelegramMessage(text: string): Promise<boolean> {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  return chatId ? sendTelegramMessageToChat(chatId, text) : false;
}

// -----------------------------------------------------------------------------
// API Routes
// -----------------------------------------------------------------------------

app.get('/api/status', async (_req, res) => {
  const [pythonAvailable, cppAvailable, javaAvailable] = await Promise.all([
    checkCommand('python3 --version'),
    checkCommand('g++ --version'),
    checkCommand('javac -version')
  ]);

  const reports = await readReports();

  res.json({
    status: 'ok',
    pythonAvailable,
    cppAvailable,
    javaAvailable,
    groqConfigured: Boolean(process.env.GROQ_API_KEY),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    reportsCount: reports.length,
    violationsCount: securityViolations.length,
    hostedOnVercel: IS_VERCEL,
    persistentStore: HAS_KV ? 'redis' : (IS_VERCEL ? 'ephemeral' : 'filesystem'),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/problems', (req, res) => {
  const difficulty = String(req.query.difficulty || '');
  const trackRaw = String(req.query.track || 'all');
  const track: LanguageTrack =
    trackRaw === 'python' || trackRaw === 'cpp' || trackRaw === 'java' || trackRaw === 'all'
      ? trackRaw
      : 'all';

  const validDiff = ['easy', 'medium', 'intermediate', 'hard', 'master'].includes(difficulty);
  if (validDiff) {
    const problems = getProblems(difficulty as Difficulty, track);
    return res.json(problems.map(sanitizeProblem));
  }

  res.json(PROBLEMS_DATABASE.map(sanitizeProblem));
});

app.get('/api/problems/:id', (req, res) => {
  const problem = getProblemById(req.params.id);
  if (!problem) {
    return res.status(404).json({ error: 'Problem not found' });
  }
  res.json(sanitizeProblem(problem));
});

app.post('/api/attendance', async (req, res) => {
  const participantName = String(req.body?.participantName || '').trim();
  const difficulty = String(req.body?.difficulty || '').trim();
  const languageTrack = String(req.body?.languageTrack || '').trim();

  if (!participantName) {
    return res.status(400).json({ success: false, error: 'Participant name is required.' });
  }

  const telegramNotified = await sendTelegramMessage(
    `<b>👤 New Contestant Attendance</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `<b>Candidate:</b> ${escapeTelegramHtml(participantName)}\n` +
    `<b>Difficulty:</b> ${escapeTelegramHtml(difficulty || 'Not specified')}\n` +
    `<b>Language:</b> ${escapeTelegramHtml(languageTrack || 'Not specified')}\n` +
    `<b>Time:</b> ${escapeTelegramHtml(new Date().toISOString())}\n` +
    `━━━━━━━━━━━━━━━━━━━━`
  );

  res.json({
    success: true,
    telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    telegramNotified
  });
});

app.post('/api/telegram/webhook', async (req, res) => {
  const message = req.body?.message;
  const chatId = String(message?.chat?.id || '');
  const command = String(message?.text || '').trim().split(/\s+/)[0].toLowerCase().split('@')[0];

  if (!chatId || !command.startsWith('/')) {
    return res.json({ success: true, handled: false });
  }

  let response = '';
  if (command === '/start' || command === '/help') {
    response =
      '<b>Code Debugging Arena Bot</b>\n\n' +
      '/status - service and participant count\n' +
      '/leaderboard - current top participants\n' +
      '/recent - latest attendance/completion activity\n' +
      '/help - show available commands';
  } else if (command === '/status') {
    const history = await readUserHistory();
    const sessions = await readAllSessions();
    response =
      '<b>Arena Status</b>\n' +
      `Telegram: ${process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID ? 'configured' : 'not configured'}\n` +
      `Participants: ${Object.keys(history).length}\n` +
      `Completed rounds: ${sessions.length}`;
  } else if (command === '/leaderboard') {
    const history = await readUserHistory();
    const users = Object.values(history)
      .sort((a: any, b: any) => (b.cumulativeMarks || 0) - (a.cumulativeMarks || 0))
      .slice(0, 10);
    response = users.length
      ? '<b>Leaderboard</b>\n' + users.map((user: any, index) =>
          `${index + 1}. ${escapeTelegramHtml(user.username)} - ${user.cumulativeMarks || 0} pts`
        ).join('\n')
      : 'No completed participants yet.';
  } else if (command === '/recent') {
    const sessions = await readAllSessions();
    response = sessions.length
      ? '<b>Recent Activity</b>\n' + sessions.slice(0, 10).map((session: any) =>
          `👤 ${escapeTelegramHtml(session.username)} — ${session.marksEarned || 0}/${session.maxMarksPossible || 0} pts`
        ).join('\n')
      : 'No recent activity.';
  } else {
    response = 'Unknown command. Use /help to see available commands.';
  }

  const sent = await sendTelegramMessageToChat(chatId, response);
  res.json({ success: true, handled: true, telegramNotified: sent });
});

app.post('/api/evaluate', async (req, res) => {
  try {
    const { problemId, userAnswer, useAiEvaluation } = req.body;
    const problem = getProblemById(problemId);
    if (!problem) {
      return res.status(404).json({ isCorrect: false, feedback: 'Problem not found.' });
    }

    const evalResult = evaluateAnswerWithMarks(problem, userAnswer);
    if (evalResult.isCorrect) {
      return res.json(evalResult);
    }

    if (useAiEvaluation || process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY) {
      try {
        if (process.env.GROQ_API_KEY) {
          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: [
                {
                  role: 'system',
                  content: 'You are an automated grading system for code debugging. Output strictly valid JSON: {"is_correct": boolean, "feedback": "concise feedback"}.'
                },
                {
                  role: 'user',
                  content: `Problem: ${problem.title} (${problem.language})\nBuggy code:\n${problem.buggyCode}\n\nExpected Resolution:\n${problem.fixedCode}\n\nCandidate submission:\n${userAnswer}\n\nDoes candidate fix the core bug properly without breaking functionality? Allow minor spacing/quotes differences.`
                }
              ],
              response_format: { type: 'json_object' }
            })
          });

          if (groqRes.ok) {
            const data: any = await groqRes.json();
            const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
            if (parsed.is_correct) {
              const fullMarks = problem.marksValue || (problem.difficulty === 'easy' ? 10 : problem.difficulty === 'intermediate' ? 20 : 100);
              return res.json({
                isCorrect: true,
                marksAwarded: fullMarks,
                maxMarks: fullMarks,
                stepBreakdown: evalResult.stepBreakdown.map(s => ({ ...s, matched: true, marks: s.maxMarks })),
                feedback: parsed.feedback || 'Bug correctly identified and resolved via AI evaluation.',
                normalizedUserAnswer: evalResult.normalizedUserAnswer,
                aiExplanation: parsed.feedback
              });
            }
          }
        } else if (process.env.GEMINI_API_KEY) {
          const gemini = getGeminiClient();
          if (gemini) {
            const response = await gemini.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: `You are an automated grader for a programming contest. Analyze this debug submission:
Language: ${problem.language}
Buggy code: ${problem.buggyCode}
Expected fix: ${problem.fixedCode}
Candidate fix: ${userAnswer}

Return JSON with format: {"is_correct": boolean, "feedback": "brief reason"}`
            });
            const text = response.text || '';
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
              const parsed = JSON.parse(match[0]);
              if (parsed.is_correct) {
                const fullMarks = problem.marksValue || (problem.difficulty === 'easy' ? 10 : problem.difficulty === 'intermediate' ? 20 : 100);
                return res.json({
                  isCorrect: true,
                  marksAwarded: fullMarks,
                  maxMarks: fullMarks,
                  stepBreakdown: evalResult.stepBreakdown.map(s => ({ ...s, matched: true, marks: s.maxMarks })),
                  feedback: parsed.feedback || 'Bug resolved according to AI analysis.',
                  normalizedUserAnswer: evalResult.normalizedUserAnswer
                });
              }
            }
          }
        }
      } catch (aiErr) {
        console.warn('AI evaluation error fallback:', aiErr);
      }
    }

    return res.json(evalResult);
  } catch (err: any) {
    res.status(500).json({ isCorrect: false, feedback: 'Evaluation server error: ' + err.message });
  }
});

app.get('/api/user-history/:username', async (req, res) => {
  const username = decodeURIComponent(req.params.username || '').trim().toLowerCase();
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  const historyDb = await readUserHistory();
  const userRecord = historyDb[username] || null;
  res.json({
    success: true,
    exists: Boolean(userRecord),
    username,
    record: normalizeHistoryRecord(userRecord)
  });
});

app.post('/api/user-history', async (req, res) => {
  try {
    const body = req.body || {};
    const roundPayload = body.roundData || body;
    const username = (body.username || roundPayload.username || '').trim();

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const roundId = roundPayload.roundId || 'rnd_' + Date.now();
    const difficulty = roundPayload.difficulty || 'easy';
    const languageTrack = roundPayload.languageTrack || 'all';
    const totalQuestions = Number(roundPayload.totalQuestions || (roundPayload.answers ? roundPayload.answers.length : 0)) || 0;
    const correctCount = Number(roundPayload.correctCount || (roundPayload.answers ? roundPayload.answers.filter((a: any) => a.status === 'correct').length : 0)) || 0;
    const marksEarned = Number(roundPayload.marksEarned) || 0;
    const maxMarksPossible = Number(roundPayload.maxMarksPossible || roundPayload.maxMarks) || 100;
    const scorePercentage = Number(roundPayload.scorePercentage) || (maxMarksPossible > 0 ? Math.round((marksEarned / maxMarksPossible) * 100) : 0);
    const timeSeconds = Number(roundPayload.timeSeconds || roundPayload.totalTimeSeconds) || 0;
    const violationsCount = Number(roundPayload.violationsCount) || 0;
    const questionSummaries = (roundPayload.questionSummaries || roundPayload.answers || []).map((q: any) => {
      const problem = q.id ? getProblemById(q.id) : undefined;
      return {
        ...q,
        expectedAnswer: q.expectedAnswer || problem?.acceptedFixes?.[0] || problem?.buggyLineContent || '',
        explanation: q.explanation || problem?.explanation || ''
      };
    });

    const cleanUsername = username;
    const key = cleanUsername.toLowerCase();
    const historyDb = await readUserHistory();
    const existing = historyDb[key] || {
      username: cleanUsername,
      createdAt: new Date().toISOString(),
      rounds: [],
      totalRounds: 0,
      cumulativeMarks: 0,
      maxCumulativeMarks: 0,
      bestScorePercentage: 0,
      totalQuestionsSolved: 0,
      totalTimeSpentSeconds: 0
    };

    const newRound = {
      roundNumber: existing.rounds.length + 1,
      roundId,
      timestamp: new Date().toISOString(),
      difficulty,
      languageTrack,
      totalQuestions,
      correctCount,
      marksEarned,
      maxMarksPossible,
      scorePercentage,
      timeSeconds,
      violationsCount,
      questionSummaries
    };

    existing.rounds.push(newRound);
    existing.totalRounds = existing.rounds.length;
    existing.cumulativeMarks = existing.rounds.reduce((acc: number, r: any) => acc + (r.marksEarned || 0), 0);
    existing.maxCumulativeMarks = existing.rounds.reduce((acc: number, r: any) => acc + (r.maxMarksPossible || 100), 0);
    existing.bestScorePercentage = Math.max(...existing.rounds.map((r: any) => r.scorePercentage || 0));
    existing.totalQuestionsSolved = existing.rounds.reduce((acc: number, r: any) => acc + (r.correctCount || 0), 0);
    existing.totalTimeSpentSeconds = existing.rounds.reduce((acc: number, r: any) => acc + (r.timeSeconds || 0), 0);
    existing.lastActive = new Date().toISOString();

    historyDb[key] = existing;
    await writeUserHistory(historyDb);

    const allSessions = await readAllSessions();
    allSessions.unshift({
      sessionId: newRound.roundId,
      username: cleanUsername,
      roundNumber: newRound.roundNumber,
      timestamp: newRound.timestamp,
      difficulty: newRound.difficulty,
      marksEarned: newRound.marksEarned,
      maxMarksPossible: newRound.maxMarksPossible,
      scorePercentage: newRound.scorePercentage,
      timeSeconds: newRound.timeSeconds,
      violationsCount: newRound.violationsCount,
      answers: questionSummaries
    });
    if (allSessions.length > 500) allSessions.pop();
    await writeAllSessions(allSessions);

    res.json({
      success: true,
      message: `Round ${newRound.roundNumber} recorded permanently for ${cleanUsername}.`,
      userRecord: normalizeHistoryRecord(existing),
      currentRound: newRound
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record user round: ' + err.message });
  }
});

app.get('/api/admin/sessions', requireAdmin, async (_req, res) => {
  try {
    const sessions = await readAllSessions();
    res.json({ success: true, count: sessions.length, sessions });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/admin/users', requireAdmin, async (_req, res) => {
  try {
    const historyDb = await readUserHistory();
    const users = Object.values(historyDb).map(normalizeHistoryRecord);
    res.json({ success: true, count: users.length, users });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/leaderboard', async (_req, res) => {
  try {
    const historyDb = await readUserHistory();
    const usersList: any[] = Object.values(historyDb);

    const leaderboard = usersList.map((u) => {
      const bestRound = (u.rounds || []).reduce((best: any, curr: any) => {
        if (!best) return curr;
        return (curr.marksEarned > best.marksEarned) ? curr : best;
      }, null);

      return {
        rank: 0,
        username: u.username,
        totalRounds: u.totalRounds || u.rounds?.length || 0,
        cumulativeMarks: u.cumulativeMarks || 0,
        maxCumulativeMarks: u.maxCumulativeMarks || 100,
        totalQuestionsSolved: u.totalQuestionsSolved || 0,
        bestScorePercentage: u.bestScorePercentage || 0,
        bestRoundMarks: bestRound ? `${bestRound.marksEarned}/${bestRound.maxMarksPossible}` : '0/100',
        totalTimeSpentSeconds: u.totalTimeSpentSeconds || 0,
        lastActive: u.lastActive || u.createdAt,
        roundsHistory: u.rounds || [],
        uniqueScore: (u.rounds || []).reduce((best: number, r: any) => Math.max(best, r.uniqueScore || 0), 0)
      };
    }).sort((a, b) => {
      if (b.cumulativeMarks !== a.cumulativeMarks) {
        return b.cumulativeMarks - a.cumulativeMarks;
      }
      if (b.bestScorePercentage !== a.bestScorePercentage) {
        return b.bestScorePercentage - a.bestScorePercentage;
      }
      if (b.totalQuestionsSolved !== a.totalQuestionsSolved) {
        return b.totalQuestionsSolved - a.totalQuestionsSolved;
      }
      return a.totalTimeSpentSeconds - b.totalTimeSpentSeconds;
    }).map((item, idx) => ({ ...item, rank: idx + 1 }));

    res.json({ success: true, totalParticipants: leaderboard.length, leaderboard });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/run-code', async (req, res) => {
  const { language, code } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, error: 'No code provided.' });
  }

  if (IS_VERCEL) {
    return res.json({
      success: false,
      output: '',
      error: 'Live compiler sandbox is not available on the hosted deployment. Submit your fix in the answer box — grading still works without running the compiler.'
    });
  }

  const tmpDir = path.join(SCRIPT_DIR, '.tmp_sandbox');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const runId = 'run_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const startTime = Date.now();

  try {
    if (language === 'python') {
      const filePath = path.join(tmpDir, `${runId}.py`);
      fs.writeFileSync(filePath, code);

      exec(`python3 "${filePath}"`, { timeout: 4000 }, (error, stdout, stderr) => {
        try { fs.unlinkSync(filePath); } catch {}
        const execTime = Date.now() - startTime;
        if (error && error.killed) {
          return res.json({ success: false, error: 'Execution timed out (limit: 4s)', executionTimeMs: execTime });
        }
        res.json({
          success: !error,
          output: stdout || '',
          error: stderr || (error ? error.message : undefined),
          executionTimeMs: execTime
        });
      });
    } else if (language === 'cpp') {
      const srcPath = path.join(tmpDir, `${runId}.cpp`);
      const binPath = path.join(tmpDir, `${runId}.out`);
      fs.writeFileSync(srcPath, code);

      exec(`g++ -O2 -std=c++17 "${srcPath}" -o "${binPath}"`, { timeout: 4000 }, (compileErr, _cStdout, cStderr) => {
        if (compileErr) {
          try { fs.unlinkSync(srcPath); } catch {}
          return res.json({
            success: false,
            error: 'Compilation Error:\n' + (cStderr || compileErr.message),
            output: ''
          });
        }

        exec(`"${binPath}"`, { timeout: 4000 }, (runErr, rStdout, rStderr) => {
          try {
            fs.unlinkSync(srcPath);
            fs.unlinkSync(binPath);
          } catch {}
          const execTime = Date.now() - startTime;
          res.json({
            success: !runErr,
            output: rStdout || '',
            error: rStderr || (runErr ? runErr.message : undefined),
            executionTimeMs: execTime
          });
        });
      });
    } else if (language === 'java') {
      const classNameMatch = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
      const className = classNameMatch ? classNameMatch[1] : 'Main';
      const javaFolder = path.join(tmpDir, runId);
      fs.mkdirSync(javaFolder, { recursive: true });
      const srcPath = path.join(javaFolder, `${className}.java`);
      fs.writeFileSync(srcPath, code);

      exec(`javac "${srcPath}"`, { timeout: 4000, cwd: javaFolder }, (compileErr, _cStdout, cStderr) => {
        if (compileErr) {
          try { fs.rmSync(javaFolder, { recursive: true, force: true }); } catch {}
          return res.json({
            success: false,
            error: 'Java Compilation Error:\n' + (cStderr || compileErr.message),
            output: ''
          });
        }

        exec(`java ${className}`, { timeout: 4000, cwd: javaFolder }, (runErr, rStdout, rStderr) => {
          try { fs.rmSync(javaFolder, { recursive: true, force: true }); } catch {}
          const execTime = Date.now() - startTime;
          res.json({
            success: !runErr,
            output: rStdout || '',
            error: rStderr || (runErr ? runErr.message : undefined),
            executionTimeMs: execTime
          });
        });
      });
    } else {
      res.status(400).json({ success: false, error: 'Unsupported language: ' + language });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Execution engine error: ' + err.message });
  }
});

app.post('/api/groq/ai-hint', async (req, res) => {
  const { problemId, hintIndex } = req.body;
  const problem = getProblemById(problemId);
  if (!problem) {
    return res.status(404).json({ error: 'Problem not found' });
  }

  if (problem.hints && problem.hints[hintIndex || 0]) {
    return res.json({ hint: problem.hints[hintIndex || 0], source: 'predefined' });
  }

  try {
    if (process.env.GROQ_API_KEY) {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'You are a supportive code debugging mentor. Give a concise, 1-2 sentence progressive hint guiding the candidate toward discovering the bug on their own without spoiling the exact solution code.'
            },
            {
              role: 'user',
              content: `Problem: ${problem.title}\nLanguage: ${problem.language}\nBuggy code:\n${problem.buggyCode}\nBug explanation: ${problem.explanation}`
            }
          ],
          max_tokens: 150
        })
      });
      if (groqRes.ok) {
        const data: any = await groqRes.json();
        const hintText = data.choices?.[0]?.message?.content?.trim();
        return res.json({ hint: hintText, source: 'groq' });
      }
    } else if (process.env.GEMINI_API_KEY) {
      const gemini = getGeminiClient();
      if (gemini) {
        const response = await gemini.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Provide a subtle, educational 1-sentence hint for this bug without giving away the exact code fix:
Language: ${problem.language}
Problem: ${problem.title}
Code:
${problem.buggyCode}`
        });
        return res.json({ hint: response.text?.trim(), source: 'gemini' });
      }
    }
  } catch (err) {
    console.warn('AI hint generation error:', err);
  }

  res.json({
    hint: 'Carefully inspect variable data types, memory lifetime, and loop termination boundary conditions.',
    source: 'fallback'
  });
});

app.post('/api/security/alert', async (req, res) => {
  const { participantName, violationType, problemTitle, details, timestamp } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  const violation: SecurityViolationLog = {
    id: 'viol_' + Date.now(),
    timestamp: timestamp || new Date().toISOString(),
    participantName: participantName || 'Anonymous',
    problemTitle: problemTitle || 'General Arena',
    violationType: violationType || 'copy_attempt',
    details: details || 'Security policy violation detected.',
    ip: String(ip),
    telegramNotified: false
  };

  securityViolations.unshift(violation);
  if (securityViolations.length > 200) securityViolations.pop();

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (botToken && chatId) {
    const text = `🚨 *SECURITY VIOLATION DETECTED*
━━━━━━━━━━━━━━━━━━━━
👤 *Candidate:* \`${violation.participantName}\`
⚠️ *Violation:* \`${violation.violationType}\`
🎯 *Context:* ${violation.problemTitle}
📝 *Details:* ${violation.details}
⏰ *Time:* \`${violation.timestamp}\`
🌐 *IP:* \`${violation.ip}\`
━━━━━━━━━━━━━━━━━━━━`;

    try {
      const teleRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown'
        })
      });
      if (teleRes.ok) {
        violation.telegramNotified = true;
      }
    } catch (e) {
      console.warn('Telegram dispatch failure:', e);
    }
  }

  res.json({ success: true, violation, telegramNotified: violation.telegramNotified });
});

app.post('/api/reports', async (req, res) => {
  try {
    const reportData = req.body;
    const participant = (reportData.participantName || 'candidate').replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 15);
    const fileName = `report_${participant}_${timestamp}.txt`;
    const filePath = path.join(REPORTS_DIR, fileName);

    let content = reportData.rawTextReport;
    if (!content) {
      content = `================================================================================
           CODE DEBUGGING COMPETITION ARENA - OFFICIAL REPORT
================================================================================
Generated On: ${new Date().toISOString()}
Participant:  ${reportData.participantName}
Difficulty:   ${(reportData.difficulty || 'easy').toUpperCase()}
Status:       COMPLETED

--------------------------------------------------------------------------------
EXECUTIVE PERFORMANCE SUMMARY
--------------------------------------------------------------------------------
Total Problems:    ${reportData.totalQuestions}
Correct Solved:    ${reportData.correctCount}
Skipped:           ${reportData.skippedCount}
Incorrect Tries:   ${reportData.incorrectCount}
Total Attempts:    ${reportData.totalAttempts}
Accuracy Rate:     ${reportData.scorePercentage}%
Final Score:       ${reportData.marksEarned ?? reportData.correctCount * 100} / ${reportData.maxMarksPossible ?? reportData.totalQuestions * 100} pts
Total Time Taken:  ${reportData.totalTimeSeconds} seconds (${Math.floor(reportData.totalTimeSeconds / 60)}m ${reportData.totalTimeSeconds % 60}s)
Security Flags:    ${reportData.violationsCount || 0} violation(s)

--------------------------------------------------------------------------------
DETAILED PROBLEM-BY-PROBLEM BREAKDOWN
--------------------------------------------------------------------------------
`;
      if (reportData.detailedQuestions && Array.isArray(reportData.detailedQuestions)) {
        reportData.detailedQuestions.forEach((q: any, i: number) => {
          const problem = q.id ? getProblemById(q.id) : undefined;
          const expected = q.expectedAnswer || problem?.acceptedFixes?.[0] || 'N/A';
          const explanation = q.explanation || problem?.explanation || '';
          content += `[#${String(i + 1).padStart(2, '0')}] [${(q.language || '').toUpperCase()}] ${q.title}
      Result:   ${String(q.status || '').toUpperCase()} | Attempts: ${q.attempts} | Time: ${q.timeSeconds}s
      Candidate Answer: ${q.userAnswer || '(None / Skipped)'}
      Expected Fix:     ${expected}
      Explanation:      ${explanation}

`;
        });
      }
      content += `================================================================================
Verified by Automated Code Debugging Engine.
Saved at: ${filePath}
================================================================================
`;
    }

    try {
      fs.writeFileSync(filePath, content, 'utf-8');
    } catch (e) {
      console.warn('Could not write report file (using in-memory store):', e);
    }

    const reports = await readReports();
    reports.unshift({
      fileName,
      content,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      sizeBytes: Buffer.byteLength(content, 'utf-8')
    });
    if (reports.length > 200) reports.pop();
    await writeReports(reports);

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (botToken && chatId) {
      const summaryMsg = `🏁 *CONTEST REPORT GENERATED*
━━━━━━━━━━━━━━━━━━━━
👤 *Candidate:* \`${reportData.participantName}\`
🎯 *Difficulty:* \`${(reportData.difficulty || '').toUpperCase()}\`
💻 *Language:* \`${(reportData.languageTrack || 'all').toUpperCase()}\`
🏆 *Score:* \`${reportData.marksEarned ?? reportData.correctCount * 100} / ${reportData.maxMarksPossible ?? reportData.totalQuestions * 100}\` (${reportData.scorePercentage}%)
✅ *Correct:* \`${reportData.correctCount}\` | ⏭️ *Skipped:* \`${reportData.skippedCount}\`
🔁 *Attempts:* \`${reportData.totalAttempts || 0}\` | 💡 *Hints:* \`${reportData.totalHintsUsed || 0}\`
⚡ *Unique score:* \`${reportData.uniqueScore || 0}\`
🚨 *Security flags:* \`${reportData.violationsCount || 0}\`
⏰ *Time:* \`${reportData.totalTimeSeconds}s\`
📁 *File:* \`${fileName}\`
━━━━━━━━━━━━━━━━━━━━`;
      sendTelegramMessage(summaryMsg).catch(() => {});
    }

    res.json({
      success: true,
      fileName,
      filePath: `/reports/${fileName}`,
      content
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save report: ' + err.message });
  }
});

app.get('/api/reports', requireAdmin, async (_req, res) => {
  try {
    const reports = await readReports();
    res.json(reports.map(r => ({
      fileName: r.fileName,
      sizeBytes: r.sizeBytes,
      createdAt: r.createdAt,
      modifiedAt: r.modifiedAt,
      preview: r.content.slice(0, 500)
    })).sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list reports: ' + err.message });
  }
});

app.get('/api/reports/:fileName', requireAdmin, async (req, res) => {
  const fileName = path.basename(req.params.fileName);
  const reports = await readReports();
  const found = reports.find(r => r.fileName === fileName);
  if (found) {
    res.setHeader('Content-Type', 'text/plain');
    return res.send(found.content);
  }

  const filePath = path.join(REPORTS_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Report file not found.' });
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  res.setHeader('Content-Type', 'text/plain');
  res.send(content);
});

app.get('/api/admin/data/export', requireAdmin, async (_req, res) => {
  try {
    res.json({ success: true, store: HAS_KV ? 'redis' : (IS_VERCEL ? 'ephemeral' : 'filesystem'), data: await exportData() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to export data: ' + err.message });
  }
});

app.post('/api/admin/data/import', requireAdmin, async (req, res) => {
  try {
    const data = req.body?.data;
    if (!isRecord(data) || !isRecord(data.userHistory) || !Array.isArray(data.sessions) || !Array.isArray(data.reports)) {
      return res.status(400).json({ success: false, error: 'Invalid sync file. Expected userHistory, sessions, and reports.' });
    }
    const reports = data.reports.filter((report: any) =>
      isRecord(report) && typeof report.fileName === 'string' && typeof report.content === 'string'
    );
    await Promise.all([
      writeUserHistory(data.userHistory),
      writeAllSessions(data.sessions),
      writeReports(reports)
    ]);
    res.json({
      success: true,
      message: `Imported ${Object.keys(data.userHistory).length} users, ${data.sessions.length} sessions, and ${reports.length} reports.`,
      store: HAS_KV ? 'redis' : (IS_VERCEL ? 'ephemeral' : 'filesystem')
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to import data: ' + err.message });
  }
});

app.get('/api/bash-script', (req, res) => {
  const scriptPath = path.join(SCRIPT_DIR, 'debug_contest.sh');
  if (!fs.existsSync(scriptPath)) {
    return res.status(404).json({ error: 'Bash script not found.' });
  }
  const content = fs.readFileSync(scriptPath, 'utf-8');
  if (req.query.download === 'true') {
    res.setHeader('Content-Disposition', 'attachment; filename="debug_contest.sh"');
    res.setHeader('Content-Type', 'application/x-sh');
  } else {
    res.setHeader('Content-Type', 'text/plain');
  }
  res.send(content);
});

app.post('/api/admin/login', (req, res) => {
  const { secret } = req.body;
  const adminSecret = getAdminSecret();
  if (!adminSecret) {
    return res.status(500).json({
      success: false,
      error: 'Admin secret is not configured on the server. Set ADMIN_SECRET in the hosting environment.'
    });
  }
  if (typeof secret === 'string' && timingSafeEqual(secret, adminSecret)) {
    return res.json({
      success: true,
      token: createAdminToken(),
      violations: securityViolations,
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        groqConfigured: Boolean(process.env.GROQ_API_KEY),
        geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
        telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
        hostedOnVercel: IS_VERCEL,
        persistentStore: HAS_KV ? 'redis' : (IS_VERCEL ? 'ephemeral' : 'filesystem')
      }
    });
  }
  res.status(401).json({ success: false, error: 'Invalid admin credentials.' });
});

app.get('/api/admin/config', requireAdmin, (_req, res) => {
  const maskKey = (k?: string) => {
    if (!k || k.length < 8) return k ? '••••••••' : '';
    return k.slice(0, 6) + '••••••••' + k.slice(-4);
  };

  res.json({
    success: true,
    config: {
      geminiApiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
      geminiApiKeyMasked: maskKey(process.env.GEMINI_API_KEY),
      groqApiKeyConfigured: Boolean(process.env.GROQ_API_KEY),
      groqApiKeyMasked: maskKey(process.env.GROQ_API_KEY),
      telegramBotTokenConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      telegramBotTokenMasked: maskKey(process.env.TELEGRAM_BOT_TOKEN),
      telegramChatIdConfigured: Boolean(process.env.TELEGRAM_CHAT_ID),
      telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
      adminSecretSet: Boolean(getAdminSecret())
    }
  });
});

app.post('/api/admin/config', requireAdmin, (req, res) => {
  try {
    const { geminiApiKey, groqApiKey, telegramBotToken, telegramChatId, adminSecret } = req.body;

    if (geminiApiKey !== undefined && geminiApiKey.trim()) {
      process.env.GEMINI_API_KEY = geminiApiKey.trim();
      aiClient = null;
    }
    if (groqApiKey !== undefined && groqApiKey.trim()) {
      process.env.GROQ_API_KEY = groqApiKey.trim();
    }
    if (telegramBotToken !== undefined && telegramBotToken.trim()) {
      process.env.TELEGRAM_BOT_TOKEN = telegramBotToken.trim();
    }
    if (telegramChatId !== undefined && telegramChatId.trim()) {
      process.env.TELEGRAM_CHAT_ID = telegramChatId.trim();
    }
    if (adminSecret !== undefined && adminSecret.trim()) {
      process.env.ADMIN_SECRET = adminSecret.trim();
    }

    res.json({
      success: true,
      message: 'Configuration updated in the active runtime. On Vercel, set the same values in Project Settings → Environment Variables so they survive redeploys.',
      systemInfo: {
        groqConfigured: Boolean(process.env.GROQ_API_KEY),
        geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
        telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/test-gemini', requireAdmin, async (_req, res) => {
  const gemini = getGeminiClient();
  if (!gemini) {
    return res.status(400).json({
      success: false,
      error: 'GEMINI_API_KEY is not configured or failed to initialize.'
    });
  }

  try {
    const response = await gemini.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Respond with the exact word: "READY_GEMINI_OK"'
    });
    res.json({
      success: true,
      message: 'Gemini 2.5 Flash API connection verified successfully!',
      response: response.text?.trim()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Gemini API test failed: ' + err.message });
  }
});

app.post('/api/admin/test-groq', requireAdmin, async (_req, res) => {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return res.status(400).json({
      success: false,
      error: 'GROQ_API_KEY is not configured.'
    });
  }

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Say "GROQ_OK"' }],
        max_tokens: 10
      })
    });

    if (groqRes.ok) {
      const data: any = await groqRes.json();
      return res.json({
        success: true,
        message: 'Groq Llama-3.3-70b API connection verified successfully!',
        response: data.choices?.[0]?.message?.content?.trim()
      });
    }
    const errText = await groqRes.text();
    res.status(500).json({ success: false, error: 'Groq API error: ' + errText });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Groq connection failed: ' + err.message });
  }
});

app.post('/api/admin/test-telegram', requireAdmin, async (_req, res) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return res.status(400).json({
      success: false,
      error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not configured.'
    });
  }

  try {
    const text = `🔔 *ADMIN TEST NOTIFICATION*
━━━━━━━━━━━━━━━━━━━━
✅ Telegram integration verified from Code Debugging Arena web dashboard.
⏰ Timestamp: \`${new Date().toISOString()}\`
━━━━━━━━━━━━━━━━━━━━`;

    const teleRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
    });

    if (teleRes.ok) {
      return res.json({ success: true, message: 'Test notification sent to Telegram chat successfully.' });
    }
    const errBody = await teleRes.text();
    res.status(500).json({ success: false, error: 'Telegram API returned error: ' + errBody });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/test-all', requireAdmin, async (_req, res) => {
  const timestamp = new Date().toISOString();
  const results: Record<string, {
    name: string;
    category: string;
    status: 'PASSED' | 'WARNING' | 'FAILED' | 'NOT_CONFIGURED';
    latencyMs: number;
    details: string;
    diagnosticInfo?: any;
  }> = {};

  const startServer = Date.now();
  const memory = process.memoryUsage();
  results.serverRuntime = {
    name: 'Node.js Core Runtime & Memory',
    category: 'System Core',
    status: 'PASSED',
    latencyMs: Date.now() - startServer,
    details: `Uptime: ${Math.round(process.uptime())}s | Heap: ${Math.round(memory.heapUsed / 1024 / 1024)}MB / ${Math.round(memory.heapTotal / 1024 / 1024)}MB`,
    diagnosticInfo: {
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      rssMb: Math.round(memory.rss / 1024 / 1024),
      hostedOnVercel: IS_VERCEL
    }
  };

  const startDb = Date.now();
  try {
    const history = await readUserHistory();
    const sessions = await readAllSessions();
    const userCount = Object.keys(history).length;
    const sessionCount = sessions.length;
    results.userDatabase = {
      name: 'User Database & Multi-Round Store',
      category: 'Persistence',
      status: 'PASSED',
      latencyMs: Date.now() - startDb,
      details: `Active contestants: ${userCount} | Sessions: ${sessionCount} | Store: ${HAS_KV ? 'Redis' : (IS_VERCEL ? 'ephemeral /tmp' : 'filesystem')}.`,
      diagnosticInfo: { userCount, sessionCount, persistentStore: HAS_KV ? 'redis' : (IS_VERCEL ? 'ephemeral' : 'filesystem') }
    };
  } catch (err: any) {
    results.userDatabase = {
      name: 'User Database & Multi-Round Store',
      category: 'Persistence',
      status: 'FAILED',
      latencyMs: Date.now() - startDb,
      details: 'Error accessing user history store: ' + err.message
    };
  }

  const startFs = Date.now();
  try {
    const reports = await readReports();
    results.reportStorage = {
      name: 'Report Storage Subsystem',
      category: 'Storage',
      status: 'PASSED',
      latencyMs: Date.now() - startFs,
      details: `Stored reports: ${reports.length}.`,
      diagnosticInfo: { reportsCount: reports.length }
    };
  } catch (err: any) {
    results.reportStorage = {
      name: 'Report Storage Subsystem',
      category: 'Storage',
      status: 'FAILED',
      latencyMs: Date.now() - startFs,
      details: 'Storage check failed: ' + err.message
    };
  }

  const startEval = Date.now();
  try {
    const sample = getProblemById('py-easy-1');
    if (sample) {
      const evalOk = evaluateAnswerWithMarks(sample, 'for i in range(1, n + 1):');
      results.codeEvaluator = {
        name: 'Multi-Language Code Evaluation Engine',
        category: 'Grading Engine',
        status: evalOk.isCorrect ? 'PASSED' : 'WARNING',
        latencyMs: Date.now() - startEval,
        details: evalOk.isCorrect
          ? 'Python, C++, Java grading heuristics are operational.'
          : 'Evaluator heuristic returned unexpected outcome.'
      };
    }
  } catch (err: any) {
    results.codeEvaluator = {
      name: 'Multi-Language Code Evaluation Engine',
      category: 'Grading Engine',
      status: 'FAILED',
      latencyMs: Date.now() - startEval,
      details: 'Evaluator engine error: ' + err.message
    };
  }

  const startSec = Date.now();
  results.antiCheat = {
    name: 'Anti-Cheat Proctor Ingress & Telemetry',
    category: 'Security',
    status: 'PASSED',
    latencyMs: Date.now() - startSec,
    details: `Proctor listener active. Logged security events: ${securityViolations.length}.`,
    diagnosticInfo: { loggedEvents: securityViolations.length }
  };

  const startGemini = Date.now();
  if (process.env.GEMINI_API_KEY) {
    const gemini = getGeminiClient();
    if (gemini) {
      try {
        const geminiRes = await gemini.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: 'Respond with "DIAGNOSTIC_GEMINI_OK"'
        });
        const respText = geminiRes.text?.trim() || '';
        results.geminiAi = {
          name: 'Gemini 2.5 Flash AI Engine',
          category: 'AI Services',
          status: 'PASSED',
          latencyMs: Date.now() - startGemini,
          details: `Connected & responding. Output: "${respText.slice(0, 30)}"`,
          diagnosticInfo: { model: 'gemini-2.5-flash', response: respText }
        };
      } catch (err: any) {
        results.geminiAi = {
          name: 'Gemini 2.5 Flash AI Engine',
          category: 'AI Services',
          status: 'FAILED',
          latencyMs: Date.now() - startGemini,
          details: 'Gemini API call failed: ' + err.message
        };
      }
    } else {
      results.geminiAi = {
        name: 'Gemini 2.5 Flash AI Engine',
        category: 'AI Services',
        status: 'FAILED',
        latencyMs: Date.now() - startGemini,
        details: 'Gemini client failed initialization.'
      };
    }
  } else {
    results.geminiAi = {
      name: 'Gemini 2.5 Flash AI Engine',
      category: 'AI Services',
      status: 'NOT_CONFIGURED',
      latencyMs: 0,
      details: 'GEMINI_API_KEY is not configured.'
    };
  }

  const startGroq = Date.now();
  if (process.env.GROQ_API_KEY) {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'Say "GROQ_OK"' }],
          max_tokens: 10
        })
      });

      if (groqRes.ok) {
        const groqData: any = await groqRes.json();
        const output = groqData.choices?.[0]?.message?.content?.trim() || '';
        results.groqAi = {
          name: 'Groq Llama-3.3-70b Inference Engine',
          category: 'AI Services',
          status: 'PASSED',
          latencyMs: Date.now() - startGroq,
          details: `Connected & responding. Output: "${output.slice(0, 30)}"`,
          diagnosticInfo: { model: 'llama-3.3-70b-versatile', response: output }
        };
      } else {
        const errText = await groqRes.text();
        results.groqAi = {
          name: 'Groq Llama-3.3-70b Inference Engine',
          category: 'AI Services',
          status: 'FAILED',
          latencyMs: Date.now() - startGroq,
          details: 'Groq API returned error: ' + errText.slice(0, 80)
        };
      }
    } catch (err: any) {
      results.groqAi = {
        name: 'Groq Llama-3.3-70b Inference Engine',
        category: 'AI Services',
        status: 'FAILED',
        latencyMs: Date.now() - startGroq,
        details: 'Groq connection failed: ' + err.message
      };
    }
  } else {
    results.groqAi = {
      name: 'Groq Llama-3.3-70b Inference Engine',
      category: 'AI Services',
      status: 'NOT_CONFIGURED',
      latencyMs: 0,
      details: 'GROQ_API_KEY is not configured.'
    };
  }

  const startTele = Date.now();
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    try {
      const pingText = `⚡ *ARENA ONE-CLICK FULL AUDIT PING*\n━━━━━━━━━━━━━━━━━━━━\n✅ Admin performed 1-click all-functions test.\n⏰ Time: \`${timestamp}\`\n━━━━━━━━━━━━━━━━━━━━`;
      const teleRes = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: pingText,
          parse_mode: 'Markdown'
        })
      });

      if (teleRes.ok) {
        results.telegramProctor = {
          name: 'Telegram Real-Time Proctor Dispatcher',
          category: 'Alerts & Proctoring',
          status: 'PASSED',
          latencyMs: Date.now() - startTele,
          details: 'Alert bot successfully verified and delivered test message to target chat.',
          diagnosticInfo: { chatId: process.env.TELEGRAM_CHAT_ID }
        };
      } else {
        const teleErr = await teleRes.text();
        results.telegramProctor = {
          name: 'Telegram Real-Time Proctor Dispatcher',
          category: 'Alerts & Proctoring',
          status: 'FAILED',
          latencyMs: Date.now() - startTele,
          details: 'Telegram API returned: ' + teleErr.slice(0, 80)
        };
      }
    } catch (err: any) {
      results.telegramProctor = {
        name: 'Telegram Real-Time Proctor Dispatcher',
        category: 'Alerts & Proctoring',
        status: 'FAILED',
        latencyMs: Date.now() - startTele,
        details: 'Telegram connection error: ' + err.message
      };
    }
  } else {
    results.telegramProctor = {
      name: 'Telegram Real-Time Proctor Dispatcher',
      category: 'Alerts & Proctoring',
      status: 'NOT_CONFIGURED',
      latencyMs: 0,
      details: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing.'
    };
  }

  const allValues = Object.values(results);
  const passedCount = allValues.filter(r => r.status === 'PASSED').length;
  const failedCount = allValues.filter(r => r.status === 'FAILED').length;
  const warningCount = allValues.filter(r => r.status === 'WARNING').length;
  const notConfiguredCount = allValues.filter(r => r.status === 'NOT_CONFIGURED').length;
  const totalChecks = allValues.length;

  res.json({
    success: true,
    timestamp,
    overallHealthy: failedCount === 0,
    summary: {
      totalChecks,
      passedCount,
      failedCount,
      warningCount,
      notConfiguredCount,
      healthScore: totalChecks > 0 ? Math.round((passedCount / totalChecks) * 100) : 0
    },
    results
  });
});

async function startServer() {
  if (!IS_PRODUCTION) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ARENA] Code Debugging Competition Server listening on http://0.0.0.0:${PORT}`);
    console.log(`[ARENA] Reports directory: ${REPORTS_DIR}`);
  });

  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (webhookUrl && botToken) {
    fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: `${webhookUrl.replace(/\/$/, '')}/api/telegram/webhook` })
    }).catch(error => console.warn('Could not configure Telegram webhook:', error));
    fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start', description: 'Show bot help' },
          { command: 'status', description: 'Show arena status' },
          { command: 'leaderboard', description: 'Show top participants' },
          { command: 'recent', description: 'Show recent activity' },
          { command: 'help', description: 'Show available commands' }
        ]
      })
    }).catch(error => console.warn('Could not configure Telegram commands:', error));
  }
}

if (!IS_VERCEL) {
  startServer();
}

export default app;
