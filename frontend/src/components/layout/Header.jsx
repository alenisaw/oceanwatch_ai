import { useEffect, useState } from 'react';
import { Clock, Wifi, WifiOff, Zap } from 'lucide-react';

const TAB_TITLES = {
  global: 'Global Environmental Intelligence',
  single: 'Single Tile Analysis',
  batch: 'Batch Analysis',
  incidents: 'Incident Log',
  benchmark: 'Runtime Benchmark',
  reports: 'Environmental Report Studio',
  settings: 'Settings',
};

/**
 * @param {{ activeTab: string, apiStatus: 'unknown'|'ok'|'error', apiUrl: string }} props
 */
export default function Header({ activeTab, apiStatus, apiUrl }) {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const statusConfig = {
    ok: { color: 'text-emerald-300', dot: 'bg-emerald-400', label: 'API Online', Icon: Wifi },
    error: { color: 'text-red-300', dot: 'bg-red-400', label: 'API Offline', Icon: WifiOff },
    unknown: { color: 'text-slate-500', dot: 'bg-slate-600', label: 'Connecting...', Icon: Wifi },
  }[apiStatus];

  const { color, dot, label, Icon } = statusConfig;

  return (
    <header className="z-10 flex h-14 flex-shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-950/78 px-3 backdrop-blur-xl sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <Zap size={13} className="flex-shrink-0 text-cyan-bright" aria-hidden="true" />
        <h1 className="truncate text-sm font-semibold text-slate-200">
          {TAB_TITLES[activeTab] ?? 'OceanWatch AI'}
        </h1>
      </div>

      <div className="flex flex-shrink-0 items-center gap-3">
        <div
          className={`hidden items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1.5 text-xs sm:flex ${color}`}
          aria-label={`API status: ${label}`}
          title={`${label} - ${apiUrl}`}
        >
          <span className={`status-dot ${dot} animate-pulse-dim`} aria-hidden="true" />
          <Icon size={12} aria-hidden="true" />
          <span>{label}</span>
        </div>

        <div
          className="flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1.5 font-mono text-xs tabular-nums text-slate-500"
          aria-label="Current UTC time"
        >
          <Clock size={11} aria-hidden="true" />
          <span>
            {time.toUTCString().split(' ').slice(4, 5).join(' ')}
            {' UTC'}
          </span>
        </div>
      </div>
    </header>
  );
}
