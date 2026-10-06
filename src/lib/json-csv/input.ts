import { JSON_CSV_LIMITS, type CsvConversion, type JsonInputFormat } from "./types";

export function inputSizeProblem(text: string): string | null {
  if (text.length > JSON_CSV_LIMITS.inputChars) return "Use at most 1,000,000 characters. The previous input was kept; nothing was truncated.";
  if (new TextEncoder().encode(text).length > JSON_CSV_LIMITS.inputBytes) return "Use at most 2 MiB of UTF-8 input. The previous input was kept; nothing was truncated.";
  return null;
}

export async function readJsonFile(file: Pick<File, "name" | "size" | "arrayBuffer">, selectedFormat: JsonInputFormat = "json"): Promise<{ text: string; format: JsonInputFormat }> {
  if (!/\.(json|jsonl|ndjson|txt)$/i.test(file.name)) throw new Error("Choose a UTF-8 JSON, JSONL, NDJSON or TXT file. URLs and spreadsheet files cannot be imported.");
  if (file.size > JSON_CSV_LIMITS.inputBytes) throw new Error("This file exceeds the 2 MiB limit. The previous input was kept.");
  const format = /\.(jsonl|ndjson)$/i.test(file.name) ? "jsonl" : /\.txt$/i.test(file.name) ? selectedFormat : "json";
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(await file.arrayBuffer());
  } catch {
    throw new Error("The file could not be read as UTF-8. Export a UTF-8 text copy and try again.");
  }
  const problem = inputSizeProblem(text);
  if (problem) throw new Error(problem);
  if (!text.trim()) throw new Error("The selected file is empty. The previous input was kept.");
  return { text, format };
}

export function csvDownloadDetails(result: CsvConversion, name: string): { fileName: string; mime: string; contents: string } {
  const tsv = result.options.delimiter === "\t";
  let base = name.trim().replace(/[. ]+$/g, "").replace(/\.(csv|tsv)$/i, "").replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, "_").slice(0, 80);
  if (/[\uD800-\uDBFF]$/.test(base)) base = base.slice(0, -1);
  base = base.replace(/[. ]+$/g, "");
  if (!base || /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(base)) base = "converted-data";
  return {
    fileName: `${base}.${tsv ? "tsv" : "csv"}`,
    mime: `${tsv ? "text/tab-separated-values" : "text/csv"};charset=utf-8`,
    contents: `${result.options.bom ? "\ufeff" : ""}${result.csv}`,
  };
}

export function shortText(text: string, max: number): string {
  if (text.length <= max) return text;
  let end = max;
  if (end > 0 && /[\uD800-\uDBFF]/.test(text[end - 1])) end--;
  return `${text.slice(0, end)}…`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Number((bytes / 1024).toFixed(1))} KiB`;
  return `${Number((bytes / (1024 * 1024)).toFixed(2))} MiB`;
}