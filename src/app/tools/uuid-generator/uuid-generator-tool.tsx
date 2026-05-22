"use client";

import { useState, useCallback } from "react";
import { Copy, Check, RefreshCw, Trash2 } from "lucide-react";

type UuidVersion = "v4" | "v1-like" | "nil";

function generateUuidV4(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function generateUuidV1Like(): string {
  // Timestamp-based (not true V1 since we don't have MAC address)
  const now = BigInt(Date.now()) * BigInt(10000) + BigInt("122192928000000000"); // 100ns intervals since UUID epoch
  const timeLow = (now & BigInt(0xffffffff)).toString(16).padStart(8, "0");
  const timeMid = ((now >> BigInt(32)) & BigInt(0xffff)).toString(16).padStart(4, "0");
  const timeHi = (((now >> BigInt(48)) & BigInt(0x0fff)) | BigInt(0x1000)).toString(16).padStart(4, "0");
  const clockSeq = crypto.getRandomValues(new Uint8Array(2));
  clockSeq[0] = (clockSeq[0] & 0x3f) | 0x80;
  const cs = Array.from(clockSeq)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const node = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${timeLow}-${timeMid}-${timeHi}-${cs}-${node}`;
}

function generateNilUuid(): string {
  return "00000000-0000-0000-0000-000000000000";
}

function parseUuid(uuid: string): {
  valid: boolean;
  version: string;
  variant: string;
} {
  const clean = uuid.replace(/-/g, "");
  if (!/^[0-9a-f]{32}$/i.test(clean)) return { valid: false, version: "—", variant: "—" };

  const versionChar = clean[12];
  const variantChar = parseInt(clean[16], 16);

  let version = "Unknown";
  if (versionChar === "1") version = "1 (Time-based)";
  else if (versionChar === "2") version = "2 (DCE Security)";
  else if (versionChar === "3") version = "3 (MD5 Name-based)";
  else if (versionChar === "4") version = "4 (Random)";
  else if (versionChar === "5") version = "5 (SHA-1 Name-based)";
  else if (versionChar === "7") version = "7 (Unix Epoch Time)";
  else if (clean === "00000000000000000000000000000000") version = "Nil UUID";

  let variant = "Unknown";
  if ((variantChar & 0x8) === 0) variant = "NCS (backward compatible)";
  else if ((variantChar & 0xc) === 0x8) variant = "RFC 4122 / RFC 9562";
  else if ((variantChar & 0xe) === 0xc) variant = "Microsoft (backward compatible)";
  else if ((variantChar & 0xe) === 0xe) variant = "Reserved for future";

  if (clean === "00000000000000000000000000000000") variant = "Nil";

  return { valid: true, version, variant };
}

export function UuidGeneratorTool() {
  const [uuids, setUuids] = useState<string[]>([]);
  const [count, setCount] = useState(1);
  const [version, setVersion] = useState<UuidVersion>("v4");
  const [uppercase, setUppercase] = useState(false);
  const [noBraces, setNoBraces] = useState(true);
  const [copiedIdx, setCopiedIdx] = useState(-1);
  const [copiedAll, setCopiedAll] = useState(false);
  const [validateInput, setValidateInput] = useState("");

  const generate = useCallback(() => {
    const gen =
      version === "v4"
        ? generateUuidV4
        : version === "v1-like"
        ? generateUuidV1Like
        : generateNilUuid;
    const results: string[] = [];
    for (let i = 0; i < Math.min(count, 100); i++) {
      let uuid = gen();
      if (uppercase) uuid = uuid.toUpperCase();
      if (!noBraces) uuid = `{${uuid}}`;
      results.push(uuid);
    }
    setUuids(results);
  }, [count, version, uppercase, noBraces]);

  const copyOne = useCallback(async (uuid: string, idx: number) => {
    await navigator.clipboard.writeText(uuid);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(-1), 2000);
  }, []);

  const copyAll = useCallback(async () => {
    await navigator.clipboard.writeText(uuids.join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }, [uuids]);

  const validateResult = validateInput.trim() ? parseUuid(validateInput.trim()) : null;

  return (
    <div className="space-y-6">
      {/* Generator */}
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-sm font-medium mb-4">Generate UUIDs</p>
        <div className="flex flex-wrap gap-3 mb-4">
          <div>
            <label htmlFor="uuid-version" className="text-xs text-muted-foreground block mb-1">
              Version
            </label>
            <select
              id="uuid-version"
              value={version}
              onChange={(e) => setVersion(e.target.value as UuidVersion)}
              className="bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="v4">v4 (Random)</option>
              <option value="v1-like">v1-like (Time-based)</option>
              <option value="nil">Nil UUID</option>
            </select>
          </div>
          <div>
            <label htmlFor="uuid-count" className="text-xs text-muted-foreground block mb-1">
              Count
            </label>
            <input
              id="uuid-count"
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) =>
                setCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))
              }
              className="w-20 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-4">
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={uppercase}
              onChange={(e) => setUppercase(e.target.checked)}
              className="rounded border-border"
            />
            Uppercase
          </label>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={!noBraces}
              onChange={(e) => setNoBraces(!e.target.checked)}
              className="rounded border-border"
            />
            With braces {`{...}`}
          </label>
        </div>

        <button
          onClick={generate}
          className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <RefreshCw size={14} />
          Generate {count > 1 ? `${count} UUIDs` : "UUID"}
        </button>
      </div>

      {/* Results */}
      {uuids.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">
              Generated UUID{uuids.length > 1 ? "s" : ""}
            </p>
            <div className="flex gap-2">
              <button
                onClick={copyAll}
                className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1"
              >
                {copiedAll ? <Check size={12} /> : <Copy size={12} />}
                {copiedAll ? "Copied All" : "Copy All"}
              </button>
              <button
                onClick={() => setUuids([])}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <Trash2 size={12} /> Clear
              </button>
            </div>
          </div>
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {uuids.map((uuid, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-muted/50 border border-border rounded-lg px-3 py-2 group"
              >
                <span className="font-mono text-sm select-all break-all">{uuid}</span>
                <button
                  onClick={() => copyOne(uuid, i)}
                  className="text-muted-foreground hover:text-foreground ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Copy"
                >
                  {copiedIdx === i ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validator */}
      <div className="bg-card border border-border rounded-xl p-5">
        <label htmlFor="uuid-validate" className="text-sm font-medium block mb-2">
          Validate UUID
        </label>
        <input
          id="uuid-validate"
          type="text"
          value={validateInput}
          onChange={(e) => setValidateInput(e.target.value)}
          placeholder="Paste a UUID to validate..."
          className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
          spellCheck={false}
        />
        {validateResult && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  validateResult.valid
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                }`}
              >
                {validateResult.valid ? "Valid UUID" : "Invalid UUID"}
              </span>
            </div>
            {validateResult.valid && (
              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Version: </span>
                  <span className="font-mono">{validateResult.version}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Variant: </span>
                  <span className="font-mono">{validateResult.variant}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
