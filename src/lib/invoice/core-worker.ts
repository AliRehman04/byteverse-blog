import { extractInvoice, groupTextTokens } from "./parser";
import type { ExtractionOptions, SourceLine, TextToken } from "./types";

type Task = { operation: "group"; tokens: TextToken[] } | { operation: "extract"; lines: SourceLine[]; options: ExtractionOptions };

self.onmessage = (event: MessageEvent<Task>) => {
  try {
    const task = event.data;
    const result = task.operation === "group" ? groupTextTokens(task.tokens) : extractInvoice(task.lines, task.options);
    self.postMessage({ ok: true, result });
  } catch {
    self.postMessage({ ok: false });
  }
};