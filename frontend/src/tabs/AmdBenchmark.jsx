import { useState, useCallback } from 'react';
import { Cpu, Play, TrendingUp, Clock, Zap, BarChart2 } from 'lucide-react';
import { fetchBenchmark } from '../api/oceanwatch.js';
import StatusBanner from '../components/ui/StatusBanner.jsx';
import MetricCard from '../components/ui/MetricCard.jsx';
import RiskBadge from '../components/ui/RiskBadge.jsx';

const RISK_COLORS = {
  none:   'bg-green-500',
  low:    'bg-lime-500',
  medium: 'bg-amber-500',
  high:   'bg-red-500',
};

export default function AmdBenchmark({ apiUrl }) {
  const [status, setStatus]     = useState('idle');
  const [result, setResult]     = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const run = useCallback(async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const data = await fetchBenchmark(apiUrl);
      setResult(data);
      setStatus('success');
    } catch (err) {
      setErrorMsg(err.message ?? 'Unknown error');
      setStatus('error');
    }
  }, [apiUrl]);

  const isLoading = status === 'loading';
  const r = result;

  const riskTotal = r
    ? Object.values(r.risk_distribution).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">

      {/* ── Header ───────────────────────────────────── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Cpu size={16} className="text-cyan-bright" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-slate-100">AMD MI300X Benchmark</h2>
            <p className="text-xs text-slate-500">Throughput and latency profiling for AMD Track 3</p>
          </div>
        </div>
        <button onClick={run} disabled={isLoading} className="btn-primary">
          <Play size={14} /> {isLoading ? 'Running…' : 'Run Benchmark'}
        </button>
      </div>

      {/* ── Status ───────────────────────────────────── */}
      {status === 'loading' && (
        <StatusBanner
          variant="loading"
          message="Running benchmark suite…"
          detail="Executing 50 synthetic tile analyses to measure throughput and latency."
        />
      )}
      {status === 'error' && <StatusBanner variant="error" message="Benchmark failed" detail={errorMsg} />}

      {/* ── Idle state ───────────────────────────────── */}
      {status === 'idle' && (
        <div className="panel flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-ocean-750 border border-ocean-600 flex items-center justify-center">
            <Cpu size={28} className="text-slate-500" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-300">No benchmark data</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Press "Run Benchmark" to execute the inference throughput suite (50 synthetic tiles).
            </p>
          </div>
          <div className="panel-raised p-4 text-left space-y-2 max-w-sm w-full">
            <p className="section-label">What this measures</p>
            <ul className="text-xs text-slate-400 space-y-1.5">
              <li className="flex gap-2"><span className="text-cyan-dim">•</span> Average inference latency per tile (ms)</li>
              <li className="flex gap-2"><span className="text-cyan-dim">•</span> p95 / p99 tail latency</li>
              <li className="flex gap-2"><span className="text-cyan-dim">•</span> Throughput in tiles/second</li>
              <li className="flex gap-2"><span className="text-cyan-dim">•</span> Risk distribution across test suite</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── Results ──────────────────────────────────── */}
      {status === 'success' && r && (
        <div className="flex flex-col gap-4 flex-1 min-h-0 animate-slide-up overflow-y-auto scrollable">
          {/* Metric cards */}
          <div className="grid grid-cols-5 gap-2">
            <MetricCard label="Hardware"      value={r.hardware}                         icon={<Cpu size={13} />}       accent="text-cyan-bright" />
            <MetricCard label="Tiles Tested"  value={r.tiles_tested}                     icon={<BarChart2 size={13} />} />
            <MetricCard label="Avg Latency"   value={`${r.avg_latency_ms} ms`}           icon={<Clock size={13} />}     accent="text-sky-400" />
            <MetricCard label="p95 Latency"   value={`${r.p95_latency_ms} ms`}           icon={<Clock size={13} />}     accent="text-slate-300" />
            <MetricCard label="Throughput"    value={`${r.tiles_per_second}/s`}          icon={<Zap size={13} />}       accent="text-cyan-bright" />
          </div>

          <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
            {/* Latency profile */}
            <div className="panel p-4 space-y-3">
              <p className="section-label">Latency Profile</p>

              <LatencyBar label="Average" value={r.avg_latency_ms} max={r.p99_latency_ms * 1.2} color="bg-cyan-bright" />
              <LatencyBar label="p95"     value={r.p95_latency_ms} max={r.p99_latency_ms * 1.2} color="bg-sky-400" />
              <LatencyBar label="p99"     value={r.p99_latency_ms} max={r.p99_latency_ms * 1.2} color="bg-amber-400" />

              <div className="divider" />

              <div className="space-y-1">
                {[
                  { k: 'Avg latency',  v: `${r.avg_latency_ms} ms` },
                  { k: 'p95 latency',  v: `${r.p95_latency_ms} ms` },
                  { k: 'p99 latency',  v: `${r.p99_latency_ms} ms` },
                  { k: 'Throughput',   v: `${r.tiles_per_second} tiles/s` },
                  { k: 'Tiles tested', v: r.tiles_tested },
                  { k: 'Timestamp',    v: new Date(r.timestamp).toISOString().slice(0, 19).replace('T', ' ') },
                ].map(({ k, v }) => (
                  <div key={k} className="flex justify-between text-xs gap-2">
                    <span className="text-slate-500">{k}</span>
                    <span className="font-mono text-slate-200">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk distribution */}
            <div className="panel p-4 space-y-3">
              <p className="section-label">Risk Distribution</p>
              <div className="space-y-2.5">
                {Object.entries(r.risk_distribution).map(([level, count]) => {
                  const pct = riskTotal > 0 ? (count / riskTotal) * 100 : 0;
                  return (
                    <div key={level} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <RiskBadge level={level} size="sm" />
                        <span className="text-xs font-mono text-slate-400">
                          {count} <span className="text-slate-600">({pct.toFixed(0)}%)</span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-ocean-750 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${RISK_COLORS[level] ?? 'bg-slate-500'}`}
                          style={{ width: `${pct}%` }}
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${level} risk: ${count} tiles`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="divider" />
              <div className="panel-raised p-3 text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-300">AMD Track 3 note:</strong> On AMD MI300X hardware,
                replace the <code className="font-mono text-cyan-dim">runtime: cpu</code> label with{' '}
                <code className="font-mono text-cyan-dim">runtime: amd-mi300x</code> and swap
                the inference backend to ROCm/HIP. Throughput scales with batch parallelism and GPU memory.
              </div>
            </div>
          </div>

          <button onClick={run} disabled={isLoading} className="btn-ghost self-start text-xs border border-ocean-600">
            <Play size={12} /> Re-run Benchmark
          </button>
        </div>
      )}
    </div>
  );
}

function LatencyBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono text-slate-200">{value} ms</span>
      </div>
      <div className="h-2 bg-ocean-750 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
