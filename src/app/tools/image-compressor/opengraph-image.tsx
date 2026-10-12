import { ImageResponse } from "next/og";
import { imageStudioBrand } from "@/lib/image-studio/brand";

export const alt = `${imageStudioBrand.name} by ${imageStudioBrand.publisher}: free browser-based image compression with measured size ceilings, resizing and JPG, PNG, WebP and AVIF output.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Self-contained artwork and the bundled ImageResponse font; no external assets. */
export default function Image() {
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "42px 56px", background: "linear-gradient(115deg, #0b1426, #102449 72%, #231b45)", color: "#f4f7ff", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <svg width="42" height="42" viewBox="0 0 36 36" fill="none">
            <rect x="1" y="1" width="34" height="34" rx="11" fill="#2563eb" />
            <path d="M11 9H9v7m16-7h2v7M9 23v4h7m11-4v4h-7" stroke="#dbeafe" strokeWidth="2" strokeLinecap="round" />
            <path d="m12 22 5-6 4 4 3-3v7H12v-2Z" fill="#fff" />
            <circle cx="23" cy="13" r="2" fill="#c4b5fd" />
          </svg>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 700 }}>{imageStudioBrand.name}</div>
          <div style={{ display: "flex", fontSize: 18, color: "#b5c6df" }}>by {imageStudioBrand.publisher}</div>
        </div>
        <div style={{ display: "flex", padding: "9px 16px", border: "1px solid #405a7d", borderRadius: 30, fontSize: 17, color: "#dbe9ff" }}>Free. No signup. No uploads.</div>
      </div>

      <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 36 }}>
        <div style={{ display: "flex", flexDirection: "column", width: 626 }}>
          <div style={{ display: "flex", marginBottom: 16, fontSize: 15, color: "#a6c9ff", letterSpacing: 3 }}>YOUR BROWSER. YOUR IMAGES.</div>
          <div style={{ display: "flex", fontSize: 63, fontWeight: 700, letterSpacing: -3, lineHeight: 1.05 }}>Compress images</div>
          <div style={{ display: "flex", marginTop: 7, fontSize: 63, fontWeight: 700, letterSpacing: -3, lineHeight: 1.05, color: "#a4c5ff" }}>to your target size.</div>
          <div style={{ display: "flex", marginTop: 24, maxWidth: 550, fontSize: 24, lineHeight: 1.5, color: "#c0cfe5" }}>Set a byte ceiling. Resize and convert. Compare the actual result.</div>
          <div style={{ display: "flex", gap: 10, marginTop: 26 }}>
            {["JPG", "PNG", "WebP", "AVIF"].map(format => <div key={format} style={{ display: "flex", padding: "8px 15px", border: "1px solid #405a7d", borderRadius: 9, fontSize: 18, color: "#e1ebfc" }}>{format}</div>)}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", width: 388, border: "1px solid #405a7d", borderRadius: 20, overflow: "hidden", backgroundColor: "#111f37" }}>
          <div style={{ display: "flex", padding: "15px 20px", fontSize: 15, color: "#b8cceb" }}>An illustrated workflow, not a result</div>
          <svg width="388" height="196" viewBox="0 0 388 196" fill="none">
            <rect width="388" height="196" fill="#254978" />
            <circle cx="302" cy="48" r="23" fill="#dcecff" />
            <path d="M0 135 90 33l76 81 70-58 152 113v27H0Z" fill="#557cab" />
            <path d="m50 79 40-46 44 47-31-12-14 8-14-7Z" fill="#d3e4f7" />
            <path d="M0 164 78 109l67 44 83-48 84 55 76-47v83H0Z" fill="#183451" />
            <path d="M0 169c65-19 117 8 181 0s132-1 207 14v13H0Z" fill="#51a1b6" />
            <path d="M93 182h72m70 5h88" stroke="#afd7e4" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "20px 22px" }}>
            <div style={{ display: "flex", fontSize: 22, color: "#edf4ff", fontWeight: 700 }}>A ceiling, not padded bytes.</div>
            <div style={{ display: "flex", fontSize: 18, lineHeight: 1.5, color: "#bccde5" }}>Success means the measured output is at or below your limit.</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 18, borderTop: "1px solid #344b6b", fontSize: 17, color: "#b8c9e3" }}>
        <span>Batch processing · Local codecs · Metadata removal</span>
        <span>{new URL(imageStudioBrand.siteUrl).host}</span>
      </div>
    </div>,
    { ...size },
  );
}