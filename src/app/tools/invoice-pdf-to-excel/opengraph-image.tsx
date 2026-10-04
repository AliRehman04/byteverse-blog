import { ImageResponse } from "next/og";

export const alt = "Invoice PDF to Excel by ByteVerse: three fictional USD and EUR invoices, one flagged total, and a reviewed spreadsheet workflow.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "44px 56px", background: "linear-gradient(125deg, #0f172a 0%, #122738 65%, #134e4a 100%)", color: "#f8fafc", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 23, fontWeight: 700 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 10, backgroundColor: "#5eead4", color: "#0f172a", fontSize: 22 }}>B</div>
            ByteVerse
          </div>
          <div style={{ display: "flex", fontSize: 15, letterSpacing: 3, color: "#99f6e4" }}>DOCUMENTS → DECISIONS</div>
        </div>

        <div style={{ display: "flex", marginTop: 28, fontSize: 64, fontWeight: 700, lineHeight: 1.1, letterSpacing: -2 }}>Invoice PDF to Excel</div>
        <div style={{ display: "flex", marginTop: 14, fontSize: 31, color: "#99f6e4" }}>PDF invoices → one reviewed spreadsheet</div>

        <div style={{ display: "flex", gap: 20, marginTop: 32 }}>
          {[
            { id: "DEMO-001", supplier: "Northstar Design Studio", amount: "USD 440.00", note: "400.00 + 40.00 = 440.00", flagged: false },
            { id: "DEMO-002", supplier: "Harbor Office Supplies", amount: "EUR 150.60", note: "125.50 + 25.10 = 150.60", flagged: false },
            { id: "DEMO-003", supplier: "Northstar Design Studio", amount: "USD 250.00", note: "200.00 + 20.00 = 220.00", flagged: true },
          ].map((invoice) => (
            <div key={invoice.id} style={{ display: "flex", flexDirection: "column", width: 349, borderRadius: 18, padding: 22, backgroundColor: "#f8fafc", color: "#0f172a" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14, color: "#64748b" }}>
                <span>{invoice.id}</span>
                <span style={{ color: invoice.flagged ? "#92400e" : "#0f766e", fontWeight: 700 }}>{invoice.flagged ? "CHECK TOTAL" : "SAMPLE PDF"}</span>
              </div>
              <div style={{ display: "flex", marginTop: 18, fontSize: 18 }}>{invoice.supplier}</div>
              <div style={{ display: "flex", marginTop: 14, fontSize: 32, fontWeight: 700 }}>{invoice.amount}</div>
              <div style={{ display: "flex", marginTop: 18, padding: "9px 10px", borderRadius: 8, fontSize: 15, color: invoice.flagged ? "#92400e" : "#115e59", backgroundColor: invoice.flagged ? "#fef3c7" : "#e6f4ef" }}>{invoice.note}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", marginTop: 16, fontSize: 14, color: "#cbd5e1" }}>Fictional examples · currencies kept separate · review required</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 16, borderTop: "1px solid #365462", fontSize: 18 }}>
          <span style={{ color: "#99f6e4" }}>On-device processing · Real XLSX + CSV · No OCR</span>
          <span>Free. No signup.</span>
        </div>
      </div>
    ),
    { ...size },
  );
}