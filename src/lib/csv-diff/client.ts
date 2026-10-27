import { CSV_DIFF_LIMITS, CsvDiffError, type CsvDiffRequest, type CsvDiffResponse } from "./types";

type WithoutId<T> = T extends { id: number } ? Omit<T, "id"> : never;
export type CsvDiffOperation = WithoutId<CsvDiffRequest>;
export type CsvDiffSuccess = Extract<CsvDiffResponse, { ok: true }>;
export interface CsvDiffJob { promise: Promise<CsvDiffSuccess>; cancel(): void }
let sequence = 0;

export function startCsvDiffJob(operation: CsvDiffOperation): CsvDiffJob {
  let cancel = () => {};
  const promise = new Promise<CsvDiffSuccess>((resolve, reject) => {
    let worker: Worker;
    try { worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }); }
    catch { reject(new CsvDiffError("WORKER_UNAVAILABLE", "The local worker could not start. Use a current browser and reload this page.")); return; }
    const id = ++sequence;
    let settled = false;
    const finish = (error?: CsvDiffError, value?: CsvDiffSuccess) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      if (error) reject(error);
      else if (value) resolve(value);
    };
    const timer = setTimeout(() => finish(new CsvDiffError("TIMEOUT", "This operation exceeded 15 seconds and was stopped. Try smaller inputs or fewer columns.")), CSV_DIFF_LIMITS.timeoutMs);
    cancel = () => finish(new CsvDiffError("CANCELLED", "Operation cancelled. Your inputs were kept."));
    worker.onmessage = (event: MessageEvent<CsvDiffResponse>) => {
      const response = event.data;
      if (!response || response.id !== id) return;
      if (!response.ok) finish(new CsvDiffError(response.code, response.error, response.issues));
      else if (response.kind === operation.kind) finish(undefined, response);
      else finish(new CsvDiffError("WORKER_ERROR", "The worker returned an unexpected result. Run the operation again."));
    };
    worker.onerror = event => { event.preventDefault(); finish(new CsvDiffError("WORKER_ERROR", "The local worker stopped unexpectedly. Your input files have not been changed.")); };
    worker.onmessageerror = () => finish(new CsvDiffError("WORKER_ERROR", "The local worker result could not be read."));
    try { worker.postMessage({ ...operation, id } satisfies CsvDiffRequest); }
    catch { finish(new CsvDiffError("WORKER_ERROR", "These inputs could not be sent to the local worker. Select them again.")); }
  });
  return { promise, cancel: () => cancel() };
}