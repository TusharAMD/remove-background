import React from 'react';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { ProcessingProgress } from '../types';

interface ProgressBarProps {
  progress: ProcessingProgress;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  if (progress.status === 'idle') return null;

  const isError = progress.status === 'error';

  return (
    <div className="w-full max-w-xl mx-auto my-6 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2.5">
          {isError ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : (
            <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
          )}
          <span className={`font-medium ${isError ? 'text-rose-400' : 'text-slate-200'}`}>
            {progress.message || 'Processing image on device...'}
          </span>
        </div>
        <span className="font-mono text-xs font-semibold text-brand-400">
          {progress.percent}%
        </span>
      </div>

      {/* Progress Bar Track */}
      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            isError
              ? 'bg-rose-500'
              : 'bg-gradient-to-r from-brand-500 via-cyan-400 to-emerald-400'
          }`}
          style={{ width: `${Math.max(5, progress.percent)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-brand-400" />
          100% Private On-Device AI
        </span>
        <span>High-Precision Cutout</span>
      </div>
    </div>
  );
};
