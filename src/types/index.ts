export type EngineType = 'best' | 'imgly';

export type BackgroundType = 'transparent' | 'color' | 'gradient' | 'image' | 'blur';

export interface EdgeRefinementConfig {
  haloThreshold: number; // 0-90: cuts off ambient backlit halos & faint glow
  edgeErode: number;     // 0 to 4: insets outer borders to shave fringe
  edgeFeather: number;   // 0 to 4: smooths jagged transition edges
}

export interface BackgroundConfig {
  type: BackgroundType;
  color: string;
  gradient: {
    from: string;
    to: string;
    angle: number;
  };
  customImageUrl?: string;
  blurAmount: number; // 0-30 px
  shadow: boolean;
  shadowBlur: number;
  shadowColor: string;
  shadowOffsetY: number;
  refinement: EdgeRefinementConfig;
}

export interface ProcessingProgress {
  status: 'idle' | 'loading-model' | 'processing' | 'finishing' | 'done' | 'error';
  percent: number;
  message: string;
  stage?: string;
  error?: string;
}

export interface ImageItem {
  id: string;
  file: File;
  name: string;
  size: number;
  originalUrl: string;
  processedBlob?: Blob;
  processedUrl?: string;
  rawMask?: Uint8Array;
  width: number;
  height: number;
  status: 'queued' | 'processing' | 'done' | 'error';
  progress: number;
  statusMessage?: string;
  durationMs?: number;
}

export interface HardwareInfo {
  webgpuSupported: boolean;
  gpuAdapterName?: string;
  cores: number;
  recommendedEngine: EngineType;
}
