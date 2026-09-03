"use client";

import { useEffect } from "react";

const VIEW_TRACKING_TTL = 12 * 60 * 60 * 1000;
const ENGAGEMENT_DELAY_MS = 10_000;
const SAMPLE_RATE = 3; // 1-in-3 clients report, weighted ×3 server-side

export function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const storageKey = `byteverse:viewed:${slug}`;
    const lastTracked = Number(window.localStorage.getItem(storageKey) || 0);

    if (Date.now() - lastTracked < VIEW_TRACKING_TTL) return;

    // Only count engaged views: visible tab, 10s on page. Kills bounces,
    // prefetches, and most bots — each skipped ping saves a DB wake.
    const timer = window.setTimeout(() => {
      if (document.visibilityState !== "visible") return;

      window.localStorage.setItem(storageKey, String(Date.now()));

      if (Math.random() * SAMPLE_RATE >= 1) return; // sampled out, still marked as viewed

      fetch(`/api/views/${slug}`, {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ w: SAMPLE_RATE }),
      }).catch(() => {
        window.localStorage.removeItem(storageKey);
      });
    }, ENGAGEMENT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [slug]);

  return null;
}
