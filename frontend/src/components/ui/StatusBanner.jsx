import { AlertTriangle, CheckCircle, Info, XCircle, Loader } from 'lucide-react';

const VARIANTS = {
  success: { icon: CheckCircle, bg: 'bg-green-950',  border: 'border-green-800',  text: 'text-green-300',  iconColor: 'text-green-400' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-950', border: 'border-amber-800', text: 'text-amber-300',  iconColor: 'text-amber-400' },
  error:   { icon: XCircle,      bg: 'bg-red-950',    border: 'border-red-800',    text: 'text-red-300',    iconColor: 'text-red-400'   },
  info:    { icon: Info,         bg: 'bg-ocean-800',  border: 'border-ocean-600',  text: 'text-slate-300',  iconColor: 'text-cyan-bright'},
  loading: { icon: Loader,       bg: 'bg-ocean-800',  border: 'border-ocean-600',  text: 'text-slate-300',  iconColor: 'text-cyan-bright'},
};

/**
 * @param {{ variant: 'success'|'warning'|'error'|'info'|'loading', message: string, detail?: string }} props
 */
export default function StatusBanner({ variant = 'info', message, detail }) {
  const cfg = VARIANTS[variant] ?? VARIANTS.info;
  const Icon = cfg.icon;
  const spin = variant === 'loading';

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm
        ${cfg.bg} ${cfg.border} ${cfg.text} animate-fade-in`}
    >
      <Icon
        size={16}
        className={`flex-shrink-0 mt-0.5 ${cfg.iconColor} ${spin ? 'animate-spin' : ''}`}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="font-medium">{message}</p>
        {detail && <p className="mt-0.5 text-xs opacity-70">{detail}</p>}
      </div>
    </div>
  );
}
