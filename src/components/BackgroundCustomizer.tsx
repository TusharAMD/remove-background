import React, { useRef, useState } from 'react';
import {
  Palette,
  Sparkles,
  Image as ImageIcon,
  Sliders,
  Download,
  Copy,
  Check,
  Flame,
  SunMedium,
  Grid,
  Droplets,
  Scissors,
  Wand2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { BackgroundConfig, BackgroundType, EdgeRefinementConfig } from '../types';

interface BackgroundCustomizerProps {
  config: BackgroundConfig;
  onChange: (config: BackgroundConfig) => void;
  onDownload: () => void;
  onCopy: () => void;
  isCopied: boolean;
  isExporting: boolean;
}

const COLOR_PRESETS = [
  '#ffffff', // Pure White
  '#000000', // Pure Black
  '#f1f5f9', // Slate Light
  '#0f172a', // Slate Dark
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#ec4899', // Pink
];

const GRADIENT_PRESETS = [
  { name: 'Studio Blue', from: '#1e3a8a', to: '#0f172a', angle: 135 },
  { name: 'Sunset Glow', from: '#ff512f', to: '#dd2476', angle: 45 },
  { name: 'Aurora Neon', from: '#00c6ff', to: '#0072ff', angle: 120 },
  { name: 'Emerald Luxe', from: '#059669', to: '#022c22', angle: 180 },
  { name: 'Cyber Purple', from: '#8b5cf6', to: '#3b82f6', angle: 90 },
  { name: 'Soft Minimal', from: '#f8fafc', to: '#cbd5e1', angle: 135 },
  { name: 'Warm Peach', from: '#ff9a9e', to: '#fecfef', angle: 90 },
  { name: 'Dark Void', from: '#18181b', to: '#09090b', angle: 180 },
];

export const BackgroundCustomizer: React.FC<BackgroundCustomizerProps> = ({
  config,
  onChange,
  onDownload,
  onCopy,
  isCopied,
  isExporting
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showRefinements, setShowRefinements] = useState(true);

  const handleTypeChange = (type: BackgroundType) => {
    onChange({ ...config, type });
  };

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      onChange({
        ...config,
        type: 'image',
        customImageUrl: url
      });
    }
  };

  const updateRefinement = (partial: Partial<EdgeRefinementConfig>) => {
    onChange({
      ...config,
      refinement: {
        ...config.refinement,
        ...partial
      }
    });
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl">
      {/* Background Mode Selector */}
      <div className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Palette className="w-4 h-4 text-brand-400" />
          <span>Background Mode</span>
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <button
            onClick={() => handleTypeChange('transparent')}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all ${
              config.type === 'transparent'
                ? 'bg-brand-500/20 border-brand-500 text-brand-300 shadow-sm'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>Transparent</span>
          </button>

          <button
            onClick={() => handleTypeChange('color')}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all ${
              config.type === 'color'
                ? 'bg-brand-500/20 border-brand-500 text-brand-300 shadow-sm'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Solid Color</span>
          </button>

          <button
            onClick={() => handleTypeChange('gradient')}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all ${
              config.type === 'gradient'
                ? 'bg-brand-500/20 border-brand-500 text-brand-300 shadow-sm'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Gradient</span>
          </button>

          <button
            onClick={() => handleTypeChange('blur')}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all ${
              config.type === 'blur'
                ? 'bg-brand-500/20 border-brand-500 text-brand-300 shadow-sm'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Droplets className="w-4 h-4" />
            <span>Blur Backdrop</span>
          </button>

          <button
            onClick={() => {
              handleTypeChange('image');
              if (!config.customImageUrl) {
                fileInputRef.current?.click();
              }
            }}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all ${
              config.type === 'image'
                ? 'bg-brand-500/20 border-brand-500 text-brand-300 shadow-sm'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Custom Image</span>
          </button>
        </div>
      </div>

      {/* Mode-Specific Sub-Controls */}
      {config.type === 'color' && (
        <div className="space-y-3 p-4 bg-slate-950/60 rounded-xl border border-slate-800 animate-in fade-in">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Color Palette & Custom Picker</span>
            <span className="font-mono text-slate-300">{config.color}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                onClick={() => onChange({ ...config, color })}
                className={`w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110 shadow-sm ${
                  config.color.toLowerCase() === color.toLowerCase()
                    ? 'border-brand-400 scale-110 shadow-brand-500/40'
                    : 'border-slate-700 hover:border-slate-500'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}

            {/* Native Color Picker */}
            <label className="relative cursor-pointer flex items-center justify-center w-7 h-7 rounded-lg bg-slate-800 border-2 border-slate-700 hover:border-slate-500 overflow-hidden">
              <input
                type="color"
                value={config.color}
                onChange={(e) => onChange({ ...config, color: e.target.value })}
                className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
              />
              <Palette className="w-4 h-4 text-slate-300 pointer-events-none" />
            </label>
          </div>
        </div>
      )}

      {config.type === 'gradient' && (
        <div className="space-y-3 p-4 bg-slate-950/60 rounded-xl border border-slate-800 animate-in fade-in">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Studio Gradient Backdrops</span>
            <span className="font-mono text-slate-300">{config.gradient.angle}°</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {GRADIENT_PRESETS.map((grad, i) => (
              <button
                key={i}
                onClick={() =>
                  onChange({
                    ...config,
                    gradient: { from: grad.from, to: grad.to, angle: grad.angle }
                  })
                }
                className="h-10 rounded-xl border border-slate-700 hover:border-slate-500 transition-all text-xs font-medium text-white flex items-center justify-center shadow-sm hover:scale-[1.02]"
                style={{
                  background: `linear-gradient(${grad.angle}deg, ${grad.from}, ${grad.to})`
                }}
              >
                <span className="bg-black/30 px-2 py-0.5 rounded backdrop-blur-xs text-[11px]">
                  {grad.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {config.type === 'blur' && (
        <div className="space-y-3 p-4 bg-slate-950/60 rounded-xl border border-slate-800 animate-in fade-in">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Portrait Bokeh / Background Blur</span>
            <span className="font-mono text-brand-400">{config.blurAmount}px</span>
          </div>
          <input
            type="range"
            min="2"
            max="30"
            step="1"
            value={config.blurAmount}
            onChange={(e) =>
              onChange({ ...config, blurAmount: parseInt(e.target.value, 10) })
            }
            className="w-full accent-brand-500 cursor-pointer"
          />
        </div>
      )}

      {config.type === 'image' && (
        <div className="space-y-3 p-4 bg-slate-950/60 rounded-xl border border-slate-800 animate-in fade-in">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleCustomImageUpload}
            className="hidden"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Custom Backdrop Photo</span>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
            >
              Choose Image File
            </button>
          </div>
        </div>
      )}

      {/* SOTA Edge & Backlit Halo Refinement Panel */}
      <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3.5">
        <div
          onClick={() => setShowRefinements(!showRefinements)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-cyan-400" />
            <div>
              <span className="text-xs font-semibold text-white tracking-wide">
                Backlit Halo & Edge De-bleed
              </span>
              <span className="block text-[10px] text-cyan-400 font-medium">
                Eliminates ambient light glow & hazy borders
              </span>
            </div>
          </div>
          <button className="text-slate-400 hover:text-white p-1">
            {showRefinements ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        {showRefinements && (
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() =>
                  updateRefinement({ haloThreshold: 20, edgeErode: 1, edgeFeather: 1 })
                }
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  config.refinement.haloThreshold === 20
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 border border-slate-700'
                }`}
              >
                ✨ Fix Backlit Glow
              </button>
              <button
                onClick={() =>
                  updateRefinement({ haloThreshold: 8, edgeErode: 0, edgeFeather: 1 })
                }
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  config.refinement.haloThreshold === 8
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 border border-slate-700'
                }`}
              >
                💇 Fine Hair / Soft
              </button>
              <button
                onClick={() =>
                  updateRefinement({ haloThreshold: 0, edgeErode: 0, edgeFeather: 0 })
                }
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  config.refinement.haloThreshold === 0 && config.refinement.edgeErode === 0
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 border border-slate-700'
                }`}
              >
                Original Raw
              </button>
            </div>

            {/* Halo Threshold Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Ambient Halo Cutoff</span>
                <span className="font-mono text-cyan-400">
                  {config.refinement.haloThreshold}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                step="1"
                value={config.refinement.haloThreshold}
                onChange={(e) =>
                  updateRefinement({ haloThreshold: parseInt(e.target.value, 10) })
                }
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">
                Cuts off faint low-contrast luminous glow and ambient wall light
              </span>
            </div>

            {/* Edge Erode Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Edge Inset / Erode</span>
                <span className="font-mono text-cyan-400">
                  {config.refinement.edgeErode > 0 ? `+${config.refinement.edgeErode}` : config.refinement.edgeErode}px
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="4"
                step="1"
                value={config.refinement.edgeErode}
                onChange={(e) =>
                  updateRefinement({ edgeErode: parseInt(e.target.value, 10) })
                }
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">
                Shaves 1-3px border reflections off high-contrast edges
              </span>
            </div>

            {/* Edge Feather Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Edge Feathering</span>
                <span className="font-mono text-cyan-400">
                  {config.refinement.edgeFeather}px
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="4"
                step="1"
                value={config.refinement.edgeFeather}
                onChange={(e) =>
                  updateRefinement({ edgeFeather: parseInt(e.target.value, 10) })
                }
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* Shadow & Lighting Option */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-sm">
        <div className="flex items-center gap-2">
          <SunMedium className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-medium text-slate-300">Natural Drop Shadow</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.shadow}
            onChange={(e) => onChange({ ...config, shadow: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500"></div>
        </label>
      </div>

      {/* Export Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <button
          onClick={onDownload}
          disabled={isExporting}
          className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-brand-600 via-cyan-500 to-emerald-400 hover:from-brand-500 hover:via-cyan-400 hover:to-emerald-300 text-white font-semibold text-sm shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{isExporting ? 'Exporting...' : 'Download Clean PNG'}</span>
        </button>

        <button
          onClick={onCopy}
          className="w-full sm:w-auto py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-sm transition-all flex items-center justify-center gap-2"
        >
          {isCopied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy to Clipboard</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
