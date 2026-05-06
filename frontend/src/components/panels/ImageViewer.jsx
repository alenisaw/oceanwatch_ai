import { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

/**
 * Side-by-side SAR preview and mask overlay viewer.
 * @param {{ previewB64: string|null, overlayB64: string|null, loading: boolean, tileId: string }} props
 */
export default function ImageViewer({ previewB64, overlayB64, loading, tileId }) {
  const [zoom, setZoom] = useState(1);

  const zoomIn  = () => setZoom((z) => Math.min(z + 0.25, 3));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const reset   = () => setZoom(1);

  return (
    <div className="panel flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ocean-700">
        <span className="section-label">Image Preview</span>
        <div className="flex items-center gap-1">
          <button onClick={zoomOut} disabled={zoom <= 0.5} className="btn-ghost p-1" aria-label="Zoom out">
            <ZoomOut size={13} />
          </button>
          <button onClick={reset} className="text-[10px] font-mono text-slate-400 hover:text-slate-200 px-1 cursor-pointer" aria-label="Reset zoom">
            {Math.round(zoom * 100)}%
          </button>
          <button onClick={zoomIn}  disabled={zoom >= 3}   className="btn-ghost p-1" aria-label="Zoom in">
            <ZoomIn size={13} />
          </button>
          <div className="w-px h-4 bg-ocean-700 mx-1" aria-hidden="true" />
          <button onClick={reset} className="btn-ghost p-1" aria-label="Fit to panel">
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* Images */}
      <div className="flex flex-1 min-h-0 gap-2 p-3 overflow-auto scrollable">
        <ImagePane
          src={previewB64}
          label="SAR Preview"
          sublabel="VV channel — backscatter intensity"
          alt={tileId ? `SAR preview for tile ${tileId}` : 'SAR preview'}
          loading={loading}
          zoom={zoom}
        />
        <ImagePane
          src={overlayB64}
          label="Predicted Mask"
          sublabel="Pollution probability overlay"
          alt={tileId ? `Predicted mask overlay for tile ${tileId}` : 'Predicted mask overlay'}
          loading={loading}
          zoom={zoom}
          accent
        />
      </div>
    </div>
  );
}

function ImagePane({ src, label, sublabel, alt, loading, zoom, accent = false }) {
  return (
    <div className="flex-1 flex flex-col gap-2 min-w-0">
      <div className="flex items-baseline gap-1.5">
        <span className={`text-xs font-semibold ${accent ? 'text-cyan-bright' : 'text-slate-300'}`}>{label}</span>
        <span className="text-[10px] text-slate-500 truncate">{sublabel}</span>
      </div>

      <div
        className={`flex-1 min-h-[160px] rounded-lg overflow-auto bg-ocean-950 border
          flex items-center justify-center scrollable
          ${accent ? 'border-cyan-dark' : 'border-ocean-700'}`}
      >
        {loading ? (
          <div className="w-full h-full min-h-[160px] bg-ocean-900 rounded-lg animate-pulse" />
        ) : src ? (
          <img
            src={src}
            alt={alt}
            draggable={false}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.15s ease' }}
            className="max-w-none object-contain rounded"
          />
        ) : (
          <EmptyPane />
        )}
      </div>
    </div>
  );
}

function EmptyPane() {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-slate-600 select-none">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <rect x="4" y="4" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
        <path d="M12 28L18 20L23 25L27 19L34 28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="14" cy="15" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span className="text-xs">No image data</span>
    </div>
  );
}
