import { generateTypeScript, inspectTypeScriptJson, JsonTypeScriptError } from "./engine";
import type { JsonTsOptions, JsonTsResponse } from "./types";

// Works with DOM OR webworker libs, without combining conflicting globals.
interface JsonTsWorkerScope {
  onmessage: ((event: { data: unknown }) => void) | null;
  postMessage(message: JsonTsResponse): void;
}
const scope = globalThis as unknown as JsonTsWorkerScope;

function ownValue(value: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && "value" in descriptor ? descriptor.value as unknown : undefined;
}

scope.onmessage = (event) => {
  let data: unknown, id: unknown;
  try {
    data = event.data;
    if (typeof data !== "object" || data === null || Array.isArray(data)) return;
    id = ownValue(data, "id");
  } catch { return; }
  // Never invent a correlation ID for a malformed or uncorrelatable event.
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 0) return;
  let response: JsonTsResponse;
  try {
    const kind = ownValue(data, "kind"), input = ownValue(data, "input"), format = ownValue(data, "format");
    const expected = kind === "inspect" ? ["id", "kind", "input", "format"] : ["id", "kind", "input", "format", "options"];
    const keys = Object.getOwnPropertyNames(data);
    if ((kind !== "inspect" && kind !== "generate") || typeof input !== "string" || (format !== "json" && format !== "jsonl")
      || keys.length !== expected.length || keys.some((key) => !expected.includes(key))
      || Object.getOwnPropertySymbols(data).length
      || keys.some((key) => !("value" in (Object.getOwnPropertyDescriptor(data, key) ?? {})))) {
      throw new JsonTypeScriptError("Invalid JSON-to-TypeScript request. Check the input format and settings.");
    }
    response = kind === "inspect" ? { id, kind, inspection: inspectTypeScriptJson(input, format) }
      : { id, kind, result: generateTypeScript(input, format, ownValue(data, "options") as JsonTsOptions) };
  } catch (error: unknown) {
    response = { id, kind: "error", error: error instanceof JsonTypeScriptError
      ? error.message : "Unable to process this JSON safely. Check the input and TypeScript settings." };
  }
  scope.postMessage(response);
};