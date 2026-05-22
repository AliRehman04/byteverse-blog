"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Copy,
  Check,
  FileText,
  Search,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  Globe,
  Loader2,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Hash,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

interface Section {
  id: string;
  name: string;
  items: string[];
}

interface SourceLine {
  line: number;
  text: string;
  type:
    | "heading"
    | "blockquote"
    | "list"
    | "link"
    | "blank"
    | "text"
    | "code-fence"
    | "summary";
  headingLevel?: number;
  errors: string[];
}

interface ParsedSection {
  title: string;
  line: number;
  items: { text: string; line: number }[];
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  stats: {
    lines: number;
    chars: number;
    headings: number;
    h2Sections: number;
    listItems: number;
    links: number;
    emails: number;
  };
  sourceLines: SourceLine[];
  parsedTitle: string | null;
  parsedSummary: string | null;
  parsedSections: ParsedSection[];
}

interface FetchStatus {
  found: boolean;
  status: string;
  url: string | null;
  tried: string[];
  contentType?: string;
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  VALIDATOR ENGINE                                                    */
/* ------------------------------------------------------------------ */

function validateLlmsTxt(text: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const sourceLines: SourceLine[] = [];
  const parsedSections: ParsedSection[] = [];
  let parsedTitle: string | null = null;
  let parsedSummary: string | null = null;

  const raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = raw.split("\n");

  const stats = {
    lines: lines.length,
    chars: raw.length,
    headings: 0,
    h2Sections: 0,
    listItems: 0,
    links: 0,
    emails: 0,
  };

  if (!raw.trim()) {
    return {
      valid: false,
      errors: ["File is empty — no content found"],
      warnings,
      suggestions,
      stats,
      sourceLines,
      parsedTitle: null,
      parsedSummary: null,
      parsedSections: [],
    };
  }

  let hasH1 = false;
  let hasBlockquote = false;
  let foundBlockquoteSummary = false;
  let currentH2: ParsedSection | null = null;
  let inCodeFence = false;

  const emailPattern = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g;
  const phonePattern = /\+?\d[\d\-.\s()]{6,}\d/g;
  const linkPattern = /https?:\/\/[^\s)>\]]+/g;
  const mdLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;

    const lineMeta: SourceLine = {
      line: lineNum,
      text: line,
      type: "text",
      errors: [],
    };

    // Code fences
    if (/^(`{3,}|~{3,})/.test(trimmed)) {
      inCodeFence = !inCodeFence;
      lineMeta.type = "code-fence";
      sourceLines.push(lineMeta);
      continue;
    }
    if (inCodeFence) {
      lineMeta.type = "code-fence";
      sourceLines.push(lineMeta);
      continue;
    }

    // Blank line
    if (!trimmed) {
      lineMeta.type = "blank";
      sourceLines.push(lineMeta);
      continue;
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      stats.headings++;
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].trim();
      lineMeta.type = "heading";
      lineMeta.headingLevel = level;

      if (level === 1) {
        if (hasH1) {
          warnings.push(
            `Line ${lineNum}: Multiple H1 headings found. Only the first is used as the title.`
          );
        } else {
          parsedTitle = headingText;
        }
        hasH1 = true;
        if (!headingText) {
          const msg = `Line ${lineNum}: H1 heading is empty.`;
          errors.push(msg);
          lineMeta.errors.push(msg);
        }
      }

      if (level === 2) {
        if (currentH2) {
          parsedSections.push(currentH2);
        }
        currentH2 = { title: headingText, line: lineNum, items: [] };
        stats.h2Sections++;
        if (!headingText) {
          const msg = `Line ${lineNum}: H2 section heading is empty.`;
          errors.push(msg);
          lineMeta.errors.push(msg);
        }
      }

      sourceLines.push(lineMeta);
      continue;
    }

    // Blockquote
    if (/^>\s*/.test(trimmed)) {
      hasBlockquote = true;
      lineMeta.type = "blockquote";
      const bqContent = trimmed.replace(/^>\s*/, "");

      if (!foundBlockquoteSummary && hasH1 && !currentH2) {
        foundBlockquoteSummary = true;
        if (parsedSummary === null) parsedSummary = "";
        parsedSummary += bqContent + "\n";
      }

      emailPattern.lastIndex = 0;
      if (emailPattern.test(bqContent)) {
        warnings.push(
          `Line ${lineNum}: Blockquote contains an email address. Consider redacting it.`
        );
      }
      emailPattern.lastIndex = 0;

      sourceLines.push(lineMeta);
      continue;
    }

    // List items
    if (/^[-*+]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      stats.listItems++;
      lineMeta.type = "list";
      const itemText = trimmed.replace(/^\s*([-*+]\s+|\d+\.\s+)/, "");

      if (currentH2) {
        currentH2.items.push({ text: itemText, line: lineNum });
      }

      linkPattern.lastIndex = 0;
      mdLinkPattern.lastIndex = 0;
      if (linkPattern.test(trimmed) || mdLinkPattern.test(trimmed)) {
        stats.links++;
      }
      linkPattern.lastIndex = 0;
      mdLinkPattern.lastIndex = 0;

      emailPattern.lastIndex = 0;
      if (emailPattern.test(trimmed)) {
        stats.emails++;
        warnings.push(
          `Line ${lineNum}: Contains an email address. Consider using a contact page link instead.`
        );
      }
      emailPattern.lastIndex = 0;

      phonePattern.lastIndex = 0;
      if (phonePattern.test(trimmed)) {
        warnings.push(
          `Line ${lineNum}: Contains a phone number. Consider using a contact page link instead.`
        );
      }
      phonePattern.lastIndex = 0;

      sourceLines.push(lineMeta);
      continue;
    }

    // Bare URL
    if (/^https?:\/\/\S+$/.test(trimmed)) {
      stats.links++;
      lineMeta.type = "link";
      if (currentH2) {
        currentH2.items.push({ text: trimmed, line: lineNum });
      }
      sourceLines.push(lineMeta);
      continue;
    }

    // Plain text
    if (currentH2 !== null) {
      const msg = `Line ${lineNum}: Plain text found inside section "${currentH2.title}". Only list items are allowed within H2 sections.`;
      errors.push(msg);
      lineMeta.errors.push(msg);
      suggestions.push(
        `Convert line ${lineNum} to a list item (prefix with "- ") or move it outside the H2 section.`
      );
      currentH2.items.push({ text: trimmed, line: lineNum });
    } else {
      if (hasH1 && !foundBlockquoteSummary && !currentH2) {
        lineMeta.type = "summary";
        if (parsedSummary === null) parsedSummary = "";
        parsedSummary += trimmed + "\n";
      }

      emailPattern.lastIndex = 0;
      if (emailPattern.test(trimmed)) {
        stats.emails++;
        warnings.push(
          `Line ${lineNum}: Contains an email address. Consider redacting it.`
        );
        lineMeta.errors.push("Contains email address.");
      }
      emailPattern.lastIndex = 0;

      phonePattern.lastIndex = 0;
      if (phonePattern.test(trimmed)) {
        warnings.push(
          `Line ${lineNum}: Contains a phone number. Consider removing it.`
        );
        lineMeta.errors.push("Contains phone-like string.");
      }
      phonePattern.lastIndex = 0;
    }

    sourceLines.push(lineMeta);
  }

  // Close last section
  if (currentH2) {
    parsedSections.push(currentH2);
  }

  if (parsedSummary) parsedSummary = parsedSummary.trim();

  // Validation rules
  if (!hasH1) {
    errors.push(
      "Missing H1 heading. The file must start with a title, e.g. # Your Site Name"
    );
    suggestions.push(
      'Add a short title at the top (e.g. "# My Site").'
    );
  }

  for (const sec of parsedSections) {
    if (sec.items.length === 0) {
      warnings.push(
        `Section "${sec.title}" has no list items. Add items or remove the section.`
      );
    }
  }

  const mainUrlsSection = parsedSections.find(
    (s) =>
      s.title.toLowerCase().includes("main url") ||
      s.title.toLowerCase().includes("main links")
  );
  if (mainUrlsSection) {
    const hasLinks = mainUrlsSection.items.some(
      (it) => /https?:\/\//.test(it.text) || /\[.+\]\(.+\)/.test(it.text)
    );
    if (!hasLinks) {
      warnings.push(
        `Section "${mainUrlsSection.title}" has no recognizable URLs. Add markdown links or bare URLs.`
      );
      suggestions.push(
        `Add site URLs as markdown links under "${mainUrlsSection.title}".`
      );
    }
  }

  if (!hasBlockquote) {
    suggestions.push(
      "Consider adding a blockquote summary after the H1 heading (> A brief description of your site)."
    );
  }

  if (stats.h2Sections === 0) {
    suggestions.push(
      "Consider adding H2 sections to organize your content (e.g. ## Main URLs, ## Resources)."
    );
  }

  if (stats.links === 0 && stats.h2Sections > 0) {
    suggestions.push(
      "No links found. Consider adding URLs to your key pages as markdown links."
    );
  }

  if (
    !parsedSections.some((s) => s.title.toLowerCase().includes("contact"))
  ) {
    suggestions.push(
      "Consider adding a contact section or link so AI can direct users to reach you."
    );
  }

  if (stats.chars > 200000) {
    errors.push(
      "File exceeds 200 KB. Keep it concise for better AI consumption."
    );
  }

  const valid = errors.length === 0;

  return {
    valid,
    errors,
    warnings,
    suggestions,
    stats,
    sourceLines,
    parsedTitle,
    parsedSummary,
    parsedSections,
  };
}

/* ------------------------------------------------------------------ */
/*  SOURCE LINE VIEWER                                                 */
/* ------------------------------------------------------------------ */

function SourceLineViewer({ lines }: { lines: SourceLine[] }) {
  const [expanded, setExpanded] = useState(true);
  if (lines.length === 0) return null;

  const typeColor = (type: string, hasErrors: boolean) => {
    if (hasErrors)
      return "bg-red-50 dark:bg-red-950/30 border-l-4 border-l-red-500";
    switch (type) {
      case "heading":
        return "text-primary font-bold";
      case "blockquote":
        return "text-blue-600 dark:text-blue-400 italic";
      case "list":
        return "";
      case "link":
        return "text-cyan-600 dark:text-cyan-400";
      case "blank":
        return "opacity-30";
      case "code-fence":
        return "text-orange-500 dark:text-orange-400";
      case "summary":
        return "text-muted-foreground italic";
      default:
        return "";
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-muted/50 text-sm font-semibold hover:bg-muted transition-colors"
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Hash size={16} /> Source Preview ({lines.length} lines)
      </button>
      {expanded && (
        <div className="max-h-[400px] overflow-y-auto bg-card">
          <table className="w-full text-xs font-mono">
            <tbody>
              {lines.map((ln) => (
                <tr
                  key={ln.line}
                  className={`border-b border-border/30 ${typeColor(
                    ln.type,
                    ln.errors.length > 0
                  )}`}
                >
                  <td className="px-3 py-1 text-right text-muted-foreground select-none w-12 border-r border-border/30">
                    {ln.line}
                  </td>
                  <td className="px-3 py-1 whitespace-pre-wrap break-all">
                    {ln.text || "\u00A0"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PARSED STRUCTURE VIEWER                                            */
/* ------------------------------------------------------------------ */

function ParsedStructureViewer({
  title,
  summary,
  sections,
}: {
  title: string | null;
  summary: string | null;
  sections: ParsedSection[];
}) {
  const [expanded, setExpanded] = useState(true);

  if (!title && !summary && sections.length === 0) return null;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-muted/50 text-sm font-semibold hover:bg-muted transition-colors"
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <FileText size={16} /> Parsed Structure
      </button>
      {expanded && (
        <div className="p-4 space-y-4">
          {title && (
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Title (H1)
              </span>
              <p className="text-lg font-bold mt-1">{title}</p>
            </div>
          )}
          {summary && (
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Summary
              </span>
              <p className="mt-1 text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3">
                {summary}
              </p>
            </div>
          )}
          {sections.length > 0 && (
            <div className="space-y-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Sections ({sections.length})
              </span>
              {sections.map((sec, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-muted/30 rounded-lg border border-border"
                >
                  <p className="text-sm font-bold">
                    ## {sec.title || "(empty)"}
                  </p>
                  {sec.items.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {sec.items.slice(0, 20).map((item, ii) => (
                        <li key={ii} className="flex gap-2">
                          <span className="text-muted-foreground/50 select-none">
                            •
                          </span>
                          <span className="break-all">{item.text}</span>
                          <span className="text-muted-foreground/40 ml-auto whitespace-nowrap">
                            L{item.line}
                          </span>
                        </li>
                      ))}
                      {sec.items.length > 20 && (
                        <li className="text-muted-foreground/60 italic">
                          ...and {sec.items.length - 20} more items
                        </li>
                      )}
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground/60 italic">
                      No items in this section
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  GENERATOR SECTION COMPONENT                                        */
/* ------------------------------------------------------------------ */

function SectionEditor({
  section,
  onUpdate,
  onRemove,
}: {
  section: Section;
  onUpdate: (s: Section) => void;
  onRemove: () => void;
}) {
  const addItem = () => {
    onUpdate({ ...section, items: [...section.items, ""] });
  };
  const updateItem = (idx: number, value: string) => {
    const items = [...section.items];
    items[idx] = value;
    onUpdate({ ...section, items });
  };
  const removeItem = (idx: number) => {
    onUpdate({ ...section, items: section.items.filter((_, i) => i !== idx) });
  };

  return (
    <div className="p-4 bg-muted/30 border border-border rounded-lg space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground font-mono">##</span>
        <input
          type="text"
          value={section.name}
          onChange={(e) => onUpdate({ ...section, name: e.target.value })}
          placeholder="Section Name (e.g. Main URLs)"
          className="flex-1 px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          onClick={onRemove}
          className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors"
          title="Remove section"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {section.items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2 pl-6">
          <span className="text-xs text-muted-foreground">-</span>
          <input
            type="text"
            value={item}
            onChange={(e) => updateItem(idx, e.target.value)}
            placeholder="[Page Title](https://example.com/page)"
            className="flex-1 px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={() => removeItem(idx)}
            className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
            title="Remove item"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      <button
        onClick={addItem}
        className="ml-6 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
      >
        <Plus size={14} /> Add item
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                     */
/* ------------------------------------------------------------------ */

export function LlmsTxtTool() {
  const [tab, setTab] = useState<"generator" | "validator">("generator");

  /* ---- Generator state ---- */
  const [siteName, setSiteName] = useState("");
  const [summary, setSummary] = useState("");
  const [sections, setSections] = useState<Section[]>([
    { id: "1", name: "Main URLs", items: [""] },
  ]);
  const [genCopied, setGenCopied] = useState(false);
  const [domain, setDomain] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");

  /* ---- Validator state ---- */
  const [valMode, setValMode] = useState<"url" | "text">("url");
  const [valDomain, setValDomain] = useState("");
  const [valFetching, setValFetching] = useState(false);
  const [valFetchStatus, setValFetchStatus] = useState<FetchStatus | null>(
    null
  );
  const [validatorInput, setValidatorInput] = useState("");
  const [result, setResult] = useState<ValidationResult | null>(null);

  /* ---- Generator output ---- */
  const generated = useMemo(() => {
    const lines: string[] = [];
    if (siteName) lines.push(`# ${siteName}`);
    if (summary) {
      lines.push("");
      summary.split("\n").forEach((l) => lines.push(`> ${l}`));
    }
    for (const section of sections) {
      if (!section.name && section.items.every((i) => !i)) continue;
      lines.push("");
      lines.push(`## ${section.name || "Untitled Section"}`);
      for (const item of section.items) {
        if (item) lines.push(`- ${item}`);
      }
    }
    lines.push("");
    return lines.join("\n");
  }, [siteName, summary, sections]);

  /* ---- Generator actions ---- */
  const addSection = useCallback(() => {
    setSections((prev) => [
      ...prev,
      { id: Date.now().toString(), name: "", items: [""] },
    ]);
  }, []);

  const autoGenerate = useCallback(async () => {
    const d = domain.trim();
    if (!d) return;
    setFetching(true);
    setFetchError("");
    try {
      const res = await fetch("/api/tools/llms-txt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: d }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch site data");

      if (data.siteTitle) setSiteName(data.siteTitle);
      if (data.siteDescription) setSummary(data.siteDescription);

      const groups = data.groups as Record<
        string,
        { title: string; url: string }[]
      >;
      const groupCounts = (data.groupCounts || {}) as Record<string, number>;
      const navSections = (data.navSections || {}) as Record<
        string,
        { title: string; url: string }[]
      >;
      const newSections: Section[] = [];
      let id = 1;

      // Navigation sections first (from nav/footer extraction)
      for (const [name, links] of Object.entries(navSections)) {
        if (links.length > 0) {
          newSections.push({
            id: String(id++),
            name: `Navigation: ${name}`,
            items: links.map((l) => `[${l.title}](${l.url})`),
          });
        }
      }

      // Main Pages first from groups
      if (groups["Main Pages"]) {
        const count = groupCounts["Main Pages"] || groups["Main Pages"].length;
        const suffix = count > 30 ? ` (${count} total)` : "";
        newSections.push({
          id: String(id++),
          name: `Main Pages${suffix}`,
          items: groups["Main Pages"].map((p) => `[${p.title}](${p.url})`),
        });
      }

      // Other groups
      for (const [name, pages] of Object.entries(groups)) {
        if (name === "Main Pages") continue;
        const count = groupCounts[name] || pages.length;
        const suffix = count > 30 ? ` (${count} total)` : "";
        newSections.push({
          id: String(id++),
          name: `${name}${suffix}`,
          items: pages.map((p) => `[${p.title}](${p.url})`),
        });
      }

      if (newSections.length > 0) setSections(newSections);
    } catch (err: unknown) {
      setFetchError(
        err instanceof Error ? err.message : "Failed to fetch site data"
      );
    } finally {
      setFetching(false);
    }
  }, [domain]);

  const downloadGenerated = useCallback(() => {
    const blob = new Blob([generated], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "llms.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [generated]);

  const updateSection = useCallback((id: string, updated: Section) => {
    setSections((prev) => prev.map((s) => (s.id === id ? updated : s)));
  }, []);

  const removeSection = useCallback((id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const copyGenerated = useCallback(async () => {
    await navigator.clipboard.writeText(generated);
    setGenCopied(true);
    setTimeout(() => setGenCopied(false), 2000);
  }, [generated]);

  /* ---- Validator actions ---- */
  const validateByUrl = useCallback(async () => {
    const d = valDomain.trim();
    if (!d) return;
    setValFetching(true);
    setResult(null);
    setValFetchStatus(null);
    setValidatorInput("");
    try {
      const res = await fetch("/api/tools/llms-txt/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: d }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to check domain");

      const fetchStatus: FetchStatus = {
        found: data.found,
        status: data.status,
        url: data.url,
        tried: data.tried || [],
        contentType: data.contentType,
        error: data.error,
      };
      setValFetchStatus(fetchStatus);

      if (data.found && data.status === "present" && data.content) {
        setValidatorInput(data.content);
        setResult(validateLlmsTxt(data.content));
      } else if (data.found && data.status === "invalid_content") {
        setResult(null);
      }
    } catch (err: unknown) {
      setValFetchStatus({
        found: false,
        status: "error",
        url: null,
        tried: [],
        error:
          err instanceof Error ? err.message : "Failed to check domain",
      });
    } finally {
      setValFetching(false);
    }
  }, [valDomain]);

  const validateText = useCallback(() => {
    setValFetchStatus(null);
    setResult(validateLlmsTxt(validatorInput));
  }, [validatorInput]);

  const loadSample = useCallback(() => {
    setValidatorInput(`# My Awesome Website

> A modern web platform for developers
> Building tools that make coding easier

## Main URLs
- [Homepage](https://example.com)
- [Blog](https://example.com/blog)
- [Documentation](https://example.com/docs)
- [Pricing](https://example.com/pricing)

## Resources
- [API Reference](https://example.com/api)
- [GitHub Repository](https://github.com/user/repo)
- [Changelog](https://example.com/changelog)

## Contact
- [Contact Form](https://example.com/contact)
- [Support](https://example.com/support)
`);
    setResult(null);
    setValFetchStatus(null);
  }, []);

  const loadBadSample = useCallback(() => {
    setValidatorInput(`My Website Without H1

## About Us
We are a great company that builds amazing products.
Our team is dedicated to excellence.

## Contact
Email us at hello@example.com
Call us at +1-555-123-4567

##

## Empty Section
`);
    setResult(null);
    setValFetchStatus(null);
  }, []);

  const useInValidator = useCallback(() => {
    setValidatorInput(generated);
    setValMode("text");
    setTab("validator");
    setResult(null);
    setValFetchStatus(null);
  }, [generated]);

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit mx-auto">
        <button
          onClick={() => setTab("generator")}
          className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "generator"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText size={16} /> Generator
        </button>
        <button
          onClick={() => setTab("validator")}
          className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "validator"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Search size={16} /> Validator
        </button>
      </div>

      {/* ============ GENERATOR TAB ============ */}
      {tab === "generator" && (
        <div className="space-y-6">
          {/* Auto-generate from domain */}
          <div className="p-5 bg-muted/30 border border-border rounded-xl space-y-3">
            <label className="text-sm font-semibold block">
              Auto-generate from website
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <input
                  type="url"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && autoGenerate()}
                  placeholder="https://example.com"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button
                onClick={autoGenerate}
                disabled={fetching || !domain.trim()}
                className="px-6 py-2.5 bg-primary text-primary-foreground font-medium text-sm rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40 inline-flex items-center gap-2 whitespace-nowrap"
              >
                {fetching ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <FileText size={16} />
                )}
                {fetching ? "Fetching..." : "Generate"}
              </button>
            </div>
            {fetchError && (
              <p className="text-sm text-red-500 flex items-center gap-1.5">
                <XCircle size={14} className="flex-shrink-0" /> {fetchError}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Enter your domain to auto-fetch sitemap and generate llms.txt. No
              email required — 100% free.
            </p>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-3 text-xs text-muted-foreground">
                or edit manually below
              </span>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">
                  Site Name <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground font-mono">
                    #
                  </span>
                  <input
                    type="text"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="Your Website Name"
                    className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">
                  Summary (blockquote)
                </label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="A brief description of your website..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Sections</label>
                  <button
                    onClick={addSection}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Plus size={14} /> Add Section
                  </button>
                </div>

                {sections.map((section) => (
                  <SectionEditor
                    key={section.id}
                    section={section}
                    onUpdate={(s) => updateSection(section.id, s)}
                    onRemove={() => removeSection(section.id)}
                  />
                ))}
              </div>

              <button
                onClick={useInValidator}
                className="w-full py-2 text-sm text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
              >
                Validate this output
              </button>
            </div>

            {/* Preview / Output */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">
                  Generated llms.txt
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={downloadGenerated}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-xs font-medium rounded-lg hover:bg-muted transition-colors"
                  >
                    <Download size={14} /> Download
                  </button>
                  <button
                    onClick={copyGenerated}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    {genCopied ? <Check size={14} /> : <Copy size={14} />}
                    {genCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
              <pre className="p-4 bg-muted/50 border border-border rounded-lg text-sm font-mono whitespace-pre-wrap min-h-[300px] max-h-[600px] overflow-y-auto">
                {generated ||
                  "# Your Site Name\n\n> Description...\n\n## Main URLs\n- [Homepage](https://...)"}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ============ VALIDATOR TAB ============ */}
      {tab === "validator" && (
        <div className="space-y-6">
          {/* Mode switcher */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit mx-auto">
            <button
              onClick={() => {
                setValMode("url");
                setResult(null);
                setValFetchStatus(null);
              }}
              className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-md transition-colors ${
                valMode === "url"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Globe size={14} /> Validate by URL
            </button>
            <button
              onClick={() => {
                setValMode("text");
                setResult(null);
                setValFetchStatus(null);
              }}
              className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-md transition-colors ${
                valMode === "text"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText size={14} /> Validate by Text
            </button>
          </div>

          {/* URL mode */}
          {valMode === "url" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">
                  Website domain
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                    />
                    <input
                      type="url"
                      value={valDomain}
                      onChange={(e) => setValDomain(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && validateByUrl()}
                      placeholder="example.com or https://example.com"
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <button
                    onClick={validateByUrl}
                    disabled={valFetching || !valDomain.trim()}
                    className="px-6 py-2.5 bg-primary text-primary-foreground font-medium text-sm rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40 inline-flex items-center gap-2 whitespace-nowrap"
                  >
                    {valFetching ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Search size={16} />
                    )}
                    {valFetching ? "Checking..." : "Validate"}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Checks /llms.txt, /.well-known/llms.txt, and www variant
                  automatically. No email required.
                </p>
              </div>
            </div>
          )}

          {/* Text mode */}
          {valMode === "text" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">
                  Paste your llms.txt content
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={loadSample}
                    className="text-xs text-primary hover:underline"
                  >
                    Load valid sample
                  </button>
                  <button
                    onClick={loadBadSample}
                    className="text-xs text-orange-500 hover:underline"
                  >
                    Load invalid sample
                  </button>
                </div>
              </div>
              <textarea
                value={validatorInput}
                onChange={(e) => {
                  setValidatorInput(e.target.value);
                  setResult(null);
                }}
                placeholder={
                  "# Your Site Name\n\n> Brief description\n\n## Main URLs\n- [Home](https://example.com)"
                }
                rows={12}
                spellCheck={false}
                className="w-full p-4 font-mono text-sm bg-muted/50 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />

              <button
                onClick={validateText}
                disabled={!validatorInput.trim()}
                className="w-full mt-4 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                Validate
              </button>
            </div>
          )}

          {/* ---- Fetch Status (URL mode) ---- */}
          {valFetchStatus && (
            <div className="animate-fade-in">
              {valFetchStatus.status === "not_found" && (
                <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <XCircle
                      size={20}
                      className="text-red-600 dark:text-red-400"
                    />
                    <p className="font-semibold text-red-700 dark:text-red-300">
                      No llms.txt found
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Could not find an llms.txt file on the target domain.
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-medium">URLs tried:</p>
                    {valFetchStatus.tried.map((u, i) => (
                      <p
                        key={i}
                        className="flex items-center gap-1.5 text-red-600/70 dark:text-red-400/70"
                      >
                        <XCircle size={12} /> {u}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {valFetchStatus.status === "invalid_content" && (
                <div className="p-4 rounded-lg border bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      size={20}
                      className="text-orange-600 dark:text-orange-400"
                    />
                    <p className="font-semibold text-orange-700 dark:text-orange-300">
                      File found but not plain text
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Found at{" "}
                    <span className="font-mono text-xs">
                      {valFetchStatus.url}
                    </span>{" "}
                    but Content-Type is{" "}
                    <span className="font-mono text-xs">
                      {valFetchStatus.contentType || "unknown"}
                    </span>
                    . The file should be plain text.
                  </p>
                </div>
              )}

              {valFetchStatus.status === "present" && (
                <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      size={20}
                      className="text-green-600 dark:text-green-400"
                    />
                    <div>
                      <p className="font-semibold text-green-700 dark:text-green-300">
                        llms.txt found
                      </p>
                      <a
                        href={valFetchStatus.url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-600 dark:text-green-400 hover:underline inline-flex items-center gap-1"
                      >
                        {valFetchStatus.url}{" "}
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {valFetchStatus.status === "error" && (
                <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2">
                    <XCircle
                      size={20}
                      className="text-red-600 dark:text-red-400"
                    />
                    <p className="font-semibold text-red-700 dark:text-red-300">
                      {valFetchStatus.error || "Failed to check domain"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ---- Validation Results ---- */}
          {result && (
            <div className="space-y-4 animate-fade-in">
              {/* Status badge */}
              <div
                className={`flex items-center gap-3 p-4 rounded-lg border ${
                  result.valid
                    ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                }`}
              >
                {result.valid ? (
                  <CheckCircle2
                    size={24}
                    className="text-green-600 dark:text-green-400 flex-shrink-0"
                  />
                ) : (
                  <XCircle
                    size={24}
                    className="text-red-600 dark:text-red-400 flex-shrink-0"
                  />
                )}
                <div>
                  <p
                    className={`font-semibold ${
                      result.valid
                        ? "text-green-700 dark:text-green-300"
                        : "text-red-700 dark:text-red-300"
                    }`}
                  >
                    {result.valid ? "Valid llms.txt" : "Invalid llms.txt"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {result.errors.length} error
                    {result.errors.length !== 1 ? "s" : ""},{" "}
                    {result.warnings.length} warning
                    {result.warnings.length !== 1 ? "s" : ""},{" "}
                    {result.suggestions.length} suggestion
                    {result.suggestions.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 sm:grid-cols-7 gap-3">
                {[
                  { label: "Lines", value: result.stats.lines },
                  { label: "Characters", value: result.stats.chars },
                  { label: "Headings", value: result.stats.headings },
                  { label: "Sections", value: result.stats.h2Sections },
                  { label: "List Items", value: result.stats.listItems },
                  { label: "Links", value: result.stats.links },
                  { label: "Emails", value: result.stats.emails },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="p-3 bg-card border border-border rounded-lg text-center"
                  >
                    <div className="text-lg font-bold">{s.value}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Errors */}
              {result.errors.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-red-600 dark:text-red-400">
                    <XCircle size={16} /> Errors ({result.errors.length})
                  </h3>
                  {result.errors.map((e, i) => (
                    <div
                      key={i}
                      className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg text-sm"
                    >
                      {e}
                    </div>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                    <AlertTriangle size={16} /> Warnings (
                    {result.warnings.length})
                  </h3>
                  {result.warnings.map((w, i) => (
                    <div
                      key={i}
                      className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm"
                    >
                      {w}
                    </div>
                  ))}
                </div>
              )}

              {/* Suggestions */}
              {result.suggestions.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Info size={16} /> Suggestions ({result.suggestions.length})
                  </h3>
                  {result.suggestions.map((s, i) => (
                    <div
                      key={i}
                      className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm"
                    >
                      {s}
                    </div>
                  ))}
                </div>
              )}

              {/* Source line viewer */}
              <SourceLineViewer lines={result.sourceLines} />

              {/* Parsed structure */}
              <ParsedStructureViewer
                title={result.parsedTitle}
                summary={result.parsedSummary}
                sections={result.parsedSections}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
