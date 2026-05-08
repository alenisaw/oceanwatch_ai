/**
 * OceanWatch AI — API adapter layer.
 * All backend communication is isolated here. No mock logic leaks into UI components.
 * Demo fallback (DEMO_RESULT) is exported but clearly flagged as synthetic.
 */

const BASE = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8001';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? body.message ?? detail;
    } catch {
      /* ignore parse failure */
    }
    throw new Error(detail);
  }
  return res.json();
}

export async function healthCheck() {
  return request('/health');
}

/** Run demo analysis — returns IncidentReport only (no images). */
export async function runDemoAnalysis() {
  return request('/analyze/demo', { method: 'POST' });
}

/** Run demo analysis with SAR preview + mask overlay as base64 data URIs. */
export async function runDemoAnalysisFull() {
  return request('/analyze/demo/full', { method: 'POST' });
}

/**
 * Analyze a single uploaded tile file.
 * @param {File} file — .npy / .npz / .tif / .tiff
 * @returns {{ report, preview_b64, overlay_b64, latency_ms }}
 */
export async function analyzeTileFull(file) {
  const form = new FormData();
  form.append('file', file);
  return request('/analyze/tile/full', { method: 'POST', body: form });
}

/**
 * Batch-analyze multiple tiles.
 * @param {File[]} files
 * @returns {{ total_tiles, total_latency_ms, tiles_per_second, results[], timestamp }}
 */
export async function analyzeBatch(files) {
  const form = new FormData();
  for (const f of files) form.append('files', f);
  return request('/analyze/batch', { method: 'POST', body: form });
}

/**
 * Fetch benchmark results (synthetic CPU run; swap hardware label for MI300X on AMD infra).
 * @returns {{ hardware, tiles_tested, avg_latency_ms, p95_latency_ms, p99_latency_ms, tiles_per_second, risk_distribution, timestamp }}
 */
export async function fetchBenchmark() {
  return request('/benchmark');
}

/**
 * Fetch official NOAA IncidentNews records with coordinates.
 * @param {{ threat?: string, limit?: number, startDate?: string, endDate?: string }} filters
 */
export async function fetchNoaaIncidents(filters = {}) {
  const params = new URLSearchParams();
  params.set('threat', filters.threat ?? 'Oil');
  params.set('limit', String(filters.limit ?? 1200));
  if (filters.startDate) params.set('start_date', filters.startDate);
  if (filters.endDate) params.set('end_date', filters.endDate);
  return request(`/incidents/noaa?${params.toString()}`);
}

/**
 * Fetch points for the satellite heat surface.
 * Includes NOAA reported incidents plus contextual maritime oil-risk anchors.
 * @param {{ threat?: string, limit?: number, startDate?: string, endDate?: string }} filters
 */
export async function fetchOceanRiskSurface(filters = {}) {
  const params = new URLSearchParams();
  params.set('threat', filters.threat ?? 'Oil');
  params.set('limit', String(filters.limit ?? 1200));
  if (filters.startDate) params.set('start_date', filters.startDate);
  if (filters.endDate) params.set('end_date', filters.endDate);
  return request(`/incidents/ocean-risk?${params.toString()}`);
}

/**
 * Generate a professional environmental report draft using an open-source LLM provider when available.
 * @param {{ geography: string, stats: object, ranked_zones: object[], timeframe: object }} payload
 */
export async function generateEnvironmentalReport(payload) {
  return request('/reports/environmental', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
