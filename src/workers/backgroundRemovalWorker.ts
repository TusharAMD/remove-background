import { removeBackground, Config as ImglyConfig } from '@imgly/background-removal';
import { AutoModel, AutoProcessor, RawImage, env } from '@huggingface/transformers';

// Configure transformers.js environment for Web Worker
env.allowLocalModels = false;
env.useBrowserCache = true;

let loadedModels: Record<string, any> = {};
let loadedProcessors: Record<string, any> = {};
let currentDevice: 'webgpu' | 'wasm' = 'webgpu';

self.onmessage = async (e: MessageEvent) => {
  const { id, type, imageBlob, engine } = e.data;

  if (type === 'PING') {
    self.postMessage({ id, type: 'PONG' });
    return;
  }

  if (type === 'PROCESS_IMAGE') {
    try {
      let resultBlob: Blob;

      if (engine === 'imgly') {
        resultBlob = await processWithImgly(imageBlob, id);
      } else if (engine === 'transformers-rmbg') {
        resultBlob = await processWithTransformers(imageBlob, id, 'briaai/RMBG-1.4');
      } else {
        // Default Recommended: Dual-AI Ensemble (fuses RMBG-1.4 fine matting + semantic body mask)
        resultBlob = await processWithEnsemble(imageBlob, id);
      }

      self.postMessage({
        id,
        type: 'SUCCESS',
        resultBlob
      });
    } catch (err: any) {
      console.error('Worker processing error:', err);
      self.postMessage({
        id,
        type: 'ERROR',
        error: err?.message || 'Failed to process image'
      });
    }
  }
};

async function processWithImgly(blob: Blob, taskId: string): Promise<Blob> {
  const config: ImglyConfig = {
    progress: (key: string, current: number, total: number) => {
      const percent = total > 0 ? Math.round((current / total) * 100) : 0;
      self.postMessage({
        id: taskId,
        type: 'PROGRESS',
        percent,
        stage: 'processing',
        message: `Processing image... ${percent > 0 ? `${percent}%` : ''}`
      });
    },
    output: {
      format: 'image/png',
      quality: 1.0
    }
  };

  return await removeBackground(blob, config);
}

async function getRmbgMask(blob: Blob, taskId: string, modelId: string = 'briaai/RMBG-1.4'): Promise<{ mask: any; width: number; height: number; origData: any; channels: number }> {
  const isBiRefNet = modelId.includes('BiRefNet');
  const dtype = isBiRefNet ? 'fp32' : 'q8';
  const preferredDevice: 'webgpu' | 'wasm' = isBiRefNet ? 'wasm' : 'webgpu';

  const loadModel = async (device: 'webgpu' | 'wasm') => {
    self.postMessage({
      id: taskId,
      type: 'PROGRESS',
      percent: 15,
      stage: 'loading',
      message: 'Initializing AI model...'
    });

    const progressCallback = (progress: any) => {
      if (progress.status === 'progress' && progress.total) {
        const pct = Math.round((progress.loaded / progress.total) * 100);
        self.postMessage({
          id: taskId,
          type: 'PROGRESS',
          percent: pct,
          stage: 'downloading',
          message: `Preparing AI engine: ${pct}%`
        });
      }
    };

    try {
      loadedModels[modelId] = await AutoModel.from_pretrained(modelId, {
        device,
        dtype: dtype as any,
        progress_callback: progressCallback
      });
      currentDevice = device;
    } catch (gpuError) {
      if (device === 'webgpu') {
        console.warn(`WebGPU fallback to WASM for ${modelId}`, gpuError);
        loadedModels[modelId] = await AutoModel.from_pretrained(modelId, {
          device: 'wasm',
          dtype: dtype as any,
          progress_callback: progressCallback
        });
        currentDevice = 'wasm';
      } else {
        throw gpuError;
      }
    }

    if (!loadedProcessors[modelId]) {
      loadedProcessors[modelId] = await AutoProcessor.from_pretrained(modelId);
    }
  };

  if (!loadedModels[modelId] || !loadedProcessors[modelId]) {
    await loadModel(preferredDevice);
  }

  let model = loadedModels[modelId];
  const processor = loadedProcessors[modelId];

  self.postMessage({
    id: taskId,
    type: 'PROGRESS',
    percent: 60,
    stage: 'processing',
    message: 'Isolating subject and refining edges...'
  });

  const image = await RawImage.fromBlob(blob);
  const { pixel_values } = await processor(image);

  self.postMessage({
    id: taskId,
    type: 'PROGRESS',
    percent: 80,
    stage: 'inference',
    message: 'Computing alpha matte...'
  });

  const modelInput: any = {};
  const mainInput = model.sessions?.['model']?.inputNames?.[0] || 'input_image';
  modelInput[mainInput] = pixel_values;

  let rawOutput: any;
  try {
    rawOutput = await model(modelInput);
  } catch (execErr) {
    if (currentDevice === 'webgpu') {
      console.warn('WebGPU forward pass failed, reloading with WASM...', execErr);
      await loadModel('wasm');
      model = loadedModels[modelId];
      rawOutput = await model(modelInput);
    } else {
      throw execErr;
    }
  }

  const outputTensor = rawOutput.output_image || rawOutput.output || rawOutput[0] || Object.values(rawOutput)[0];
  const maskSlice = outputTensor[0] || outputTensor;

  const data = maskSlice.data;
  let minVal = Infinity;
  let maxVal = -Infinity;
  for (let i = 0; i < data.length; i++) {
    if (data[i] < minVal) minVal = data[i];
    if (data[i] > maxVal) maxVal = data[i];
  }
  const range = maxVal - minVal > 0.0001 ? maxVal - minVal : 1;

  const u8Array = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const norm = (data[i] - minVal) / range;
    u8Array[i] = Math.round(Math.min(1, Math.max(0, norm)) * 255);
  }

  const normalizedTensor = new (maskSlice.constructor)(
    'uint8',
    u8Array,
    maskSlice.dims
  );

  const mask = await RawImage.fromTensor(normalizedTensor).resize(
    image.width,
    image.height
  );

  return {
    mask: mask.data,
    width: image.width,
    height: image.height,
    origData: image.data,
    channels: image.channels || 3
  };
}

async function processWithTransformers(
  blob: Blob,
  taskId: string,
  modelId: string = 'briaai/RMBG-1.4'
): Promise<Blob> {
  const { mask, width, height, origData, channels } = await getRmbgMask(blob, taskId, modelId);

  self.postMessage({
    id: taskId,
    type: 'PROGRESS',
    percent: 95,
    stage: 'compositing',
    message: 'Generating transparent PNG...'
  });

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create OffscreenCanvas 2D context');

  const imgData = ctx.createImageData(width, height);
  const totalPixels = width * height;

  for (let i = 0; i < totalPixels; i++) {
    const srcIdx = i * channels;
    const destIdx = i * 4;
    imgData.data[destIdx] = origData[srcIdx];
    imgData.data[destIdx + 1] = origData[srcIdx + 1];
    imgData.data[destIdx + 2] = origData[srcIdx + 2];
    imgData.data[destIdx + 3] = mask[i];
  }

  ctx.putImageData(imgData, 0, 0);
  return await canvas.convertToBlob({ type: 'image/png' });
}

/**
 * Dual-AI Ensemble Engine:
 * Combines fine-edge hair/fur matting of RMBG-1.4 with semantic masking of @imgly
 * to eliminate background clutter while keeping fine hair strands.
 */
async function processWithEnsemble(blob: Blob, taskId: string): Promise<Blob> {
  self.postMessage({
    id: taskId,
    type: 'PROGRESS',
    percent: 10,
    stage: 'ensemble',
    message: 'Running Dual-AI Ensemble: Model 1 (Semantic Body)...'
  });

  // 1. Run @imgly for semantic segmentation
  const imglyBlob = await processWithImgly(blob, taskId);
  const imglyImage = await RawImage.fromBlob(imglyBlob);

  self.postMessage({
    id: taskId,
    type: 'PROGRESS',
    percent: 50,
    stage: 'ensemble',
    message: 'Running Dual-AI Ensemble: Model 2 (Fine Fur/Hair Matting)...'
  });

  // 2. Run RMBG-1.4 for continuous alpha matting
  const rmbgData = await getRmbgMask(blob, taskId, 'briaai/RMBG-1.4');

  self.postMessage({
    id: taskId,
    type: 'PROGRESS',
    percent: 90,
    stage: 'ensemble',
    message: 'Fusing Dual-AI probability masks & removing artifacts...'
  });

  const width = rmbgData.width;
  const height = rmbgData.height;
  const totalPixels = width * height;
  const fusedMask = new Uint8Array(totalPixels);

  const imglyAlpha = new Uint8Array(totalPixels);
  const imglyRawData = imglyImage.data;
  const imglyChannels = imglyImage.channels || 4;

  for (let i = 0; i < totalPixels; i++) {
    imglyAlpha[i] = imglyChannels === 4 ? imglyRawData[i * 4 + 3] : 255;
  }

  const rmbgAlpha = rmbgData.mask;

  // Smart Fusion:
  // - High agreement (both > 100): Solid foreground
  // - Model 1 thinks background (imgly === 0) & Model 2 has low confidence (< 180): Filter out background clutter
  // - Edges: RMBG-1.4 continuous alpha
  for (let i = 0; i < totalPixels; i++) {
    const a1 = imglyAlpha[i];
    const a2 = rmbgAlpha[i];

    if (a1 > 120 && a2 > 120) {
      fusedMask[i] = Math.max(a1, a2);
    } else if (a1 === 0 && a2 < 170) {
      fusedMask[i] = 0; // Cut rogue background artifacts
    } else if (a1 > 200 && a2 < 50) {
      fusedMask[i] = a1; // Keep subject body if rmbg missed a portion
    } else {
      fusedMask[i] = Math.round(a1 * 0.4 + a2 * 0.6);
    }
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create OffscreenCanvas 2D context');

  const imgData = ctx.createImageData(width, height);
  const origData = rmbgData.origData;
  const channels = rmbgData.channels;

  for (let i = 0; i < totalPixels; i++) {
    const srcIdx = i * channels;
    const destIdx = i * 4;
    imgData.data[destIdx] = origData[srcIdx];
    imgData.data[destIdx + 1] = origData[srcIdx + 1];
    imgData.data[destIdx + 2] = origData[srcIdx + 2];
    imgData.data[destIdx + 3] = fusedMask[i];
  }

  ctx.putImageData(imgData, 0, 0);
  return await canvas.convertToBlob({ type: 'image/png' });
}
