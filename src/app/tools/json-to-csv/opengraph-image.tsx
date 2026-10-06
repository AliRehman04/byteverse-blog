import { ImageResponse } from "next/og";

export const alt = "ByteVerse JSON to CSV Converter: fictional Maya and Leo records with nested city fields converted to matching CSV rows.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "40px 54px", backgroundColor: "#faf9f6", color: "#203e6c", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 23, fontWeight: 700 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 10, backgroundColor: "#203e6c", color: "#ffffff", fontSize: 22 }}>B</div>
            ByteVerse
          </div>
          <div style={{ display: "flex", borderRadius: 30, padding: "10px 18px", backgroundColor: "#e9eefb", fontSize: 17 }}>Free · No account · Browser-based</div>
        </div>

        <div style={{ display: "flex", marginTop: 28, fontSize: 60, fontWeight: 700, letterSpacing: -2, lineHeight: 1.1 }}>JSON to CSV converter</div>
        <div style={{ display: "flex", marginTop: 12, fontSize: 28, color: "#516585" }}>Turn nested data into a usable spreadsheet.</div>

        <div style={{ display: "flex", alignItems: "stretch", gap: 18, marginTop: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", width: 555, padding: "20px 22px", border: "1px solid #d9e0ee", borderRadius: 18, backgroundColor: "#ffffff" }}>
            <div style={{ display: "flex", marginBottom: 12, fontSize: 14, fontWeight: 700, letterSpacing: 2, color: "#3b63c6" }}>NESTED JSON</div>
            {[
              "[",
              '  {"name":"Maya",',
              '   "location":{"city":"Bristol"}},',
              '  {"name":"Leo",',
              '   "location":{"city":"Oslo"}}',
              "]",
            ].map((line, index) => (
              <div key={index} style={{ display: "flex", fontSize: 19, lineHeight: 1.4, whiteSpace: "pre" }}>{line}</div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 42, color: "#3b63c6", fontSize: 34 }}>→</div>

          <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "20px 22px", border: "1px solid #d9e0ee", borderRadius: 18, backgroundColor: "#edf2fd" }}>
            <div style={{ display: "flex", fontSize: 14, fontWeight: 700, letterSpacing: 2, color: "#3b63c6" }}>CSV</div>
            <div style={{ display: "flex", marginTop: 24, paddingBottom: 14, borderBottom: "1px solid #cdd8ee", fontSize: 23, fontWeight: 700 }}>name,location.city</div>
            <div style={{ display: "flex", marginTop: 16, fontSize: 23 }}>Maya,Bristol</div>
            <div style={{ display: "flex", marginTop: 12, fontSize: 23 }}>Leo,Oslo</div>
          </div>
        </div>

        <div style={{ display: "flex", marginTop: 12, fontSize: 15, color: "#516585" }}>Fictional records · nested city fields become matching CSV columns</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 16, borderTop: "1px solid #d9e0ee", fontSize: 18 }}>
          <span>JSON + JSON Lines · Choose columns · Preview rows</span>
          <span style={{ color: "#516585" }}>byteverse.fyi</span>
        </div>
      </div>
    ),
    { ...size },
  );
}