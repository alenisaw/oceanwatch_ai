const RISK_CONFIG = {
  none:    { label: 'None',   bg: 'bg-green-950',  border: 'border-green-700',  text: 'text-green-400',  dot: 'bg-green-500'  },
  low:     { label: 'Low',    bg: 'bg-lime-950',   border: 'border-lime-700',   text: 'text-lime-400',   dot: 'bg-lime-500'   },
  medium:  { label: 'Medium', bg: 'bg-amber-950',  border: 'border-amber-700',  text: 'text-amber-400',  dot: 'bg-amber-500'  },
  high:    { label: 'High',   bg: 'bg-red-950',    border: 'border-red-700',    text: 'text-red-400',    dot: 'bg-red-500'    },
  unknown: { label: '—',      bg: 'bg-ocean-800',  border: 'border-ocean-600',  text: 'text-slate-400',  dot: 'bg-slate-500'  },
};

/**
 * @param {{ level: string, size?: 'sm' | 'md' | 'lg' }} props
 */
export default function RiskBadge({ level = 'unknown', size = 'md' }) {
  const cfg = RISK_CONFIG[level] ?? RISK_CONFIG.unknown;

  const sizeClasses = {
    sm:  'text-[10px] px-1.5 py-0.5 gap-1',
    md:  'text-xs px-2 py-1 gap-1.5',
    lg:  'text-sm px-3 py-1.5 gap-2',
  }[size];

  const dotSize = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-semibold rounded border uppercase tracking-wide
        ${cfg.bg} ${cfg.border} ${cfg.text} ${sizeClasses}`}
      aria-label={`Risk level: ${cfg.label}`}
    >
      <span className={`rounded-full flex-shrink-0 ${cfg.dot} ${dotSize}`} aria-hidden="true" />
      {cfg.label}
    </span>
  );
}
