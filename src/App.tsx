import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { saveAs } from 'file-saver';
import { Navbar } from './components/Navbar';
import { DropZone } from './components/DropZone';
import { ProgressBar } from './components/ProgressBar';
import { ImageComparisonSlider } from './components/ImageComparisonSlider';
import { BackgroundCustomizer } from './components/BackgroundCustomizer';
import { BatchProcessor } from './components/BatchProcessor';
import { InfoModal } from './components/InfoModal';
import { bgRemovalService } from './services/bgRemovalService';
import { detectHardware } from './utils/hardware';
import { renderImageWithBackground, copyBlobToClipboard } from './utils/canvasHelper';
import { fetchSampleAsFile, SampleImage } from './utils/sampleImages';
import {
  EngineType,
  BackgroundConfig,
  ProcessingProgress,
  ImageItem,
  HardwareInfo
} from './types';
import { Sparkles, ArrowLeft, RefreshCw, UploadCloud, Layers, Wand2 } from 'lucide-react';

const DEFAULT_BG_CONFIG: BackgroundConfig = {
  type: 'transparent',
  color: '#ffffff',
  gradient: {
    from: '#1e3a8a',
    to: '#0f172a',
    angle: 135
  },
  blurAmount: 12,
  shadow: false,
  shadowBlur: 20,
  shadowColor: 'rgba(0, 0, 0, 0.4)',
  shadowOffsetY: 10,
  refinement: {
    haloThreshold: 0,
    edgeErode: 0,
    edgeFeather: 0
  }
};

export const App: React.FC = () => {
  const isDesktop =
    typeof window !== 'undefined' &&
    (Boolean((window as any).desktopAPI?.isDesktop) ||
      window.navigator.userAgent.includes('Electron'));

  // 2 options: 'best' (High Quality / Studio) or 'imgly' (Fast Mode)
  const [engine, setEngine] = useState<EngineType>('best');
  const [hardware, setHardware] = useState<HardwareInfo | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const [images, setImages] = useState<ImageItem[]>([]);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);

  const [bgConfig, setBgConfig] = useState<BackgroundConfig>(DEFAULT_BG_CONFIG);
  const [progress, setProgress] = useState<ProcessingProgress>({
    status: 'idle',
    percent: 0,
    message: ''
  });

  const [isCopied, setIsCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  const filePickerRef = useRef<HTMLInputElement>(null);

  // Initialize hardware detection
  useEffect(() => {
    detectHardware().then((info) => {
      setHardware(info);
    });
  }, []);

  const activeItem = images.find((i) => i.id === activeImageId);

  // Process a single image
  const processImage = async (item: ImageItem, selectedEngine: EngineType = engine) => {
    const engineLabel = isDesktop
      ? selectedEngine === 'best'
        ? 'Ultra'
        : 'Fast'
      : selectedEngine === 'best'
      ? 'High Quality'
      : 'Fast Mode';

    setProgress({
      status: 'loading-model',
      percent: 10,
      message: 'Removing background...'
    });

    setImages((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, status: 'processing', progress: 10 } : i
      )
    );

    const startTime = performance.now();

    try {
      const resultBlob = await bgRemovalService.removeBackground(
        item.file,
        selectedEngine,
        (p) => {
          setProgress({
            status: 'processing',
            percent: p.percent,
            message: p.message,
            stage: p.stage
          });
          setImages((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...i, progress: p.percent } : i
            )
          );
        }
      );

      const durationMs = Math.round(performance.now() - startTime);
      const processedUrl = URL.createObjectURL(resultBlob);

      setImages((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: 'done',
                progress: 100,
                processedBlob: resultBlob,
                processedUrl,
                durationMs
              }
            : i
        )
      );

      setProgress({
        status: 'done',
        percent: 100,
        message: `Completed in ${(durationMs / 1000).toFixed(1)}s`
      });

      // Fire confetti celebration
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch {
        // ignore
      }
    } catch (err: any) {
      console.error('Processing error:', err);
      const errorMsg = err?.message || 'Failed to remove background';
      setProgress({
        status: 'error',
        percent: 0,
        message: errorMsg,
        error: errorMsg
      });
      setImages((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: 'error', statusMessage: errorMsg } : i
        )
      );
    }
  };

  // Add files to list
  const handleFilesSelected = (files: File[]) => {
    const newItems: ImageItem[] = files.map((file) => ({
      id: 'img_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      file,
      name: file.name,
      size: file.size,
      originalUrl: URL.createObjectURL(file),
      width: 0,
      height: 0,
      status: 'queued',
      progress: 0
    }));

    setImages((prev) => [...prev, ...newItems]);
    if (!activeImageId && newItems.length > 0) {
      setActiveImageId(newItems[0].id);
      processImage(newItems[0], engine);
    }
  };

  // Load sample image
  const handleLoadSample = async (sample: SampleImage) => {
    try {
      setIsLoadingSample(true);
      const file = await fetchSampleAsFile(sample);
      handleFilesSelected([file]);
    } catch (e) {
      console.error('Failed to load sample:', e);
    } finally {
      setIsLoadingSample(false);
    }
  };

  // Process all queued images in batch
  const handleProcessAll = async () => {
    for (const item of images) {
      if (item.status !== 'done') {
        setActiveImageId(item.id);
        await processImage(item, engine);
      }
    }
  };

  // Export processed image with current background & edge refinements
  const handleDownload = async () => {
    if (!activeItem?.processedUrl) return;
    setIsExporting(true);
    try {
      const finalBlob = await renderImageWithBackground(
        activeItem.processedUrl,
        activeItem.originalUrl,
        bgConfig
      );
      const filename =
        activeItem.name.replace(/\.[^/.]+$/, '') +
        (bgConfig.type === 'transparent' ? '-clean-cutout.png' : '-custom-bg.png');
      saveAs(finalBlob, filename);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setIsExporting(false);
    }
  };

  // Copy clean cutout to clipboard
  const handleCopy = async () => {
    if (!activeItem?.processedUrl) return;
    try {
      const finalBlob = await renderImageWithBackground(
        activeItem.processedUrl,
        activeItem.originalUrl,
        bgConfig
      );
      const success = await copyBlobToClipboard(finalBlob);
      if (success) {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
      }
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };

  // Reprocess active image with new engine
  const handleReprocess = () => {
    if (activeItem) {
      processImage(activeItem, engine);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-brand-500/30">
      <Navbar
        engine={engine}
        onEngineChange={(newEngine) => {
          setEngine(newEngine);
          if (activeItem && activeItem.status === 'done') {
            processImage(activeItem, newEngine);
          }
        }}
        hardware={hardware}
        onOpenInfo={() => setIsInfoOpen(true)}
      />

      <input
        ref={filePickerRef}
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => {
          if (e.target.files) {
            handleFilesSelected(Array.from(e.target.files));
          }
        }}
        className="hidden"
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* If no images yet, show Hero & Dropzone */}
        {images.length === 0 ? (
          <div className="space-y-8 py-4">
            <div className="text-center space-y-3 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-xs font-semibold text-cyan-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isDesktop ? 'Studio Desktop Mode' : '100% Private In-Browser AI'}</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
                Remove Backgrounds{' '}
                <span className="bg-gradient-to-r from-brand-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                  {isDesktop ? 'with Studio AI' : 'Locally'}
                </span>
              </h1>
              <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
                {isDesktop
                  ? 'Sub-pixel accuracy for fine hair, animal fur, lace, and complex portrait cutouts.'
                  : 'Fast and accurate AI background removal running directly on your device. Zero data uploads, completely private and unlimited.'}
              </p>
            </div>

            <DropZone
              onFilesSelected={handleFilesSelected}
              isLoadingSample={isLoadingSample}
              onLoadSample={handleLoadSample}
            />

            {/* Desktop Software Callout (Hidden inside Desktop App) */}
            {!isDesktop && (
              <div className="max-w-3xl mx-auto p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-blue-950/40 border border-purple-800/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Need Ultra-Detail for Hair & Fur?</h4>
                    <p className="text-xs text-slate-400">Get the standalone <strong>Windows Desktop App (.exe)</strong> for full offline AI performance.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsInfoOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-semibold text-xs transition-all shadow-md shrink-0 flex items-center gap-1.5"
                >
                  <span>Download for Windows (.exe)</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Active Editor Workspace */
          <div className="space-y-6">
            {/* Top Workspace Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 sm:p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setImages([]);
                    setActiveImageId(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>New Image</span>
                </button>

                <span className="text-xs text-slate-400 font-medium truncate max-w-xs">
                  {activeItem?.name}
                </span>

                {activeItem?.durationMs && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {(activeItem.durationMs / 1000).toFixed(1)}s
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleReprocess}
                  disabled={activeItem?.status === 'processing'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700 transition-colors disabled:opacity-50"
                  title="Reprocess active image"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      activeItem?.status === 'processing' ? 'animate-spin' : ''
                    }`}
                  />
                  <span>
                    Reprocess ({isDesktop ? (engine === 'best' ? 'Ultra' : 'Fast') : (engine === 'best' ? 'High Quality' : 'Fast Mode')})
                  </span>
                </button>
              </div>
            </div>

            {/* Progress indicator */}
            {progress.status !== 'idle' && progress.status !== 'done' && (
              <ProgressBar progress={progress} />
            )}

            {/* Main Visual Comparison and Customizer Layout */}
            {activeItem && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Visual Viewport */}
                <div className="lg:col-span-8 bg-slate-900/40 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-xl">
                  {activeItem.processedUrl ? (
                    <ImageComparisonSlider
                      originalUrl={activeItem.originalUrl}
                      processedUrl={activeItem.processedUrl}
                      bgConfig={bgConfig}
                      onCutoutUpdated={(blob, url) => {
                        setImages((prev) =>
                          prev.map((i) =>
                            i.id === activeItem.id
                              ? { ...i, processedBlob: blob, processedUrl: url }
                              : i
                          )
                        );
                      }}
                    />
                  ) : (
                    <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] rounded-2xl overflow-hidden border border-slate-800 flex flex-col items-center justify-center bg-slate-950 p-6 text-center space-y-4">
                      <img
                        src={activeItem.originalUrl}
                        alt="Original"
                        className="max-h-64 object-contain opacity-40 blur-xs"
                      />
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center p-4">
                        <ProgressBar progress={progress} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Customizer Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                  <BackgroundCustomizer
                    config={bgConfig}
                    onChange={setBgConfig}
                    onDownload={handleDownload}
                    onCopy={handleCopy}
                    isCopied={isCopied}
                    isExporting={isExporting}
                  />
                </div>
              </div>
            )}

            {/* Batch Queue Drawer */}
            {images.length > 0 && (
              <BatchProcessor
                items={images}
                activeId={activeImageId || ''}
                onSelectActive={(id) => {
                  setActiveImageId(id);
                  const selected = images.find((i) => i.id === id);
                  if (selected && selected.status === 'queued') {
                    processImage(selected, engine);
                  }
                }}
                onRemoveItem={(id) => {
                  setImages((prev) => prev.filter((i) => i.id !== id));
                  if (activeImageId === id) {
                    const remaining = images.filter((i) => i.id !== id);
                    if (remaining.length > 0) {
                      setActiveImageId(remaining[0].id);
                    } else {
                      setActiveImageId(null);
                    }
                  }
                }}
                onClearAll={() => {
                  setImages([]);
                  setActiveImageId(null);
                }}
                onProcessAll={handleProcessAll}
                isProcessingAny={images.some((i) => i.status === 'processing')}
                onAddMore={() => filePickerRef.current?.click()}
              />
            )}
          </div>
        )}
      </main>

      {/* Clean Footer with Custom Social Links */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span>Created by <strong className="text-white font-semibold">Tushar Amdoskar</strong></span>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="https://github.com/TusharAMD"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>GitHub</span>
            </a>

            <a
              href="https://www.linkedin.com/in/tushar-amdoskar/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
              <span>LinkedIn</span>
            </a>

            <button
              onClick={() => setIsInfoOpen(true)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              Desktop App & Info
            </button>
          </div>
        </div>
      </footer>

      {/* Information & Privacy Modal */}
      <InfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        hardware={hardware}
      />
    </div>
  );
};
