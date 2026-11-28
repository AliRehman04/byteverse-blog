"use client";

import { useEffect } from "react";
import { trackHomepageEvent } from "@/lib/homepage-events";

// One delegated listener reports clicks on marked homepage links (tools, categories, guides and calls to action).
export function HomepageAnalytics() {
  useEffect(() => {
    const root = document.querySelector("[data-homepage]");
    if (!root) return;
    function report(event: Event) {
      const target = (event.target as Element | null)?.closest?.("[data-home-event]");
      if (!(target instanceof HTMLElement) || !root!.contains(target)) return;
      trackHomepageEvent(target.dataset.homeEvent ?? "click", { item: target.dataset.homeLabel ?? "" });
    }
    root.addEventListener("click", report);
    return () => root.removeEventListener("click", report);
  }, []);
  return null;
}
