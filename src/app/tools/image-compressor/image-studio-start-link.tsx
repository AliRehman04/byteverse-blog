"use client";

import type { ReactNode } from "react";

export function ImageStudioStartLink({ children, className }: { children: ReactNode; className?: string }) {
  return <a href="#image-tool" className={className} onClick={event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const workspace = document.getElementById("image-tool");
    if (!workspace) return;
    event.preventDefault();
    document.getElementById("image-dropzone")?.focus({ preventScroll: true });
    if (location.hash !== "#image-tool") history.replaceState(history.state, "", "#image-tool");
    workspace.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }}>{children}</a>;
}