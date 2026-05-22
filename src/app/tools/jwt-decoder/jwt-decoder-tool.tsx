"use client";

import { useState, useMemo, useCallback } from "react";
import { Copy, Check, AlertTriangle, Shield, ShieldAlert, Clock, Info } from "lucide-react";

interface JwtParts {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  isExpired: boolean;
  expiresAt: string | null;
  issuedAt: string | null;
  notBefore: string | null;
}

function decodeBase64Url(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  if (pad) base64 += "=".repeat(4 - pad);
  return decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
}

function formatTimestamp(ts: number): string {
  try {
    return new Date(ts * 1000).toLocaleString(undefined, {
      dateStyle: "full",
      timeStyle: "long",
    });
  } catch {
    return "Invalid date";
  }
}

function parseJwt(token: string): JwtParts | null {
  const parts = token.trim().split(".");
  if (parts.length !== 3) return null;

  try {
    const header = JSON.parse(decodeBase64Url(parts[0]));
    const payload = JSON.parse(decodeBase64Url(parts[1]));
    const signature = parts[2];

    const now = Math.floor(Date.now() / 1000);
    const exp = typeof payload.exp === "number" ? payload.exp : null;
    const iat = typeof payload.iat === "number" ? payload.iat : null;
    const nbf = typeof payload.nbf === "number" ? payload.nbf : null;

    return {
      header,
      payload,
      signature,
      isExpired: exp !== null && exp < now,
      expiresAt: exp !== null ? formatTimestamp(exp) : null,
      issuedAt: iat !== null ? formatTimestamp(iat) : null,
      notBefore: nbf !== null ? formatTimestamp(nbf) : null,
    };
  } catch {
    return null;
  }
}

const SAMPLE_HEADER = { alg: "HS256", typ: "JWT" };
const SAMPLE_PAYLOAD = {
  sub: "1234567890",
  name: "John Doe",
  email: "john@example.com",
  role: "admin",
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
};

function createSampleJwt(): string {
  const enc = (obj: unknown) => {
    const json = JSON.stringify(obj);
    return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  return `${enc(SAMPLE_HEADER)}.${enc(SAMPLE_PAYLOAD)}.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`;
}

export function JwtDecoderTool() {
  const [token, setToken] = useState("");
  const [copiedField, setCopiedField] = useState("");

  const decoded = useMemo(() => {
    if (!token.trim()) return null;
    return parseJwt(token);
  }, [token]);

  const isInvalid = token.trim().length > 0 && decoded === null;

  const copyJson = useCallback(async (json: unknown, field: string) => {
    await navigator.clipboard.writeText(JSON.stringify(json, null, 2));
    setCopiedField(field);
    setTimeout(() => setCopiedField(""), 2000);
  }, []);

  const loadSample = useCallback(() => {
    setToken(createSampleJwt());
  }, []);

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="jwt-input" className="text-sm font-medium">Paste JWT Token</label>
          <div className="flex gap-2">
            <button
              onClick={loadSample}
              className="text-xs text-primary hover:underline"
            >
              Load Sample
            </button>
            <button
              onClick={() => setToken("")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
        </div>
        <textarea
          id="jwt-input"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          rows={4}
          className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/40 break-all"
          spellCheck={false}
        />
        {isInvalid && (
          <div className="mt-2 flex items-center gap-2 text-red-500 text-sm">
            <AlertTriangle size={14} />
            <span>Invalid JWT format. A JWT should have 3 parts separated by dots (header.payload.signature).</span>
          </div>
        )}
      </div>

      {/* Color-coded token preview */}
      {decoded && (
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-sm font-medium mb-3">Token Structure</p>
          <div className="bg-muted/50 border border-border rounded-lg p-3 font-mono text-xs break-all leading-relaxed">
            <span className="text-red-500 dark:text-red-400">{token.trim().split(".")[0]}</span>
            <span className="text-muted-foreground">.</span>
            <span className="text-purple-500 dark:text-purple-400">{token.trim().split(".")[1]}</span>
            <span className="text-muted-foreground">.</span>
            <span className="text-cyan-500 dark:text-cyan-400">{token.trim().split(".")[2]}</span>
          </div>
          <div className="flex gap-4 mt-2 text-xs">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Header</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span> Payload</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block"></span> Signature</span>
          </div>
        </div>
      )}

      {/* Status badges */}
      {decoded && (
        <div className="flex flex-wrap gap-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
            decoded.isExpired
              ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
              : decoded.expiresAt
              ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400"
              : "bg-muted/50 border-border text-muted-foreground"
          }`}>
            {decoded.isExpired ? <ShieldAlert size={16} /> : <Shield size={16} />}
            {decoded.isExpired ? "Expired" : decoded.expiresAt ? "Valid (not expired)" : "No expiration set"}
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/50 text-sm text-muted-foreground">
            <Info size={16} />
            Algorithm: <span className="font-mono font-medium text-foreground">{String(decoded.header.alg || "—")}</span>
          </div>
        </div>
      )}

      {/* Header */}
      {decoded && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 mr-2"></span>
              Header
            </p>
            <button
              onClick={() => copyJson(decoded.header, "header")}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              {copiedField === "header" ? <Check size={12} /> : <Copy size={12} />}
              {copiedField === "header" ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="bg-muted/50 border border-border rounded-lg p-3 text-sm font-mono overflow-x-auto">
            {JSON.stringify(decoded.header, null, 2)}
          </pre>
        </div>
      )}

      {/* Payload */}
      {decoded && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-500 mr-2"></span>
              Payload (Claims)
            </p>
            <button
              onClick={() => copyJson(decoded.payload, "payload")}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              {copiedField === "payload" ? <Check size={12} /> : <Copy size={12} />}
              {copiedField === "payload" ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="bg-muted/50 border border-border rounded-lg p-3 text-sm font-mono overflow-x-auto">
            {JSON.stringify(decoded.payload, null, 2)}
          </pre>

          {/* Timestamps */}
          {(decoded.issuedAt || decoded.expiresAt || decoded.notBefore) && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Clock size={12} /> Timestamps
              </p>
              {decoded.issuedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground min-w-[80px]">Issued At:</span>
                  <span className="font-mono text-xs">{decoded.issuedAt}</span>
                </div>
              )}
              {decoded.expiresAt && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground min-w-[80px]">Expires:</span>
                  <span className={`font-mono text-xs ${decoded.isExpired ? "text-red-500" : ""}`}>
                    {decoded.expiresAt}
                  </span>
                </div>
              )}
              {decoded.notBefore && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground min-w-[80px]">Not Before:</span>
                  <span className="font-mono text-xs">{decoded.notBefore}</span>
                </div>
              )}
            </div>
          )}

          {/* Registered claims */}
          <div className="mt-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Registered Claims</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                ["iss", "Issuer"],
                ["sub", "Subject"],
                ["aud", "Audience"],
                ["jti", "JWT ID"],
              ].map(([key, label]) => (
                <div key={key} className="text-sm flex gap-2">
                  <span className="text-muted-foreground">{label}:</span>
                  <span className="font-mono text-xs">
                    {decoded.payload[key] !== undefined
                      ? String(decoded.payload[key])
                      : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Signature */}
      {decoded && (
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-sm font-medium mb-3">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-500 mr-2"></span>
            Signature
          </p>
          <p className="bg-muted/50 border border-border rounded-lg p-3 text-sm font-mono break-all">
            {decoded.signature}
          </p>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Info size={12} />
            Signature verification requires the secret key and cannot be done client-side.
          </p>
        </div>
      )}
    </div>
  );
}
