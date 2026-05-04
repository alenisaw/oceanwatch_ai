import { useRef, useState, useCallback } from 'react';
import { Upload, FileText, X } from 'lucide-react';

const ACCEPTED = ['.npy', '.npz', '.tif', '.tiff'];
const ACCEPTED_MIME = [
  'application/octet-stream',
  'image/tiff',
  'image/tif',
].join(',');

/**
 * @param {{ onFile: (File) => void, multiple?: boolean, disabled?: boolean }} props
 */
export default function FileUpload({ onFile, multiple = false, disabled = false }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleFiles = useCallback((files) => {
    const valid = Array.from(files).filter((f) => {
      const ext = '.' + f.name.split('.').pop().toLowerCase();
      return ACCEPTED.includes(ext);
    });
    if (valid.length === 0) return;
    setSelectedFiles(valid);
    if (multiple) {
      onFile(valid);
    } else {
      onFile(valid[0]);
    }
  }, [onFile, multiple]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  }, [disabled, handleFiles]);

  const onDragOver = (e) => { e.preventDefault(); if (!disabled) setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const onInputChange = (e) => {
    if (e.target.files?.length) handleFiles(e.target.files);
  };

  const clearFiles = (e) => {
    e.stopPropagation();
    setSelectedFiles([]);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload SAR tile file"
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => e.key === 'Enter' && !disabled && inputRef.current?.click()}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`relative flex flex-col items-center justify-center gap-3
        border-2 border-dashed rounded-xl p-8 text-center
        transition-all duration-150 select-none
        ${disabled
          ? 'border-ocean-700 bg-ocean-900 cursor-not-allowed opacity-50'
          : dragging
            ? 'border-cyan-bright bg-cyan-dark/20 cursor-copy'
            : selectedFiles.length > 0
              ? 'border-cyan-dim bg-ocean-850 cursor-pointer'
              : 'border-ocean-600 bg-ocean-850 hover:border-cyan-dim hover:bg-ocean-800 cursor-pointer'
        }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        multiple={multiple}
        className="sr-only"
        onChange={onInputChange}
        disabled={disabled}
        aria-hidden="true"
      />

      {selectedFiles.length > 0 ? (
        <>
          <FileText size={28} className="text-cyan-bright" aria-hidden="true" />
          <div className="space-y-1">
            {selectedFiles.map((f, i) => (
              <p key={i} className="text-sm font-medium text-slate-200 truncate max-w-xs">{f.name}</p>
            ))}
            <p className="text-xs text-slate-500">
              {selectedFiles.length === 1
                ? `${(selectedFiles[0].size / 1024).toFixed(1)} KB`
                : `${selectedFiles.length} files selected`}
            </p>
          </div>
          <button
            onClick={clearFiles}
            className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            aria-label="Clear selection"
          >
            <X size={16} />
          </button>
        </>
      ) : (
        <>
          <Upload size={28} className={dragging ? 'text-cyan-bright' : 'text-slate-500'} aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-slate-300">
              {dragging ? 'Drop to upload' : 'Drop tile here or click to browse'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Accepted: {ACCEPTED.join(', ')} — Sentinel-1 SAR tiles
            </p>
          </div>
        </>
      )}
    </div>
  );
}
