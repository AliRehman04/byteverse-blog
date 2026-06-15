"use client";

import { useEffect } from "react";

const VIEW_TRACKING_TTL = 12 * 60 * 60 * 1000;

export function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const storageKey = `byteverse:viewed:${slug}`;
    const lastTracked = Number(window.localStorage.getItem(storageKey) || 0);

    if (Date.now() - lastTracked < VIEW_TRACKING_TTL) return;

    window.localStorage.setItem(storageKey, String(Date.now()));
    fetch(`/api/views/${slug}`, { method: "POST", keepalive: true }).catch(() => {
      window.localStorage.removeItem(storageKey);
    });
  }, [slug]);

  return null;
}
