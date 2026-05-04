import { useState, useCallback } from 'react';
import { Play, Upload, RotateCcw, TrendingUp, Clock, Layers } from 'lucide-react';
import { analyzeBatch } from '../api/oceanwatch.js';
import FileUpload from '../components/ui/FileUpload.jsx';
import StatusBanner from '../components/ui/StatusBanner.jsx';
import MetricCard from '../components/ui/MetricCard.jsx';
import RiskBadge from '../components/ui/RiskBadge.jsx';

const DEMO_TILE_NAMES = [
  'high_confidence_compact',
  'look_alike_uncertain',
  'low_risk',
  'medium_risk',
  'no_oil_like',
];

export default function BatchAnalysis() {
  const [status, setStatus]     = useState('idle');
  const [result, setResult]     = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [files, setFiles]       = useState([]);

  const reset = () => {
    setStatus('idle');
    setResult(null);
    setErrorMsg('');
    setFiles([]);
  };

  const runBatch = useCallback(async (targetFiles) => {
    if (!targetFiles?.length) return;
    setStatus('loading');
    setErrorMsg('');
    try {
      const data = await analyzeBatch(targetFiles);
      setResult(data);
      setStatus('success');
    } catch (err) {
      setErrorMsg(err.message ?? 'Unknown error');
      setStatus('error');
    }
  }, []);

  const isLoading = status === 'loading';

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">

      {/* ── Summary metrics ──────────────────────────── */}
      {result && (
        <div className="grid grid-cols-4 gap-2 flex-shrink-0">
          <MetricCard label="Total Tiles"  value={result.total_tiles}  icon={<Layers size={13} />} />
          <MetricCard
            label="Throughput"
            value={`${result.tiles_per_second.toFixed(1)}/s`}
            sub="tiles per second"
            icon={<TrendingUp size={13} />}
          />
          <MetricCard
            label="Total Latency"
            value={`${result.total_latency_ms.toFixed(0)} ms`}
            icon={<Clock size={13} />}
            accent="text-slate-300"
          />
          <MetricCard
            label="High Risk"
            value={result.results.filter((r) => r.risk_level === 'high').length}
            sub="tiles flagged"
            icon={<TrendingUp size={13} />}
            accent="text-red-400"
          />
        </div>
      )}

      {/* ── Status ───────────────────────────────────── */}
      {status === 'loading' && (
        <StatusBanner
          variant="loading"
          message={`Processing ${files.length} tile${files.length !== 1 ? 's' : ''}…`}
          detail="Running segmentation pipeline on each tile sequentially."
        />
      )}
      {status === 'error' && <StatusBanner variant="error" message="Batch analysis failed" detail={errorMsg} />}
      {status === 'success' && (
        <StatusBanner
          variant="success"
          message={`Batch complete — ${result.total_tiles} tiles processed`}
          detail={`${result.tiles_per_second.toFixed(1)} tiles/s · ${result.total_latency_ms.toFixed(0)} ms total`}
        />
      )}

      {/* ── Content ──────────────────────────────────── */}
      {status === 'idle' || status === 'error' ? (
        <div className="panel flex-1 flex flex-col gap-4 p-4 justify-center">
          <div className="max-w-xl mx-auto w-full space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Batch Tile Upload</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload multiple SAR tiles for sequential analysis. Results include per-tile latency, risk, and confidence.
              </p>
            </div>

            <FileUpload onFile={setFiles} multiple disabled={isLoading} />

            <div className="flex items-center gap-3">
              <button
                onClick={() => runBatch(files)}
                disabled={files.length === 0 || isLoading}
                className="btn-primary flex-1"
              >
                <Upload size={14} /> Run Batch ({files.length} files)
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-ocean-700" />
              <span className="text-[11px] text-slate-600 flex-shrink-0">or use demo tiles</span>
              <div className="flex-1 h-px bg-ocean-700" />
            </div>

            <button
              onClick={() => runBatch([])}
              disabled={isLoading}
              className="btn-ghost w-full border border-ocean-600 justify-center"
            >
              <Play size={14} /> Run Demo Batch
            </button>
          </div>
        </div>
      ) : (
        /* Results table */
        <div className="panel flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-ocean-700 flex-shrink-0">
            <span className="section-label">Batch Results</span>
            <button onClick={reset} className="btn-ghost text-xs py-1">
              <RotateCcw size={12} /> New Batch
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-auto scrollable">
            <table className="w-full text-xs" role="table" aria-label="Batch analysis results">
              <thead>
                <tr className="border-b border-ocean-700">
                  {['Tile', 'Risk', 'Confidence', 'Affected Area', 'Regions', 'Latency'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left font-medium text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result?.results?.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-ocean-800 hover:bg-ocean-750 transition-colors"
                    role="row"
                  >
                    <td className="px-4 py-2.5 font-mono text-slate-300 max-w-[140px] truncate" title={row.tile_id}>
                      {row.tile_id}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.risk_level === 'error'
                        ? <span className="text-red-400 text-[10px]">error</span>
                        : <RiskBadge level={row.risk_level} size="sm" />}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-300">
                      {row.error ? '—' : `${(row.confidence * 100).toFixed(1)}%`}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-300">
                      {row.error ? '—' : `${(row.affected_pixel_ratio * 100).toFixed(2)}%`}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-300">
                      {row.error ? '—' : row.regions_detected}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums font-mono text-slate-400">
                      {row.error ? <span className="text-red-400 text-[10px]">{row.error}</span> : `${row.latency_ms} ms`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
