// Sends homepage interaction events to the Google Analytics tag when it is loaded. No personal data is included.
export function trackHomepageEvent(action: string, detail: Record<string, string | number> = {}) {
  if (typeof window === "undefined") return;
  const gtag = (window as typeof window & { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag === "function") gtag("event", `home_${action}`, detail);
}
