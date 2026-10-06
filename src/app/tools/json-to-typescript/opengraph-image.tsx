import { ImageResponse } from "next/og";

export const alt = "ByteVerse JSON to TypeScript: fictional account samples produce a mixed ID type and an optional nullable email field.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", backgroundColor: "#f4f7fc", color: "#172840", padding: "38px 54px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 21 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontWeight: 700 }}><div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, backgroundColor: "#1d4ed8", borderRadius: 9, color: "white" }}>B</div>ByteVerse</div>
          <div style={{ display: "flex", color: "#53647b", fontSize: 17 }}>Free · Local generation · No account</div>
        </div>
        <div style={{ display: "flex", marginTop: 25, fontSize: 60, fontWeight: 700, letterSpacing: -2 }}>JSON to TypeScript</div>
        <div style={{ display: "flex", color: "#1d4ed8", fontSize: 30, marginTop: 4 }}>Types you can inspect.</div>
        <div style={{ display: "flex", gap: 28, alignItems: "stretch", marginTop: 26 }}>
          <div style={{ display: "flex", flexDirection: "column", width: 430, padding: "20px 22px", border: "1px solid #d9e2ef", borderRadius: 16, backgroundColor: "#ffffff" }}>
            <div style={{ display: "flex", color: "#53647b", fontSize: 14, letterSpacing: 2, marginBottom: 18 }}>3 FICTIONAL ACCOUNT SAMPLES</div>
            <div style={{ display: "flex", fontSize: 23, fontWeight: 700 }}>Mixed IDs, missing email.</div>
            <div style={{ display: "flex", fontSize: 19, marginTop: 18 }}>id: 101, &quot;demo-102&quot;, 103</div>
            <div style={{ display: "flex", fontSize: 18, marginTop: 12 }}>email: string, missing, null</div>
            <div style={{ display: "flex", color: "#1d4ed8", fontSize: 17, marginTop: 22 }}>Email is present in 2 of 3 objects.</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "20px 24px", border: "1px solid #314461", borderRadius: 16, backgroundColor: "#0f1b2e", color: "#e0eaff" }}>
            <div style={{ display: "flex", color: "#a8bbd5", fontSize: 14, letterSpacing: 2, marginBottom: 14 }}>INFER ARRAY ITEM · INTERFACE</div>
            {[
              "export interface Account {", "  id: number | string;", "  name: string;", "  email?: string | null;", "}",
            ].map((line, index) => <div key={index} style={{ display: "flex", whiteSpace: "pre", fontSize: 23, lineHeight: 1.6 }}>{line}</div>)}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "auto", paddingTop: 18, borderTop: "1px solid #d9e2ef", fontSize: 17, color: "#53647b" }}><span>Sample-based inference, not runtime validation</span><span>byteverse.fyi</span></div>
      </div>
    ),
    { ...size },
  );
}