import { rootNameProblem } from "./naming";
import { JSON_TS_LIMITS, type JsonTsFormat, type JsonTsResult } from "./types";

const FILE_ERROR = "The file could not be read as UTF-8. Export a UTF-8 text copy and try again.";
class InputProblem extends Error {}

export function inputSizeProblem(text: string): string | null {
  if (typeof text !== "string") return "Provide JSON text.";
  if (text.length > JSON_TS_LIMITS.inputChars) return "Use at most 1,000,000 UTF-16 characters. Nothing was truncated.";
  try {
    if (new TextEncoder().encode(text).byteLength > JSON_TS_LIMITS.inputBytes) return "Use at most 2 MiB of UTF-8 input. Nothing was truncated.";
  } catch {
    return "Unable to check the input size safely.";
  }
  return null;
}

export async function readTypeScriptJsonFile(
  file: Pick<File, "name" | "size" | "arrayBuffer">,
  selectedFormat: JsonTsFormat = "json",
): Promise<{ text: string; format: JsonTsFormat }> {
  try {
    if (selectedFormat !== "json" && selectedFormat !== "jsonl") throw new InputProblem("Choose JSON or JSON Lines as the input format.");
    if (typeof file.name !== "string" || !/\.(json|jsonl|ndjson|txt)$/i.test(file.name)) {
      throw new InputProblem("Choose a UTF-8 JSON, JSONL, NDJSON or TXT file.");
    }
    if (!Number.isSafeInteger(file.size) || file.size < 0) throw new InputProblem("The file has an invalid size.");
    if (file.size > JSON_TS_LIMITS.inputBytes) throw new InputProblem("This file exceeds the 2 MiB limit. The previous input was kept.");
    const format = /\.(jsonl|ndjson)$/i.test(file.name) ? "jsonl" : /\.txt$/i.test(file.name) ? selectedFormat : "json";
    const buffer = await file.arrayBuffer();
    // Recheck actual bytes before decoding, even if the file metadata was stale.
    if (buffer.byteLength > JSON_TS_LIMITS.inputBytes) throw new InputProblem("This file exceeds the 2 MiB limit. The previous input was kept.");
    const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(buffer);
    const problem = inputSizeProblem(text);
    if (problem) throw new InputProblem(problem);
    if (!text.trim()) throw new InputProblem("The selected file is empty. The previous input was kept.");
    // Parsing is deliberately separate: inspect the candidate before replacing UI input.
    return { text, format };
  } catch (error: unknown) {
    throw new Error(error instanceof InputProblem ? error.message : FILE_ERROR);
  }
}

export function typeScriptDownloadDetails(
  result: JsonTsResult,
  extension: "ts" | "d.ts",
): { fileName: string; mime: string; contents: string } {
  try {
    if ((extension !== "ts" && extension !== "d.ts") || rootNameProblem(result.options.rootName)
      || typeof result.code !== "string" || !result.code.length || result.code.length > JSON_TS_LIMITS.outputChars) {
      throw new Error("Invalid result");
    }
    const name = result.options.rootName;
    const base = /^(?:con|prn|aux|nul|com[0-9]*|lpt[0-9]*)$/i.test(name) ? `${name}-types` : name;
    return { fileName: `${base}.${extension}`, mime: "text/plain;charset=utf-8", contents: result.code };
  } catch {
    throw new Error("Generate a valid TypeScript result and choose a supported download extension.");
  }
}

export function formatBytes(bytes: number): string {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Number((bytes / 1024).toFixed(1))} KiB`;
  return `${Number((bytes / (1024 * 1024)).toFixed(2))} MiB`;
}