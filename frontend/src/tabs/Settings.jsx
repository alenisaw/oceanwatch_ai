import { useState } from 'react';
import { Save, RotateCcw, ExternalLink } from 'lucide-react';

const DEFAULTS = {
  apiUrl:            'http://localhost:8000',
  confidenceThreshold: 0.5,
  minComponentPixels:  8,
};

/**
 * @param {{ settings: object, onSave: (s) => void }} props
 */
export default function Settings({ settings, onSave }) {
  const [form, setForm] = useState({ ...DEFAULTS, ...settings });
  const [saved, setSaved] = useState(false);

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setSaved(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const reset = () => {
    setForm(DEFAULTS);
    setSaved(false);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="max-w-xl space-y-6">
        <form onSubmit={handleSave} className="space-y-6" noValidate>

          {/* API connection */}
          <Section title="API Connection">
            <Field label="Backend URL" hint="FastAPI server base URL (no trailing slash)">
              <input
                type="url"
                value={form.apiUrl}
                onChange={(e) => set('apiUrl', e.target.value)}
                className="input-field"
                placeholder="http://localhost:8000"
                aria-label="Backend API URL"
              />
            </Field>
            <div className="flex items-center gap-2 mt-2">
              <a
                href={`${form.apiUrl}/docs`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost text-xs border border-ocean-600"
              >
                <ExternalLink size={12} /> Open API Docs
              </a>
              <a
                href={`${form.apiUrl}/health`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost text-xs"
              >
                <ExternalLink size={12} /> Health Check
              </a>
            </div>
          </Section>

          {/* Analysis parameters */}
          <Section title="Analysis Parameters">
            <Field
              label={`Confidence threshold — ${form.confidenceThreshold}`}
              hint="Minimum confidence required before raising a risk flag."
            >
              <input
                type="range"
                min={0.1}
                max={0.9}
                step={0.05}
                value={form.confidenceThreshold}
                onChange={(e) => set('confidenceThreshold', parseFloat(e.target.value))}
                className="w-full accent-cyan-bright cursor-pointer"
                aria-label="Confidence threshold"
              />
              <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                <span>0.1 (permissive)</span>
                <span>0.9 (strict)</span>
              </div>
            </Field>

            <Field
              label={`Min component pixels — ${form.minComponentPixels}`}
              hint="Connected components smaller than this are discarded as noise."
            >
              <input
                type="range"
                min={1}
                max={64}
                step={1}
                value={form.minComponentPixels}
                onChange={(e) => set('minComponentPixels', parseInt(e.target.value, 10))}
                className="w-full accent-cyan-bright cursor-pointer"
                aria-label="Minimum component pixels"
              />
              <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                <span>1 px (sensitive)</span>
                <span>64 px (coarse)</span>
              </div>
            </Field>
          </Section>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button type="submit" className="btn-primary">
              <Save size={14} />
              {saved ? 'Saved!' : 'Save Settings'}
            </button>
            <button type="button" onClick={reset} className="btn-ghost">
              <RotateCcw size={14} /> Reset Defaults
            </button>
          </div>
        </form>

        {/* About */}
        <div className="divider pt-6">
          <div className="pt-4 panel-raised p-4 space-y-2 text-xs text-slate-400 leading-relaxed">
            <p className="section-label">About OceanWatch AI</p>
            <p>
              Sentinel-1 SAR satellite imagery analysis pipeline for marine pollution detection
              and triage. Classifies ocean tiles as none / low / medium / high risk based on
              backscatter anomaly detection.
            </p>
            <p className="text-slate-500">
              AMD Track 3 · Deterministic demo baseline · GPU inference available via ROCm/HIP.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <fieldset className="space-y-4">
      <legend className="section-label mb-3">{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-600">{hint}</p>}
    </div>
  );
}
