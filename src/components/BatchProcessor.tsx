import React from 'react';
import {
  Layers,
  Play,
  Download,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FileArchive,
  Plus
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ImageItem } from '../types';

interface BatchProcessorProps {
  items: ImageItem[];
  activeId: string;
  onSelectActive: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  onProcessAll: () => void;
  isProcessingAny: boolean;
  onAddMore: () => void;
}

export const BatchProcessor: React.FC<BatchProcessorProps> = ({
  items,
  activeId,
  onSelectActive,
  onRemoveItem,
  onClearAll,
  onProcessAll,
  isProcessingAny,
  onAddMore
}) => {
  const completedCount = items.filter((i) => i.status === 'done').length;
  const isAllDone = completedCount === items.length && items.length > 0;

  const handleDownloadZip = async () => {
    const zip = new JSZip();
    const folder = zip.folder('cutouts');

    for (const item of items) {
      if (item.processedBlob) {
        const fileName = item.name.replace(/\.[^/.]+$/, '') + '-nobg.png';
        folder?.file(fileName, item.processedBlob);
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `magiccut-batch-${Date.now()}.zip`);
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-brand-400" />
          <h3 className="font-semibold text-white text-sm">
            Batch Queue ({items.length} {items.length === 1 ? 'image' : 'images'})
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
            {completedCount}/{items.length} Ready
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onAddMore}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add More</span>
          </button>

          {!isAllDone && (
            <button
              onClick={onProcessAll}
              disabled={isProcessingAny}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-xs font-medium text-white shadow-md shadow-brand-500/25 transition-all disabled:opacity-50"
            >
              {isProcessingAny ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              <span>Process All</span>
            </button>
          )}

          {completedCount > 0 && (
            <button
              onClick={handleDownloadZip}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white shadow-md shadow-emerald-600/25 transition-all"
            >
              <FileArchive className="w-3.5 h-3.5" />
              <span>Download ZIP ({completedCount})</span>
            </button>
          )}

          <button
            onClick={onClearAll}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Clear all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid of Items */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-64 overflow-y-auto pr-1">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectActive(item.id)}
            className={`group relative rounded-xl border p-2 cursor-pointer transition-all overflow-hidden ${
              item.id === activeId
                ? 'border-brand-500 bg-brand-500/10 shadow-md ring-1 ring-brand-500'
                : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
            }`}
          >
            <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-slate-900 bg-checkerboard flex items-center justify-center">
              <img
                src={item.processedUrl || item.originalUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />

              {/* Status Overlay */}
              {item.status === 'processing' && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-2 text-center">
                  <Loader2 className="w-5 h-5 text-brand-400 animate-spin mb-1" />
                  <span className="text-[10px] font-mono text-white">{item.progress}%</span>
                </div>
              )}

              {item.status === 'done' && (
                <div className="absolute top-1.5 right-1.5 p-0.5 rounded-full bg-emerald-500 text-white shadow">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              )}

              {item.status === 'error' && (
                <div className="absolute top-1.5 right-1.5 p-0.5 rounded-full bg-rose-500 text-white shadow">
                  <AlertCircle className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-300 truncate max-w-[80%]">
                {item.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveItem(item.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-rose-400 hover:bg-slate-800 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
