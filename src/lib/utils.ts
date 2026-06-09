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

/**
 * Returns accessible badge colors for a given hex background.
 * Ensures white text passes WCAG AA 4.5:1 contrast.
 * If not, darkens the background proportionally.
 */
export function getAccessibleBadgeStyle(hexColor: string): { backgroundColor: string; color: string } {
  const hex = hexColor.replace("#", "");
  if (hex.length < 6) return { backgroundColor: hexColor, color: "#ffffff" };
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };

  const lum = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  const contrastWhite = 1.05 / (lum + 0.05);

  if (contrastWhite >= 4.5) {
    return { backgroundColor: hexColor, color: "#ffffff" };
  }

  // Darken by stepping down until contrast passes
  for (let k = 0.95; k >= 0.3; k -= 0.05) {
    const dr = Math.round(r * k);
    const dg = Math.round(g * k);
    const db = Math.round(b * k);
    const dLum = 0.2126 * toLinear(dr) + 0.7152 * toLinear(dg) + 0.0722 * toLinear(db);
    if (1.05 / (dLum + 0.05) >= 4.5) {
      return {
        backgroundColor: `#${dr.toString(16).padStart(2, "0")}${dg.toString(16).padStart(2, "0")}${db.toString(16).padStart(2, "0")}`,
        color: "#ffffff",
      };
    }
  }

  return { backgroundColor: "#1e293b", color: "#ffffff" };
}
