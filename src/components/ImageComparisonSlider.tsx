import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Columns,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Eraser,
  Paintbrush,
  Undo,
  Check,
  X,
  Sliders
} from 'lucide-react';
import { BackgroundConfig } from '../types';
import { createRefinedCutout, loadImage } from '../utils/canvasHelper';

interface ImageComparisonSliderProps {
  originalUrl: string;
  processedUrl: string;
  bgConfig: BackgroundConfig;
  onCutoutUpdated?: (blob: Blob, url: string) => void;
}

export const ImageComparisonSlider: React.FC<ImageComparisonSliderProps> = ({
  originalUrl,
  processedUrl,
  bgConfig,
  onCutoutUpdated
}) => {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showSplit, setShowSplit] = useState(true);
  const [displayCutoutUrl, setDisplayCutoutUrl] = useState(processedUrl);

  // Manual Touch-up states
  const [isTouchUpActive, setIsTouchUpActive] = useState(false);
  const [brushTool, setBrushTool] = useState<'erase' | 'restore'>('erase');
  const [brushSize, setBrushSize] = useState(25);
  const [isPainting, setIsPainting] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchCanvasRef = useRef<HTMLCanvasElement>(null);
  const historyStackRef = useRef<ImageData[]>([]);
  const origImgRef = useRef<HTMLImageElement | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Load original image for restoration brush
  useEffect(() => {
    loadImage(originalUrl).then((img) => {
      origImgRef.current = img;
    });
  }, [originalUrl]);

  // Live real-time halo de-bleeding and edge refinement preview
  useEffect(() => {
    let isMounted = true;
    if (
      !isTouchUpActive &&
      bgConfig.refinement &&
      (bgConfig.refinement.haloThreshold > 0 ||
        bgConfig.refinement.edgeErode > 0 ||
        bgConfig.refinement.edgeFeather > 0)
    ) {
      createRefinedCutout(processedUrl, bgConfig.refinement).then((blob) => {
        if (isMounted) {
          const url = URL.createObjectURL(blob);
          setDisplayCutoutUrl(url);
        }
      });
    } else if (!isTouchUpActive) {
      setDisplayCutoutUrl(processedUrl);
    }
    return () => {
      isMounted = false;
    };
  }, [processedUrl, bgConfig.refinement, isTouchUpActive]);

  // Setup touch-up canvas when touch-up mode is enabled
  useEffect(() => {
    if (isTouchUpActive) {
      setShowSplit(false); // Hide slider while painting
      loadImage(displayCutoutUrl).then((img) => {
        const canvas = touchCanvasRef.current;
        if (!canvas) return;
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          // Save initial state to history
          historyStackRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
        }
      });
    }
  }, [isTouchUpActive, displayCutoutUrl]);

  // Handle painting on touch-up canvas
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = touchCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const drawStroke = (fromX: number, fromY: number, toX: number, toY: number) => {
    const canvas = touchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.hypot(dx, dy);

    ctx.save();
    if (brushTool === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brushSize * 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      if (dist === 0) {
        ctx.arc(toX, toY, brushSize, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
      }
    } else if (brushTool === 'restore' && origImgRef.current) {
      // Continuous interpolation stamping for restore brush
      const step = Math.max(1, brushSize / 4);
      const steps = Math.max(1, Math.ceil(dist / step));

      for (let i = 0; i <= steps; i++) {
        const t = steps === 0 ? 0 : i / steps;
        const curX = fromX + dx * t;
        const curY = fromY + dy * t;

        ctx.save();
        ctx.beginPath();
        ctx.arc(curX, curY, brushSize, 0, Math.PI * 2);
        ctx.clip();
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(origImgRef.current, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
    }
    ctx.restore();
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isTouchUpActive) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;

    const canvas = touchCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      historyStackRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (historyStackRef.current.length > 20) historyStackRef.current.shift();
    }

    setIsPainting(true);
    lastPosRef.current = coords;
    drawStroke(coords.x, coords.y, coords.x, coords.y);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isTouchUpActive) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;
    setCursorPos({ x: e.clientX, y: e.clientY });

    if (isPainting && lastPosRef.current) {
      drawStroke(lastPosRef.current.x, lastPosRef.current.y, coords.x, coords.y);
      lastPosRef.current = coords;
    }
  };

  const handleCanvasMouseUp = () => {
    if (isPainting) {
      setIsPainting(false);
      lastPosRef.current = null;
      // Sync canvas changes
      const canvas = touchCanvasRef.current;
      if (canvas && onCutoutUpdated) {
        canvas.toBlob((blob) => {
          if (blob) {
            const newUrl = URL.createObjectURL(blob);
            setDisplayCutoutUrl(newUrl);
            onCutoutUpdated(blob, newUrl);
          }
        }, 'image/png');
      }
    }
  };

  const handleUndo = () => {
    const canvas = touchCanvasRef.current;
    if (!canvas || historyStackRef.current.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const lastState = historyStackRef.current.pop();
    if (lastState) {
      ctx.putImageData(lastState, 0, 0);
      canvas.toBlob((blob) => {
        if (blob && onCutoutUpdated) {
          const newUrl = URL.createObjectURL(blob);
          setDisplayCutoutUrl(newUrl);
          onCutoutUpdated(blob, newUrl);
        }
      }, 'image/png');
    }
  };

  const handleResetTouchups = () => {
    setDisplayCutoutUrl(processedUrl);
    if (onCutoutUpdated) {
      loadImage(processedUrl).then((img) => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth || img.width;
        c.height = img.naturalHeight || img.height;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          c.toBlob((b) => {
            if (b) onCutoutUpdated(b, processedUrl);
          }, 'image/png');
        }
      });
    }
    setIsTouchUpActive(false);
    setShowSplit(true);
  };

  // Slider dragging logic
  const handleMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current || isTouchUpActive) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPos(percentage);
    },
    [isTouchUpActive]
  );

  const handleMouseDown = () => {
    if (!isTouchUpActive) setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleMove(e.clientX);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMove]);

  // Compute background style for processed image side
  const getProcessedBgStyle = (): React.CSSProperties => {
    if (bgConfig.type === 'color') {
      return { backgroundColor: bgConfig.color };
    }
    if (bgConfig.type === 'gradient') {
      return {
        background: `linear-gradient(${bgConfig.gradient.angle}deg, ${bgConfig.gradient.from}, ${bgConfig.gradient.to})`
      };
    }
    if (bgConfig.type === 'image' && bgConfig.customImageUrl) {
      return {
        backgroundImage: `url(${bgConfig.customImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    }
    return {};
  };

  return (
    <div className="w-full space-y-3">
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          {/* Split Slider toggle */}
          <button
            onClick={() => {
              if (isTouchUpActive) setIsTouchUpActive(false);
              setShowSplit(!showSplit);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all ${
              showSplit && !isTouchUpActive
                ? 'bg-slate-800 border-slate-700 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Split Slider</span>
          </button>

          {/* Interactive Manual Eraser & Restore Brush Button */}
          <button
            onClick={() => {
              setIsTouchUpActive(!isTouchUpActive);
              if (!isTouchUpActive) setShowSplit(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition-all ${
              isTouchUpActive
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
            title="Clean up stubborn wall bleeds or restore parts of the image with a brush"
          >
            <Eraser className="w-3.5 h-3.5 text-cyan-400" />
            <span>✏️ Eraser Brush Tool</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="p-1 hover:text-white rounded hover:bg-slate-800"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono px-1.5 text-[11px] text-slate-300">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            className="p-1 hover:text-white rounded hover:bg-slate-800"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          {zoom !== 1 && (
            <button
              onClick={() => setZoom(1)}
              className="p-1 hover:text-white rounded hover:bg-slate-800 text-brand-400 ml-1"
              title="Reset zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Touch-Up Sub-Toolbar (Active when Touch-up Mode is on) */}
      {isTouchUpActive && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 border border-cyan-500/40 rounded-xl shadow-lg animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBrushTool('erase')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                brushTool === 'erase'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Erase Background</span>
            </button>
            <button
              onClick={() => setBrushTool('restore')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                brushTool === 'restore'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <Paintbrush className="w-3.5 h-3.5" />
              <span>Restore Subject</span>
            </button>

            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-800">
              <span className="text-[11px] text-slate-400">Brush Size:</span>
              <input
                type="range"
                min="5"
                max="150"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
                className="w-24 accent-cyan-400 cursor-pointer"
              />
              <span className="font-mono text-xs text-cyan-300 w-8">{brushSize}px</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
              title="Undo last stroke"
            >
              <Undo className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
            <button
              onClick={handleResetTouchups}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
              title="Reset manual brush edits"
            >
              Reset
            </button>
            <button
              onClick={() => {
                setIsTouchUpActive(false);
                setCursorPos(null);
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-xs shadow hover:bg-cyan-400 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Done Editing</span>
            </button>
          </div>
        </div>
      )}

      {/* Comparison & Touch-up Canvas Viewport */}
      <div
        ref={containerRef}
        className={`relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[620px] rounded-2xl overflow-hidden border select-none shadow-2xl bg-slate-950 ${
          isTouchUpActive
            ? 'border-cyan-500/60 cursor-none'
            : showSplit
            ? 'border-slate-800 cursor-ew-resize'
            : 'border-slate-800'
        }`}
        onMouseDown={handleMouseDown}
      >
        {/* Visual Brush Follower Circle */}
        {isTouchUpActive && cursorPos && (
          <div
            className="pointer-events-none fixed z-50 rounded-full border-2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
            style={{
              left: cursorPos.x,
              top: cursorPos.y,
              width: `${brushSize * 2 * (touchCanvasRef.current ? (touchCanvasRef.current.getBoundingClientRect().width / touchCanvasRef.current.width) * zoom : 1)}px`,
              height: `${brushSize * 2 * (touchCanvasRef.current ? (touchCanvasRef.current.getBoundingClientRect().height / touchCanvasRef.current.height) * zoom : 1)}px`,
              borderColor: brushTool === 'erase' ? '#f43f5e' : '#10b981',
              backgroundColor: brushTool === 'erase' ? 'rgba(244, 63, 94, 0.25)' : 'rgba(16, 185, 129, 0.25)',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.6)'
            }}
          />
        )}

        {/* Right / Full layer: Processed Image with Chosen Background */}
        <div
          className={`absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden ${
            bgConfig.type === 'transparent' ? 'bg-checkerboard' : ''
          }`}
          style={getProcessedBgStyle()}
        >
          {/* Blurred Background Mode */}
          {bgConfig.type === 'blur' && (
            <div
              className="absolute inset-0 bg-cover bg-center filter scale-105"
              style={{
                backgroundImage: `url(${originalUrl})`,
                filter: `blur(${bgConfig.blurAmount}px)`
              }}
            />
          )}

          {/* If Touch-Up is active: Interactive Canvas for Erasing / Restoring */}
          {isTouchUpActive ? (
            <canvas
              ref={touchCanvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseEnter={(e) => setCursorPos({ x: e.clientX, y: e.clientY })}
              onMouseLeave={() => {
                handleCanvasMouseUp();
                setCursorPos(null);
              }}
              className="relative max-w-full max-h-full object-contain cursor-none"
              style={{
                transform: `scale(${zoom})`,
                filter: bgConfig.shadow
                  ? `drop-shadow(0px ${bgConfig.shadowOffsetY}px ${bgConfig.shadowBlur}px ${bgConfig.shadowColor})`
                  : 'none'
              }}
            />
          ) : (
            /* Regular Processed Cutout (Live Refined) */
            <img
              src={displayCutoutUrl}
              alt="Processed Cutout"
              className="relative max-w-full max-h-full object-contain transition-transform"
              style={{
                transform: `scale(${zoom})`,
                filter: bgConfig.shadow
                  ? `drop-shadow(0px ${bgConfig.shadowOffsetY}px ${bgConfig.shadowBlur}px ${bgConfig.shadowColor})`
                  : 'none'
              }}
              draggable={false}
            />
          )}

          {/* Badge */}
          <div className="absolute top-4 right-4 z-10 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            <span>Clean Cutout</span>
          </div>
        </div>

        {/* Left Layer: Original Image (Clipped by Slider) */}
        {showSplit && !isTouchUpActive && (
          <div
            className="absolute inset-0 h-full overflow-hidden"
            style={{ width: `${sliderPos}%` }}
          >
            <div
              className="relative w-full h-full flex items-center justify-center bg-slate-900"
              style={{
                width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%'
              }}
            >
              <img
                src={originalUrl}
                alt="Original"
                className="max-w-full max-h-full object-contain transition-transform"
                style={{ transform: `scale(${zoom})` }}
                draggable={false}
              />

              {/* Badge */}
              <div className="absolute top-4 left-4 z-10 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-[11px] font-semibold text-slate-300">
                Original
              </div>
            </div>
          </div>
        )}

        {/* Slider Divider Bar */}
        {showSplit && !isTouchUpActive && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.8)] z-20"
            style={{ left: `${sliderPos}%` }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-slate-900 shadow-xl flex items-center justify-center border-2 border-brand-500">
              <Columns className="w-4 h-4 rotate-90" />
            </div>
          </div>
        )}
      </div>

      <div className="text-center text-[11px] text-slate-500">
        {isTouchUpActive
          ? 'Click and drag over any unwanted wall/bleed area with the Eraser brush to cleanly erase it'
          : 'Drag the vertical slider to compare edge details, or click "✏️ Eraser Brush Tool" to touch up edges'}
      </div>
    </div>
  );
};
