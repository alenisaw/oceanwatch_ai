import { useState, useCallback } from 'react';
import { Play, Upload, RotateCcw, Activity, Target, MapPin, Gauge } from 'lucide-react';
import { runDemoAnalysisFull, analyzeTileFull } from '../api/oceanwatch.js';
import FileUpload from '../components/ui/FileUpload.jsx';
import StatusBanner from '../components/ui/StatusBanner.jsx';
import MetricCard from '../components/ui/MetricCard.jsx';
import RiskBadge from '../components/ui/RiskBadge.jsx';
import ImageViewer from '../components/panels/ImageViewer.jsx';
import ReportPanel from '../components/panels/ReportPanel.jsx';
import JsonExport from '../components/panels/JsonExport.jsx';

const PANEL_REPORT = 'report';
const PANEL_JSON   = 'json';

/**
 * @param {{ onNewIncident: (report) => void }} props
 */
export default function SingleTile({ onNewIncident }) {
  const [status, setStatus]     = useState('idle'); // idle | loading | success | error
  const [result, setResult]     = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [panel, setPanel]       = useState(PANEL_REPORT);
  const [file, setFile]         = useState(null);

  const reset = () => {
    setStatus('idle');
    setResult(null);
    setErrorMsg('');
    setFile(null);
  };

  const runAnalysis = useCallback(async (apiFn) => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const data = await apiFn();
      setResult(data);
      setStatus('success');
      if (data?.report) onNewIncident?.(data.report);
    } catch (err) {
      setErrorMsg(err.message ?? 'Unknown error');
      setStatus('error');
    }
  }, [onNewIncident]);

  const runDemo   = () => runAnalysis(runDemoAnalysisFull);
  const runUpload = () => {
    if (!file) return;
    runAnalysis(() => analyzeTileFull(file));
  };

  const r = result?.report;
  const isLoading = status === 'loading';

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">

      {/* ── Metric cards ─────────────────────────────── */}
      <div className="grid grid-cols-5 gap-2 flex-shrink-0">
        <MetricCard
          label="Risk Level"
          value={r ? <RiskBadge level={r.risk_level} size="sm" /> : '—'}
          icon={<Activity size={13} />}
          loading={isLoading}
        />
        <MetricCard
          label="Confidence"
          value={r ? `${(r.confidence * 100).toFixed(1)}%` : '—'}
          icon={<Gauge size={13} />}
          loading={isLoading}
        />
        <MetricCard
          label="Affected Area"
          value={r ? `${(r.affected_pixel_ratio * 100).toFixed(2)}%` : '—'}
          sub="of total pixels"
          icon={<Target size={13} />}
          loading={isLoading}
        />
        <MetricCard
          label="Regions"
          value={r?.mask_summary?.regions_detected ?? '—'}
          sub="connected components"
          icon={<MapPin size={13} />}
          loading={isLoading}
        />
        <MetricCard
          label="Latency"
          value={result?.latency_ms != null ? `${result.latency_ms.toFixed(0)} ms` : '—'}
          sub="inference time"
          icon={<Activity size={13} />}
          accent="text-slate-300"
          loading={isLoading}
        />
      </div>

      {/* ── Status banner ────────────────────────────── */}
      {status === 'loading' && (
        <StatusBanner variant="loading" message="Running inference…" detail="Segmentation model is analyzing the SAR tile." />
      )}
      {status === 'error' && (
        <StatusBanner variant="error" message="Analysis failed" detail={errorMsg} />
      )}
      {status === 'success' && (
        <StatusBanner
          variant="success"
          message="Analysis complete"
          detail={`Incident ${r?.incident_id} · ${r?.risk_level} risk · ${(r?.confidence * 100).toFixed(1)}% confidence`}
        />
      )}

      {/* ── Main workspace ───────────────────────────── */}
      <div className="flex flex-1 min-h-0 gap-3">

        {/* Left: upload + image viewer */}
        <div className="flex flex-col flex-1 min-w-0 gap-3">
          {status === 'idle' || status === 'error' ? (
            /* Upload / Demo area */
            <div className="panel flex-1 flex flex-col gap-4 p-4 justify-center">
              <div className="max-w-lg mx-auto w-full space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-200">Upload SAR Tile</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Upload a Sentinel-1 SAR tile (.npy, .npz, .tif, .tiff) for pollution detection analysis.
                  </p>
                </div>

                <FileUpload onFile={setFile} disabled={isLoading} />

                <div className="flex items-center gap-3">
                  <button
                    onClick={runUpload}
                    disabled={!file || isLoading}
                    className="btn-primary flex-1"
                  >
                    <Upload size={14} /> Analyze Tile
                  </button>
                  <span className="text-xs text-slate-600 flex-shrink-0">or</span>
                  <button
                    onClick={runDemo}
                    disabled={isLoading}
                    className="btn-ghost flex-1 border border-ocean-600"
                  >
                    <Play size={14} /> Run Demo
                  </button>
                </div>

                <p className="text-[11px] text-slate-600 text-center">
                  Demo uses a synthetic 128×128 Sentinel-1 SAR tile.
                </p>
              </div>
            </div>
          ) : (
            /* Image viewer after analysis */
            <div className="flex-1 min-h-0">
              <ImageViewer
                previewB64={result?.preview_b64 ?? null}
                overlayB64={result?.overlay_b64 ?? null}
                loading={isLoading}
                tileId={r?.source?.image_id}
              />
            </div>
          )}

          {/* Re-run controls when result is shown */}
          {(status === 'success') && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={runDemo} disabled={isLoading} className="btn-ghost text-xs">
                <Play size={12} /> New Demo
              </button>
              <button onClick={reset} className="btn-ghost text-xs">
                <RotateCcw size={12} /> Upload New Tile
              </button>
            </div>
          )}
        </div>

        {/* Right: report / JSON panel */}
        <div className="flex flex-col w-[340px] flex-shrink-0 gap-2">
          {/* Panel tabs */}
          <div className="flex gap-1 p-1 bg-ocean-900 rounded-lg border border-ocean-700 flex-shrink-0">
            <PanelTab id={PANEL_REPORT} active={panel} onClick={setPanel} label="Report" />
            <PanelTab id={PANEL_JSON}   active={panel} onClick={setPanel} label="JSON" />
          </div>

          {/* Panel content */}
          <div className="panel flex-1 min-h-0 overflow-y-auto scrollable p-4">
            {panel === PANEL_REPORT ? (
              <ReportPanel report={r ?? null} loading={isLoading} />
            ) : (
              <div className="h-full -m-4">
                <JsonExport
                  data={result?.report ?? null}
                  filename={r ? `${r.incident_id}.json` : 'oceanwatch-report.json'}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelTab({ id, active, onClick, label }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors duration-150 cursor-pointer
        ${active === id
          ? 'bg-ocean-700 text-slate-100'
          : 'text-slate-500 hover:text-slate-300 hover:bg-ocean-800'}`}
      aria-pressed={active === id}
    >
      {label}
    </button>
  );
}
