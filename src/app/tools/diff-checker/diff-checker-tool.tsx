"use client";

import { useState, useMemo, useCallback } from "react";
import { Copy, Check, Trash2, ArrowLeftRight } from "lucide-react";

interface DiffLine {
  type: "equal" | "added" | "removed";
  text: string;
  leftNum: number | null;
  rightNum: number | null;
}

function computeDiff(a: string, b: string): DiffLine[] {
  const linesA = a.split("\n");
  const linesB = b.split("\n");

  // LCS-based diff (Myers-like approach simplified)
  const m = linesA.length;
  const n = linesB.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (linesA[i - 1] === linesB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff
  const result: DiffLine[] = [];
  let i = m;
  let j = n;

  const stack: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
      stack.push({
        type: "equal",
        text: linesA[i - 1],
        leftNum: i,
        rightNum: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({
        type: "added",
        text: linesB[j - 1],
        leftNum: null,
        rightNum: j,
      });
      j--;
    } else {
      stack.push({
        type: "removed",
        text: linesA[i - 1],
        leftNum: i,
        rightNum: null,
      });
      i--;
    }
  }

  // Reverse since we built it backwards
  for (let k = stack.length - 1; k >= 0; k--) {
    result.push(stack[k]);
  }

  return result;
}

interface DiffStats {
  added: number;
  removed: number;
  unchanged: number;
  total: number;
}

export function DiffCheckerTool() {
  const [textA, setTextA] = useState("");
  const [textB, setTextB] = useState("");
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [copied, setCopied] = useState(false);

  const { diff, stats } = useMemo(() => {
    let a = textA;
    let b = textB;

    if (ignoreCase) {
      a = a.toLowerCase();
      b = b.toLowerCase();
    }
    if (ignoreWhitespace) {
      a = a
        .split("\n")
        .map((l) => l.trim())
        .join("\n");
      b = b
        .split("\n")
        .map((l) => l.trim())
        .join("\n");
    }

    const diffResult = computeDiff(a, b);
    const s: DiffStats = {
      added: diffResult.filter((d) => d.type === "added").length,
      removed: diffResult.filter((d) => d.type === "removed").length,
      unchanged: diffResult.filter((d) => d.type === "equal").length,
      total: diffResult.length,
    };
    return { diff: diffResult, stats: s };
  }, [textA, textB, ignoreWhitespace, ignoreCase]);

  const hasDiff = textA.length > 0 || textB.length > 0;
  const isIdentical =
    hasDiff && stats.added === 0 && stats.removed === 0 && textA === textB;

  const copyDiff = useCallback(async () => {
    const text = diff
      .map((d) => {
        const prefix =
          d.type === "added" ? "+ " : d.type === "removed" ? "- " : "  ";
        return prefix + d.text;
      })
      .join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [diff]);

  const swap = useCallback(() => {
    setTextA(textB);
    setTextB(textA);
  }, [textA, textB]);

  return (
    <div className="space-y-6">
      {/* Options */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={ignoreWhitespace}
            onChange={(e) => setIgnoreWhitespace(e.target.checked)}
            className="rounded border-border"
          />
          Ignore whitespace
        </label>
        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={ignoreCase}
            onChange={(e) => setIgnoreCase(e.target.checked)}
            className="rounded border-border"
          />
          Ignore case
        </label>
        <button
          onClick={swap}
          className="text-xs px-3 py-1.5 rounded-lg bg-muted/50 border border-border hover:bg-primary/10 hover:border-primary/50 transition-colors flex items-center gap-1 ml-auto"
        >
          <ArrowLeftRight size={12} /> Swap
        </button>
      </div>

      {/* Two text areas side by side */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="diff-text-a" className="text-sm font-medium">
              Original Text
            </label>
            <button
              onClick={() => setTextA("")}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Trash2 size={12} /> Clear
            </button>
          </div>
          <textarea
            id="diff-text-a"
            value={textA}
            onChange={(e) => setTextA(e.target.value)}
            placeholder="Paste original text here..."
            rows={12}
            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/40"
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {textA.split("\n").length} lines • {textA.length} chars
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="diff-text-b" className="text-sm font-medium">
              Modified Text
            </label>
            <button
              onClick={() => setTextB("")}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Trash2 size={12} /> Clear
            </button>
          </div>
          <textarea
            id="diff-text-b"
            value={textB}
            onChange={(e) => setTextB(e.target.value)}
            placeholder="Paste modified text here..."
            rows={12}
            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/40"
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {textB.split("\n").length} lines • {textB.length} chars
          </p>
        </div>
      </div>

      {/* Stats */}
      {hasDiff && (
        <div className="flex flex-wrap gap-3">
          {isIdentical ? (
            <div className="px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 text-sm font-medium">
              ✓ Texts are identical
            </div>
          ) : (
            <>
              <div className="px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-sm">
                <span className="text-green-600 dark:text-green-400 font-medium">
                  +{stats.added}
                </span>{" "}
                <span className="text-muted-foreground">added</span>
              </div>
              <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-sm">
                <span className="text-red-600 dark:text-red-400 font-medium">
                  −{stats.removed}
                </span>{" "}
                <span className="text-muted-foreground">removed</span>
              </div>
              <div className="px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm">
                <span className="font-medium">{stats.unchanged}</span>{" "}
                <span className="text-muted-foreground">unchanged</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Unified diff view */}
      {hasDiff && !isIdentical && diff.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <p className="text-sm font-medium">Diff Result</p>
            <button
              onClick={copyDiff}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy Diff"}
            </button>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm font-mono">
              <tbody>
                {diff.map((line, i) => (
                  <tr
                    key={i}
                    className={
                      line.type === "added"
                        ? "bg-green-500/10"
                        : line.type === "removed"
                        ? "bg-red-500/10"
                        : ""
                    }
                  >
                    <td className="px-2 py-0.5 text-right text-xs text-muted-foreground select-none w-10 border-r border-border/50">
                      {line.leftNum ?? ""}
                    </td>
                    <td className="px-2 py-0.5 text-right text-xs text-muted-foreground select-none w-10 border-r border-border/50">
                      {line.rightNum ?? ""}
                    </td>
                    <td className="px-2 py-0.5 select-none w-5 text-center">
                      <span
                        className={
                          line.type === "added"
                            ? "text-green-600 dark:text-green-400"
                            : line.type === "removed"
                            ? "text-red-600 dark:text-red-400"
                            : "text-muted-foreground"
                        }
                      >
                        {line.type === "added"
                          ? "+"
                          : line.type === "removed"
                          ? "−"
                          : " "}
                      </span>
                    </td>
                    <td className="px-2 py-0.5 whitespace-pre-wrap break-all">
                      {line.text || "\u00A0"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
