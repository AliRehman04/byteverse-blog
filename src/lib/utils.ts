import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trimEnd() + "...";
}

// Tiny SVG shimmer placeholder for next/image blur
export const shimmerBlur = `data:image/svg+xml;base64,${Buffer.from(
  '<svg width="400" height="250" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="250" fill="#1e293b"/><rect width="400" height="250" fill="url(#g)"><animate attributeName="opacity" values="0.4;0.8;0.4" dur="1.5s" repeatCount="indefinite"/></rect><defs><linearGradient id="g"><stop offset="0%" stop-color="#334155"/><stop offset="50%" stop-color="#475569"/><stop offset="100%" stop-color="#334155"/></linearGradient></defs></svg>'
).toString("base64")}`;
