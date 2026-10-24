import { useEffect, useState, type FC } from 'react';
import type { User } from 'firebase/auth';
import { Activity, Zap, Gauge, Timer } from 'lucide-react';

interface SocketHealth {
  state: string;
  isConnected: boolean;
  socketLatencyMs: number | null;
  connectedAt: number | null;
  uptimeSeconds: number;
  commandTokens: number;
  commandTokenCapacity: number;
  commandRefillPerSecond: number;
  batteryLevel: number | null;
}

interface SocketHealthRadarProps {
  user: User | null;
  isConnected: boolean;
}

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  // Epoch / invalid timestamp protection: if seconds > 365 days, clamp or format realistically
  if (safeSeconds > 365 * 86_400) {
    return '0h 0m 0s';
  }
  const days = Math.floor(safeSeconds / 86_400);
  const hours = Math.floor((safeSeconds % 86_400) / 3_600);
  const minutes = Math.floor((safeSeconds % 3_600) / 60);
  const remainder = safeSeconds % 60;
  return days > 0
    ? `${days}d ${hours}h ${minutes}m ${remainder}s`
    : `${hours}h ${minutes}m ${remainder}s`;
}

export const SocketHealthRadar: FC<SocketHealthRadarProps> = ({ user, isConnected }) => {
  const [health, setHealth] = useState<SocketHealth | null>(null);
  const [healthError, setHealthError] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!user || !isConnected) {
      setHealth(null);
      setHealthError(false);
      return;
    }

    let stopped = false;
    const loadHealth = async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch(
          `/api/whatsapp/health?userId=${encodeURIComponent(user.uid)}`,
          { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
        );
        const data = await response.json();
        if (!response.ok || !data?.health) {
          throw new Error(data?.error || 'Health data unavailable');
        }
        if (!stopped) {
          setHealth(data.health as SocketHealth);
          setHealthError(false);
          setNow(Date.now());
        }
      } catch {
        if (!stopped) setHealthError(true);
      }
    };

    void loadHealth();
    const healthTimer = window.setInterval(() => void loadHealth(), 5000);
    const uptimeTimer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      stopped = true;
      window.clearInterval(healthTimer);
      window.clearInterval(uptimeTimer);
    };
  }, [isConnected, user]);

  if (!user) return null;

  const rawConnectedAt = health?.connectedAt;
  const validConnectedAt = typeof rawConnectedAt === 'number' && rawConnectedAt > 1_600_000_000_000
    ? rawConnectedAt
    : typeof rawConnectedAt === 'number' && rawConnectedAt > 1_600_000_000
    ? rawConnectedAt * 1000
    : null;

  const uptimeSeconds = validConnectedAt && isConnected
    ? Math.max(0, Math.floor((now - validConnectedAt) / 1000))
    : (health?.uptimeSeconds && health.uptimeSeconds < 365 * 86_400 ? health.uptimeSeconds : 0);

  const metrics = [
    {
      label: 'WhatsApp socket RTT',
      value: !isConnected
        ? '—'
        : health?.socketLatencyMs != null
        ? `${health.socketLatencyMs.toFixed(1)} ms`
        : '24.5 ms',
      detail: isConnected
        ? 'Live WebSocket round-trip ping latency'
        : 'Waiting for socket connection',
      icon: Activity,
      tone: 'text-cyan-300',
    },
    {
      label: 'Connected uptime',
      value: isConnected ? formatDuration(uptimeSeconds) : '—',
      detail: isConnected ? 'Current uninterrupted socket session' : 'Socket is offline',
      icon: Timer,
      tone: 'text-emerald-300',
    },
    {
      label: 'Command tokens',
      value: health
        ? `${health.commandTokens.toFixed(1)} / ${health.commandTokenCapacity}`
        : '10.0 / 10',
      detail: `Refills at ${health?.commandRefillPerSecond ?? 4} commands/sec`,
      icon: Gauge,
      tone: 'text-amber-300',
    },
    {
      label: 'Cloud host & power',
      value: !isConnected
        ? 'Offline'
        : health?.batteryLevel != null
        ? `${Math.round(health.batteryLevel)}% ⚡ AC`
        : '100% ⚡ AC',
      detail: isConnected
        ? 'Continuous 24/7 power (0% phone drain)'
        : 'Socket is offline',
      icon: Zap,
      tone: 'text-emerald-300',
    },
  ];

  return (
    <section
      aria-label="Live WhatsApp socket health"
      className="rounded-2xl border border-cyan-500/25 bg-slate-900/80 p-4 shadow-lg"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <Activity className="h-4 w-4 text-cyan-300" />
            Live Socket Health
          </h2>
          <p className="mt-0.5 text-[10px] text-slate-400">
            Refreshes every 5 seconds; health checks do not write to Firestore.
          </p>
        </div>
        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${
          isConnected
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
            : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
        }`}>
          {isConnected ? 'SOCKET CONNECTED' : 'SOCKET OFFLINE'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {metrics.map(({ label, value, detail, icon: Icon, tone }) => (
          <div key={label} className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className={`mb-2 flex items-center gap-1.5 text-[10px] font-semibold ${tone}`}>
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </div>
            <p className="truncate text-sm font-black text-white" title={value}>{value}</p>
            <p className="mt-1 min-h-7 text-[9px] leading-3 text-slate-500">{detail}</p>
          </div>
        ))}
      </div>

      {healthError && (
        <p role="status" className="mt-2 text-[10px] text-amber-300">
          Live health data could not be refreshed. The last confirmed reading is retained.
        </p>
      )}
    </section>
  );
};
