/** Bundled, fictional sample files (example.com addresses, 555 numbers). Never user data. */
export interface StudioSample { id: string; name: string; fileName: string; description: string; bytes(): Uint8Array }

const CUSTOMERS = [
  "Customer ID,Name,Email,Phone,ZIP,State,Signup date,Account number,Notes",
  "000123,Ava Thompson,ava@example.com,(617) 555-0142,02115,MA,3/4/26,40001234567812345678,Prefers email ",
  "000124, Liam Carter,liam@example.com,617-555-0199,02139-4307,MA,03/05/2026,40001234567812345679,=SUM(A1:A3)",
  "000125,Sofía Ramírez,sofia@example.com,+1 212 555 0101,10001,NY,2026-03-06,40001234567812345680,\"Call after 5pm, not before\"",
  "000126,Noah  Patel,noah@example.com,2125550123,07030,NJ,Jan-24,4.00012345678123E+19,VIP",
  "000127,Emma Wilson,emma@example.com,(973) 555-0177,7302,NJ,3/9/26,40001234567812345682,\"Line one\r\nline two\"",
  "000127,Emma Wilson,emma@example.com,(973) 555-0177,7302,NJ,3/9/26,40001234567812345682,\"Line one\r\nline two\"",
  ",,,,,,,,",
  "000128,Mason Lee,mason@example.com,N/A,30301,GA,3/10/26,40001234567812345683,@mention follow-up",
].join("\r\n") + "\r\n";

const EUROPE = [
  "Order ID;Customer;City;Amount (EUR);Order date",
  "000451;Müller GmbH;München;1.234,50;04.03.2026",
  "000452;Café Lumière;Paris;89,90;05.03.2026",
  "000453;Zoë & Söhne;Wien;€ 120,00;06.03.2026",
  "000454;Ørsted Design;Kraków;45,00;07.03.2026",
].join("\r\n") + "\r\n";

const INVENTORY = [
  "SKU\tUPC\tDescription\tQty\tWarehouse\tBatch",
  "00012345\t036000291452\t\"Steel bracket, 4\"\" heavy duty\"\t12\tA1\t1234567890123456",
  "00012346\t012345678905\tHinge\t0\tB2\t1/2",
  "00012347\t074312345678\t\"Shelf label\npack of 50\"\t140\tA1\t4.12E+16",
  "00012348\t088888888888\tCable tie \t-5\tC3\t2026-01-15",
  "00012349\t000000012345\tWasher\t1,200\tB2\tMar-26",
].join("\n") + "\n";

const BROKEN = [
  "id,name,comment",
  "1,\"Alpha\",\"Looks fine\"",
  "2,\"Beta\"x,text after a closing quote",
  "3,Gamma,5'10\" tall",
  "4,Delta,ok,extra,fields",
  "5,\"Epsilon,quote never closes",
  "6,Zeta,this row is swallowed by the open quote",
].join("\n");

const WINDOWS_1252_EXTRA: Record<string, number> = { "€": 0x80 };

function encodeWindows1252(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const code = char.charCodeAt(0);
    bytes[index] = WINDOWS_1252_EXTRA[char] ?? (code <= 0xff ? code : 0x3f);
  }
  return bytes;
}

const utf8 = (text: string, bom = false) => {
  const body = new TextEncoder().encode(text);
  if (!bom) return body;
  const bytes = new Uint8Array(body.length + 3);
  bytes.set([0xef, 0xbb, 0xbf]);
  bytes.set(body, 3);
  return bytes;
};

export const STUDIO_SAMPLES: readonly StudioSample[] = [
  { id: "customers", name: "US customer list", fileName: "sample-customers.csv", description: "ZIP codes, phone numbers, long account IDs, a formula and duplicates", bytes: () => utf8(CUSTOMERS, true) },
  { id: "europe", name: "European export", fileName: "sample-orders-eu.csv", description: "Semicolons, decimal commas and Windows-1252 accents", bytes: () => encodeWindows1252(EUROPE) },
  { id: "inventory", name: "Inventory TSV", fileName: "sample-inventory.tsv", description: "Tab-delimited SKUs, UPCs, quoted text and a rounded batch ID", bytes: () => utf8(INVENTORY) },
  { id: "broken", name: "Broken quotes", fileName: "sample-broken-quotes.csv", description: "Malformed and unclosed quotes plus a row with extra fields", bytes: () => utf8(BROKEN) },
];
