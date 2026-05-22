"use client";

import { useState, useMemo } from "react";
import { Type, Hash, AlignLeft, Clock, FileText, MessageSquare } from "lucide-react";

export function WordCounterTool() {
  const [text, setText] = useState("");

  const stats = useMemo(() => {
    const trimmed = text.trim();
    if (!trimmed) {
      return { words: 0, chars: text.length, charsNoSpace: 0, sentences: 0, paragraphs: 0, readTime: "0 sec", speakTime: "0 sec" };
    }

    const words = trimmed.split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g, "").length;
    const sentences = (trimmed.match(/[.!?]+(\s|$)/g) || []).length;
    const paragraphs = trimmed.split(/\n\s*\n/).filter((p) => p.trim()).length;

    const readMin = words / 200;
    const speakMin = words / 130;

    const formatTime = (min: number) => {
      if (min < 1) return `${Math.ceil(min * 60)} sec`;
      const m = Math.floor(min);
      const s = Math.round((min - m) * 60);
      return s > 0 ? `${m} min ${s} sec` : `${m} min`;
    };

    return {
      words,
      chars,
      charsNoSpace,
      sentences,
      paragraphs,
      readTime: formatTime(readMin),
      speakTime: formatTime(speakMin),
    };
  }, [text]);

  const statCards = [
    { label: "Words", value: stats.words.toLocaleString(), icon: Type, color: "text-blue-500" },
    { label: "Characters", value: stats.chars.toLocaleString(), icon: Hash, color: "text-purple-500" },
    { label: "No Spaces", value: stats.charsNoSpace.toLocaleString(), icon: Hash, color: "text-indigo-500" },
    { label: "Sentences", value: stats.sentences.toLocaleString(), icon: AlignLeft, color: "text-green-500" },
    { label: "Paragraphs", value: stats.paragraphs.toLocaleString(), icon: FileText, color: "text-orange-500" },
    { label: "Read Time", value: stats.readTime, icon: Clock, color: "text-cyan-500" },
    { label: "Speak Time", value: stats.speakTime, icon: MessageSquare, color: "text-pink-500" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="p-3 bg-card border border-border rounded-lg text-center"
          >
            <s.icon size={18} className={`mx-auto mb-1 ${s.color}`} />
            <div className="text-lg font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Text area */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Start typing or paste your text here..."
        rows={14}
        className="w-full p-4 text-sm bg-muted/50 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 leading-relaxed"
        autoFocus
      />

      {/* Quick actions */}
      <div className="flex gap-3 text-sm">
        <button
          onClick={() => setText("")}
          className="px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear
        </button>
        <button
          onClick={() => setText(text.toUpperCase())}
          disabled={!text}
          className="px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        >
          UPPERCASE
        </button>
        <button
          onClick={() => setText(text.toLowerCase())}
          disabled={!text}
          className="px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        >
          lowercase
        </button>
        <button
          onClick={() => {
            setText(
              text.replace(/\w\S*/g, (t) =>
                t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
              )
            );
          }}
          disabled={!text}
          className="px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        >
          Title Case
        </button>
      </div>
    </div>
  );
}
