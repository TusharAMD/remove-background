import { HardwareInfo } from '../types';

export async function detectHardware(): Promise<HardwareInfo> {
  const cores = navigator.hardwareConcurrency || 4;
  let webgpuSupported = false;
  let gpuAdapterName: string | undefined = undefined;

  if ('gpu' in navigator && typeof (navigator as any).gpu?.requestAdapter === 'function') {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (adapter) {
        webgpuSupported = true;
        // In newer browsers, info is available via adapter.info
        if (adapter.info) {
          gpuAdapterName = adapter.info.description || adapter.info.device || adapter.info.architecture;
        }
        if (!gpuAdapterName && adapter.requestAdapterInfo) {
          try {
            const info = await adapter.requestAdapterInfo();
            gpuAdapterName = info.description || info.device || info.vendor;
          } catch {
            // ignore
          }
        }
      }
    } catch {
      webgpuSupported = false;
    }
  }

  return {
    webgpuSupported,
    gpuAdapterName: gpuAdapterName || (webgpuSupported ? 'WebGPU Device' : undefined),
    cores,
    recommendedEngine: webgpuSupported ? 'best' : 'imgly'
  };
}
