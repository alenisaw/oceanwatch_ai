/**
 * Compact metric card for the analytics toolbar.
 * @param {{ label, value, sub, icon: ReactNode, accent?: string, loading?: boolean }} props
 */
export default function MetricCard({ label, value, sub, icon, accent = 'text-cyan-bright', loading = false }) {
  return (
    <div className="metric-card min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="section-label truncate">{label}</span>
        {icon && (
          <span className={`flex-shrink-0 ${accent} opacity-70`} aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      {loading ? (
        <div className="h-6 w-24 bg-ocean-700 rounded animate-pulse" />
      ) : (
        <span className={`text-lg font-semibold leading-none ${accent}`}>{value ?? '—'}</span>
      )}
      {sub && !loading && (
        <span className="text-[11px] text-slate-500 truncate">{sub}</span>
      )}
    </div>
  );
}
