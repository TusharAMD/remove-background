import React from 'react';
import { Sparkles, Cpu, Zap, Info, Layers, Wand2 } from 'lucide-react';
import { EngineType, HardwareInfo } from '../types';

interface NavbarProps {
  engine: EngineType;
  onEngineChange: (engine: EngineType) => void;
  hardware: HardwareInfo | null;
  onOpenInfo: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  engine,
  onEngineChange,
  hardware,
  onOpenInfo
}) => {
  const isDesktop =
    typeof window !== 'undefined' &&
    (Boolean((window as any).desktopAPI?.isDesktop) ||
      window.navigator.userAgent.includes('Electron'));

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-cyan-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">
                {isDesktop ? 'Background Remover Studio' : 'Background Remover'}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {isDesktop ? 'Ultra AI' : '100% Free'}
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              {isDesktop ? 'Ultra-Detail Local Processing' : 'Instant AI Cutouts In Your Browser'}
            </p>
          </div>
        </div>

        {/* Engine Switcher & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* AI Mode Selector */}
          <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/60 shadow-inner">
            <button
              onClick={() => onEngineChange('best')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                engine === 'best'
                  ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white shadow-md shadow-purple-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
              title={isDesktop ? 'Ultra: Maximum sub-pixel precision' : 'High Quality: Best for fine edges & details'}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
              <span>{isDesktop ? 'Ultra' : 'High Quality'}</span>
            </button>

            <button
              onClick={() => onEngineChange('imgly')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                engine === 'imgly'
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={isDesktop ? 'Fast: High speed cutout' : 'Fast Mode: Instant cutouts'}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>{isDesktop ? 'Fast' : 'Fast Mode'}</span>
            </button>
          </div>

          {/* Desktop App Link Button (Hidden when inside desktop app) */}
          {!isDesktop && (
            <button
              onClick={onOpenInfo}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600/20 to-indigo-600/20 hover:from-purple-600/30 hover:to-indigo-600/30 text-purple-300 hover:text-purple-200 border border-purple-500/30 text-xs font-semibold transition-all shadow-sm"
              title="Download Windows App for Ultra Hair & Fur Detail"
            >
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Windows App</span>
              <span className="sm:hidden">App</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
