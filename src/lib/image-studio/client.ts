import { IMAGE_LIMITS, OUTPUT_MIME } from "./types";
import type { ImageSettings } from "./types";
import type { ImageInspection, ImageResult, StudioRequest, StudioResponse } from "./protocol";
import { validateSettings } from "./settings";
import { sniffImage } from "./sniff";

export type ProgressListener = (progress: number, stage: string) => void;
interface DeviceNavigator extends Navigator { deviceMemory?: number }
export function deviceLimits() {
  const memory = typeof navigator === "undefined" ? 4 : (navigator as DeviceNavigator).deviceMemory ?? 4;
  const cores = typeof navigator === "undefined" ? 2 : navigator.hardwareConcurrency || 2;
  return {
    maxPixels: memory <= 2 ? IMAGE_LIMITS.lowMemoryPixels : IMAGE_LIMITS.pixels,
    concurrency: memory <= 4 ? 1 : Math.max(1, Math.min(cores - 1, 4)),
    concurrentPixels: memory <= 4 ? IMAGE_LIMITS.pixels : 75_000_000,
  };
}
const abortError = () => new DOMException("Image operation cancelled.", "AbortError");
interface Pending {
  request: StudioRequest;
  pixels: number;
  resolve: (value: ImageInspection | ImageResult) => void;
  reject: (error: Error) => void;
  progress?: ProgressListener;
  signal?: AbortSignal;
  onAbort: () => void;
  slot?: Slot;
}
interface Slot { worker: Worker; task?: Pending; timeout?: ReturnType<typeof setTimeout>; idle?: ReturnType<typeof setTimeout> }

/** Image bytes stay within this page and its same-origin worker. One task per
 * worker, bounded aggregate pixels, hard timeout, termination on cancellation. */
export class StudioPool {
  private slots: Slot[] = [];
  private queue: Pending[] = [];
  private disposed = false;
  private readonly limits = deviceLimits();

  async inspect(file: Blob, signal?: AbortSignal, progress?: ProgressListener): Promise<ImageInspection> {
    return this.run("inspect", file, undefined, signal, progress) as Promise<ImageInspection>;
  }
  async process(file: Blob, settings: ImageSettings, signal?: AbortSignal, progress?: ProgressListener): Promise<ImageResult> {
    return this.run("process", file, validateSettings(settings), signal, progress) as Promise<ImageResult>;
  }
  private async run(action: StudioRequest["action"], file: Blob, settings?: ImageSettings, signal?: AbortSignal, progress?: ProgressListener) {
    if (this.disposed || signal?.aborted) throw abortError();
    if (typeof Worker !== "function" || typeof WebAssembly !== "object") throw new Error("This tool needs a current browser with Web Workers and WebAssembly.");
    if (file.size < 1 || file.size > IMAGE_LIMITS.fileBytes) throw new Error("Choose a non-empty image up to 50 MB.");
    let pixels = this.limits.maxPixels;
    // Header probe allocates at most 1 MiB, not a decoded image. Truncation may
    // make full structural sniffing inconclusive; the worker validates it all.
    try {
      const header = new Uint8Array(await file.slice(0, 1_048_576).arrayBuffer());
      const info = sniffImage(header);
      if (info?.width && info.height) pixels = info.width * info.height;
    } catch { /* The complete worker validation supplies the precise error. */ }
    if (pixels > this.limits.maxPixels) throw new Error(`This device's image safety limit is ${this.limits.maxPixels / 1_000_000} megapixels. Resize the source in a trusted desktop editor first.`);
    if (this.disposed || signal?.aborted) throw abortError();
    return new Promise<ImageInspection | ImageResult>((resolve, reject) => {
      const task: Pending = {
        request: { id: crypto.randomUUID(), action, file, settings, maxPixels: this.limits.maxPixels },
        pixels, resolve, reject, progress, signal,
        onAbort: () => {
          const index = this.queue.indexOf(task);
          if (index >= 0) this.queue.splice(index, 1);
          if (task.slot) this.finish(task.slot, undefined, abortError(), true);
          else { task.signal?.removeEventListener("abort", task.onAbort); task.reject(abortError()); }
        },
      };
      signal?.addEventListener("abort", task.onAbort, { once: true });
      this.queue.push(task); this.drain();
    });
  }
  private drain() {
    if (this.disposed) return;
    while (this.queue.length) {
      const active = this.slots.filter(slot => slot.task);
      if (active.length >= this.limits.concurrency) return;
      const task = this.queue[0];
      if (active.length && active.reduce((sum, slot) => sum + slot.task!.pixels, 0) + task.pixels > this.limits.concurrentPixels) return;
      this.queue.shift();
      if (task.signal?.aborted) { task.onAbort(); continue; }
      let slot = this.slots.find(item => !item.task);
      if (!slot) {
        try {
          const worker = new Worker("/image-studio/worker.js", { type: "module", name: "byteverse-image-codec" });
          slot = { worker }; this.slots.push(slot);
          const current = slot;
          worker.onmessage = (event: MessageEvent<StudioResponse>) => {
            const message = event.data; const running = current.task;
            if (!running || !message || message.id !== running.request.id) return;
            if (message.kind === "progress") {
              if (Number.isFinite(message.progress) && typeof message.stage === "string") running.progress?.(Math.min(1, Math.max(0, message.progress)), message.stage.slice(0, 240));
            } else if (message.kind === "error") this.finish(current, undefined, new Error(message.message.slice(0, 400)), true);
            else if (message.kind === "inspection" && running.request.action === "inspect" && message.value?.preview instanceof Blob && message.value.width > 0 && message.value.height > 0) this.finish(current, message.value);
            else if (message.kind === "result" && running.request.action === "process" && message.value?.blob instanceof Blob && message.value.reference instanceof Blob && message.value.blob.size > 0 && message.value.blob.size <= IMAGE_LIMITS.maxOutputBytes && message.value.blob.type === OUTPUT_MIME[message.value.format]) this.finish(current, message.value);
            else this.finish(current, undefined, new Error("The local encoder returned an invalid result. Please retry."), true);
          };
          worker.onerror = () => this.finish(current, undefined, new Error("The image worker could not load or ran out of memory. Reload the tool or try a smaller image."), true);
          worker.onmessageerror = () => this.finish(current, undefined, new Error("The browser could not transfer this image result. Try a smaller image."), true);
        } catch { task.signal?.removeEventListener("abort", task.onAbort); task.reject(new Error("This browser could not start the local image worker.")); continue; }
      }
      clearTimeout(slot.idle); slot.task = task; task.slot = slot;
      const current = slot;
      slot.timeout = setTimeout(() => this.finish(current, undefined, new Error("This image reached the two-minute safety limit. Try smaller dimensions, JPEG/WebP, or a single image."), true), IMAGE_LIMITS.jobTimeoutMs);
      try { slot.worker.postMessage(task.request); }
      catch { this.finish(slot, undefined, new Error("This file could not be sent to the local worker."), true); }
    }
  }
  private finish(slot: Slot, value?: ImageInspection | ImageResult, error?: Error, terminate = false) {
    const task = slot.task; clearTimeout(slot.timeout); slot.task = undefined;
    if (task) { task.slot = undefined; task.signal?.removeEventListener("abort", task.onAbort); if (error) task.reject(error); else if (value) task.resolve(value); }
    if (terminate || this.disposed) this.retire(slot);
    else slot.idle = setTimeout(() => this.retire(slot), 30_000);
    this.drain();
  }
  private retire(slot: Slot) {
    if (slot.task) return;
    clearTimeout(slot.idle); clearTimeout(slot.timeout); slot.worker.terminate();
    this.slots = this.slots.filter(item => item !== slot);
  }
  dispose() {
    this.disposed = true;
    for (const task of this.queue.splice(0)) { task.signal?.removeEventListener("abort", task.onAbort); task.reject(abortError()); }
    for (const slot of [...this.slots]) this.finish(slot, undefined, abortError(), true);
  }
}