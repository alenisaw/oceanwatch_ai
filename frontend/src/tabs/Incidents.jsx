import { useState } from 'react';
import { AlertTriangle, Trash2, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import RiskBadge from '../components/ui/RiskBadge.jsx';

const RISK_ORDER = ['high', 'medium', 'low', 'none'];

/**
 * @param {{ incidents: IncidentReport[], onClear: () => void }} props
 */
export default function Incidents({ incidents, onClear }) {
  const [filter, setFilter]         = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const filtered = incidents
    .filter((r) => filter === 'all' || r.risk_level === filter)
    .slice()
    .sort((a, b) => {
      const ra = RISK_ORDER.indexOf(a.risk_level);
      const rb = RISK_ORDER.indexOf(b.risk_level);
      if (ra !== rb) return ra - rb;
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const counts = Object.fromEntries(
    ['all', ...RISK_ORDER].map((lvl) => [
      lvl,
      lvl === 'all' ? incidents.length : incidents.filter((r) => r.risk_level === lvl).length,
    ])
  );

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Header + controls */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-slate-500" aria-hidden="true" />
          <div className="flex gap-1">
            {['all', ...RISK_ORDER].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilter(lvl)}
                className={`text-[11px] font-medium px-2 py-1 rounded capitalize transition-colors cursor-pointer
                  ${filter === lvl
                    ? 'bg-ocean-700 text-slate-100'
                    : 'text-slate-500 hover:bg-ocean-800 hover:text-slate-300'}`}
                aria-pressed={filter === lvl}
              >
                {lvl === 'all' ? 'All' : lvl}
                {counts[lvl] > 0 && (
                  <span className="ml-1 opacity-60">({counts[lvl]})</span>
                )}
              </button>
            ))}
          </div>
        </div>
        {incidents.length > 0 && (
          <button
            onClick={onClear}
            className="btn-danger text-xs"
            aria-label="Clear all incidents"
          >
            <Trash2 size={12} /> Clear all
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollable space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-slate-600 select-none">
            <AlertTriangle size={28} aria-hidden="true" />
            <p className="text-xs text-center">
              {incidents.length === 0
                ? 'No incidents yet. Run an analysis from the Single Tile tab.'
                : `No incidents matching "${filter}" risk level.`}
            </p>
          </div>
        ) : (
          filtered.map((report) => (
            <IncidentRow
              key={report.incident_id}
              report={report}
              expanded={expandedId === report.incident_id}
              onToggle={() => setExpandedId(
                expandedId === report.incident_id ? null : report.incident_id
              )}
            />
          ))
        )}
      </div>
    </div>
  );
}

function IncidentRow({ report, expanded, onToggle }) {
  const ts = new Date(report.created_at);
  const dateStr = ts.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  return (
    <div
      className={`panel transition-all duration-150 overflow-hidden
        ${report.risk_level === 'high' ? 'border-red-900' : ''}
        ${report.risk_level === 'medium' ? 'border-amber-900' : ''}`}
    >
      {/* Row header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer hover:bg-ocean-750 transition-colors group"
        aria-expanded={expanded}
      >
        <RiskBadge level={report.risk_level} size="sm" />
        <div className="flex-1 min-w-0 grid grid-cols-3 gap-2">
          <span className="font-mono text-xs text-slate-300 truncate">{report.incident_id}</span>
          <span className="text-xs text-slate-500 truncate">{dateStr}</span>
          <span className="text-xs text-slate-500 truncate text-right">
            {(report.confidence * 100).toFixed(1)}% conf · {report.mask_summary?.regions_detected} regions
          </span>
        </div>
        <span className="flex-shrink-0 text-slate-600 group-hover:text-slate-400">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-ocean-700 px-4 py-3 grid grid-cols-2 gap-4 animate-fade-in">
          <div className="space-y-2">
            <InfoRow k="Type"           v={report.incident_type?.replace(/_/g, ' ')} />
            <InfoRow k="Affected area"  v={`${(report.affected_pixel_ratio * 100).toFixed(2)}%`} />
            <InfoRow k="Sensor"         v={report.source?.sensor} />
            <InfoRow k="Channels"       v={report.source?.channels?.join(', ')} />
            <InfoRow k="Model"          v={report.model?.segmentation_model} />
          </div>
          <div>
            <p className="section-label mb-1.5">Recommended Actions</p>
            <ol className="space-y-1">
              {report.recommended_actions?.map((a, i) => (
                <li key={i} className="flex gap-2 text-xs text-slate-400">
                  <span className="text-cyan-dim font-mono text-[10px] flex-shrink-0 pt-px">{String(i + 1).padStart(2, '0')}</span>
                  {a}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ k, v }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs">
      <span className="text-slate-500">{k}</span>
      <span className="text-slate-300 font-mono truncate text-right">{v ?? '—'}</span>
    </div>
  );
}
