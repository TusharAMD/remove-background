import React from 'react';
import { X, ShieldCheck, Zap, Lock, HardDrive, Sparkles, Download, Layers } from 'lucide-react';
import { HardwareInfo } from '../types';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  hardware: HardwareInfo | null;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Background Remover</h2>
            <p className="text-sm text-slate-400">100% Private, Free & Unlimited</p>
          </div>
        </div>

        {/* Windows Desktop App Spotlight */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-950/60 via-slate-900 to-indigo-950/60 border border-purple-700/50 mb-5 shadow-lg">
          <div className="flex items-center gap-2 text-purple-300 font-bold mb-2 text-sm">
            <HardDrive className="w-4 h-4 text-purple-400" />
            <span>🖥️ Windows Desktop App (Ultra Detail)</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            Need maximum accuracy for fine hair, animal fur, lace, and complex portrait cutouts? The Windows Desktop App runs our full high-precision AI engine with sub-pixel edge detection.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div>
              <span className="text-xs font-semibold text-white block">Standalone Windows Application</span>
              <span className="text-[11px] text-slate-400">100% Offline AI • Sub-pixel strand & fur precision</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="https://github.com/TusharAMD/remove-background/releases/download/v1.0.0/Background-Remover-Studio-Setup-1.0.0.exe"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Installer (.exe)</span>
              </a>
              <a
                href="https://github.com/TusharAMD/remove-background/releases/download/v1.0.0/Background-Remover-Studio-1.0.0.exe"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Portable (.exe)</span>
              </a>
            </div>
          </div>
        </div>

        {/* Key Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/40">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1 text-xs">
              <Lock className="w-3.5 h-3.5" />
              <span>100% Private</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Images never leave your computer. Everything processes locally on your hardware.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/40">
            <div className="flex items-center gap-2 text-brand-400 font-semibold mb-1 text-xs">
              <Zap className="w-3.5 h-3.5" />
              <span>No Limits & Free</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Zero subscription fees, no credit counts, and no quality reductions.
            </p>
          </div>
        </div>

        {/* Footer with Creator Links */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-3 text-slate-400">
            <span>Created by <strong className="text-white">Tushar Amdoskar</strong></span>
            <span>•</span>
            <a
              href="https://github.com/TusharAMD"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:underline"
            >
              GitHub
            </a>
            <span>•</span>
            <a
              href="https://www.linkedin.com/in/tushar-amdoskar/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:underline"
            >
              LinkedIn
            </a>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs transition-colors shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
