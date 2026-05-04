import { useEffect, useState } from 'react';
import { Wifi, WifiOff, Clock, Zap } from 'lucide-react';

const TAB_TITLES = {
  single:    'Single Tile Analysis',
  batch:     'Batch Analysis',
  incidents: 'Incident Log',
  benchmark: 'AMD MI300X Benchmark',
  settings:  'Settings',
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
    ok:      { color: 'text-green-400', dot: 'bg-green-500', label: 'API Online', Icon: Wifi },
    error:   { color: 'text-red-400',   dot: 'bg-red-500',   label: 'API Offline', Icon: WifiOff },
    unknown: { color: 'text-slate-500', dot: 'bg-slate-600', label: 'Connecting…', Icon: Wifi },
  }[apiStatus];

  const { color, dot, label, Icon } = statusConfig;

  return (
    <header className="flex items-center justify-between h-12 px-4 border-b border-ocean-700 bg-ocean-900 flex-shrink-0">
      {/* Left: breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <Zap size={13} className="text-cyan-bright flex-shrink-0" aria-hidden="true" />
        <h1 className="text-sm font-medium text-slate-200 truncate">
          {TAB_TITLES[activeTab] ?? 'OceanWatch AI'}
        </h1>
      </div>

      {/* Right: status + clock */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* API status */}
        <div
          className={`flex items-center gap-1.5 text-xs ${color}`}
          aria-label={`API status: ${label}`}
          title={`${label} — ${apiUrl}`}
        >
          <span className={`status-dot ${dot} animate-pulse-dim`} aria-hidden="true" />
          <Icon size={12} aria-hidden="true" />
          <span className="hidden sm:inline">{label}</span>
        </div>

        {/* Clock */}
        <div
          className="flex items-center gap-1.5 text-xs text-slate-500 font-mono tabular-nums"
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
