"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { ArrowUpRight, Search, X } from "lucide-react";
import { trackHomepageEvent } from "@/lib/homepage-events";
import styles from "./homepage-tool-finder.module.css";

interface SearchableTool {
  slug: string;
  name: string;
  category: string;
  terms: string;
}

const subscribeToHydration = () => () => {};

export function HomepageToolFinder({ tools, placeholder }: { tools: readonly SearchableTool[]; placeholder: string }) {
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const id = useId();
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  // Tools whose name contains more of the typed words come first; ties keep the catalog order.
  const nameHits = (tool: SearchableTool) => words.filter((word) => tool.name.toLowerCase().includes(word)).length;
  const matches = words.length
    ? tools.filter((tool) => words.every((word) => tool.terms.includes(word))).map((tool, index) => ({ tool, index, hits: nameHits(tool) }))
      .sort((a, b) => b.hits - a.hits || a.index - b.index).map((entry) => entry.tool)
    : [];
  const expanded = active && words.length > 0;
  const term = words.join(" ");
  const matchCount = matches.length;

  // Report a search once the visitor pauses, so each query is counted once.
  useEffect(() => {
    if (!term) return;
    const timer = setTimeout(() => trackHomepageEvent("tool_search", { search_term: term.slice(0, 40), results: matchCount }), 1200);
    return () => clearTimeout(timer);
  }, [term, matchCount]);

  function clear() {
    setQuery("");
    input.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") { event.preventDefault(); clear(); return; }
    const links = [...(results.current?.querySelectorAll<HTMLAnchorElement>("a[data-result]") ?? [])];
    if (!expanded || links.length === 0) return;
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      links[Math.min(index + 1, links.length - 1)].focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (index <= 0) input.current?.focus(); else links[index - 1].focus();
    } else if (event.key === "Enter" && document.activeElement === input.current) {
      // Enter opens the best match; the click keeps the site's normal link handling.
      event.preventDefault();
      links[0].click();
    }
  }

  return (
    <div
      className={styles.finder} role="search" aria-label="Find a free tool"
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setActive(false); }}
      onKeyDown={onKeyDown}
    >
      <label htmlFor={id} className={styles.label}>Find a tool</label>
      <div className={styles.field}>
        <Search size={20} aria-hidden="true" />
        <input
          ref={input} id={id} type="search" value={query} disabled={!hydrated}
          onChange={(event) => { setQuery(event.target.value); setActive(true); }}
          onFocus={() => setActive(true)} placeholder={placeholder}
          autoComplete="off" maxLength={100} aria-controls={`${id}-results`} aria-describedby={`${id}-hint`}
          className={styles.input}
        />
        {query && <button type="button" onClick={clear} className={styles.clear} aria-label="Clear tool search"><X size={18} aria-hidden="true" /></button>}
      </div>
      <p id={`${id}-hint`} className={styles.label}>Type to filter the tools. Press Enter to open the first match, or use the arrow keys to choose one.</p>
      <p role="status" aria-live="polite" className={styles.status}>{words.length ? `${matches.length} matching tools` : ""}</p>
      <div id={`${id}-results`} ref={results} hidden={!expanded} className={styles.results}>
        {matches.length ? <><p className={styles.resultCount}>{matches.length} {matches.length === 1 ? "tool" : "tools"} found</p><ul>{matches.map((tool) => (
          <li key={tool.slug}><Link href={`/tools/${tool.slug}`} prefetch={false} data-result data-home-event="search_result_click" data-home-label={tool.slug}><span><strong>{tool.name}</strong><small>{tool.category}</small></span><ArrowUpRight size={16} aria-hidden="true" /></Link></li>
        ))}</ul></> : <p className={styles.empty}>No matching tool. Try “image”, “JSON”, “text” or “SEO”, or <Link href="/tools" prefetch={false}>browse all tools</Link>.</p>}
      </div>
      <noscript><p className={styles.fallback}>Search needs JavaScript. Choose a tool below, or browse the full tools page.</p></noscript>
    </div>
  );
}
