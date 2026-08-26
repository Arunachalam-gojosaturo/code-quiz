import { SecurityViolation } from '../types';

type ViolationCallback = (violation: SecurityViolation) => void;

class AntiCheatManager {
  private violationListeners: ViolationCallback[] = [];
  private isActive: boolean = false;
  private participantName: string = '';
  private currentProblemId?: string;
  private currentProblemTitle?: string;
  private violationsCount: number = 0;

  public init(participantName: string) {
    this.participantName = participantName;
    this.isActive = true;
    this.violationsCount = 0;
    this.setupListeners();
  }

  public updateContext(problemId?: string, problemTitle?: string) {
    this.currentProblemId = problemId;
    this.currentProblemTitle = problemTitle;
  }

  public stop() {
    this.isActive = false;
    this.removeListeners();
  }

  public onViolation(callback: ViolationCallback) {
    this.violationListeners.push(callback);
    return () => {
      this.violationListeners = this.violationListeners.filter(cb => cb !== callback);
    };
  }

  private triggerViolation(type: SecurityViolation['violationType'], details: string) {
    if (!this.isActive) return;

    this.violationsCount++;
    const violation: SecurityViolation = {
      id: 'viol_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      participantName: this.participantName || 'Anonymous Candidate',
      problemId: this.currentProblemId,
      problemTitle: this.currentProblemTitle,
      violationType: type,
      details,
      telegramNotified: false
    };

    // Notify UI listeners
    this.violationListeners.forEach(cb => cb(violation));

    // Dispatch to backend to send Telegram Alert
    this.sendTelegramAlert(violation);
  }

  private async sendTelegramAlert(violation: SecurityViolation) {
    try {
      const res = await fetch('/api/security/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantName: violation.participantName,
          violationType: violation.violationType,
          problemTitle: violation.problemTitle || 'General Arena',
          details: violation.details,
          timestamp: violation.timestamp
        })
      });
      if (res.ok) {
        violation.telegramNotified = true;
      }
    } catch (e) {
      console.warn('Could not dispatch Telegram alert:', e);
    }
  }

  private handleCopy = (e: ClipboardEvent) => {
    // Prevent copying of protected code
    const target = e.target as HTMLElement;
    if (target && target.closest('.no-copy-zone')) {
      e.preventDefault();
      this.triggerViolation(
        'copy_attempt',
        'Attempted to copy protected debugging problem code from editor/view zone.'
      );
    }
  };

  private handleContextMenu = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target && target.closest('.no-copy-zone')) {
      e.preventDefault();
      this.triggerViolation(
        'right_click',
        'Attempted right-click / context menu on protected problem contents.'
      );
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    // Intercept Ctrl+C, Cmd+C, Ctrl+U, Ctrl+Shift+I, F12
    const isCopy = (e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C');
    const isCut = (e.ctrlKey || e.metaKey) && (e.key === 'x' || e.key === 'X');
    const isViewSource = (e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U');
    const isDevTools = e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j'));

    const target = e.target as HTMLElement;
    const inProtectedZone = target && target.closest('.no-copy-zone');

    if ((isCopy || isCut) && inProtectedZone) {
      e.preventDefault();
      this.triggerViolation('copy_attempt', `Keyboard shortcut detected: ${e.metaKey ? 'Cmd' : 'Ctrl'}+${e.key.toUpperCase()}`);
    } else if (isViewSource) {
      e.preventDefault();
      this.triggerViolation('devtools_open', 'Attempted View Page Source shortcut (Ctrl+U)');
    } else if (isDevTools) {
      this.triggerViolation('devtools_open', 'Attempted to open Developer Tools shortcut');
    }
  };

  private handleVisibilityChange = () => {
    if (document.hidden && this.isActive) {
      this.triggerViolation(
        'tab_switch',
        'Contest window lost focus or candidate switched browser tabs.'
      );
    }
  };

  private setupListeners() {
    document.addEventListener('copy', this.handleCopy, true);
    document.addEventListener('contextmenu', this.handleContextMenu, true);
    document.addEventListener('keydown', this.handleKeyDown, true);
    document.addEventListener('visibilitychange', this.handleVisibilityChange, true);
  }

  private removeListeners() {
    document.removeEventListener('copy', this.handleCopy, true);
    document.removeEventListener('contextmenu', this.handleContextMenu, true);
    document.removeEventListener('keydown', this.handleKeyDown, true);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange, true);
  }
}

export const antiCheat = new AntiCheatManager();
