import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, Sparkles, FolderUp, Clipboard } from 'lucide-react';
import { SAMPLE_IMAGES, fetchSampleAsFile, SampleImage } from '../utils/sampleImages';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  isLoadingSample?: boolean;
  onLoadSample: (sample: SampleImage) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesSelected,
  isLoadingSample,
  onLoadSample
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.items) {
        const files: File[] = [];
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) files.push(file);
          }
        }
        if (files.length > 0) {
          onFilesSelected(files);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onFilesSelected]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith('image/')
      );
      if (files.length > 0) {
        onFilesSelected(files);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).filter((file) =>
        file.type.startsWith('image/')
      );
      if (files.length > 0) {
        onFilesSelected(files);
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Main Upload Drop Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group cursor-pointer border-2 border-dashed rounded-3xl p-8 sm:p-14 text-center transition-all duration-300 ${
          isDragOver
            ? 'border-brand-400 bg-brand-500/10 scale-[1.01]'
            : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70 shadow-2xl'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png, image/jpeg, image/webp, image/avif, image/gif"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-500 flex items-center justify-center text-white shadow-xl shadow-brand-500/25 group-hover:scale-110 transition-transform duration-300">
            <UploadCloud className="w-10 h-10 animate-bounce" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Drag & Drop your images here
            </h3>
            <p className="text-sm text-slate-400">
              or click to browse files from your computer
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60">
              <FolderUp className="w-3.5 h-3.5 text-brand-400" />
              Batch uploads supported
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60">
              <Clipboard className="w-3.5 h-3.5 text-cyan-400" />
              Paste from clipboard (<kbd className="font-mono text-[10px] bg-slate-900 px-1 py-0.5 rounded border border-slate-700">Ctrl+V</kbd>)
            </span>
          </div>

          <div className="pt-2 text-[11px] text-slate-500 font-medium">
            Supports PNG, JPEG, WEBP, AVIF • Full-resolution cutout • 100% private in-browser
          </div>
        </div>
      </div>

      {/* Sample Images Section */}
      <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Or try with a sample image:</span>
          </div>
          <span className="text-[11px] text-slate-500">Instant 1-Click Test</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SAMPLE_IMAGES.map((sample) => (
            <button
              key={sample.id}
              onClick={() => onLoadSample(sample)}
              disabled={isLoadingSample}
              className="group relative flex flex-col items-start overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 hover:border-brand-500/50 transition-all hover:scale-[1.02] text-left"
            >
              <div className="w-full h-24 overflow-hidden bg-slate-950">
                <img
                  src={sample.thumbnail}
                  alt={sample.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  crossOrigin="anonymous"
                />
              </div>
              <div className="p-2.5 w-full">
                <div className="text-xs font-medium text-slate-200 truncate group-hover:text-brand-300">
                  {sample.name}
                </div>
                <div className="text-[10px] text-slate-400">{sample.category}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
