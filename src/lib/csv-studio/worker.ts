import { StudioSession, type ImportPayload } from "./engine";
import { StudioError, type CellRange, type EncodingId, type ExportOptions, type RepairOp, type StudioMessage } from "./types";

// One worker owns one document. Replacing a file creates a new worker, so
// cancelling an import can terminate it without touching the open document.
interface Envelope { id: number; type: string; payload?: unknown }
interface StudioWorkerScope {
  onmessage: ((event: { data: Envelope }) => Promise<void>) | null;
  postMessage(message: StudioMessage, transfer: Transferable[]): void;
}
const scope = globalThis as unknown as StudioWorkerScope;
let session: StudioSession | null = null;

function post(message: StudioMessage, transfer: Transferable[] = []): void {
  scope.postMessage(message, transfer);
}

function requireSession(): StudioSession {
  if (!session) throw new StudioError("NO_DOCUMENT", "Import a file first.");
  return session;
}

scope.onmessage = async (event: { data: Envelope }) => {
  const { id, type, payload } = event.data ?? ({} as Envelope);
  if (typeof id !== "number" || typeof type !== "string") return;
  if (type === "cancel") { session?.cancel(); return; }
  try {
    let result: unknown;
    switch (type) {
      case "import":
        session = StudioSession.open(payload as ImportPayload, (phase, done, total) => post({ id, progress: { phase, done, total } }));
        result = session.snapshot();
        break;
      case "snapshot": result = requireSession().snapshot(); break;
      case "window": { const { start, count } = payload as { start: number; count: number }; result = requireSession().window(start, count); break; }
      case "cell": { const { row, column } = payload as { row: number; column: number }; result = requireSession().cell(row, column); break; }
      case "locate": { const { issueId, after } = payload as { issueId: string; after: number }; result = requireSession().locate(issueId, after); break; }
      case "preview": result = requireSession().preview((payload as { op: RepairOp }).op); break;
      case "apply": result = requireSession().apply((payload as { op: RepairOp }).op); break;
      case "undo": result = requireSession().undo(); break;
      case "redo": result = requireSession().redo(); break;
      case "reset": result = requireSession().reset(); break;
      case "dismiss": { const { issueId, dismissed } = payload as { issueId: string; dismissed: boolean }; result = requireSession().dismiss(issueId, dismissed); break; }
      case "profile": result = requireSession().profile((payload as { column: number }).column); break;
      case "stats": result = requireSession().stats((payload as { range: CellRange }).range); break;
      case "copy": result = requireSession().copy((payload as { range: CellRange }).range); break;
      case "lab": result = requireSession().lab((payload as { encodings: EncodingId[] }).encodings); break;
      case "export": {
        const output = await requireSession().export((payload as { options: ExportOptions }).options, (done, total) => post({ id, progress: { phase: "Exporting", done, total } }));
        const buffer = output.bytes.buffer.slice(output.bytes.byteOffset, output.bytes.byteOffset + output.bytes.byteLength) as ArrayBuffer;
        post({ id, ok: true, result: { ...output.result, buffer } }, [buffer]);
        return;
      }
      default:
        throw new StudioError("UNKNOWN_REQUEST", "Unknown request.");
    }
    post({ id, ok: true, result });
  } catch (error) {
    // Never echo cell values or stack traces; messages are authored, user-facing text.
    if (error instanceof StudioError) post({ id, ok: false, code: error.code, message: error.message });
    else post({ id, ok: false, code: "INTERNAL", message: "Something went wrong while processing this file in your browser. Your original file is unchanged; try again or reload the page." });
  }
};
