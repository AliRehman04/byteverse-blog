import type { JsonTsFormat, JsonTsOptions } from "./types";

export const JSON_TS_SAMPLES: Array<{
  id: string;
  label: string;
  text: string;
  format: JsonTsFormat;
  options: Partial<JsonTsOptions>;
  hint: string;
}> = [
  {
    id: "nested-api",
    label: "Nested API response",
    text: JSON.stringify({
      requestId: "demo-request-42",
      data: {
        workspace: { name: "Paper Lantern Observatory", region: "north" },
        projects: [
          { id: 101, title: "Cloud atlas", owner: { name: "Mira Example" }, tags: ["demo", "science"] },
          { id: 102, title: "Moon journal", owner: { name: "Rowan Example", active: true }, tags: [] },
        ],
      },
      nextCursor: null,
    }, null, 2),
    format: "json",
    options: { rootName: "ObservatoryResponse", rootMode: "value", pointer: "" },
    hint: "Fictional nested response. Keep the wrapper, or explicitly select /data/projects and choose array-items mode.",
  },
  {
    id: "record-array",
    label: "Optional fields and mixed IDs",
    text: JSON.stringify([
      { id: 7, name: "Demo Finch", email: "finch@example.invalid", profile: { bio: null }, active: true },
      { id: "demo-8", name: "Demo Wren", profile: { bio: "Fictional account", timezone: "UTC" }, active: false },
      { id: 9, name: "Demo Lark", email: null, profile: {} },
    ], null, 2),
    format: "json",
    options: { rootName: "DemoAccount", rootMode: "array-items", pointer: "" },
    hint: "Fictional accounts. Missing properties become optional; observed null is a separate union branch, not absence.",
  },
  {
    id: "jsonl-events",
    label: "JSON Lines examples",
    text: [
      { event: "opened", id: "demo-a", payload: { project: "Paper comet", tags: ["sample"] } },
      { event: "closed", id: 2, payload: { project: "Paper comet", duration: 12, tags: [] } },
      { event: "queued", id: "demo-c", payload: null },
    ].map((value) => JSON.stringify(value)).join("\n") + "\n",
    format: "jsonl",
    options: { rootName: "DemoEvent", rootMode: "value", pointer: "" },
    hint: "Each fictional line is an example of the same root, not an extra array. Merging does not preserve event/payload correlations.",
  },
  {
    id: "unusual-keys",
    label: "Unusual property names",
    text: '{\n  "display-name": "Demo Orbit",\n  "a/b": {"~status": "sample"},\n  "": true,\n  "123": 5,\n  "__proto__": {"safe": true},\n  "constructor": 1,\n  "toString": null,\n  "quote\\\"key": "fictional",\n  "line\\nkey": "demo",\n  "\\u202ekey": "escaped for display",\n  "<tag>&": "not HTML"\n}',
    format: "json",
    options: { rootName: "UnusualRecord", rootMode: "value", pointer: "" },
    hint: "All values are fictional. Decoded keys are preserved with safe TypeScript quoting; /a~1b/~0status selects the escaped-key value.",
  },
];