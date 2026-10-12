import type { StudioRequest, StudioResponse } from "./protocol";
import { IMAGE_LIMITS } from "./types";
import { validateSettings } from "./settings";
import { inspectImage, processImage } from "./pipeline";
import { StudioError } from "./codecs/errors";

/** Narrow worker typing keeps the application's DOM lib compatible; this file
 * is bundled as a dedicated ESM worker, never imported by the main-thread UI. */
interface WorkerHost {
  addEventListener(type: "message", listener: (event: MessageEvent<unknown>) => void): void;
  postMessage(message: StudioResponse): void;
}
const host = globalThis as unknown as WorkerHost;
const ID_PATTERN = /^[a-zA-Z0-9_:.-]{1,128}$/;
let busy = false;

function messageId(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const descriptor = Object.getOwnPropertyDescriptor(value, "id");
  return descriptor && "value" in descriptor && typeof descriptor.value === "string" && ID_PATTERN.test(descriptor.value) ? descriptor.value : "";
}

function request(value: unknown): StudioRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new StudioError("invalid", "Invalid worker request.");
  const allowed = new Set(["id", "action", "file", "maxPixels", "settings"]);
  const names = Reflect.ownKeys(value);
  if (names.length > allowed.size || names.some((name) => typeof name !== "string" || !allowed.has(name)
    || !Object.prototype.hasOwnProperty.call(Object.getOwnPropertyDescriptor(value, name), "value"))) {
    throw new StudioError("invalid", "Invalid worker request fields.");
  }
  const input = value as Partial<StudioRequest>;
  if (!messageId(input) || (input.action !== "inspect" && input.action !== "process")) throw new StudioError("invalid", "A valid job ID and image action are required.");
  if (!(input.file instanceof Blob) || input.file.size < 1) throw new StudioError("invalid", "Choose a non-empty local image file.");
  if (input.file.size > IMAGE_LIMITS.fileBytes) throw new StudioError("resource", "This file exceeds the 50 MB input safety limit.");
  if (typeof input.maxPixels !== "number" || !Number.isSafeInteger(input.maxPixels) || input.maxPixels < 1 || input.maxPixels > IMAGE_LIMITS.pixels) throw new StudioError("invalid", "A valid worker pixel budget is required.");
  if (input.action === "process" && input.settings === undefined) throw new StudioError("invalid", "Processing settings are required.");
  let settings: StudioRequest["settings"];
  if (input.settings !== undefined) {
    try { settings = validateSettings(input.settings); }
    catch { throw new StudioError("invalid", "Invalid image settings; check the target, quality, crop and dimensions."); }
  }
  return { id: input.id!, action: input.action, file: input.file, maxPixels: input.maxPixels, settings };
}

function reportError(id: string, error: unknown): void {
  if (error instanceof StudioError) host.postMessage({ id, kind: "error", code: error.code, message: error.message });
  else if (error instanceof RangeError) host.postMessage({ id, kind: "error", code: "resource", message: "Image processing exceeded a dimension or memory limit. Try a smaller image." });
  else host.postMessage({ id, kind: "error", code: "codec", message: "The image could not be processed safely. Try a smaller image or another format." });
}

host.addEventListener("message", (event) => {
  const id = messageId(event.data);
  if (busy) { reportError(id, new StudioError("invalid", "This worker is already processing an image. Use one active job per worker.")); return; }
  let input: StudioRequest;
  try { input = request(event.data); }
  catch (error) { reportError(id, error); return; }
  busy = true;
  const controller = new AbortController();
  const deadline = Date.now() + IMAGE_LIMITS.jobTimeoutMs;
  const timer = setTimeout(() => controller.abort(), IMAGE_LIMITS.jobTimeoutMs);
  let previous = 0;
  let updates = 0;
  const checkTime = () => {
    if (controller.signal.aborted || Date.now() >= deadline) throw new StudioError("resource", "This image exceeded the worker's time budget. Retry with fewer pixels or a faster format.");
  };
  const onProgress = (fraction: number, stage: string) => {
    checkTime();
    // All fractions represent the bounded planned stages/attempts, never an ETA.
    // At most 128 updates; the shared search caps successful encode attempts.
    if (updates++ >= 128 && fraction !== 1) return;
    previous = Math.max(previous, Math.min(1, Math.max(0, fraction)));
    host.postMessage({ id: input.id, kind: "progress", progress: previous, stage: stage.slice(0, 240) });
  };
  void (async () => {
    try {
      const options = { signal: controller.signal, onProgress };
      if (input.action === "inspect") {
        const value = await inspectImage(input.file, input.maxPixels, options);
        checkTime();
        host.postMessage({ id: input.id, kind: "inspection", value });
      } else {
        const value = await processImage(input.file, input.settings!, input.maxPixels, options);
        checkTime();
        host.postMessage({ id: input.id, kind: "result", value });
      }
    } catch (error) { reportError(input.id, error); }
    finally { clearTimeout(timer); busy = false; }
  })();
});

// Cooperative checks cannot interrupt native/WASM calls. The parent MUST
// terminate this worker for cancellation and the protocol's 120-second hard
// deadline; a timeout is never implemented by abandoning a live decode buffer.