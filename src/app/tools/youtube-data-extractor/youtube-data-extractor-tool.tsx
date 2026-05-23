"use client";

import { useState, useCallback } from "react";
import {
  Copy,
  Check,
  Search,
  Loader2,
  Image as ImageIcon,
  FileText,
  Tag,
  Info,
  Download,
  ExternalLink,
  AlertCircle,
  Film,
  Zap,
} from "lucide-react";

interface VideoData {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  tags: string[];
  channelName: string;
  isShort: boolean;
  url: string;
}

export function YouTubeDataExtractorTool() {
  const [input, setInput] = useState("");
  const [data, setData] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);

  const extract = useCallback(async () => {
    const url = input.trim();
    if (!url) return;
    setLoading(true);
    setError("");
    setData(null);
    setDescExpanded(false);
    try {
      const res = await fetch("/api/youtube-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to extract data");
        return;
      }
      setData(json);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [input]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        extract();
      }
    },
    [extract]
  );

  const copyText = useCallback(async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const copyAll = useCallback(async () => {
    if (!data) return;
    const text = [
      `Title: ${data.title}`,
      `Channel: ${data.channelName}`,
      `Type: ${data.isShort ? "YouTube Short" : "YouTube Video"}`,
      `URL: ${data.url}`,
      `Thumbnail: ${data.thumbnail}`,
      "",
      `Description:\n${data.description}`,
      "",
      `Tags: ${data.tags.join(", ")}`,
    ].join("\n");
    await copyText(text, "all");
  }, [data, copyText]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ── Input ── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <label className="text-xs font-medium mb-1 block">
          Paste YouTube video or Shorts URL
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://www.youtube.com/watch?v=... or /shorts/..."
              className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              autoFocus
            />
          </div>
          <button
            onClick={extract}
            disabled={!input.trim() || loading}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Zap size={14} />
            )}
            {loading ? "Extracting..." : "Extract"}
          </button>
        </div>

        {/* Quick examples */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">Example:</span>
          {[
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "https://youtube.com/shorts/example",
          ].map((ex) => (
            <button
              key={ex}
              onClick={() => setInput(ex)}
              className="text-xs px-2.5 py-1 rounded-full bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors truncate max-w-[260px]"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-start gap-2 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* ── Results ── */}
      {data && (
        <div className="space-y-5">
          {/* Copy All + Type badge */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
              <Film size={12} />
              {data.isShort ? "YouTube Short" : "YouTube Video"}
            </span>
            <button
              onClick={copyAll}
              className="text-xs font-medium px-4 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5"
            >
              {copiedField === "all" ? (
                <Check size={12} />
              ) : (
                <Copy size={12} />
              )}
              {copiedField === "all" ? "Copied!" : "Copy All Data"}
            </button>
          </div>

          {/* Thumbnail */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <span className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                <ImageIcon size={13} />
                Thumbnail
              </span>
              <div className="flex gap-2">
                <a
                  href={data.thumbnail}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <ExternalLink size={12} />
                  Open
                </a>
                <a
                  href={data.thumbnail}
                  download={`thumbnail-${data.videoId}.jpg`}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <Download size={12} />
                  Download
                </a>
                <button
                  onClick={() => copyText(data.thumbnail, "thumb")}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  {copiedField === "thumb" ? (
                    <Check size={12} />
                  ) : (
                    <Copy size={12} />
                  )}
                  {copiedField === "thumb" ? "Copied" : "Copy URL"}
                </button>
              </div>
            </div>
            <div className="relative aspect-video bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.thumbnail}
                alt={data.title}
                className="w-full h-full object-contain"
              />
            </div>
            {/* All thumbnail sizes */}
            <div className="px-4 py-3 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                All thumbnail sizes:
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Max Res (1280×720)", key: "maxresdefault" },
                  { label: "SD (640×480)", key: "sddefault" },
                  { label: "HQ (480×360)", key: "hqdefault" },
                  { label: "MQ (320×180)", key: "mqdefault" },
                  { label: "Default (120×90)", key: "default" },
                ].map((size) => (
                  <button
                    key={size.key}
                    onClick={() =>
                      copyText(
                        `https://img.youtube.com/vi/${data.videoId}/${size.key}.jpg`,
                        size.key
                      )
                    }
                    className="text-xs px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    {copiedField === size.key ? (
                      <Check size={10} />
                    ) : (
                      <Copy size={10} />
                    )}
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <span className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                <Info size={13} />
                Title
                {data.channelName && (
                  <span className="text-muted-foreground/60 font-normal">
                    — {data.channelName}
                  </span>
                )}
              </span>
              <button
                onClick={() => copyText(data.title, "title")}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                {copiedField === "title" ? (
                  <Check size={12} />
                ) : (
                  <Copy size={12} />
                )}
                {copiedField === "title" ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm font-medium">{data.title}</p>
            </div>
          </div>

          {/* Description */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <span className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                <FileText size={13} />
                Description
                {data.description && (
                  <span className="text-muted-foreground/60 font-normal">
                    ({data.description.length} chars)
                  </span>
                )}
              </span>
              <button
                onClick={() => copyText(data.description, "desc")}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                {copiedField === "desc" ? (
                  <Check size={12} />
                ) : (
                  <Copy size={12} />
                )}
                {copiedField === "desc" ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="px-4 py-3">
              {data.description ? (
                <>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
                    {descExpanded
                      ? data.description
                      : data.description.slice(0, 300)}
                    {!descExpanded && data.description.length > 300 && "..."}
                  </p>
                  {data.description.length > 300 && (
                    <button
                      onClick={() => setDescExpanded(!descExpanded)}
                      className="text-xs font-medium text-primary mt-2 hover:underline"
                    >
                      {descExpanded ? "Show less" : "Show full description"}
                    </button>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground/60 italic">
                  No description available
                </p>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <span className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                <Tag size={13} />
                Tags
                {data.tags.length > 0 && (
                  <span className="text-muted-foreground/60 font-normal">
                    ({data.tags.length} tags)
                  </span>
                )}
              </span>
              {data.tags.length > 0 && (
                <button
                  onClick={() => copyText(data.tags.join(", "), "tags")}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  {copiedField === "tags" ? (
                    <Check size={12} />
                  ) : (
                    <Copy size={12} />
                  )}
                  {copiedField === "tags" ? "Copied" : "Copy All"}
                </button>
              )}
            </div>
            <div className="px-4 py-3">
              {data.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {data.tags.map((tag, i) => (
                    <span
                      key={i}
                      onClick={() => copyText(tag, `tag-${i}`)}
                      className="inline-flex items-center gap-1 bg-muted/60 hover:bg-muted border border-border rounded-lg px-3 py-1.5 text-sm cursor-pointer transition-colors"
                      title="Click to copy"
                    >
                      {copiedField === `tag-${i}` ? (
                        <span className="text-green-500">Copied!</span>
                      ) : (
                        tag
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground/60 italic">
                  No tags found — this video may not have public tags
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
