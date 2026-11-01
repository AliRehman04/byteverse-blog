"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ArrowUpRight, Search, X } from "lucide-react";
import { toolCatalog, type ToolCategory, type ToolEntry } from "@/lib/tool-catalog";
import { filterDirectoryTools, hubCategories, toDirectoryTools, toolsInCategory } from "@/lib/tools-hub";
import styles from "./tools-hub.module.css";

type Filter = ToolCategory | "all";
const subscribeToHydration = () => () => {};

function ToolCard({ tool }: { tool: ToolEntry }) {
  const Icon = tool.icon;
  return (
    <li>
      <Link href={`/tools/${tool.slug}`} prefetch={false} className={styles.toolCard} data-tool={tool.slug}>
        <span className={styles.toolCardHead}>
          <span className={`${styles.toolIcon} ${tool.bg} ${tool.color}`}><Icon size={20} aria-hidden="true" /></span>
          <h3 className={styles.toolName}>{tool.name}</h3>
        </span>
        <p className={styles.toolDesc}>{tool.description}</p>
        <span className={styles.toolFoot}><span>{tool.category}</span><em>Open tool</em></span>
        <ArrowUpRight size={16} aria-hidden="true" className={styles.toolArrow} />
      </Link>
    </li>
  );
}

export function ToolsDirectory({ children }: { children?: ReactNode }) {
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Filter>("all");
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const searchable = useMemo(() => toDirectoryTools(toolCatalog), []);
  const bySlug = useMemo(() => new Map(toolCatalog.map((tool) => [tool.slug, tool])), []);
  const filtering = query.trim().length > 0 || category !== "all";
  const matches = filtering ? filterDirectoryTools(searchable, query, category).flatMap((tool) => bySlug.get(tool.slug) ?? []) : [];
  const activeCategory = hubCategories.find((entry) => entry.title === category);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      event.preventDefault();
      input.current?.focus();
    }
    document.addEventListener("keydown", focusSearch);
    return () => document.removeEventListener("keydown", focusSearch);
  }, []);

  function reset() {
    setQuery("");
    setCategory("all");
    input.current?.focus();
  }

  function choose(event: React.MouseEvent<HTMLAnchorElement>, next: Filter) {
    if (!hydrated) return;
    event.preventDefault();
    setCategory(next);
  }

  return (
    <>
      <div className={`${styles.container} ${styles.finderWrap}`}>
        <div className={styles.finder} role="search" aria-label="Find a tool" onKeyDown={(event) => { if (event.key === "Escape" && query) { event.preventDefault(); setQuery(""); } }}>
          <label htmlFor={id} className={styles.srOnly}>Search tools by name, task or format</label>
          <div className={styles.field}>
            <Search size={20} aria-hidden="true" />
            <input
              ref={input} id={id} type="search" value={query} disabled={!hydrated}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by task, format or name: “csv”, “hash”, “meta tags”…"
              autoComplete="off" maxLength={80} className={styles.input} aria-describedby={`${id}-status`}
            />
            {query ? (
              <button type="button" onClick={() => { setQuery(""); input.current?.focus(); }} className={styles.clear} aria-label="Clear search"><X size={18} aria-hidden="true" /></button>
            ) : (
              <span className={styles.kbd} aria-hidden="true">Press /</span>
            )}
          </div>
          <ul className={styles.chips} aria-label="Filter by category">
            <li>
              <a href="#directory" className={styles.chip} aria-current={category === "all" ? "true" : undefined} onClick={(event) => choose(event, "all")}>
                All <span className={styles.chipCount}>{toolCatalog.length}</span>
              </a>
            </li>
            {hubCategories.map((entry) => (
              <li key={entry.id}>
                <a href={`#${entry.id}`} className={styles.chip} style={{ "--chip-tone": entry.tone } as React.CSSProperties}
                  aria-current={category === entry.title ? "true" : undefined} onClick={(event) => choose(event, entry.title)}>
                  <span className={styles.chipDot} aria-hidden="true" />{entry.title}
                  <span className={styles.chipCount}>{toolsInCategory(entry.title).length}</span>
                </a>
              </li>
            ))}
          </ul>
          <p id={`${id}-status`} role="status" aria-live="polite" className={styles.status}>
            {filtering ? `${matches.length} of ${toolCatalog.length} tools${query.trim() ? ` match “${query.trim()}”` : ""}${activeCategory ? ` in ${activeCategory.title}` : ""}` : ""}
          </p>
          <noscript><p className={styles.fallback}>Search needs JavaScript. Every tool is listed below by category, and the chips jump to each section.</p></noscript>
        </div>
      </div>

      {!filtering && children}

      <div id="directory" className={`${styles.container} ${styles.directory}`}>
        {filtering ? (
          <section aria-labelledby={`${id}-results`}>
            <div className={styles.resultsHead}>
              <h2 id={`${id}-results`}>{matches.length} {matches.length === 1 ? "tool" : "tools"}{activeCategory ? ` in ${activeCategory.title}` : ""}{query.trim() ? ` for “${query.trim()}”` : ""}</h2>
              <button type="button" onClick={reset} className={styles.resetLink}>Show all {toolCatalog.length} tools</button>
            </div>
            {matches.length ? (
              <ul className={styles.toolGrid}>{matches.map((tool) => <ToolCard key={tool.slug} tool={tool} />)}</ul>
            ) : (
              <div className={styles.empty}>
                <strong>No tool matches that search.</strong>
                <p>Try a format such as “json” or “csv”, a task such as “compress” or “compare”, or browse a category.</p>
                {hubCategories.map((entry) => (
                  <a key={entry.id} href={`#${entry.id}`} onClick={(event) => { choose(event, entry.title); setQuery(""); }}>{entry.title}</a>
                ))}
              </div>
            )}
          </section>
        ) : (
          hubCategories.map((entry) => {
            const Icon = entry.icon;
            const tools = toolsInCategory(entry.title);
            return (
              <section key={entry.id} id={entry.id} className={styles.categorySection} aria-labelledby={`${entry.id}-title`} style={{ "--cat-tone": entry.tone } as React.CSSProperties}>
                <div className={styles.categoryHead}>
                  <span className={styles.categoryIcon}><Icon size={22} aria-hidden="true" /></span>
                  <div>
                    <h2 id={`${entry.id}-title`} className={styles.categoryTitle}>{entry.title} <span className={styles.categoryCount}>{tools.length} {tools.length === 1 ? "tool" : "tools"}</span></h2>
                    <p className={styles.categoryBlurb}>{entry.blurb}</p>
                  </div>
                </div>
                <ul className={styles.toolGrid}>{tools.map((tool) => <ToolCard key={tool.slug} tool={tool} />)}</ul>
              </section>
            );
          })
        )}
      </div>
    </>
  );
}
