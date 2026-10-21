"use client";

import Link from "next/link";
import { useId, useRef, useState, useSyncExternalStore } from "react";
import { ArrowUpRight, Search, X } from "lucide-react";
import styles from "./homepage-tool-finder.module.css";

interface SearchableTool {
  slug: string;
  name: string;
  category: string;
  terms: string;
}

const subscribeToHydration = () => () => {};

export function HomepageToolFinder({ tools }: { tools: readonly SearchableTool[] }) {
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = words.length ? tools.filter((tool) => words.every((word) => `${tool.name} ${tool.category} ${tool.terms} ${tool.slug.replace(/-/g, " ")}`.toLowerCase().includes(word))) : [];
  const expanded = active && words.length > 0;

  function clear() {
    setQuery("");
    input.current?.focus();
  }

  return (
    <div
      className={styles.finder} role="search" aria-label="Find a free tool"
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setActive(false); }}
      onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); clear(); } }}
    >
      <label htmlFor={id} className={styles.label}>Find a tool</label>
      <div className={styles.field}>
        <Search size={18} aria-hidden="true" />
        <input
          ref={input} id={id} type="search" value={query} disabled={!hydrated}
          onChange={(event) => { setQuery(event.target.value); setActive(true); }}
          onFocus={() => setActive(true)} placeholder="Try “JSON”, “image” or “SEO”…"
          autoComplete="off" maxLength={100} aria-controls={`${id}-results`}
          className={styles.input}
        />
        {query && <button type="button" onClick={clear} className={styles.clear} aria-label="Clear tool search"><X size={16} aria-hidden="true" /></button>}
      </div>
      <p role="status" aria-live="polite" className={styles.status}>{words.length ? `${matches.length} matching tools` : ""}</p>
      <div id={`${id}-results`} hidden={!expanded} className={styles.results}>
        {matches.length ? <><p className={styles.resultCount}>{matches.length} {matches.length === 1 ? "tool" : "tools"} found</p><ul>{matches.map((tool) => (
          <li key={tool.slug}><Link href={`/tools/${tool.slug}`} prefetch={false}><span><strong>{tool.name}</strong><small>{tool.category}</small></span><ArrowUpRight size={16} aria-hidden="true" /></Link></li>
        ))}</ul></> : <p className={styles.empty}>No matching tool. Try “image”, “JSON”, “text” or “SEO”.</p>}
      </div>
      <noscript><p className={styles.fallback}>Choose a tool below, or browse the full toolkit.</p></noscript>
    </div>
  );
}