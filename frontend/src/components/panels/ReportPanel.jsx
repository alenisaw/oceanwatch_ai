import { AlertTriangle, CheckCircle2, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import RiskBadge from '../ui/RiskBadge.jsx';

/**
 * @param {{ report: IncidentReport | null, loading: boolean }} props
 */
export default function ReportPanel({ report, loading }) {
  const [showFullReport, setShowFullReport] = useState(false);

  if (loading) return <ReportSkeleton />;
  if (!report) return <ReportEmpty />;

  return (
    <div className="flex flex-col gap-4 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-mono text-slate-500 truncate">{report.incident_id}</p>
          <p className="text-sm font-semibold text-slate-100 mt-0.5 truncate">{report.incident_type.replace(/_/g, ' ')}</p>
        </div>
        <RiskBadge level={report.risk_level} size="md" />
      </div>

      <div className="divider" />

      {/* Uncertainty notes */}
      {report.uncertainty?.length > 0 && (
        <Section
          icon={<AlertTriangle size={13} />}
          title="Uncertainty Notes"
          iconColor="text-amber-400"
        >
          <ul className="space-y-1.5">
            {report.uncertainty.map((note, i) => (
              <li key={i} className="flex gap-2 text-xs text-slate-400 leading-relaxed">
                <span className="flex-shrink-0 text-amber-600 mt-0.5">•</span>
                {note}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Recommended actions */}
      {report.recommended_actions?.length > 0 && (
        <Section
          icon={<CheckCircle2 size={13} />}
          title="Recommended Actions"
          iconColor="text-cyan-bright"
        >
          <ol className="space-y-1.5">
            {report.recommended_actions.map((action, i) => (
              <li key={i} className="flex gap-2 text-xs text-slate-300 leading-relaxed">
                <span className="flex-shrink-0 font-mono text-cyan-dim mt-0.5 text-[10px] pt-px">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {action}
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Narrative report */}
      {report.report && (
        <Section
          icon={<FileText size={13} />}
          title="Incident Summary"
          iconColor="text-slate-400"
        >
          <div>
            <p className={`text-xs text-slate-400 leading-relaxed whitespace-pre-wrap ${!showFullReport ? 'line-clamp-4' : ''}`}>
              {report.report}
            </p>
            {report.report.length > 200 && (
              <button
                onClick={() => setShowFullReport((v) => !v)}
                className="mt-1.5 text-[11px] text-cyan-dim hover:text-cyan-bright flex items-center gap-1 cursor-pointer transition-colors"
              >
                {showFullReport ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Show full report</>}
              </button>
            )}
          </div>
        </Section>
      )}

      {/* Model info */}
      <div className="panel-raised p-3 space-y-1">
        <p className="section-label mb-2">Model</p>
        <Row k="Segmentation" v={report.model?.segmentation_model} />
        <Row k="Runtime"      v={report.model?.runtime} />
        <Row k="Mode"         v={report.model?.reporting_mode} />
        <Row k="Sensor"       v={report.source?.sensor} />
        <Row k="Channels"     v={report.source?.channels?.join(', ')} />
      </div>
    </div>
  );
}

function Section({ icon, title, iconColor, children }) {
  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-1.5 ${iconColor}`}>
        {icon}
        <span className="text-xs font-semibold text-slate-300">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs">
      <span className="text-slate-500 flex-shrink-0">{k}</span>
      <span className="text-slate-300 font-mono text-right truncate">{v ?? '—'}</span>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[80, 60, 90, 50].map((w, i) => (
        <div key={i} className="h-3 bg-ocean-700 rounded" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

function ReportEmpty() {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-slate-600 select-none">
      <FileText size={28} aria-hidden="true" />
      <p className="text-xs text-center">Run an analysis to generate<br />the incident report.</p>
    </div>
  );
}
