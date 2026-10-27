import { compareTables } from "./engine";
import { exportCsv, exportJson, filteredRows } from "./export";
import { readCsvInput } from "./input";
import { CsvDiffError, type Comparison, type CsvDiffResponse, type CsvInput, type CsvTable, type DiffOptions, type ExportFilter } from "./types";

export type { CsvDiffRequest, CsvDiffResponse } from "./types";

// Works with DOM or worker-only TypeScript libs without combining their globals.
// Requests are independent. The host discards stale IDs and terminates at 15 s.
interface CsvDiffWorkerScope {
  onmessage: ((event: { data: unknown }) => Promise<void>) | null;
  postMessage(message: CsvDiffResponse): void;
}

const scope = globalThis as unknown as CsvDiffWorkerScope;

function ownValue(value: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && "value" in descriptor ? descriptor.value as unknown : undefined;
}

function invalidRequest(): never {
  throw new CsvDiffError("INVALID_REQUEST", "Invalid CSV comparison request. Check the operation and its inputs.");
}

scope.onmessage = async ({ data }) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return;
  let id: unknown;
  try { id = ownValue(data, "id"); } catch { return; }
  // Do not fabricate correlation IDs for malformed or unrelated messages.
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 0) return;
  let response: CsvDiffResponse;
  try {
    const kind = ownValue(data, "kind");
    const allowed = kind === "inspect" ? ["id", "kind", "inputs"]
      : kind === "compare" ? ["id", "kind", "tables", "options"]
        : kind === "export" ? ["id", "kind", "result", "format", "filter"] : [];
    if (!allowed.length || Object.getOwnPropertySymbols(data).length
      || Object.getOwnPropertyNames(data).some((key) => !allowed.includes(key)
        || !("value" in (Object.getOwnPropertyDescriptor(data, key) ?? {})))) invalidRequest();
    if (kind === "inspect") {
      const inputs = ownValue(data, "inputs");
      if (!Array.isArray(inputs) || inputs.length !== 2) invalidRequest();
      const original = await readCsvInput(inputs[0] as CsvInput);
      const updated = await readCsvInput(inputs[1] as CsvInput);
      response = { id, ok: true, kind, tables: [original, updated] };
    } else if (kind === "compare") {
      const tables = ownValue(data, "tables");
      if (!Array.isArray(tables) || tables.length !== 2) invalidRequest();
      response = { id, ok: true, kind, result: compareTables(tables[0] as CsvTable, tables[1] as CsvTable, ownValue(data, "options") as DiffOptions) };
    } else {
      const result = ownValue(data, "result") as Comparison;
      const filter = ownValue(data, "filter") as ExportFilter | undefined;
      const format = ownValue(data, "format");
      if (format !== "csv" && format !== "json") invalidRequest();
      if (format === "csv") {
        response = { id, ok: true, kind: "export", ...exportCsv(result, filter), mime: "text/csv;charset=utf-8", filename: "csv-comparison.csv" };
      } else {
        response = { id, ok: true, kind: "export", text: exportJson(result, filter),
          mime: "application/json;charset=utf-8", filename: "csv-comparison.json", protectedCells: 0, rows: filteredRows(result, filter).length };
      }
    }
  } catch (error: unknown) {
    response = error instanceof CsvDiffError
      ? { id, ok: false, error: error.message, code: error.code, ...(error.issues ? { issues: error.issues } : {}) }
      : { id, ok: false, error: "Unable to process this CSV comparison. Check the inputs and settings.", code: "INTERNAL_ERROR" };
  }
  scope.postMessage(response);
};