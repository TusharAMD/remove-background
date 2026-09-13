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
    // Scale blur to match full canvas resolution (reference baseline ~800px preview)
    const scaleFactor = Math.max(width, height) / 800;
    const blurRadius = Math.max(3, Math.round(config.blurAmount * scaleFactor));

    ctx.save();
    // 1. Draw solid original base
    ctx.drawImage(origImg, 0, 0, width, height);
    // 2. Draw blurred bokeh layer with subtle expansion to prevent edge vignetting
    ctx.filter = `blur(${blurRadius}px)`;
    const pad = Math.round(blurRadius * 1.2);
    ctx.drawImage(origImg, -pad, -pad, width + pad * 2, height + pad * 2);
    ctx.restore();
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
