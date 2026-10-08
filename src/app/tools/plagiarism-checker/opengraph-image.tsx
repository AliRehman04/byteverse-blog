import { ImageResponse } from "next/og";

export const alt = "ByteVerse Text Similarity Checker: a fictional draft and supplied source with matching wording highlighted in context. Local comparison, not a plagiarism verdict.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "38px 48px", backgroundColor: "#09090b", color: "#f8fafc", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 23, fontWeight: 700 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 11, backgroundColor: "#2563eb", color: "#ffffff", fontSize: 22 }}>B</div>
            ByteVerse
          </div>
          <div style={{ display: "flex", border: "1px solid #3b82f6", borderRadius: 30, padding: "10px 18px", backgroundColor: "#172554", color: "#dbeafe", fontSize: 17 }}>Free · No account · On-device matching</div>
        </div>

        <div style={{ display: "flex", marginTop: 28, fontSize: 62, fontWeight: 700, letterSpacing: -2, lineHeight: 1.1 }}>Text similarity checker</div>
        <div style={{ display: "flex", marginTop: 12, fontSize: 31, color: "#a1a1aa" }}>See the match. Understand the context.</div>

        <div style={{ display: "flex", gap: 24, marginTop: 28 }}>
          {[
            { label: "YOUR DRAFT", opening: "Each weekday,", highlight: "#dbeafe", ink: "#0f172a", accent: "#60a5fa" },
            { label: "SUPPLIED SOURCE", opening: "For early visitors,", highlight: "#ede9fe", ink: "#0f172a", accent: "#c4b5fd" },
          ].map((document) => (
            <div key={document.label} style={{ display: "flex", flexDirection: "column", width: 540, padding: "24px", border: "1px solid #27272a", borderRadius: 18, backgroundColor: "#111113" }}>
              <div style={{ display: "flex", fontSize: 14, fontWeight: 700, letterSpacing: 2, color: document.accent }}>{document.label}</div>
              <div style={{ display: "flex", marginTop: 20, fontSize: 23, color: "#f8fafc" }}>{document.opening}</div>
              <div style={{ display: "flex", marginTop: 10, padding: "10px 12px", borderRadius: 8, backgroundColor: document.highlight, color: document.ink, fontSize: 24, lineHeight: 1.35 }}>the reading room opens before sunrise</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", marginTop: 15, fontSize: 15, color: "#a1a1aa" }}>Fictional phrase illustration · shared wording, not a plagiarism verdict</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 18, borderTop: "1px solid #27272a", fontSize: 18 }}>
          <span>One draft + up to five supplied sources</span>
          <span style={{ color: "#60a5fa" }}>No internet-wide scan</span>
        </div>
      </div>
    ),
    { ...size },
  );
}