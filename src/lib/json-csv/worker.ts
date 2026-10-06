import { convertJson, inspectJson, JsonCsvError } from "./engine";
import type { CsvColumn, CsvOptions, JsonCsvResponse } from "./types";

// Compiles with either DOM or worker libraries; do not combine their globals.
interface JsonCsvWorkerScope {
  onmessage: ((event: { data: unknown }) => void) | null;
  postMessage(message: JsonCsvResponse): void;
}

const scope = globalThis as unknown as JsonCsvWorkerScope;

function ownValue(value: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && "value" in descriptor ? descriptor.value as unknown : undefined;
}

scope.onmessage = ({ data }) => {
  // No synthetic/stale correlation ID is invented for an uncorrelatable event.
  // Requests are stateless: the UI can discard a late result by its exact ID.
  if (typeof data !== "object" || data === null || Array.isArray(data)) return;
  let id: unknown;
  try { id = ownValue(data, "id"); } catch { return; }
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 0) return;
  let response: JsonCsvResponse;
  try {
    const kind = ownValue(data, "kind");
    const input = ownValue(data, "input");
    const format = ownValue(data, "format");
    const keys = kind === "inspect" ? ["id", "kind", "input", "format"]
      : ["id", "kind", "input", "format", "options", "columns"];
    const names = Object.getOwnPropertyNames(data);
    if ((kind !== "inspect" && kind !== "convert") || typeof input !== "string"
      || (format !== "json" && format !== "jsonl") || names.some((key) => !keys.includes(key))
      || Object.getOwnPropertySymbols(data).length
      || names.some((key) => !("value" in (Object.getOwnPropertyDescriptor(data, key) ?? {})))) {
      throw new JsonCsvError("Invalid JSON-to-CSV request. Check the input format and settings.");
    }
    if (kind === "inspect") response = { id, kind, inspection: inspectJson(input, format) };
    else response = { id, kind, conversion: convertJson(input, format,
      ownValue(data, "options") as CsvOptions, ownValue(data, "columns") as CsvColumn[] | undefined) };
  } catch (error: unknown) {
    response = { id, kind: "error", error: error instanceof JsonCsvError
      ? error.message : "Unable to process this JSON safely. Check the input and CSV settings." };
  }
  scope.postMessage(response);
};