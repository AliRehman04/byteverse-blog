import type { StudioResponse } from "../protocol";

export type StudioErrorCode = Extract<StudioResponse, { kind: "error" }>["code"];

/** Only code-authored messages cross the worker boundary. Never wrap a codec's
 * message/cause: it can contain a filename, metadata, a URL or a WASM stack. */
export class StudioError extends Error {
  constructor(readonly code: StudioErrorCode, message: string) {
    super(message);
    this.name = "StudioError";
  }
}

export function checkAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new StudioError("resource", "Image processing stopped or exceeded its time budget. Retry with a smaller image.");
}

export function quiet(): void { /* No decoder output, including metadata, is logged. */ }