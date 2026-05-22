"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";

/* ── Tool Metadata ────────────────────────────────────── */
const TOOLS: Record<string, { name: string; desc: string }> = {
  "json-formatter": { name: "JSON Formatter", desc: "Format, validate & minify JSON" },
  "password-generator": { name: "Password Generator", desc: "Strong random passwords" },
  "meta-tag-generator": { name: "Meta Tag Generator", desc: "SEO meta tags with preview" },
  "base64-encoder-decoder": { name: "Base64 Encoder", desc: "Encode & decode Base64" },
  "word-counter": { name: "Word Counter", desc: "Words, chars & reading time" },
  "llms-txt-generator-validator": { name: "llms.txt Validator", desc: "Generate & validate llms.txt" },
  "regex-tester": { name: "Regex Tester", desc: "Test patterns with live highlighting" },
  "jwt-decoder": { name: "JWT Decoder", desc: "Decode & inspect JSON Web Tokens" },
  "hash-generator": { name: "Hash Generator", desc: "SHA-256, SHA-512 hashes" },
  "uuid-generator": { name: "UUID Generator", desc: "Generate & validate UUIDs" },
  "timestamp-converter": { name: "Timestamp Converter", desc: "Unix timestamps ↔ dates" },
  "url-encoder-decoder": { name: "URL Encoder", desc: "Encode & decode URLs" },
  "diff-checker": { name: "Diff Checker", desc: "Compare texts side by side" },
  "og-preview": { name: "OG Preview", desc: "Social media link card preview" },
  "robots-txt-generator": { name: "robots.txt Generator", desc: "Build robots.txt visually" },
  "schema-markup-generator": { name: "Schema Markup", desc: "JSON-LD structured data" },
  "slug-generator": { name: "Slug Generator", desc: "URL-friendly text slugs" },
  "css-gradient-generator": { name: "Gradient Generator", desc: "Linear & radial CSS gradients" },
  "color-converter": { name: "Color Converter", desc: "HEX, RGB & HSL conversion" },
  "box-shadow-generator": { name: "Box Shadow", desc: "Visual CSS shadow builder" },
  "ai-content-detector": { name: "AI Content Detector", desc: "Detect AI-generated text" },
  "plagiarism-checker": { name: "Plagiarism Checker", desc: "Check text uniqueness" },
  "plagiarism-remover": { name: "Plagiarism Remover", desc: "Rewrite & humanize text" },
  "html-editor": { name: "HTML Editor", desc: "Live HTML/CSS/JS playground" },
  "html-tag-generator": { name: "Tag Generator", desc: "Add or strip HTML tags" },
};

/* ── Related Tools Map ────────────────────────────────── */
const RELATED: Record<string, string[]> = {
  "json-formatter": ["diff-checker", "regex-tester", "html-editor", "schema-markup-generator"],
  "password-generator": ["hash-generator", "uuid-generator", "jwt-decoder"],
  "meta-tag-generator": ["og-preview", "schema-markup-generator", "robots-txt-generator", "slug-generator"],
  "base64-encoder-decoder": ["url-encoder-decoder", "hash-generator", "jwt-decoder"],
  "word-counter": ["ai-content-detector", "plagiarism-checker", "diff-checker", "html-tag-generator"],
  "llms-txt-generator-validator": ["robots-txt-generator", "schema-markup-generator", "meta-tag-generator"],
  "regex-tester": ["json-formatter", "diff-checker", "html-editor", "slug-generator"],
  "jwt-decoder": ["base64-encoder-decoder", "hash-generator", "uuid-generator", "password-generator"],
  "hash-generator": ["password-generator", "base64-encoder-decoder", "uuid-generator"],
  "uuid-generator": ["password-generator", "hash-generator", "slug-generator"],
  "timestamp-converter": ["url-encoder-decoder", "base64-encoder-decoder", "slug-generator"],
  "url-encoder-decoder": ["base64-encoder-decoder", "slug-generator", "meta-tag-generator"],
  "diff-checker": ["json-formatter", "word-counter", "regex-tester", "plagiarism-checker"],
  "og-preview": ["meta-tag-generator", "schema-markup-generator", "slug-generator"],
  "robots-txt-generator": ["llms-txt-generator-validator", "meta-tag-generator", "schema-markup-generator"],
  "schema-markup-generator": ["meta-tag-generator", "og-preview", "robots-txt-generator", "llms-txt-generator-validator"],
  "slug-generator": ["url-encoder-decoder", "meta-tag-generator", "word-counter"],
  "css-gradient-generator": ["color-converter", "box-shadow-generator", "html-editor"],
  "color-converter": ["css-gradient-generator", "box-shadow-generator", "html-editor"],
  "box-shadow-generator": ["css-gradient-generator", "color-converter", "html-editor"],
  "ai-content-detector": ["plagiarism-remover", "plagiarism-checker", "word-counter"],
  "plagiarism-checker": ["plagiarism-remover", "ai-content-detector", "word-counter", "diff-checker"],
  "plagiarism-remover": ["plagiarism-checker", "ai-content-detector", "word-counter"],
  "html-editor": ["html-tag-generator", "css-gradient-generator", "json-formatter", "diff-checker"],
  "html-tag-generator": ["html-editor", "word-counter", "diff-checker", "slug-generator"],
};

export function RelatedTools() {
  const pathname = usePathname();
  if (!pathname || pathname === "/tools") return null;

  const slug = pathname.replace("/tools/", "").replace(/\/$/, "");
  const relatedSlugs = RELATED[slug];
  if (!relatedSlugs || relatedSlugs.length === 0) return null;

  const tools = relatedSlugs
    .map((s) => ({ slug: s, ...TOOLS[s] }))
    .filter((t) => t.name);

  if (tools.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-12">
      <div className="border-t border-border pt-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="w-1 h-6 bg-primary rounded-full" />
            Related Tools
          </h2>
          <Link
            href="/tools"
            className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
          >
            All Tools <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tools.slice(0, 4).map((tool) => (
            <Link
              key={tool.slug}
              href={`/tools/${tool.slug}`}
              className="group p-4 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-md transition-all"
            >
              <h3 className="font-semibold text-sm group-hover:text-primary transition-colors mb-1">
                {tool.name}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {tool.desc}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
