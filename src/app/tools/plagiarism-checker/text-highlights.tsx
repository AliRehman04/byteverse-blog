import { Fragment } from "react";
import type { TextRange } from "@/lib/similarity/types";
import { passageContext } from "@/lib/similarity/review";

export function PassageContext({ text, range, markerId }: { text: string; range: TextRange; markerId?: string }) {
  const context = passageContext(text, range);
  return <div className="sim-context-passage" tabIndex={0}><p dir="auto">{context.leading && "…"}<span>{context.before}</span><mark id={markerId} className="sim-highlight sim-highlight-selected">{context.match}{context.shortened && "…"}</mark><span>{context.after}</span>{context.trailing && "…"}</p>{context.shortened && <small>Long match shortened in this focus view. Full text is available in the document panes.</small>}</div>;
}

export function TextHighlights({ text, matched, excluded, selected, markerId }: {
  text: string;
  matched: TextRange[];
  excluded: TextRange[];
  selected?: TextRange;
  markerId: string;
}) {
  const points = new Set([0, text.length]);
  for (const range of [...matched, ...excluded, ...(selected ? [selected] : [])]) {
    points.add(range.start);
    points.add(range.end);
  }
  const ordered = Array.from(points).sort((a, b) => a - b);
  let matchIndex = 0;
  let excludeIndex = 0;
  return ordered.slice(0, -1).map((start, index) => {
    const end = ordered[index + 1];
    while (matchIndex < matched.length && matched[matchIndex].end <= start) matchIndex++;
    while (excludeIndex < excluded.length && excluded[excludeIndex].end <= start) excludeIndex++;
    const isExcluded = excluded[excludeIndex]?.start <= start && excluded[excludeIndex]?.end >= end;
    const isMatched = matched[matchIndex]?.start <= start && matched[matchIndex]?.end >= end;
    const isSelected = selected && selected.start <= start && selected.end >= end;
    const content = text.slice(start, end);
    if (isExcluded) return <span key={start} className="sim-excluded" title="Excluded by the selected rules">{content}</span>;
    if (isSelected || isMatched) return <mark key={start} id={isSelected && start === selected.start ? markerId : undefined} className={isSelected ? "sim-highlight sim-highlight-selected" : "sim-highlight"}>{content}</mark>;
    return <Fragment key={start}>{content}</Fragment>;
  });
}