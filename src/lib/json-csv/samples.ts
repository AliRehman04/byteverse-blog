import type { JsonInputFormat } from "./types";

export const JSON_CSV_SAMPLES: { id: string; label: string; format: JsonInputFormat; text: string; hint: string }[] = [
  {
    id: "people", label: "Simple records", format: "json",
    hint: "Fictional records with nested fields, leading-zero IDs and a missing value.",
    text: '[\n  { "id": "001", "name": "Maya", "team": "Design", "location": { "city": "Bristol" }, "active": true },\n  { "id": "002", "name": "Leo", "team": "Engineering", "location": { "city": "Oslo" }, "active": false },\n  { "id": "003", "name": "Amina", "team": null, "active": true }\n]',
  },
  {
    id: "api", label: "Wrapped API response", format: "json",
    hint: "Choose /data/items as the row source. Wrapper metadata is not exported with those records.",
    text: '{\n  "status": "ok",\n  "data": {\n    "items": [\n      { "id": 9123372036854000123, "title": "Café guide", "tags": ["reading", "weekend"], "price": 2.370 },\n      { "id": 9123372036854000124, "title": "City map", "tags": ["travel"], "price": 5.50 }\n    ]\n  },\n  "page": 1\n}',
  },
  {
    id: "orders", label: "Orders with line items", format: "json",
    hint: "Expand /items to get one row per line item, with parent order fields repeated. Empty arrays keep one parent row.",
    text: '[\n  { "order": "DEMO-101", "customer": { "name": "Maya" }, "items": [{ "sku": "BOOK", "qty": 2 }, { "sku": "MAP", "qty": 1 }], "tags": ["sample", "paid"] },\n  { "order": "DEMO-102", "customer": { "name": "Leo" }, "items": [], "tags": ["sample"] }\n]',
  },
  {
    id: "lines", label: "JSON Lines / NDJSON", format: "jsonl",
    hint: "One complete JSON record per line. Blank interior lines and malformed records are reported, not skipped.",
    text: '{"event":"opened","user":"001","count":1}\n{"event":"saved","user":"002","count":2}\n{"event":"shared","user":"003","count":3}\n',
  },
];