import { ImageResponse } from "next/og";

export const alt = "ByteVerse CSV Studio: fix your CSV and keep your data intact. ZIP codes and long IDs stay exact in the Excel export.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-static";

const rows = [
  { file: "02115", csv: "2115", xlsx: "02115" },
  { file: "07030", csv: "7030", xlsx: "07030" },
  { file: "4000123456781234", csv: "4.00012E+15", xlsx: "4000123456781234" },
];

export default function Image() {
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", padding: "48px 56px", width: "100%", height: "100%", background: "#f8fafc", color: "#0f172a", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 25, fontWeight: 700 }}><span style={{ background: "#2563eb", color: "white", borderRadius: 10, padding: "8px 13px" }}>B</span>ByteVerse</div>
        <div style={{ display: "flex", background: "#eaf1fe", borderRadius: 40, padding: "12px 20px", fontSize: 18, color: "#1d4ed8" }}>Free · Processed in your browser</div>
      </div>
      <div style={{ display: "flex", gap: 44, marginTop: 56, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", width: 500 }}>
          <div style={{ fontSize: 20, color: "#1d4ed8", letterSpacing: 2 }}>CSV REPAIR · EXCEL EXPORT</div>
          <div style={{ display: "flex", marginTop: 18, fontSize: 60, lineHeight: 1.06, letterSpacing: -2.5, fontWeight: 700 }}>Fix your CSV.<br />Keep your data intact.</div>
          <div style={{ display: "flex", marginTop: 22, fontSize: 23, lineHeight: 1.4, color: "#596573" }}>Repair, validate and export Excel-ready XLSX.<br />Leading zeros and long IDs stay exact.</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "white", padding: "24px 26px", borderRadius: 20, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 15, color: "#596573", marginBottom: 14 }}>ILLUSTRATIVE ID COLUMN</div>
          <div style={{ display: "flex", fontSize: 14, color: "#596573", paddingBottom: 10 }}>
            <span style={{ width: 185 }}>In the file</span><span style={{ width: 125 }}>CSV in Excel</span><span>XLSX export</span>
          </div>
          {rows.map((row) => (
            <div key={row.file} style={{ display: "flex", alignItems: "center", padding: "15px 0", borderTop: "1px solid #e2e8f0", fontSize: 17 }}>
              <span style={{ width: 185 }}>{row.file}</span>
              <span style={{ width: 125, color: "#b91c1c" }}>{row.csv}</span>
              <span style={{ color: "#047857" }}>{row.xlsx}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", marginTop: "auto", paddingTop: 26, color: "#596573", fontSize: 19 }}>byteverse.fyi/tools/csv-repair</div>
    </div>,
    { ...size, headers: { "Cache-Control": "public, max-age=86400, s-maxage=31536000" } },
  );
}
