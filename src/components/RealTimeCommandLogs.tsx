import React, { useState } from 'react';
import {
  Terminal,
  Zap,
  Clock,
  Activity,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Users,
  MessageSquare,
} from 'lucide-react';

export interface CommandExecutionLogItem {
  id: string;
  command: string;
  fullText: string;
  args: string[];
  sender: string;
  chatType: 'group' | 'direct' | 'console';
  chatName: string;
  remoteJid: string;
  timestamp: string;
  startedAtMs: number;
  completedAtMs?: number;
  responseTimeMs: number;
  status: 'executing' | 'completed' | 'error';
  ratePerMinute: number;
  speedRating: 'ULTRA-FAST' | 'FAST' | 'NORMAL' | 'HEAVY';
  replyPreview?: string;
  errorMessage?: string;
}

export interface CommandExecutionStatsData {
  totalExecuted: number;
  completedCount: number;
  errorCount: number;
  avgResponseTimeMs: number;
  minResponseTimeMs: number;
  maxResponseTimeMs: number;
  lastResponseTimeMs: number;
  commandsPerMinute: number;
  peakCommandsPerMinute: number;
  lastExecutedAt: string | null;
}

interface RealTimeCommandLogsProps {
  logs: CommandExecutionLogItem[];
  stats: CommandExecutionStatsData;
  isConnected: boolean;
  isStreamLive: boolean;
  onClearLogs: () => void;
  onRefreshLogs: () => void;
  onQuickTestCommand?: (cmdText: string) => Promise<void>;
  compact?: boolean;
}

function formatPreciseTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${hh}:${mm}:${ss}.${ms}`;
  } catch {
    return isoString;
  }
}

export const RealTimeCommandLogs: React.FC<RealTimeCommandLogsProps> = ({
  logs,
  stats,
  isConnected,
  isStreamLive,
  onClearLogs,
  onRefreshLogs,
  onQuickTestCommand,
  compact = false,
}) => {
  const [quickCmd, setQuickCmd] = useState('');
  const [testingCmd, setTestingCmd] = useState(false);

  const handleQuickRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCmd.trim() || !onQuickTestCommand || testingCmd) return;
    setTestingCmd(true);
    try {
      const normalized = quickCmd.trim().startsWith('.') ? quickCmd.trim() : `.${quickCmd.trim()}`;
      await onQuickTestCommand(normalized);
      setQuickCmd('');
    } finally {
      setTestingCmd(false);
    }
  };

  return (
    <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/40 shadow-xl space-y-3">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/90">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <Terminal className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-black text-xs sm:text-sm text-white tracking-tight truncate">
                Real-Time Command Execution Logs
              </h3>
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider border ${
                  isConnected || isStreamLive
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isConnected || isStreamLive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                  }`}
                />
                {isConnected ? 'LIVE WHATSAPP STREAM' : 'STANDBY TELEMETRY'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              Captures 100% of WhatsApp commands • Zero ignored commands • Sub-millisecond timer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onRefreshLogs}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-800 transition-colors cursor-pointer"
            title="Refresh Command Logs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {logs.length > 0 && (
            <button
              type="button"
              onClick={onClearLogs}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors cursor-pointer"
              title="Clear Command Logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Telemetry Metrics Grid */}
      <div className="grid grid-cols-4 gap-1.5">
        <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800/90">
          <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            <Terminal className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="truncate">Executed</span>
          </div>
          <div className="mt-0.5 font-mono text-sm sm:text-base font-black text-white">
            {stats.totalExecuted}
          </div>
          <div className="text-[9px] text-emerald-400/90 font-mono truncate">
            {stats.completedCount} ok • {stats.errorCount} err
          </div>
        </div>

        <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800/90">
          <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            <Activity className="w-3 h-3 text-cyan-400 shrink-0" />
            <span className="truncate">Exec Rate</span>
          </div>
          <div className="mt-0.5 font-mono text-sm sm:text-base font-black text-cyan-300">
            {stats.commandsPerMinute}
            <span className="text-[10px] font-normal text-slate-400">/min</span>
          </div>
          <div className="text-[9px] text-slate-400 font-mono truncate">
            Peak: {stats.peakCommandsPerMinute}/m
          </div>
        </div>

        <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800/90">
          <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            <Zap className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="truncate">Last Speed</span>
          </div>
          <div className="mt-0.5 font-mono text-sm sm:text-base font-black text-amber-300">
            {stats.lastResponseTimeMs > 0 ? `${stats.lastResponseTimeMs}ms` : '—'}
          </div>
          <div className="text-[9px] text-slate-400 font-mono truncate">
            Min: {stats.minResponseTimeMs > 0 ? `${stats.minResponseTimeMs}ms` : '—'}
          </div>
        </div>

        <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800/90">
          <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="truncate">Avg Latency</span>
          </div>
          <div className="mt-0.5 font-mono text-sm sm:text-base font-black text-emerald-300">
            {stats.avgResponseTimeMs > 0 ? `${stats.avgResponseTimeMs}ms` : '—'}
          </div>
          <div className="text-[9px] text-slate-400 font-mono truncate">
            Max: {stats.maxResponseTimeMs > 0 ? `${stats.maxResponseTimeMs}ms` : '—'}
          </div>
        </div>
      </div>

      {/* Quick Test Bar (optional) */}
      {onQuickTestCommand && (
        <form onSubmit={handleQuickRun} className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-emerald-400 font-bold">
              $
            </span>
            <input
              type="text"
              value={quickCmd}
              onChange={(e) => setQuickCmd(e.target.value)}
              placeholder="Test any command live (e.g. .ping, .menu, .uptime, .anti)..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-6 pr-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={testingCmd || !quickCmd.trim()}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1 disabled:opacity-50 transition-all cursor-pointer shrink-0"
          >
            {testingCmd ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Run</span>
          </button>
        </form>
      )}

      {/* Live Execution Feed */}
      <div
        className={`space-y-1.5 overflow-y-auto pr-1 font-mono ${
          compact ? 'max-h-[250px]' : 'max-h-[340px]'
        }`}
      >
        {logs.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 text-center space-y-1">
            <Terminal className="w-5 h-5 text-emerald-400/70 mx-auto" />
            <p className="text-xs font-sans font-semibold text-slate-300">
              Waiting for WhatsApp commands...
            </p>
            <p className="text-[10px] font-sans text-slate-500">
              Send any command (like <span className="font-mono text-emerald-400">.ping</span>,{' '}
              <span className="font-mono text-emerald-400">.menu</span>,{' '}
              <span className="font-mono text-emerald-400">.tagall</span>,{' '}
              <span className="font-mono text-emerald-400">.vv</span>) from your WhatsApp to see live execution telemetry, speed rate, and response time here immediately.
            </p>
          </div>
        ) : (
          logs.map((item) => {
            const isExecuting = item.status === 'executing';
            const isError = item.status === 'error';
            const speedBadgeClass =
              item.speedRating === 'ULTRA-FAST'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : item.speedRating === 'FAST'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : item.speedRating === 'NORMAL'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40';

            return (
              <div
                key={item.id}
                className={`p-2.5 rounded-xl border transition-all text-[11px] space-y-1.5 ${
                  isExecuting
                    ? 'bg-emerald-950/30 border-emerald-500/60 animate-pulse'
                    : isError
                    ? 'bg-rose-950/25 border-rose-500/40'
                    : 'bg-slate-900/80 border-slate-800/90 hover:border-emerald-500/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isExecuting ? (
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />
                    ) : isError ? (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold text-xs">
                      .{item.command}
                    </span>
                    {item.args.length > 0 && (
                      <span className="text-slate-300 truncate max-w-[130px] sm:max-w-[200px]">
                        {item.args.join(' ')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-1.5 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-cyan-300 text-[9px] font-bold">
                      {item.ratePerMinute} cmd/min
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-md border text-[9px] font-bold ${speedBadgeClass}`}>
                      {isExecuting ? 'RUNNING...' : `${item.responseTimeMs}ms • ${item.speedRating}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 font-sans">
                  <div className="flex items-center gap-1.5 truncate">
                    {item.chatType === 'group' ? (
                      <Users className="w-3 h-3 text-amber-400 shrink-0" />
                    ) : (
                      <MessageSquare className="w-3 h-3 text-emerald-400 shrink-0" />
                    )}
                    <span className="truncate text-slate-300 font-medium">{item.chatName}</span>
                    <span className="text-slate-600">•</span>
                    <span className="font-mono text-slate-400">{item.sender}</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 shrink-0">
                    {formatPreciseTime(item.timestamp)}
                  </span>
                </div>

                {(item.replyPreview || item.errorMessage) && (
                  <div className="pt-1 border-t border-slate-800/70 text-[10px] font-sans text-slate-300/90 truncate">
                    {item.errorMessage ? (
                      <span className="text-rose-300">⚠️ {item.errorMessage}</span>
                    ) : (
                      <span className="text-slate-400">
                        <strong className="text-emerald-400/90">Reply:</strong> {item.replyPreview}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
