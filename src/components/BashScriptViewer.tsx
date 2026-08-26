import React, { useState, useEffect } from 'react';
import { Terminal, Copy, Check, Download, X, FileCode, Play, Sparkles, Send } from 'lucide-react';

interface BashScriptViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BashScriptViewer: React.FC<BashScriptViewerProps> = ({ isOpen, onClose }) => {
  const [scriptContent, setScriptContent] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'script' | 'guide'>('script');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/bash-script')
        .then(res => res.text())
        .then(text => setScriptContent(text))
        .catch(err => console.warn('Could not load bash script:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([scriptContent], { type: 'application/x-sh' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'debug_contest.sh';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-mono">debug_contest.sh</h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  Modular Orchestrator
                </span>
              </div>
              <p className="text-xs text-slate-400">Standalone Bash script powering CLI competition, Python/C++/Java evaluation & Telegram alerts</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-cyan-400" />}
              <span>{copied ? 'Copied Script' : 'Copy Script'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download .sh</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-6 pt-3 bg-slate-950/40 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('script')}
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'script' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="h-4 w-4" />
            <span>Script Source Code</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'guide' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="h-4 w-4" />
            <span>Execution & Setup Instructions</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs">
          {activeTab === 'script' ? (
            <pre className="text-slate-200 bg-slate-950 p-4 rounded-2xl border border-slate-800 whitespace-pre overflow-x-auto leading-relaxed">
              {scriptContent || 'Loading debug_contest.sh...'}
            </pre>
          ) : (
            <div className="space-y-6 font-sans text-sm text-slate-300">
              {/* Commands Guide */}
              <div className="space-y-3">
                <h3 className="font-bold text-white text-base">Quick Start Commands</h3>
                <div className="space-y-2">
                  <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl font-mono text-xs text-cyan-300">
                    # 1. Grant execute permissions<br />
                    <span className="text-emerald-400">chmod +x debug_contest.sh</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl font-mono text-xs text-cyan-300">
                    # 2. Run Interactive Terminal Debugging Contest<br />
                    <span className="text-emerald-400">./debug_contest.sh --cli</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl font-mono text-xs text-cyan-300">
                    # 3. Launch Web Interface Server on Port 3000<br />
                    <span className="text-emerald-400">./debug_contest.sh --web</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl font-mono text-xs text-cyan-300">
                    # 4. Test Telegram Bot alerts & list generated reports<br />
                    <span className="text-emerald-400">./debug_contest.sh --test-telegram</span><br />
                    <span className="text-emerald-400">./debug_contest.sh --list-reports</span>
                  </div>
                </div>
              </div>

              {/* Environment Setup */}
              <div className="space-y-3">
                <h3 className="font-bold text-white text-base">Environment Configuration (.env)</h3>
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl font-mono text-xs text-slate-300 leading-relaxed">
                  # Groq API for AI bug evaluation & progressive hints<br />
                  <span className="text-purple-400">GROQ_API_KEY</span>="gsk_..."<br /><br />
                  # Telegram Bot Security Alerts (optional)<br />
                  <span className="text-cyan-400">TELEGRAM_BOT_TOKEN</span>="123456:ABC-DEF..."<br />
                  <span className="text-cyan-400">TELEGRAM_CHAT_ID</span>="987654321"<br /><br />
                  # Admin Console Secret<br />
                  <span className="text-amber-400">ADMIN_SECRET</span>="set-a-strong-secret-in-your-environment"
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
