import source from "invoice:core-worker";
import { INVOICE_LIMITS } from "./types";
import type { ExtractionOptions, ExtractionResult, SourceLine, TextToken } from "./types";

function run<T>(task: object, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException("Cancelled", "AbortError")); return; }
    const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
    let worker: Worker | undefined;
    const clean = () => { clearTimeout(timer); signal.removeEventListener("abort", abort); worker?.terminate(); URL.revokeObjectURL(url); };
    const abort = () => { clean(); reject(new DOMException("Cancelled", "AbortError")); };
    const timer = setTimeout(() => { clean(); reject(new Error("The bounded text extraction timed out.")); }, INVOICE_LIMITS.processMs);
    signal.addEventListener("abort", abort, { once: true });
    try {
      worker = new Worker(url);
      worker.onmessage = (event: MessageEvent<{ ok: boolean; result: T }>) => {
        clean();
        if (event.data.ok) resolve(event.data.result);
        else reject(new Error("Text extraction could not complete."));
      };
      worker.onerror = () => { clean(); reject(new Error("The isolated text reader could not start.")); };
      worker.postMessage(task);
    } catch { clean(); reject(new Error("The isolated text reader could not start.")); }
  });
}

export const groupInvoiceTokens = (tokens: TextToken[], signal: AbortSignal) => run<SourceLine[]>({ operation: "group", tokens }, signal);
export const extractInvoiceLocally = (lines: SourceLine[], options: ExtractionOptions, signal: AbortSignal) => run<ExtractionResult>({ operation: "extract", lines, options }, signal);