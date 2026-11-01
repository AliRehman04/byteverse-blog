const STORAGE_KEY = "byteverse:plagiarism-remover-handoff";
const MAX_AGE_MS = 10 * 60 * 1000;
const MAX_CHARS = 20000;

export function saveRemoverHandoff(text: string, now = Date.now()): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ text: text.slice(0, MAX_CHARS), savedAt: now }));
  } catch {
    // Blocked storage leaves the rewriter empty.
  }
}

export function takeRemoverHandoff(now = Date.now()): string | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    window.sessionStorage.removeItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { text?: unknown; savedAt?: unknown };
    if (typeof parsed.text !== "string" || typeof parsed.savedAt !== "number") return null;
    return now - parsed.savedAt <= MAX_AGE_MS ? parsed.text : null;
  } catch {
    return null;
  }
}
