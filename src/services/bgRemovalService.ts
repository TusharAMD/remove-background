import { EngineType } from '../types';

export interface ProgressPayload {
  percent: number;
  message: string;
  stage?: string;
}

type ProgressCallback = (payload: ProgressPayload) => void;

class BgRemovalService {
  private worker: Worker | null = null;
  private pendingTasks: Map<
    string,
    {
      resolve: (blob: Blob) => void;
      reject: (err: Error) => void;
      onProgress?: ProgressCallback;
    }
  > = new Map();

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    try {
      this.worker = new Worker(
        new URL('../workers/backgroundRemovalWorker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (e: MessageEvent) => {
        const { id, type, percent, message, stage, resultBlob, error } = e.data;
        const task = this.pendingTasks.get(id);
        if (!task) return;

        if (type === 'PROGRESS') {
          if (task.onProgress) {
            task.onProgress({ percent, message, stage });
          }
        } else if (type === 'SUCCESS') {
          task.resolve(resultBlob);
          this.pendingTasks.delete(id);
        } else if (type === 'ERROR') {
          task.reject(new Error(error || 'Processing failed'));
          this.pendingTasks.delete(id);
        }
      };

      this.worker.onerror = (err) => {
        console.error('Worker error:', err);
      };
    } catch (e) {
      console.warn('Could not initialize background removal worker, fallback enabled:', e);
      this.worker = null;
    }
  }

  public async removeBackground(
    imageBlob: Blob,
    engine: EngineType = 'best',
    onProgress?: ProgressCallback
  ): Promise<Blob> {
    const isDesktop =
      typeof window !== 'undefined' &&
      (Boolean((window as any).desktopAPI?.isDesktop) ||
        window.navigator.userAgent.includes('Electron'));

    // Only if running inside Desktop Electron App
    if (isDesktop) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);
        const healthCheck = await fetch('http://127.0.0.1:8765/health', {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (healthCheck.ok) {
          const desktopMode = engine === 'best' ? 'ultra' : 'fast';

          if (onProgress) {
            onProgress({
              percent: 30,
              stage: 'processing',
              message: 'Removing background...'
            });
          }

          const response = await fetch(`http://127.0.0.1:8765/remove-background?mode=${desktopMode}`, {
            method: 'POST',
            headers: {
              'X-Engine-Mode': desktopMode
            },
            body: imageBlob
          });

          if (response.ok) {
            if (onProgress) {
              onProgress({
                percent: 100,
                stage: 'done',
                message: 'Complete!'
              });
            }
            return await response.blob();
          } else {
            const errText = await response.text();
            console.error('Desktop server error response:', errText);
          }
        }
      } catch (err) {
        console.warn('Desktop server communication failed, falling back to browser worker:', err);
      }
    }

    const taskId = 'task_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();

    if (this.worker) {
      return new Promise((resolve, reject) => {
        this.pendingTasks.set(taskId, { resolve, reject, onProgress });
        this.worker?.postMessage({
          id: taskId,
          type: 'PROCESS_IMAGE',
          imageBlob,
          engine
        });
      });
    } else {
      // Fallback in main thread if worker initialization is restricted
      const { removeBackground } = await import('@imgly/background-removal');
      return await removeBackground(imageBlob, {
        progress: (key: string, current: number, total: number) => {
          const percent = total > 0 ? Math.round((current / total) * 100) : 0;
          if (onProgress) {
            onProgress({
              percent,
              stage: key,
              message: `Processing (${key.replace(/_/g, ' ')}) ${percent > 0 ? `${percent}%` : ''}`
            });
          }
        }
      });
    }
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingTasks.clear();
  }
}

export const bgRemovalService = new BgRemovalService();
