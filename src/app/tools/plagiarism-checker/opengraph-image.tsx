import { ImageResponse } from "next/og";

export const alt = "ByteVerse Text Similarity Checker: a fictional draft and supplied source with a shared phrase highlighted, not a plagiarism verdict.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "42px 54px", backgroundColor: "#faf9f6", color: "#173f38", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 23, fontWeight: 700 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 10, backgroundColor: "#173f38", color: "#ecfdf5", fontSize: 22 }}>B</div>
            ByteVerse
          </div>
          <div style={{ display: "flex", borderRadius: 30, padding: "10px 18px", backgroundColor: "#e0f0e7", fontSize: 17 }}>Free · No account · On-device matching</div>
        </div>

        <div style={{ display: "flex", marginTop: 30, fontSize: 62, fontWeight: 700, letterSpacing: -2, lineHeight: 1.1 }}>Text similarity checker</div>
        <div style={{ display: "flex", marginTop: 12, fontSize: 30, color: "#42635b" }}>Compare your writing with sources.</div>

        <div style={{ display: "flex", gap: 22, marginTop: 32 }}>
          {[
            { label: "YOUR DRAFT", opening: "Each weekday," },
            { label: "SUPPLIED SOURCE", opening: "For early visitors," },
          ].map((document) => (
            <div key={document.label} style={{ display: "flex", flexDirection: "column", width: 535, padding: "22px 24px", border: "1px solid #d5e2da", borderRadius: 18, backgroundColor: "#ffffff" }}>
              <div style={{ display: "flex", fontSize: 14, fontWeight: 700, letterSpacing: 2, color: "#527268" }}>{document.label}</div>
              <div style={{ display: "flex", marginTop: 17, fontSize: 23 }}>{document.opening}</div>
              <div style={{ display: "flex", marginTop: 8, padding: "10px 12px", borderRadius: 8, backgroundColor: "#e0f0e7", fontSize: 25, lineHeight: 1.35 }}>the reading room opens before sunrise</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", marginTop: 14, fontSize: 15, color: "#527268" }}>Fictional phrase illustration · shared wording, not a plagiarism verdict</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 18, borderTop: "1px solid #d5e2da", fontSize: 18 }}>
          <span>One draft + up to five supplied sources</span>
          <span style={{ color: "#527268" }}>No internet-wide scan</span>
        </div>
      </div>
    ),
    { ...size },
  );
}