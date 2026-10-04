export interface SampleInvoice { name: string; lines: string[] }

export const SAMPLE_INVOICES: readonly SampleInvoice[] = [
  { name: "sample-northstar-001.pdf", lines: ["NORTHSTAR DESIGN STUDIO", "Sample invoice - fictional data", "Supplier: Northstar Design Studio", "Invoice number: DEMO-001", "Invoice date: 2026-10-03", "Currency: USD", "Bill to: Example Customer", "Brand illustration / 1 / 400.00", "Subtotal: 400.00", "Tax: 40.00", "Invoice total: 440.00"] },
  { name: "sample-harbor-002.pdf", lines: ["HARBOR OFFICE SUPPLIES", "Sample invoice - fictional data", "Supplier: Harbor Office Supplies", "Invoice number: DEMO-002", "Invoice date: 2026-10-02", "Currency: EUR", "Bill to: Example Customer", "Office stationery / 1 / 125.50", "Subtotal: 125.50", "Tax: 25.10", "Invoice total: 150.60"] },
  { name: "sample-check-totals-003.pdf", lines: ["NORTHSTAR DESIGN STUDIO", "Sample invoice - review the mismatch", "Supplier: Northstar Design Studio", "Invoice number: DEMO-003", "Invoice date: 2026-10-01", "Currency: USD", "Bill to: Example Customer", "Website artwork / 1 / 200.00", "Subtotal: 200.00", "Tax: 20.00", "Invoice total: 250.00"] },
];

// ASCII-only fixtures exercise the real PDF pipeline without customer documents.
export function makeSamplePdf(lines: readonly string[]): Uint8Array {
  const escape = (value: string) => value.replace(/[^\x20-\x7e]/g, "?").replace(/[\\()]/g, "\\$&");
  const stream = `BT /F1 12 Tf 50 780 Td 24 TL\n${lines.map((line, index) => `${index ? "T* " : ""}(${escape(line)}) Tj`).join("\n")}\nET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let document = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(document.length); document += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = document.length;
  document += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(document);
}