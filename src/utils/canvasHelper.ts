import { BackgroundConfig, EdgeRefinementConfig } from '../types';
import { refineAlphaMask } from './edgeRefinement';

export async function createRefinedCutout(
  cutoutUrl: string,
  refinement: EdgeRefinementConfig
): Promise<Blob> {
  const cutoutImg = await loadImage(cutoutUrl);
  const width = cutoutImg.naturalWidth || cutoutImg.width;
  const height = cutoutImg.naturalHeight || cutoutImg.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get 2D canvas context');

  ctx.drawImage(cutoutImg, 0, 0, width, height);

  if (
    refinement.haloThreshold > 0 ||
    refinement.edgeErode > 0 ||
    refinement.edgeFeather > 0
  ) {
    const imgData = ctx.getImageData(0, 0, width, height);
    const refinedData = refineAlphaMask(
      imgData,
      refinement.haloThreshold,
      refinement.edgeErode,
      refinement.edgeFeather
    );
    ctx.putImageData(refinedData, 0, 0);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas export failed'));
    }, 'image/png');
  });
}

export async function renderImageWithBackground(
  cutoutUrl: string,
  originalUrl: string,
  config: BackgroundConfig,
  customImgElement?: HTMLImageElement | null
): Promise<Blob> {
  const cutoutImg = await loadImage(cutoutUrl);
  const width = cutoutImg.naturalWidth || cutoutImg.width;
  const height = cutoutImg.naturalHeight || cutoutImg.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // 1. Draw Background
  if (config.type === 'color') {
    ctx.fillStyle = config.color;
    ctx.fillRect(0, 0, width, height);
  } else if (config.type === 'gradient') {
    const angleRad = (config.gradient.angle * Math.PI) / 180;
    const x1 = width / 2 - (Math.cos(angleRad) * width) / 2;
    const y1 = height / 2 - (Math.sin(angleRad) * height) / 2;
    const x2 = width / 2 + (Math.cos(angleRad) * width) / 2;
    const y2 = height / 2 + (Math.sin(angleRad) * height) / 2;

    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, config.gradient.from);
    grad.addColorStop(1, config.gradient.to);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else if (config.type === 'image' && config.customImageUrl) {
    try {
      const bgImg = customImgElement || (await loadImage(config.customImageUrl));
      const scale = Math.max(width / bgImg.width, height / bgImg.height);
      const bgW = bgImg.width * scale;
      const bgH = bgImg.height * scale;
      const bgX = (width - bgW) / 2;
      const bgY = (height - bgH) / 2;
      ctx.drawImage(bgImg, bgX, bgY, bgW, bgH);
    } catch {
      // Fallback
    }
  } else if (config.type === 'blur') {
    const origImg = await loadImage(originalUrl);
    drawBokehBlur(ctx, origImg, width, height, config.blurAmount);
  }

  // 2. Prepare refined cutout on temporary canvas if refinement is active
  let subjectSource: CanvasImageSource = cutoutImg;
  if (
    config.refinement &&
    (config.refinement.haloThreshold > 0 ||
      config.refinement.edgeErode > 0 ||
      config.refinement.edgeFeather > 0)
  ) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    if (tempCtx) {
      tempCtx.drawImage(cutoutImg, 0, 0, width, height);
      const imgData = tempCtx.getImageData(0, 0, width, height);
      const refined = refineAlphaMask(
        imgData,
        config.refinement.haloThreshold,
        config.refinement.edgeErode,
        config.refinement.edgeFeather
      );
      tempCtx.putImageData(refined, 0, 0);
      subjectSource = tempCanvas;
    }
  }

  // 3. Optional Drop Shadow for the cutout
  if (config.shadow) {
    ctx.save();
    ctx.shadowColor = config.shadowColor || 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = config.shadowBlur || 25;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = config.shadowOffsetY || 12;
    ctx.drawImage(subjectSource, 0, 0, width, height);
    ctx.restore();
  }

  // 4. Draw Cutout Subject
  ctx.drawImage(subjectSource, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas export failed'));
    }, 'image/png');
  });
}

/**
 * Renders guaranteed, hardware-independent multi-pass optical Bokeh blur on HTML5 Canvas.
 * Accurately scales blur diffusion to match the high-resolution image geometry (e.g. 3000x4500)
 * so downloaded files have 100% identical blur intensity as seen in the preview.
 */
export function drawBokehBlur(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number,
  blurAmount: number
) {
  if (blurAmount <= 0) {
    ctx.drawImage(img, 0, 0, width, height);
    return;
  }

  // Calculate blur intensity proportional to display preview (~500px baseline)
  // At blurAmount 30, blur radius is ~6% of the full image dimension
  const blurFraction = Math.min(0.12, blurAmount / 500);
  const effectiveRadius = Math.max(4, Math.round(Math.max(width, height) * blurFraction));

  // Step 1: Intermediate downscale buffer (1/4 size) for preliminary anti-aliasing
  const step1W = Math.max(32, Math.round(width / 4));
  const step1H = Math.max(32, Math.round(height / 4));
  const c1 = document.createElement('canvas');
  c1.width = step1W;
  c1.height = step1H;
  const ctx1 = c1.getContext('2d');
  if (!ctx1) return;
  ctx1.imageSmoothingEnabled = true;
  ctx1.imageSmoothingQuality = 'high';
  ctx1.drawImage(img, 0, 0, step1W, step1H);

  // Step 2: Deep diffusion buffer proportional to effectiveRadius
  // For high blur (30px on 4500px photo), downsamples to ~16-24px
  const divisor = Math.max(2, Math.round(effectiveRadius * 0.7));
  const deepW = Math.max(6, Math.round(width / divisor));
  const deepH = Math.max(6, Math.round(height / divisor));

  const c2 = document.createElement('canvas');
  c2.width = deepW;
  c2.height = deepH;
  const ctx2 = c2.getContext('2d');
  if (!ctx2) return;
  ctx2.imageSmoothingEnabled = true;
  ctx2.imageSmoothingQuality = 'high';
  ctx2.drawImage(c1, 0, 0, deepW, deepH);

  // Step 3: Re-expand to intermediate smoothing buffer to guarantee zero banding
  const c3 = document.createElement('canvas');
  c3.width = step1W;
  c3.height = step1H;
  const ctx3 = c3.getContext('2d');
  if (!ctx3) return;
  ctx3.imageSmoothingEnabled = true;
  ctx3.imageSmoothingQuality = 'high';
  ctx3.drawImage(c2, 0, 0, step1W, step1H);

  // Step 4: Final upscale back to destination canvas at 100% full resolution
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(c3, 0, 0, width, height);
  ctx.restore();
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

export async function copyBlobToClipboard(blob: Blob): Promise<boolean> {
  try {
    let pngBlob = blob;
    if (blob.type !== 'image/png') {
      const img = await loadImage(URL.createObjectURL(blob));
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        pngBlob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'));
      }
    }
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': pngBlob
      })
    ]);
    return true;
  } catch (e) {
    console.error('Failed to copy to clipboard:', e);
    return false;
  }
}
