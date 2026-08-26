import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  X, 
  ShieldAlert, 
  FileText, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Download, 
  Eye, 
  Trophy,
  Users,
  History,
  Code,
  Clock,
  Award,
  ChevronDown,
  ChevronRight,
  Server,
  Key,
  ArrowLeft,
  Sparkles,
  Check,
  Zap,
  Activity,
  Cpu,
  Database,
  ShieldCheck,
  Layers,
  Terminal,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { SecurityViolation } from '../types';

interface SavedReportItem {
  fileName: string;
  sizeBytes: number;
  createdAt: string;
  modifiedAt: string;
  preview: string;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  totalRounds: number;
  cumulativeMarks: number;
  maxCumulativeMarks: number;
  totalQuestionsSolved: number;
  bestScorePercentage: number;
  bestRoundMarks: string;
  totalTimeSpentSeconds: number;
  lastActive: string;
  roundsHistory: any[];
}

interface AdminSessionRecord {
  sessionId: string;
  username: string;
  roundNumber: number;
  timestamp: string;
  difficulty: string;
  marksEarned: number;
  maxMarksPossible: number;
  scorePercentage: number;
  timeSeconds: number;
  violationsCount: number;
  answers: Array<{
    problemId: string;
    title: string;
    language: string;
    status: string;
    attempts: number;
    timeSeconds: number;
    userAnswer: string;
    expectedAnswer: string;
    explanation?: string;
    marksAwarded?: number;
    maxMarks?: number;
  }>;
}

interface AdminConfigState {
  geminiApiKeyConfigured: boolean;
  geminiApiKeyMasked: string;
  groqApiKeyConfigured: boolean;
  groqApiKeyMasked: string;
  telegramBotTokenConfigured: boolean;
  telegramBotTokenMasked: string;
  telegramChatIdConfigured: boolean;
  telegramChatId: string;
  adminSecretSet: boolean;
}

interface FunctionTestItem {
  name: string;
  category: string;
  status: 'PASSED' | 'WARNING' | 'FAILED' | 'NOT_CONFIGURED';
  latencyMs: number;
  details: string;
  diagnosticInfo?: any;
}

interface AllTestResponse {
  success: boolean;
  timestamp: string;
  overallHealthy: boolean;
  summary: {
    totalChecks: number;
    passedCount: number;
    failedCount: number;
    warningCount: number;
    notConfiguredCount: number;
    healthScore: number;
  };
  results: Record<string, FunctionTestItem>;
}

interface AdminPanelProps {
  isOpen?: boolean;
  onClose: () => void;
  isStandalonePage?: boolean;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  isOpen = true, 
  onClose,
  isStandalonePage = false 
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(sessionStorage.getItem('arena_admin_token')));
  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem('arena_admin_token') || '');
  const [passphrase, setPassphrase] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'sessions' | 'apikeys' | 'reports' | 'violations' | 'sync'>('leaderboard');

  // Data Collections
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [sessions, setSessions] = useState<AdminSessionRecord[]>([]);
  const [reports, setReports] = useState<SavedReportItem[]>([]);
  const [violations, setViolations] = useState<SecurityViolation[]>([]);
  const [systemInfo, setSystemInfo] = useState<any>(null);

  // Configuration & API Keys State
  const [configState, setConfigState] = useState<AdminConfigState | null>(null);
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [groqKeyInput, setGroqKeyInput] = useState('');
  const [telegramTokenInput, setTelegramTokenInput] = useState('');
  const [telegramChatIdInput, setTelegramChatIdInput] = useState('');
  const [newAdminSecretInput, setNewAdminSecretInput] = useState('');
  const [configSaveMsg, setConfigSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Individual Test Actions State
  const [testGeminiResult, setTestGeminiResult] = useState<string | null>(null);
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [testGroqResult, setTestGroqResult] = useState<string | null>(null);
  const [isTestingGroq, setIsTestingGroq] = useState(false);
  const [testTelegramResult, setTestTelegramResult] = useState<string | null>(null);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);

  // All-in-One Comprehensive Diagnostic Test State
  const [isRunningAllTests, setIsRunningAllTests] = useState(false);
  const [allTestResults, setAllTestResults] = useState<AllTestResponse | null>(null);
  const [allTestError, setAllTestError] = useState<string | null>(null);
  const [expandedDiagKey, setExpandedDiagKey] = useState<string | null>(null);

  // Expanded session details drilldown
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Selected Report Modal
  const [selectedReportContent, setSelectedReportContent] = useState<string | null>(null);
  const [selectedReportName, setSelectedReportName] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFile, setSyncFile] = useState<File | null>(null);

  const adminFetch = (input: RequestInfo | URL, init: RequestInit = {}) => fetch(input, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${adminToken}` }
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchAdminData();
      fetchConfigData();
    }
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: passphrase })
      });

      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(true);
        setAdminToken(data.token);
        sessionStorage.setItem('arena_admin_token', data.token);
        setViolations(data.violations || []);
        setSystemInfo(data.systemInfo || {});
      } else {
        setLoginError('Invalid admin secret passphrase.');
      }
    } catch (e: any) {
      setLoginError('Login failed: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAdminData = async () => {
    fetchLeaderboard();
    fetchSessions();
    fetchReports();
  };

  const fetchConfigData = async () => {
    try {
      const res = await adminFetch('/api/admin/config');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.config) {
          setConfigState(data.config);
          setTelegramChatIdInput(data.config.telegramChatId || '');
        }
      }
    } catch (err) {
      console.warn('Could not fetch config:', err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (e) {
      console.warn('Could not fetch leaderboard:', e);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await adminFetch('/api/admin/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (e) {
      console.warn('Could not fetch sessions:', e);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await adminFetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (e) {
      console.warn('Could not fetch reports:', e);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setConfigSaveMsg(null);

    const payload: any = {};
    if (geminiKeyInput.trim()) payload.geminiApiKey = geminiKeyInput.trim();
    if (groqKeyInput.trim()) payload.groqApiKey = groqKeyInput.trim();
    if (telegramTokenInput.trim()) payload.telegramBotToken = telegramTokenInput.trim();
    if (telegramChatIdInput.trim()) payload.telegramChatId = telegramChatIdInput.trim();
    if (newAdminSecretInput.trim()) payload.adminSecret = newAdminSecretInput.trim();

    try {
      const res = await adminFetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConfigSaveMsg({ type: 'success', text: data.message || 'API Keys and runtime configuration successfully updated!' });
        setGeminiKeyInput('');
        setGroqKeyInput('');
        setTelegramTokenInput('');
        setNewAdminSecretInput('');
        fetchConfigData();
      } else {
        setConfigSaveMsg({ type: 'error', text: data.error || 'Failed to update configuration.' });
      }
    } catch (err: any) {
      setConfigSaveMsg({ type: 'error', text: err.message });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleTestGemini = async () => {
    setIsTestingGemini(true);
    setTestGeminiResult(null);
    try {
      const res = await adminFetch('/api/admin/test-gemini', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestGeminiResult('✅ ' + data.message + ' Response: ' + data.response);
      } else {
        setTestGeminiResult('❌ ' + (data.error || 'Gemini API test failed. Check API key.'));
      }
    } catch (err: any) {
      setTestGeminiResult('❌ ' + err.message);
    } finally {
      setIsTestingGemini(false);
    }
  };

  const handleTestGroq = async () => {
    setIsTestingGroq(true);
    setTestGroqResult(null);
    try {
      const res = await adminFetch('/api/admin/test-groq', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestGroqResult('✅ ' + data.message + ' Response: ' + data.response);
      } else {
        setTestGroqResult('❌ ' + (data.error || 'Groq API test failed. Check API key.'));
      }
    } catch (err: any) {
      setTestGroqResult('❌ ' + err.message);
    } finally {
      setIsTestingGroq(false);
    }
  };

  const handleTestTelegram = async () => {
    setIsTestingTelegram(true);
    setTestTelegramResult(null);
    try {
      const res = await adminFetch('/api/admin/test-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestTelegramResult('✅ Telegram test notification dispatched and confirmed.');
      } else {
        setTestTelegramResult('❌ ' + (data.error || 'Failed to dispatch Telegram alert. Check bot token and chat id.'));
      }
    } catch (e: any) {
      setTestTelegramResult('❌ Error: ' + e.message);
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const handleRunAllTests = async () => {
    setIsRunningAllTests(true);
    setAllTestError(null);
    try {
      const res = await adminFetch('/api/admin/test-all', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setAllTestResults(data);
        setActiveTab('apikeys');
      } else {
        setAllTestError(data.error || 'Failed to complete comprehensive system audit.');
      }
    } catch (err: any) {
      setAllTestError('Audit execution error: ' + err.message);
    } finally {
      setIsRunningAllTests(false);
    }
  };

  const handleViewReport = async (fileName: string) => {
    try {
      const res = await adminFetch(`/api/reports/${encodeURIComponent(fileName)}`);
      if (res.ok) {
        const text = await res.text();
        setSelectedReportContent(text);
        setSelectedReportName(fileName);
      }
    } catch (e) {
      alert('Could not load report content');
    }
  };

  const handleExportData = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await adminFetch('/api/admin/data/export');
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Export failed.');
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `arena-sync-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setSyncMessage({ type: 'success', text: 'All users, sessions, and reports exported successfully.' });
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: err.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportData = async () => {
    if (!syncFile) return;
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const data = JSON.parse(await syncFile.text());
      const res = await adminFetch('/api/admin/data/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || 'Import failed.');
      setSyncMessage({ type: 'success', text: result.message });
      setSyncFile(null);
      fetchAdminData();
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: 'Invalid sync file or import failed: ' + err.message });
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen && !isStandalonePage) return null;

  return (
    <div className={`${isStandalonePage ? 'min-h-screen bg-[#0d1117] p-4 sm:p-8 font-mono' : 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn font-mono'}`}>
      <div className={`bg-[#161b22] border border-[#30363d] w-full ${isStandalonePage ? 'max-w-7xl mx-auto' : 'max-w-6xl max-h-[94vh]'} flex flex-col shadow-2xl overflow-hidden rounded-md`}>
        {/* Header */}
        <div className="bg-[#010409] px-6 py-4 border-b border-[#30363d] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-[#161b22] hover:bg-[#21262d] text-[#58a6ff] hover:text-[#79c0ff] border border-[#30363d] text-xs font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Return to contest arena"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>ARENA</span>
            </button>
            <div className="h-5 w-[1px] bg-[#30363d] hidden sm:block"></div>
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 bg-[#161b22] border border-[#30363d] flex items-center justify-center text-[#58a6ff]">
                <Lock className="h-3.5 w-3.5" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#f0f6fc]">
                  CHAMPIONSHIP ADMIN CONSOLE // MANAGEMENT & AUDITING
                </h2>
                <p className="text-[10px] text-[#8b949e]">
                  GOVERNMENT THIRUMAGAL MILLS COLLEGE • COMPUTER SCIENCE DEPARTMENT
                </p>
              </div>
            </div>
          </div>
          
          {!isStandalonePage && (
            <button
              onClick={onClose}
              className="p-1 text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] transition-colors border border-transparent hover:border-[#30363d] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {!isAuthenticated ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="max-w-md mx-auto py-12 space-y-5">
              <div className="text-center space-y-2 mb-6">
                <div className="h-12 w-12 bg-[#010409] border border-[#30363d] text-[#58a6ff] flex items-center justify-center mx-auto shadow-inner">
                  <Lock className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#f0f6fc]">
                  ADMINISTRATIVE ACCESS REQUIRED
                </h3>
                <p className="text-xs text-[#8b949e]">
                  Enter tournament secret passphrase to access the live leaderboard, student submissions, and cloud API keys.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8b949e]">
                  PASSPHRASE AUTHENTICATION:
                </label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter admin secret"
                  className="w-full bg-[#010409] border border-[#30363d] px-3.5 py-2.5 text-xs text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff] placeholder-[#484f58]"
                  autoFocus
                />
              </div>

              {loginError && (
                <div className="p-3 bg-[#ff5f56]/10 border border-[#ff5f56]/30 text-[#f85149] text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-[#238636] hover:bg-[#2ea043] text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>AUTHENTICATING...</span>
                  </>
                ) : (
                  <span>AUTHENTICATE AS ADMIN</span>
                )}
              </button>

            </form>
          ) : (
            /* Authenticated Admin Dashboard */
            <div className="space-y-6">
              {/* Navigation Tabs */}
              <div className="flex flex-wrap items-center gap-2 border-b border-[#30363d] pb-3 text-xs font-bold">
                <button
                  onClick={() => setActiveTab('leaderboard')}
                  className={`px-3 py-1.5 flex items-center gap-1.5 uppercase transition-colors cursor-pointer border ${
                    activeTab === 'leaderboard'
                      ? 'bg-[#1f6feb] text-white border-[#388bfd]'
                      : 'bg-[#010409] text-[#8b949e] hover:text-[#f0f6fc] border-[#30363d]'
                  }`}
                >
                  <Trophy className="h-3.5 w-3.5 text-amber-400" />
                  <span>CUMULATIVE LEADERBOARD ({leaderboard.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('sessions')}
                  className={`px-3 py-1.5 flex items-center gap-1.5 uppercase transition-colors cursor-pointer border ${
                    activeTab === 'sessions'
                      ? 'bg-[#1f6feb] text-white border-[#388bfd]'
                      : 'bg-[#010409] text-[#8b949e] hover:text-[#f0f6fc] border-[#30363d]'
                  }`}
                >
                  <Code className="h-3.5 w-3.5" />
                  <span>EXAM SESSIONS & ANSWERS ({sessions.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('apikeys')}
                  className={`px-3 py-1.5 flex items-center gap-1.5 uppercase transition-colors cursor-pointer border ${
                    activeTab === 'apikeys'
                      ? 'bg-[#1f6feb] text-white border-[#388bfd]'
                      : 'bg-[#010409] text-[#8b949e] hover:text-[#f0f6fc] border-[#30363d]'
                  }`}
                >
                  <Key className="h-3.5 w-3.5 text-emerald-400" />
                  <span>API KEYS & INTEGRATIONS</span>
                </button>

                <button
                  onClick={() => setActiveTab('reports')}
                  className={`px-3 py-1.5 flex items-center gap-1.5 uppercase transition-colors cursor-pointer border ${
                    activeTab === 'reports'
                      ? 'bg-[#1f6feb] text-white border-[#388bfd]'
                      : 'bg-[#010409] text-[#8b949e] hover:text-[#f0f6fc] border-[#30363d]'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>SAVED REPORTS ({reports.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('violations')}
                  className={`px-3 py-1.5 flex items-center gap-1.5 uppercase transition-colors cursor-pointer border ${
                    activeTab === 'violations'
                      ? 'bg-[#1f6feb] text-white border-[#388bfd]'
                      : 'bg-[#010409] text-[#8b949e] hover:text-[#f0f6fc] border-[#30363d]'
                  }`}
                >
                  <ShieldAlert className="h-3.5 w-3.5 text-[#f85149]" />
                  <span>SECURITY AUDIT ({violations.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('sync')}
                  className={`px-3 py-1.5 flex items-center gap-1.5 uppercase transition-colors cursor-pointer border ${
                    activeTab === 'sync'
                      ? 'bg-[#1f6feb] text-white border-[#388bfd]'
                      : 'bg-[#010409] text-[#8b949e] hover:text-[#f0f6fc] border-[#30363d]'
                  }`}
                >
                  <Database className="h-3.5 w-3.5 text-cyan-400" />
                  <span>DATA SYNC</span>
                </button>
              </div>

              {activeTab === 'sync' && (
                <div className="space-y-4">
                  <div className="p-5 bg-[#010409] border border-[#30363d] space-y-4">
                    <div>
                      <h3 className="text-xs font-bold uppercase text-[#f0f6fc]">FULL DATA SYNC</h3>
                      <p className="text-[10px] text-[#8b949e] mt-1">
                        Export or restore all participant history, exam sessions, and saved reports as one JSON file.
                        Configure Upstash Redis in Vercel for durable multi-instance storage.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={handleExportData} disabled={isSyncing}
                        className="px-4 py-2 bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-bold uppercase disabled:opacity-50">
                        <Download className="inline h-3.5 w-3.5 mr-2" /> EXPORT ALL DATA
                      </button>
                      <input type="file" accept="application/json" onChange={(e) => setSyncFile(e.target.files?.[0] || null)}
                        className="text-xs text-[#8b949e] max-w-full" />
                      <button type="button" onClick={handleImportData} disabled={isSyncing || !syncFile}
                        className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-bold uppercase disabled:opacity-50">
                        IMPORT SELECTED FILE
                      </button>
                    </div>
                    {syncMessage && <div className={`p-3 border text-xs ${syncMessage.type === 'success' ? 'text-[#3fb950] border-[#238636]/40' : 'text-[#f85149] border-[#da3633]/40'}`}>{syncMessage.text}</div>}
                  </div>
                </div>
              )}

              {/* TAB 1: CUMULATIVE LEADERBOARD */}
              {activeTab === 'leaderboard' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8b949e]">
                      Permanent multi-round records. Sorted by cumulative marks, then highest percentage and solved count.
                    </span>
                    <button
                      onClick={fetchLeaderboard}
                      className="text-[#58a6ff] hover:underline flex items-center gap-1 uppercase font-bold cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3" /> REFRESH LIVE
                    </button>
                  </div>

                  {leaderboard.length === 0 ? (
                    <div className="p-8 text-center bg-[#010409] border border-[#30363d] text-[#8b949e] text-xs">
                      No contestant data recorded yet.
                    </div>
                  ) : (
                    <div className="border border-[#30363d] overflow-x-auto bg-[#010409]">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#161b22] text-[#8b949e] border-b border-[#30363d] uppercase text-[10px]">
                          <tr>
                            <th className="p-3">Rank</th>
                            <th className="p-3">Candidate / Username</th>
                            <th className="p-3 text-center">Rounds</th>
                            <th className="p-3 text-center">Cumulative Marks</th>
                            <th className="p-3 text-center">Best Round</th>
                            <th className="p-3 text-center">Best %</th>
                            <th className="p-3 text-center">Total Solved</th>
                            <th className="p-3 text-right">Total Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#30363d] text-[#c9d1d9]">
                          {leaderboard.map((entry) => (
                            <tr key={entry.username} className="hover:bg-[#161b22] transition-colors">
                              <td className="p-3 font-bold">
                                {entry.rank === 1 ? (
                                  <span className="text-amber-400 flex items-center gap-1 font-bold">👑 #1</span>
                                ) : entry.rank === 2 ? (
                                  <span className="text-slate-300 font-bold">🥈 #2</span>
                                ) : entry.rank === 3 ? (
                                  <span className="text-amber-600 font-bold">🥉 #3</span>
                                ) : (
                                  `#${entry.rank}`
                                )}
                              </td>
                              <td className="p-3 font-bold text-[#f0f6fc]">
                                {entry.username}
                              </td>
                              <td className="p-3 text-center">
                                <span className="px-2 py-0.5 bg-[#161b22] border border-[#30363d] text-[#58a6ff] text-[10px]">
                                  {entry.totalRounds} Round{entry.totalRounds > 1 ? 's' : ''}
                                </span>
                              </td>
                              <td className="p-3 text-center font-extrabold text-[#3fb950] text-sm">
                                {entry.cumulativeMarks} <span className="text-[10px] text-[#8b949e]">/ {entry.maxCumulativeMarks}</span>
                              </td>
                              <td className="p-3 text-center font-mono text-[#d29922]">
                                {entry.bestRoundMarks}
                              </td>
                              <td className="p-3 text-center font-bold text-[#58a6ff]">
                                {entry.bestScorePercentage}%
                              </td>
                              <td className="p-3 text-center">
                                {entry.totalQuestionsSolved} Qs
                              </td>
                              <td className="p-3 text-right text-[#8b949e]">
                                {Math.floor(entry.totalTimeSpentSeconds / 60)}m {entry.totalTimeSpentSeconds % 60}s
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: EXAM SESSIONS & ANSWERS */}
              {activeTab === 'sessions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8b949e]">
                      Detailed exam attempts log. Expand any session to inspect every question and participant code answer.
                    </span>
                    <button
                      onClick={fetchSessions}
                      className="text-[#58a6ff] hover:underline flex items-center gap-1 uppercase font-bold cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3" /> REFRESH
                    </button>
                  </div>

                  {sessions.length === 0 ? (
                    <div className="p-8 text-center bg-[#010409] border border-[#30363d] text-[#8b949e] text-xs">
                      No individual exam sessions recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sessions.map((sess) => {
                        const isExpanded = expandedSessionId === sess.sessionId;
                        return (
                          <div 
                            key={sess.sessionId}
                            className="bg-[#010409] border border-[#30363d] overflow-hidden"
                          >
                            <div 
                              onClick={() => setExpandedSessionId(isExpanded ? null : sess.sessionId)}
                              className="p-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-[#161b22] cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <button className="text-[#58a6ff]">
                                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                                <div>
                                  <div className="text-xs font-bold text-[#f0f6fc] flex items-center gap-2">
                                    <span>{sess.username}</span>
                                    <span className="px-1.5 py-0.2 bg-[#21262d] text-[#8b949e] text-[10px] uppercase font-normal">
                                      Round #{sess.roundNumber}
                                    </span>
                                    <span className="px-1.5 py-0.2 bg-[#21262d] text-[#58a6ff] text-[10px] uppercase font-normal">
                                      {sess.difficulty}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-[#8b949e] flex items-center gap-3 mt-0.5">
                                    <span>ID: {sess.sessionId}</span>
                                    <span>•</span>
                                    <span>{new Date(sess.timestamp).toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 text-xs">
                                <div className="text-right">
                                  <div className="font-bold text-[#3fb950]">
                                    {sess.marksEarned} / {sess.maxMarksPossible} Marks ({sess.scorePercentage}%)
                                  </div>
                                  <div className="text-[10px] text-[#8b949e]">
                                    Time: {Math.floor(sess.timeSeconds / 60)}m {sess.timeSeconds % 60}s
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Expanded Answers List */}
                            {isExpanded && (
                              <div className="p-4 border-t border-[#30363d] bg-[#161b22] space-y-3">
                                <div className="text-[11px] font-bold text-[#8b949e] uppercase">
                                  SUBMITTED ANSWERS & VERIFICATION STATUS ({sess.answers?.length || 0} Questions):
                                </div>
                                {(!sess.answers || sess.answers.length === 0) ? (
                                  <div className="text-xs text-[#8b949e] italic">No question breakdown logged for this session.</div>
                                ) : (
                                  <div className="space-y-2">
                                    {sess.answers.map((ans, aIdx) => (
                                      <div 
                                        key={ans.problemId || aIdx}
                                        className="p-3 bg-[#010409] border border-[#30363d] text-xs space-y-1.5"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="font-bold text-[#f0f6fc] flex items-center gap-2">
                                            <span>#{aIdx + 1} {ans.title || ans.problemId}</span>
                                            <span className={`px-1.5 py-0.5 text-[10px] uppercase font-bold ${
                                              ans.status === 'correct' ? 'bg-[#238636]/20 text-[#3fb950] border border-[#238636]' : 'bg-[#da3633]/20 text-[#f85149] border border-[#da3633]'
                                            }`}>
                                              {ans.status}
                                            </span>
                                          </div>
                                          <span className="text-[#d29922] font-bold">
                                            {ans.marksAwarded ?? (ans.status === 'correct' ? 10 : 0)} / {ans.maxMarks ?? 10} Marks
                                          </span>
                                        </div>

                                        <div className="text-[11px] font-mono text-[#58a6ff] bg-[#161b22] p-2 rounded-xs overflow-x-auto">
                                          <span className="text-[#8b949e]">Contestant Answer: </span>
                                          {ans.userAnswer || '<No answer submitted>'}
                                        </div>

                                        {ans.expectedAnswer && (
                                          <div className="text-[10px] text-[#8b949e]">
                                            <span>Expected Fix: </span>
                                            <code className="text-[#79c0ff]">{ans.expectedAnswer}</code>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: API KEYS & CLOUD INTEGRATIONS */}
              {activeTab === 'apikeys' && (
                <div className="space-y-6">
                  <div className="p-4 bg-[#010409] border border-[#30363d] space-y-2">
                    <h3 className="text-xs font-bold uppercase text-[#f0f6fc] flex items-center gap-2">
                      <Key className="h-4 w-4 text-emerald-400" />
                      <span>RUNTIME API CREDENTIALS & SERVICE INTEGRATIONS</span>
                    </h3>
                    <p className="text-[11px] text-[#8b949e]">
                      Configure API keys dynamically without restarting the server. Keys are saved securely in runtime environment variables.
                    </p>
                  </div>

                  {/* Active Keys Overview Badges */}
                  {configState && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-[#010409] border border-[#30363d] space-y-1">
                        <div className="text-[10px] text-[#8b949e] font-bold">GEMINI 2.5 FLASH</div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${configState.geminiApiKeyConfigured ? 'bg-[#238636]' : 'bg-[#da3633]'}`}></span>
                          <span className="font-bold text-[#f0f6fc]">{configState.geminiApiKeyConfigured ? 'ACTIVE' : 'NOT CONFIGURED'}</span>
                        </div>
                        <div className="text-[10px] text-[#8b949e] font-mono">{configState.geminiApiKeyMasked || 'None'}</div>
                      </div>

                      <div className="p-3 bg-[#010409] border border-[#30363d] space-y-1">
                        <div className="text-[10px] text-[#8b949e] font-bold">GROQ LLAMA-3.3</div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${configState.groqApiKeyConfigured ? 'bg-[#238636]' : 'bg-[#da3633]'}`}></span>
                          <span className="font-bold text-[#f0f6fc]">{configState.groqApiKeyConfigured ? 'ACTIVE' : 'NOT CONFIGURED'}</span>
                        </div>
                        <div className="text-[10px] text-[#8b949e] font-mono">{configState.groqApiKeyMasked || 'None'}</div>
                      </div>

                      <div className="p-3 bg-[#010409] border border-[#30363d] space-y-1">
                        <div className="text-[10px] text-[#8b949e] font-bold">TELEGRAM PROCTOR</div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${configState.telegramBotTokenConfigured ? 'bg-[#238636]' : 'bg-[#da3633]'}`}></span>
                          <span className="font-bold text-[#f0f6fc]">{configState.telegramBotTokenConfigured ? 'CONNECTED' : 'OFFLINE'}</span>
                        </div>
                        <div className="text-[10px] text-[#8b949e] font-mono">Chat ID: {configState.telegramChatId || 'Not set'}</div>
                      </div>
                    </div>
                  )}

                  {/* Update Configuration Form */}
                  <form onSubmit={handleSaveConfig} className="p-5 bg-[#010409] border border-[#30363d] space-y-4">
                    <div className="text-xs font-bold uppercase text-[#f0f6fc] border-b border-[#30363d] pb-2">
                      UPDATE CREDENTIALS & PASSWORDS
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Gemini API Key */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase text-[#8b949e]">
                          GEMINI API KEY (AI HINTS & ANALYSIS):
                        </label>
                        <input
                          type="password"
                          value={geminiKeyInput}
                          onChange={(e) => setGeminiKeyInput(e.target.value)}
                          placeholder="Paste new Gemini API Key (e.g. AIzaSy...)"
                          className="w-full bg-[#161b22] border border-[#30363d] px-3 py-2 text-xs text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff] placeholder-[#484f58]"
                        />
                      </div>

                      {/* Groq API Key */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase text-[#8b949e]">
                          GROQ API KEY (LLAMA-3.3 EVALUATOR):
                        </label>
                        <input
                          type="password"
                          value={groqKeyInput}
                          onChange={(e) => setGroqKeyInput(e.target.value)}
                          placeholder="Paste new Groq API Key (e.g. gsk_...)"
                          className="w-full bg-[#161b22] border border-[#30363d] px-3 py-2 text-xs text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff] placeholder-[#484f58]"
                        />
                      </div>

                      {/* Telegram Bot Token */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase text-[#8b949e]">
                          TELEGRAM BOT TOKEN:
                        </label>
                        <input
                          type="password"
                          value={telegramTokenInput}
                          onChange={(e) => setTelegramTokenInput(e.target.value)}
                          placeholder="Paste Telegram Bot Token (e.g. 123456:ABC-DEF...)"
                          className="w-full bg-[#161b22] border border-[#30363d] px-3 py-2 text-xs text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff] placeholder-[#484f58]"
                        />
                      </div>

                      {/* Telegram Chat ID */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase text-[#8b949e]">
                          TELEGRAM CHAT ID:
                        </label>
                        <input
                          type="text"
                          value={telegramChatIdInput}
                          onChange={(e) => setTelegramChatIdInput(e.target.value)}
                          placeholder="Telegram Group or User ID (e.g. -100123456789)"
                          className="w-full bg-[#161b22] border border-[#30363d] px-3 py-2 text-xs text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff] placeholder-[#484f58]"
                        />
                      </div>

                      {/* Admin Passphrase Update */}
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="block text-[10px] font-bold uppercase text-[#8b949e]">
                          CHANGE ADMIN SECRET PASSPHRASE:
                        </label>
                        <input
                          type="text"
                          value={newAdminSecretInput}
                          onChange={(e) => setNewAdminSecretInput(e.target.value)}
                          placeholder="Leave blank to keep the current secret or type a new passphrase"
                          className="w-full bg-[#161b22] border border-[#30363d] px-3 py-2 text-xs text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff] placeholder-[#484f58]"
                        />
                      </div>
                    </div>

                    {configSaveMsg && (
                      <div className={`p-3 border text-xs flex items-center gap-2 ${
                        configSaveMsg.type === 'success'
                          ? 'bg-[#238636]/10 border-[#238636]/40 text-[#3fb950]'
                          : 'bg-[#da3633]/10 border-[#da3633]/40 text-[#f85149]'
                      }`}>
                        {configSaveMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        <span>{configSaveMsg.text}</span>
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={isSavingConfig}
                        className="px-5 py-2.5 bg-[#238636] hover:bg-[#2ea043] text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                      >
                        {isSavingConfig ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        <span>APPLY CREDENTIALS TO ACTIVE RUNTIME</span>
                      </button>
                    </div>
                  </form>

                  {/* Diagnostic Test Buttons Section */}
                  <div className="p-5 bg-[#010409] border border-[#30363d] space-y-4">
                    <div className="text-xs font-bold uppercase text-[#f0f6fc] border-b border-[#30363d] pb-2">
                      LIVE INTEGRATION DIAGNOSTICS & VERIFICATION
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Gemini Test */}
                      <div className="p-3.5 bg-[#161b22] border border-[#30363d] space-y-2">
                        <div className="font-bold text-xs text-[#f0f6fc]">TEST GEMINI 2.5 FLASH</div>
                        <p className="text-[10px] text-[#8b949e]">Verifies API key by sending a fast ping to Google GenAI.</p>
                        <button
                          type="button"
                          onClick={handleTestGemini}
                          disabled={isTestingGemini}
                          className="w-full py-2 bg-[#1f6feb] hover:bg-[#388bfd] text-white font-bold text-[11px] uppercase transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {isTestingGemini ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          <span>TEST GEMINI API</span>
                        </button>
                        {testGeminiResult && (
                          <div className="text-[10px] p-2 bg-[#010409] border border-[#30363d] text-[#c9d1d9] break-words">
                            {testGeminiResult}
                          </div>
                        )}
                      </div>

                      {/* Groq Test */}
                      <div className="p-3.5 bg-[#161b22] border border-[#30363d] space-y-2">
                        <div className="font-bold text-xs text-[#f0f6fc]">TEST GROQ LLAMA-3.3</div>
                        <p className="text-[10px] text-[#8b949e]">Verifies Groq endpoint and token validity.</p>
                        <button
                          type="button"
                          onClick={handleTestGroq}
                          disabled={isTestingGroq}
                          className="w-full py-2 bg-[#1f6feb] hover:bg-[#388bfd] text-white font-bold text-[11px] uppercase transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {isTestingGroq ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Server className="h-3 w-3" />}
                          <span>TEST GROQ API</span>
                        </button>
                        {testGroqResult && (
                          <div className="text-[10px] p-2 bg-[#010409] border border-[#30363d] text-[#c9d1d9] break-words">
                            {testGroqResult}
                          </div>
                        )}
                      </div>

                      {/* Telegram Test */}
                      <div className="p-3.5 bg-[#161b22] border border-[#30363d] space-y-2">
                        <div className="font-bold text-xs text-[#f0f6fc]">TEST TELEGRAM DISPATCH</div>
                        <p className="text-[10px] text-[#8b949e]">Sends live verification test message to chat id.</p>
                        <button
                          type="button"
                          onClick={handleTestTelegram}
                          disabled={isTestingTelegram}
                          className="w-full py-2 bg-[#1f6feb] hover:bg-[#388bfd] text-white font-bold text-[11px] uppercase transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {isTestingTelegram ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                          <span>SEND ALERT PING</span>
                        </button>
                        {testTelegramResult && (
                          <div className="text-[10px] p-2 bg-[#010409] border border-[#30363d] text-[#c9d1d9] break-words">
                            {testTelegramResult}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: STORED REPORTS */}
              {activeTab === 'reports' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8b949e]">
                      Individual candidate diagnostic reports stored at <code className="text-[#c9d1d9]">./reports/</code>
                    </span>
                    <button
                      onClick={fetchReports}
                      className="text-[#58a6ff] hover:underline flex items-center gap-1 uppercase font-bold cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3" /> REFRESH
                    </button>
                  </div>

                  {reports.length === 0 ? (
                    <div className="p-8 text-center bg-[#010409] border border-[#30363d] text-[#8b949e] text-xs">
                      No contest reports generated yet. Complete a quiz session to create artifacts.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#30363d] bg-[#010409] border border-[#30363d]">
                      {reports.map((rep) => (
                        <div key={rep.fileName} className="p-3.5 flex items-center justify-between hover:bg-[#161b22] transition-colors">
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-[#f0f6fc] font-mono">{rep.fileName}</div>
                            <div className="text-[10px] text-[#8b949e] flex items-center gap-3">
                              <span>SIZE: {Math.round(rep.sizeBytes / 1024)} KB</span>
                              <span>•</span>
                              <span>DATE: {new Date(rep.modifiedAt).toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewReport(rep.fileName)}
                              className="px-2.5 py-1.5 bg-[#161b22] hover:bg-[#21262d] text-[#c9d1d9] hover:text-[#58a6ff] border border-[#30363d] text-xs flex items-center gap-1 transition-colors cursor-pointer"
                              title="View full report"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>VIEW</span>
                            </button>
                            <a
                              href="#"
                              onClick={(e) => { e.preventDefault(); handleViewReport(rep.fileName); }}
                              download={rep.fileName}
                              className="px-2.5 py-1.5 bg-[#161b22] hover:bg-[#21262d] text-[#c9d1d9] border border-[#30363d] text-xs flex items-center gap-1 transition-colors"
                              title="Download file"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: SECURITY AUDIT & VIOLATIONS */}
              {activeTab === 'violations' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8b949e]">
                      Logged anti-cheat violations, devtools inspection, paste blocking, and tab switches.
                    </span>
                  </div>

                  {violations.length === 0 ? (
                    <div className="p-8 text-center bg-[#010409] border border-[#30363d] text-[#3fb950] text-xs">
                      No security policy violations detected. Perfect integrity record!
                    </div>
                  ) : (
                    <div className="divide-y divide-[#30363d] bg-[#010409] border border-[#30363d]">
                      {violations.map((v) => (
                        <div key={v.id} className="p-3.5 space-y-1 hover:bg-[#161b22] transition-colors">
                          <div className="flex items-center justify-between text-xs">
                            <div className="font-bold text-[#f85149] flex items-center gap-2">
                              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                              <span>{v.violationType.toUpperCase()}</span>
                              <span className="text-[#8b949e] font-normal">by {v.participantName}</span>
                            </div>
                            <span className="text-[10px] text-[#8b949e]">
                              {new Date(v.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#c9d1d9] pl-5">{v.details}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal: View Report Text */}
        {selectedReportContent && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="bg-[#161b22] border border-[#30363d] w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
              <div className="p-4 border-b border-[#30363d] flex items-center justify-between bg-[#010409]">
                <div className="font-bold text-xs text-[#f0f6fc]">{selectedReportName}</div>
                <button
                  onClick={() => setSelectedReportContent(null)}
                  className="p-1 text-[#8b949e] hover:text-[#f0f6fc] cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 font-mono text-[11px] text-[#c9d1d9] bg-[#010409] whitespace-pre-wrap">
                {selectedReportContent}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
