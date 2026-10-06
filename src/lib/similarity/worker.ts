import { analyzeRequest, SimilarityInputError } from "./engine";
import type { CheckRequest, CheckResponse } from "./types";

// A narrow local scope avoids combining lib.dom and lib.webworker declarations.
interface SimilarityWorkerScope {
  onmessage: ((event: { data: unknown }) => void) | null;
  postMessage(message: CheckResponse): void;
}

const scope = globalThis as unknown as SimilarityWorkerScope;

scope.onmessage = ({ data }) => {
  // Malformed envelopes cannot carry a usable correlation ID. Valid IDs are
  // always echoed unchanged, including on validation failures.
  let id = -1;
  try {
    if (typeof data === "object" && data !== null && "id" in data
      && typeof data.id === "number" && Number.isSafeInteger(data.id) && data.id >= 0) {
      id = data.id;
    }
    const result = analyzeRequest(data as CheckRequest);
    scope.postMessage({ id, result });
  } catch (error: unknown) {
    scope.postMessage({
      id,
      error: error instanceof SimilarityInputError
        ? error.message
        : "Unable to analyze this text. Check the inputs and try again.",
    });
  }
};