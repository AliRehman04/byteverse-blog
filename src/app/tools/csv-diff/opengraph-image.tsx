import { ImageResponse } from "next/og";

export const alt = "ByteVerse CSV Diff Checker: compare two exports by key and review changed, added and removed records.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-static";

export default function Image() {
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", padding: "48px 56px", width: "100%", height: "100%", background: "#f8fafc", color: "#0f172a", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 25, fontWeight: 700 }}><span style={{ background: "#3730a3", color: "white", borderRadius: 10, padding: "8px 13px" }}>B</span>ByteVerse</div>
        <div style={{ display: "flex", background: "#eef2ff", borderRadius: 40, padding: "12px 20px", fontSize: 18, color: "#3730a3" }}>Free · No uploads · No sign-up</div>
      </div>
      <div style={{ display: "flex", gap: 50, marginTop: 58, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", width: 570 }}>
          <div style={{ fontSize: 21, color: "#3730a3" }}>CSV DIFF CHECKER</div>
          <div style={{ display: "flex", marginTop: 18, fontSize: 66, lineHeight: 1.04, letterSpacing: -3, fontWeight: 700 }}>Two exports.<br />Clearer changes.</div>
          <div style={{ display: "flex", marginTop: 22, fontSize: 24, lineHeight: 1.4, color: "#596573" }}>Match by ID or composite key.<br />Review the difference. Export the report.</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "white", padding: "25px 28px", borderRadius: 20, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 16, color: "#596573", marginBottom: 22 }}>ILLUSTRATIVE INVENTORY REVIEW</div>
          {[
            { key: "001", value: "12 → 12", result: "Unchanged", color: "#596573" },
            { key: "002", value: "30 → —", result: "Removed", color: "#a82945" },
            { key: "003", value: "8 → 7", result: "Changed", color: "#865206" },
            { key: "004", value: "— → 4", result: "Added", color: "#116149" },
          ].map(row => <div key={row.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderTop: "1px solid #e2e8f0", fontSize: 20 }}><span>{row.key}</span><span>{row.value}</span><span style={{ color: row.color, fontSize: 16 }}>{row.result}</span></div>)}
        </div>
      </div>
      <div style={{ display: "flex", marginTop: "auto", paddingTop: 26, color: "#596573", fontSize: 19 }}>byteverse.fyi/tools/csv-diff</div>
    </div>,
    { ...size, headers: { "Cache-Control": "public, max-age=86400, s-maxage=31536000" } },
  );
}