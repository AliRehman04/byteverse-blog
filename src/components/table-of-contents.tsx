"use client";

import { useState, useEffect } from "react";
import { List } from "lucide-react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function TableOfContents() {
  const [headings, setHeadings] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const article = document.querySelector(".blog-content");
    if (!article) return;

    const elements = article.querySelectorAll("h2[id], h3[id]");
    const items: TocItem[] = Array.from(elements).map((el) => ({
      id: el.id,
      text: el.textContent?.trim() || "",
      level: el.tagName === "H2" ? 2 : 3,
    }));
    setHeadings(items);
  }, []);

  // Intersection observer for active heading
  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );

    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 3) return null;

  return (
    <nav className="my-8 rounded-xl border border-border bg-muted/30 p-4 sm:p-5">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between w-full text-sm font-bold text-foreground"
      >
        <span className="flex items-center gap-2">
          <List size={16} className="text-primary" />
          Table of Contents
        </span>
        <span className="text-xs text-muted-foreground">
          {collapsed ? "Show" : "Hide"}
        </span>
      </button>

      {!collapsed && (
        <ul className="mt-3 space-y-1 text-sm">
          {headings.map((item) => (
            <li key={item.id} style={{ paddingLeft: item.level === 3 ? "1rem" : 0 }}>
              <a
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`block py-1 px-2 rounded transition-colors leading-snug ${
                  activeId === item.id
                    ? "text-primary font-medium bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
