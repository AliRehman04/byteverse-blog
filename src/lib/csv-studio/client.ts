import { STUDIO_LIMITS, StudioError, type StudioMessage } from "./types";

export type ProgressHandler = (progress: { phase: string; done: number; total: number }) => void;

interface Pending { resolve(value: unknown): void; reject(error: StudioError): void; onProgress?: ProgressHandler; timer: ReturnType<typeof setTimeout> | null }

/** Main-thread handle for one document worker. All CSV content stays inside the worker. */
export class StudioClient {
  private readonly worker: Worker;
  private readonly pending = new Map<number, Pending>();
  private sequence = 0;
  private disposed = false;

  private constructor(worker: Worker) {
    this.worker = worker;
    worker.onmessage = (event: MessageEvent<StudioMessage>) => {
      const message = event.data;
      const entry = message && this.pending.get(message.id);
      if (!entry) return;
      if ("progress" in message) { entry.onProgress?.(message.progress); return; }
      this.pending.delete(message.id);
      if (entry.timer) clearTimeout(entry.timer);
      if (message.ok) entry.resolve(message.result);
      else entry.reject(new StudioError(message.code, message.message));
    };
    worker.onerror = (event) => {
      event.preventDefault();
      this.failAll(new StudioError("WORKER_ERROR", "The in-browser worker stopped unexpectedly. Your original file is unchanged; import it again."));
    };
    worker.onmessageerror = () => this.failAll(new StudioError("WORKER_ERROR", "A result from the in-browser worker could not be read."));
  }

  static create(): StudioClient {
    try {
      return new StudioClient(new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }));
    } catch {
      throw new StudioError("WORKER_UNAVAILABLE", "This browser couldn’t start the background worker CSV Studio needs. Use a current version of Chrome, Edge, Firefox or Safari.");
    }
  }

  get alive(): boolean {
    return !this.disposed;
  }

  request<T>(type: string, payload?: unknown, options: { onProgress?: ProgressHandler; transfer?: Transferable[]; timeoutMs?: number } = {}): Promise<T> {
    if (this.disposed) return Promise.reject(new StudioError("CLOSED", "This document was closed."));
    const id = ++this.sequence;
    return new Promise<T>((resolve, reject) => {
      const timer = options.timeoutMs ? setTimeout(() => {
        this.pending.delete(id);
        reject(new StudioError("TIMEOUT", "This took too long and was stopped. Try a smaller file."));
        this.dispose();
      }, options.timeoutMs) : null;
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject, onProgress: options.onProgress, timer });
      try {
        this.worker.postMessage({ id, type, payload }, options.transfer ?? []);
      } catch {
        this.pending.delete(id);
        if (timer) clearTimeout(timer);
        reject(new StudioError("POST_FAILED", "This data couldn’t be sent to the in-browser worker."));
      }
    });
  }

  /** Cooperative cancel for exports; the document stays open. */
  cancelExport(): void {
    if (!this.disposed) this.worker.postMessage({ id: 0, type: "cancel" });
  }

  importTimeout(): number {
    return STUDIO_LIMITS.importTimeoutMs;
  }

  private failAll(error: StudioError): void {
    for (const [id, entry] of this.pending) {
      if (entry.timer) clearTimeout(entry.timer);
      entry.reject(error);
      this.pending.delete(id);
    }
  }

  /** Terminate the worker and drop every reference to the document's data. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.worker.terminate();
    this.failAll(new StudioError("CANCELLED", "Cancelled. The previous document is unchanged."));
  }
}
