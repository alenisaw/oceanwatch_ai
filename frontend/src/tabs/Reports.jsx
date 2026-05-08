import { useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  Bot,
  CalendarDays,
  Download,
  FileText,
  Flame,
  Loader2,
  MapPinned,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  fetchNoaaIncidents,
  fetchOceanRiskSurface,
  generateEnvironmentalReport,
} from '../api/oceanwatch.js';

const TODAY = new Date().toISOString().slice(0, 10);
const DEFAULT_START = '2010-01-01';

function safePercent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function computeReportStats(points, incidents) {
  const total = Math.max(points.length, 1);
  const averageSeverity = points.reduce((sum, point) => sum + Number(point.severity_score || 0), 0) / total;
  const highCount = points.filter((point) => point.severity_score >= 0.7).length;
  const criticalCount = points.filter((point) => point.severity_score >= 0.9).length;
  const contextCount = points.filter((point) => point.record_type === 'context_anchor').length;
  const reportedCount = points.length - contextCount;
  const recentCount = incidents.filter((incident) => String(incident.open_date || '') >= '2020-01-01').length;
  return {
    averageSeverity,
    contextCount,
    criticalCount,
    highCount,
    recentCount,
    reportedCount,
    surfaceCount: points.length,
  };
}

function rankZones(points) {
  const zones = [
    { id: 'north-america', label: 'North America', bounds: [[5, -170], [75, -45]] },
    { id: 'europe', label: 'Europe', bounds: [[34, -25], [72, 45]] },
    { id: 'asia', label: 'Asia', bounds: [[-10, 45], [72, 150]] },
    { id: 'africa', label: 'Africa', bounds: [[-36, -20], [38, 55]] },
    { id: 'south-america', label: 'South America', bounds: [[-56, -85], [14, -30]] },
    { id: 'gulf-mexico', label: 'Gulf of Mexico', bounds: [[18, -98], [31, -80]] },
    { id: 'north-sea', label: 'North Sea', bounds: [[51, -5], [62, 10]] },
    { id: 'malacca', label: 'Malacca Strait', bounds: [[0, 95], [8, 105]] },
  ];
  return zones
    .map((zone) => {
      const [[south, west], [north, east]] = zone.bounds;
      const zonePoints = points.filter(
        (point) => point.lat >= south && point.lat <= north && point.lon >= west && point.lon <= east,
      );
      const score = zonePoints.length
        ? zonePoints.reduce((sum, point) => sum + Number(point.severity_score || 0), 0) / zonePoints.length
        : 0;
      return { ...zone, count: zonePoints.length, score };
    })
    .sort((a, b) => b.score * b.count - a.score * a.count);
}

export default function Reports({ apiUrl }) {
  const reportRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);
  const [points, setPoints] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [timeframe, setTimeframe] = useState({ start: DEFAULT_START, end: TODAY });

  const stats = useMemo(() => computeReportStats(points, incidents), [incidents, points]);
  const rankedZones = useMemo(() => rankZones(points), [points]);

  async function generateReport() {
    setStatus('loading');
    setError('');
    try {
      const [incidentPayload, surfacePayload] = await Promise.all([
        fetchNoaaIncidents(
          { threat: 'Oil', limit: 2400, startDate: timeframe.start, endDate: timeframe.end },
          apiUrl,
        ),
        fetchOceanRiskSurface(
          { threat: 'Oil', limit: 2400, startDate: timeframe.start, endDate: timeframe.end },
          apiUrl,
        ),
      ]);
      const surfacePoints = surfacePayload.surface_points ?? [];
      const noaaIncidents = incidentPayload.incidents ?? [];
      const reportStats = computeReportStats(surfacePoints, noaaIncidents);
      const zones = rankZones(surfacePoints).slice(0, 6);
      const generated = await generateEnvironmentalReport(
        {
          geography: 'Global marine operating picture',
          ranked_zones: zones,
          stats: reportStats,
          timeframe,
        },
        apiUrl,
      );
      setPoints(surfacePoints);
      setIncidents(noaaIncidents);
      setReport(generated);
      setStatus('success');
    } catch (err) {
      setError(err.message ?? 'Unable to generate report');
      setStatus('error');
    }
  }

  async function exportPdf() {
    if (!reportRef.current || !report) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#f8fafc',
        scale: 2,
        useCORS: true,
      });
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      let y = 0;
      pdf.addImage(img, 'PNG', 0, y, pageWidth, imgHeight);
      let remaining = imgHeight - pageHeight;
      while (remaining > 0) {
        y -= pageHeight;
        pdf.addPage();
        pdf.addImage(img, 'PNG', 0, y, pageWidth, imgHeight);
        remaining -= pageHeight;
      }
      pdf.save(`oceanwatch-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mission-shell relative h-full overflow-hidden rounded-[1.6rem] border border-slate-700/70 bg-slate-950/80">
      <div className="pointer-events-none absolute inset-0 mission-aura" />
      <div className="relative h-full overflow-y-auto p-4 lg:p-5">
        <header className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
              <Sparkles size={13} />
              Report studio
            </div>
            <h2 className="mt-3 max-w-4xl text-2xl font-semibold leading-tight text-slate-50 sm:text-3xl lg:text-[2.35rem]">
              Generate enterprise-grade environmental intelligence reports.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Build a timestamped PDF with map visuals, heat surfaces, pollution metrics, charts, and open-source AI narrative analysis.
            </p>
          </div>

          <div className="rounded-[1.25rem] border border-slate-700/70 bg-slate-900/64 p-3 backdrop-blur-xl">
            <div className="grid grid-cols-2 gap-3">
              <DateField label="Start" value={timeframe.start} onChange={(start) => setTimeframe((prev) => ({ ...prev, start }))} />
              <DateField label="End" value={timeframe.end} onChange={(end) => setTimeframe((prev) => ({ ...prev, end }))} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button onClick={generateReport} disabled={status === 'loading'} className="premium-button justify-center">
                {status === 'loading' ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
                Generate Report
              </button>
              <button onClick={exportPdf} disabled={!report || exporting} className="premium-button justify-center">
                {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                Export PDF
              </button>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              LLM provider: Ollama-compatible open-source model. Fallback text is used only when the local model endpoint is offline.
            </p>
          </div>
        </header>

        {error && <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}

        {status === 'loading' && <ReportSkeleton />}

        {report ? (
          <ReportPreview
            incidents={incidents}
            points={points}
            rankedZones={rankedZones}
            report={report}
            reportRef={reportRef}
            stats={stats}
            timeframe={timeframe}
          />
        ) : (
          status !== 'loading' && <ReportEmptyState onGenerate={generateReport} />
        )}
      </div>
    </div>
  );
}

function ReportPreview({ incidents, points, rankedZones, report, reportRef, stats, timeframe }) {
  return (
    <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <article ref={reportRef} className="report-paper overflow-hidden rounded-[1.35rem] bg-slate-50 text-slate-950 shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
        <div className="bg-slate-950 px-8 py-7 text-slate-50">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200">OceanWatch AI</p>
              <h3 className="mt-2 text-3xl font-semibold leading-tight">Marine Pollution Intelligence Report</h3>
              <p className="mt-2 text-sm text-slate-400">
                Generated {new Date(report.generated_at).toLocaleString()} | {timeframe.start} to {timeframe.end}
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-200/20 bg-cyan-200/10 px-4 py-3 text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-100/70">AI model</p>
              <p className="mt-1 text-sm font-semibold">{report.model}</p>
              <p className="text-xs text-slate-400">{report.provider}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-8">
          <div className="grid gap-4 md:grid-cols-4">
            <ReportMetric label="Map inputs" value={stats.surfaceCount} />
            <ReportMetric label="Avg severity" value={safePercent(stats.averageSeverity)} />
            <ReportMetric label="High zones" value={stats.highCount} />
            <ReportMetric label="Critical" value={stats.criticalCount} />
          </div>

          <ReportMapVisual points={points} />

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section>
              <ReportSection title="Executive Summary">{report.summary}</ReportSection>
              <ReportSection title="Analytical Assessment">{report.executive_assessment}</ReportSection>
              <ReportSection title="Risk Trends">{report.risk_trends}</ReportSection>
            </section>
            <section className="space-y-5">
              <ReportChart stats={stats} incidents={incidents} />
              <div>
                <h4 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Highest-risk zones</h4>
                <div className="mt-3 space-y-2">
                  {rankedZones.slice(0, 6).map((zone) => (
                    <div key={zone.id} className="rounded-xl border border-slate-200 bg-slate-100 p-3">
                      <div className="flex justify-between gap-3">
                        <span className="text-sm font-semibold">{zone.label}</span>
                        <span className="text-xs text-slate-500">{zone.count} inputs</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-amber-300 to-red-500"
                          style={{ width: `${Math.max(5, zone.score * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-slate-100 p-5">
            <h4 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Recommended Actions</h4>
            <ol className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
              {(report.recommended_actions ?? []).map((action) => (
                <li key={action} className="rounded-xl bg-white p-3 shadow-sm">{action}</li>
              ))}
            </ol>
          </section>

          <footer className="border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
            {report.confidence_note}
          </footer>
        </div>
      </article>

      <aside className="space-y-3">
        <SideCard icon={Bot} label="AI Narrative" value={report.provider === 'ollama' ? 'Open-source LLM active' : 'Fallback mode'} />
        <SideCard icon={MapPinned} label="Map capture" value={`${points.length} surface inputs embedded`} />
        <SideCard icon={Flame} label="Heat surface" value={`${safePercent(stats.averageSeverity)} average pressure`} />
        <SideCard icon={ShieldCheck} label="Guardrail" value="Uncertainty-aware language enforced" />
      </aside>
    </section>
  );
}

function ReportMapVisual({ points }) {
  const visible = points.slice(0, 160);
  return (
    <div className="relative h-[360px] overflow-hidden rounded-3xl bg-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_42%,rgba(34,211,238,0.26),transparent_32%),radial-gradient(circle_at_72%_52%,rgba(248,113,113,0.28),transparent_28%),linear-gradient(135deg,#082f49,#0f172a_52%,#020617)]" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 430" role="img" aria-label="Report map heat surface">
        <path d="M0 185 C130 120 230 138 360 172 C515 214 600 95 740 126 C850 149 910 228 1000 190 L1000 430 L0 430 Z" fill="rgba(15, 118, 110, 0.35)" />
        <path d="M0 42 C160 84 276 18 410 58 C555 102 630 22 774 48 C878 67 940 112 1000 76" fill="none" stroke="rgba(103,232,249,0.22)" strokeWidth="3" />
        {visible.map((point, index) => {
          const x = ((Number(point.lon) + 180) / 360) * 1000;
          const y = ((90 - Number(point.lat)) / 180) * 430;
          const severity = Number(point.severity_score || 0);
          return (
            <g key={`${point.id}-${index}`}>
              <circle cx={x} cy={y} r={18 + severity * 28} fill={severity > 0.8 ? 'rgba(8,8,8,0.34)' : 'rgba(248,113,113,0.16)'} />
              <circle cx={x} cy={y} r={5 + severity * 8} fill={severity > 0.8 ? '#0a0a0a' : severity > 0.65 ? '#ef4444' : '#facc15'} opacity="0.86" />
            </g>
          );
        })}
      </svg>
      <div className="absolute bottom-4 left-4 rounded-2xl border border-white/15 bg-slate-950/78 px-4 py-3 text-slate-50 backdrop-blur-xl">
        <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-100/70">Auto map screenshot</p>
        <p className="mt-1 text-sm font-semibold">Global heat and zone overlay</p>
      </div>
    </div>
  );
}

function ReportChart({ stats, incidents }) {
  const reported = Math.max(1, stats.reportedCount);
  const context = Math.max(1, stats.contextCount);
  const recent = Math.max(1, stats.recentCount);
  const earlier = Math.max(1, incidents.length - stats.recentCount);
  const max = Math.max(reported, context, recent, earlier);
  const bars = [
    ['Reported', reported, '#22d3ee'],
    ['Context', context, '#14b8a6'],
    ['Recent', recent, '#f59e0b'],
    ['Earlier', earlier, '#64748b'],
  ];
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
      <h4 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Analytics Summary</h4>
      <div className="mt-4 space-y-3">
        {bars.map(([label, value, color]) => (
          <div key={label} className="grid grid-cols-[72px_minmax(0,1fr)_48px] items-center gap-3 text-xs">
            <span className="font-semibold text-slate-600">{label}</span>
            <span className="h-2 overflow-hidden rounded-full bg-slate-200">
              <span className="block h-full rounded-full" style={{ width: `${(value / max) * 100}%`, backgroundColor: color }} />
            </span>
            <span className="text-right text-slate-500">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportSection({ children, title }) {
  return (
    <div className="mb-5">
      <h4 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">{title}</h4>
      <p className="mt-2 text-sm leading-7 text-slate-700">{children}</p>
    </div>
  );
}

function ReportMetric({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function SideCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[1.2rem] border border-slate-700/70 bg-slate-950/72 p-4 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
          <Icon size={17} />
        </span>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</p>
          <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
        </div>
      </div>
    </div>
  );
}

function DateField({ label, onChange, value }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <span className="relative block">
        <CalendarDays size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input className="input-field h-11 rounded-xl pr-9" type="date" value={value} onChange={(event) => onChange(event.target.value)} />
      </span>
    </label>
  );
}

function ReportSkeleton() {
  return (
    <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="h-[780px] animate-pulse rounded-[1.35rem] bg-slate-900/80" />
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-[1.2rem] bg-slate-900/80" />
        <div className="h-24 animate-pulse rounded-[1.2rem] bg-slate-900/80" />
        <div className="h-24 animate-pulse rounded-[1.2rem] bg-slate-900/80" />
      </div>
    </div>
  );
}

function ReportEmptyState({ onGenerate }) {
  return (
    <section className="mt-5 grid min-h-[520px] place-items-center rounded-[1.35rem] border border-slate-700/70 bg-slate-950/72 p-8 text-center backdrop-blur-xl">
      <div className="max-w-xl">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
          <FileText size={24} />
        </div>
        <h3 className="mt-5 text-2xl font-semibold text-slate-50">No report generated yet</h3>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Generate a professional PDF-ready brief with map visuals, charts, statistics, and AI analytical narrative.
        </p>
        <button onClick={onGenerate} className="premium-button mt-5 justify-center">
          <RefreshCcw size={15} />
          Generate Report
        </button>
      </div>
    </section>
  );
}
