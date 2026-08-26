import React from 'react';
import { AlertTriangle, ShieldAlert, Send, Check } from 'lucide-react';
import { SecurityViolation } from '../types';

interface SecurityWarningModalProps {
  violation: SecurityViolation | null;
  onDismiss: () => void;
}

export const SecurityWarningModal: React.FC<SecurityWarningModalProps> = ({
  violation,
  onDismiss
}) => {
  if (!violation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn font-mono">
      <div className="bg-[#161b22] border border-[#f85149] max-w-md w-full p-6 shadow-2xl space-y-4 text-center">
        <div className="h-12 w-12 bg-[#010409] border border-[#f85149] text-[#f85149] flex items-center justify-center mx-auto">
          <ShieldAlert className="h-6 w-6" />
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 bg-[#f8514922] text-[#f85149] border border-[#f85149]">
            SECURITY_VIOLATION_FLAGGED
          </span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#f0f6fc]">
            PROCTOR INTERVENTION WARNING
          </h3>
        </div>

        <p className="text-xs text-[#c9d1d9] leading-relaxed bg-[#010409] p-3 border border-[#30363d] text-left font-mono space-y-1">
          <div><span className="text-[#f85149] font-bold">TYPE:</span> {violation.violationType}</div>
          <div><span className="text-[#8b949e]">DETAILS:</span> {violation.details}</div>
          <div><span className="text-[#484f58]">TIME:</span> {new Date(violation.timestamp).toLocaleTimeString()}</div>
        </p>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#8b949e]">
          <Send className="h-3 w-3 text-[#58a6ff]" />
          <span>Security telemetry dispatched to proctor audit log.</span>
        </div>

        <button
          onClick={onDismiss}
          className="w-full py-2.5 bg-[#f85149] hover:bg-[#da3633] text-white font-bold text-xs uppercase tracking-wider border border-[#f85149] transition-colors cursor-pointer"
        >
          ACKNOWLEDGE & RESUME ARENA
        </button>
      </div>
    </div>
  );
};
