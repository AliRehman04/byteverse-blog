"use client";

import { useState, useCallback, useMemo } from "react";
import { Copy, Check, ArrowLeftRight, Clock, Trash2 } from "lucide-react";

const COMMON_FORMATS = [
  { label: "ISO 8601", format: (d: Date) => d.toISOString() },
  { label: "UTC String", format: (d: Date) => d.toUTCString() },
  { label: "Local String", format: (d: Date) => d.toLocaleString() },
  {
    label: "Date Only (YYYY-MM-DD)",
    format: (d: Date) => d.toISOString().split("T")[0],
  },
  {
    label: "Time Only (HH:MM:SS)",
    format: (d: Date) => d.toISOString().split("T")[1].replace("Z", ""),
  },
  {
    label: "RFC 2822",
    format: (d: Date) => d.toUTCString().replace("GMT", "+0000"),
  },
  {
    label: "Relative",
    format: (d: Date) => {
      const diff = Date.now() - d.getTime();
      const abs = Math.abs(diff);
      const future = diff < 0;
      const seconds = Math.floor(abs / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      const months = Math.floor(days / 30);
      const years = Math.floor(days / 365);

      let text = "";
      if (seconds < 60) text = `${seconds} second${seconds !== 1 ? "s" : ""}`;
      else if (minutes < 60) text = `${minutes} minute${minutes !== 1 ? "s" : ""}`;
      else if (hours < 24) text = `${hours} hour${hours !== 1 ? "s" : ""}`;
      else if (days < 30) text = `${days} day${days !== 1 ? "s" : ""}`;
      else if (months < 12) text = `${months} month${months !== 1 ? "s" : ""}`;
      else text = `${years} year${years !== 1 ? "s" : ""}`;

      return future ? `in ${text}` : `${text} ago`;
    },
  },
];

export function TimestampConverterTool() {
  const [mode, setMode] = useState<"toDate" | "toUnix">("toDate");
  const [unixInput, setUnixInput] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [timeInput, setTimeInput] = useState("00:00:00");
  const [copiedField, setCopiedField] = useState("");

  const nowUnix = useMemo(() => Math.floor(Date.now() / 1000), []);

  const setNow = useCallback(() => {
    const now = new Date();
    if (mode === "toDate") {
      setUnixInput(Math.floor(now.getTime() / 1000).toString());
    } else {
      setDateInput(now.toISOString().split("T")[0]);
      setTimeInput(now.toTimeString().slice(0, 8));
    }
  }, [mode]);

  // Unix → Date conversion
  const unixResult = useMemo(() => {
    if (!unixInput.trim()) return null;
    const num = Number(unixInput.trim());
    if (isNaN(num)) return { error: "Invalid number" };

    // Detect if milliseconds (13+ digits) or seconds (10 digits)
    let ms: number;
    let unit: string;
    if (Math.abs(num) > 1e12) {
      ms = num;
      unit = "milliseconds";
    } else {
      ms = num * 1000;
      unit = "seconds";
    }

    const date = new Date(ms);
    if (isNaN(date.getTime())) return { error: "Invalid timestamp" };

    return { date, unit, error: null };
  }, [unixInput]);

  // Date → Unix conversion
  const dateResult = useMemo(() => {
    if (!dateInput) return null;
    try {
      const dt = new Date(`${dateInput}T${timeInput || "00:00:00"}`);
      if (isNaN(dt.getTime())) return { error: "Invalid date" };
      return {
        seconds: Math.floor(dt.getTime() / 1000),
        milliseconds: dt.getTime(),
        date: dt,
        error: null,
      };
    } catch {
      return { error: "Invalid date" };
    }
  }, [dateInput, timeInput]);

  const copyText = useCallback(async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(""), 2000);
  }, []);

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex gap-2 bg-muted/50 p-1 rounded-lg w-fit">
        <button
          onClick={() => setMode("toDate")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === "toDate"
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Unix → Date
        </button>
        <button
          onClick={() => setMode("toUnix")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === "toUnix"
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Date → Unix
        </button>
      </div>

      {/* Current time reference */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Clock size={16} className="text-primary" />
          <span className="text-muted-foreground">Current Unix timestamp:</span>
          <span className="font-mono font-medium">{nowUnix}</span>
        </div>
        <button
          onClick={setNow}
          className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          Use Current Time
        </button>
      </div>

      {/* Unix → Date */}
      {mode === "toDate" && (
        <>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="unix-input" className="text-sm font-medium">
                Unix Timestamp
              </label>
              <button
                onClick={() => setUnixInput("")}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <Trash2 size={12} /> Clear
              </button>
            </div>
            <input
              id="unix-input"
              type="text"
              value={unixInput}
              onChange={(e) => setUnixInput(e.target.value)}
              placeholder="e.g. 1700000000 (seconds) or 1700000000000 (ms)"
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
              spellCheck={false}
            />
            {unixInput && unixResult && !unixResult.error && (
              <p className="text-xs text-muted-foreground mt-1">
                Detected as {unixResult.unit}
              </p>
            )}
            {unixResult?.error && (
              <p className="text-xs text-red-500 mt-1">{unixResult.error}</p>
            )}
          </div>

          {unixResult && !unixResult.error && unixResult.date && (
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <ArrowLeftRight size={16} className="text-primary" />
                <p className="text-sm font-medium">Converted Formats</p>
              </div>
              <div className="space-y-2">
                {COMMON_FORMATS.map((f) => {
                  const val = f.format(unixResult.date!);
                  return (
                    <div
                      key={f.label}
                      className="flex items-center justify-between bg-muted/50 border border-border rounded-lg px-3 py-2 group"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{f.label}</p>
                        <p className="font-mono text-sm truncate">{val}</p>
                      </div>
                      <button
                        onClick={() => copyText(val, f.label)}
                        className="text-muted-foreground hover:text-foreground ml-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        title="Copy"
                      >
                        {copiedField === f.label ? (
                          <Check size={14} />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Date → Unix */}
      {mode === "toUnix" && (
        <>
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm font-medium mb-3">Select Date & Time</p>
            <div className="flex flex-wrap gap-3">
              <div>
                <label htmlFor="date-input" className="text-xs text-muted-foreground block mb-1">
                  Date
                </label>
                <input
                  id="date-input"
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label htmlFor="time-input" className="text-xs text-muted-foreground block mb-1">
                  Time
                </label>
                <input
                  id="time-input"
                  type="time"
                  step="1"
                  value={timeInput}
                  onChange={(e) => setTimeInput(e.target.value)}
                  className="bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
          </div>

          {dateResult && !dateResult.error && (
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <ArrowLeftRight size={16} className="text-primary" />
                <p className="text-sm font-medium">Unix Timestamp</p>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Seconds", value: dateResult.seconds!.toString() },
                  {
                    label: "Milliseconds",
                    value: dateResult.milliseconds!.toString(),
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between bg-muted/50 border border-border rounded-lg px-3 py-2 group"
                  >
                    <div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="font-mono text-sm select-all">{item.value}</p>
                    </div>
                    <button
                      onClick={() => copyText(item.value, item.label)}
                      className="text-muted-foreground hover:text-foreground ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Copy"
                    >
                      {copiedField === item.label ? (
                        <Check size={14} />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                ))}
                {/* All formats too */}
                {COMMON_FORMATS.slice(0, 4).map((f) => {
                  const val = f.format(dateResult.date!);
                  return (
                    <div
                      key={f.label}
                      className="flex items-center justify-between bg-muted/50 border border-border rounded-lg px-3 py-2 group"
                    >
                      <div>
                        <p className="text-xs text-muted-foreground">{f.label}</p>
                        <p className="font-mono text-sm truncate">{val}</p>
                      </div>
                      <button
                        onClick={() => copyText(val, f.label)}
                        className="text-muted-foreground hover:text-foreground ml-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        title="Copy"
                      >
                        {copiedField === f.label ? (
                          <Check size={14} />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {dateResult?.error && (
            <p className="text-sm text-red-500">{dateResult.error}</p>
          )}
        </>
      )}
    </div>
  );
}
