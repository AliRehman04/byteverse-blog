export const JSON_TS_LIMITS = {
  inputChars: 1_000_000,
  inputBytes: 2 * 1024 * 1024,
  tokens: 200_000,
  depth: 40,
  samples: 10_000,
  declarations: 200,
  properties: 2_000,
  keyChars: 1_024,
  pointerChars: 4_096,
  rootNameChars: 64,
  literalValues: 20,
  literalChars: 120,
  outputChars: 400_000,
  timeoutMs: 15_000,
} as const;

export type JsonTsFormat = "json" | "jsonl";

export interface JsonTsOptions {
  rootName: string;
  declarationStyle: "interface" | "type";
  rootMode: "value" | "array-items";
  pointer: string;
  optionalProperties: "inferred" | "all";
  readonly: boolean;
  exportDeclarations: boolean;
  stringLiterals: boolean;
  sortProperties: boolean;
  indent: "2" | "4" | "tab";
}

export const DEFAULT_JSON_TS_OPTIONS: JsonTsOptions = {
  rootName: "Root",
  declarationStyle: "interface",
  rootMode: "value",
  pointer: "",
  optionalProperties: "inferred",
  readonly: false,
  exportDeclarations: true,
  stringLiterals: false,
  sortProperties: false,
  indent: "2",
};

export interface JsonTsNotice {
  code: string;
  message: string;
  count: number;
}

export interface JsonTsInspection {
  format: JsonTsFormat;
  inputBytes: number;
  sampleCount: number;
  notices: JsonTsNotice[];
}

export interface JsonTsProperty {
  key: string;
  type: string;
  optional: boolean;
  present: number;
  total: number;
}

export interface JsonTsDeclaration {
  name: string;
  kind: "interface" | "type";
  code: string;
  properties: JsonTsProperty[];
}

export interface JsonTsResult extends JsonTsInspection {
  code: string;
  options: JsonTsOptions;
  rootType: string;
  declarations: JsonTsDeclaration[];
  stats: {
    selectedValues: number;
    properties: number;
    optionalProperties: number;
    unions: number;
    outputBytes: number;
  };
}

export type JsonTsRequest =
  | { id: number; kind: "inspect"; input: string; format: JsonTsFormat }
  | { id: number; kind: "generate"; input: string; format: JsonTsFormat; options: JsonTsOptions };

export type JsonTsResponse =
  | { id: number; kind: "inspect"; inspection: JsonTsInspection }
  | { id: number; kind: "generate"; result: JsonTsResult }
  | { id: number; kind: "error"; error: string };