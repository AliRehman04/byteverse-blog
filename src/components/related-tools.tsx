"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight, Braces, KeyRound, Tags, Binary, Type, FileText,
  Regex, Hash, Fingerprint, Clock, Link2, GitCompareArrows,
  Eye, Code, TextCursorInput, Paintbrush, Pipette, Square,
  Brain, FileSearch, CodeXml, RemoveFormatting, Wand2, FileCode,
  Video, Speech, QrCode, Clock3, FileImage,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ── Tool Metadata ────────────────────────────────────── */
const TOOLS: Record<string, { name: string; desc: string; icon: LucideIcon; color: string }> = {
  "json-formatter": { name: "JSON Formatter", desc: "Format, validate & minify JSON", icon: Braces, color: "text-blue-500" },
  "password-generator": { name: "Password Generator", desc: "Strong random passwords", icon: KeyRound, color: "text-emerald-500" },
  "meta-tag-generator": { name: "Meta Tag Generator", desc: "SEO meta tags with preview", icon: Tags, color: "text-violet-500" },
  "base64-encoder-decoder": { name: "Base64 Encoder", desc: "Encode & decode Base64", icon: Binary, color: "text-orange-500" },
  "word-counter": { name: "Word Counter", desc: "Words, chars & reading time", icon: Type, color: "text-pink-500" },
  "llms-txt-generator-validator": { name: "llms.txt Validator", desc: "Generate & validate llms.txt", icon: FileText, color: "text-teal-500" },
  "regex-tester": { name: "Regex Tester", desc: "Test patterns with live highlighting", icon: Regex, color: "text-amber-500" },
  "jwt-decoder": { name: "JWT Decoder", desc: "Decode & inspect JSON Web Tokens", icon: FileText, color: "text-rose-500" },
  "hash-generator": { name: "Hash Generator", desc: "SHA-256, SHA-512 hashes", icon: Hash, color: "text-cyan-500" },
  "uuid-generator": { name: "UUID Generator", desc: "Generate & validate UUIDs", icon: Fingerprint, color: "text-indigo-500" },
  "timestamp-converter": { name: "Timestamp Converter", desc: "Unix timestamps ↔ dates", icon: Clock, color: "text-sky-500" },
  "url-encoder-decoder": { name: "URL Encoder", desc: "Encode & decode URLs", icon: Link2, color: "text-lime-500" },
  "diff-checker": { name: "Diff Checker", desc: "Compare texts side by side", icon: GitCompareArrows, color: "text-purple-500" },
  "og-preview": { name: "OG Preview", desc: "Social media link card preview", icon: Eye, color: "text-fuchsia-500" },
  "robots-txt-generator": { name: "robots.txt Generator", desc: "Build robots.txt visually", icon: FileText, color: "text-green-500" },
  "schema-markup-generator": { name: "Schema Markup", desc: "JSON-LD structured data", icon: Code, color: "text-yellow-500" },
  "slug-generator": { name: "Slug Generator", desc: "URL-friendly text slugs", icon: TextCursorInput, color: "text-stone-500" },
  "css-gradient-generator": { name: "Gradient Generator", desc: "Linear & radial CSS gradients", icon: Paintbrush, color: "text-red-500" },
  "color-converter": { name: "Color Converter", desc: "HEX, RGB & HSL conversion", icon: Pipette, color: "text-rose-500" },
  "box-shadow-generator": { name: "Box Shadow", desc: "Visual CSS shadow builder", icon: Square, color: "text-slate-500" },
  "ai-content-detector": { name: "AI Content Detector", desc: "Detect AI-generated text", icon: Brain, color: "text-pink-500" },
  "ai-prompt-generator": { name: "AI Prompt Generator", desc: "Build better prompts for AI tools", icon: Wand2, color: "text-violet-500" },
  "ai-cv-builder": { name: "AI CV Builder", desc: "Create modern CVs and PDFs", icon: FileText, color: "text-emerald-500" },
  "plagiarism-checker": { name: "Plagiarism Checker", desc: "Check text uniqueness", icon: FileSearch, color: "text-emerald-500" },
  "plagiarism-remover": { name: "Plagiarism Remover", desc: "Rewrite & humanize text", icon: Wand2, color: "text-fuchsia-500" },
  "html-editor": { name: "HTML Editor", desc: "Live HTML/CSS/JS playground", icon: CodeXml, color: "text-orange-500" },
  "html-tag-generator": { name: "Tag Generator", desc: "Add or strip HTML tags", icon: RemoveFormatting, color: "text-cyan-500" },
  "code-formatter": { name: "Code Formatter", desc: "Format & beautify code", icon: FileCode, color: "text-emerald-500" },
  "youtube-tag-generator": { name: "YouTube Tag Generator", desc: "Generate optimized YouTube tags", icon: Video, color: "text-red-500" },
  "text-to-speech": { name: "Text to Speech", desc: "Convert text to speech online", icon: Speech, color: "text-teal-500" },
  "qr-code-generator": { name: "QR Code Generator", desc: "Generate custom QR codes", icon: QrCode, color: "text-indigo-500" },
  "image-compressor": { name: "Image Compressor", desc: "Compress and resize images", icon: FileImage, color: "text-sky-500" },
  "cron-expression-generator": { name: "Cron Expression Generator", desc: "Build cron schedules visually", icon: Clock3, color: "text-amber-500" },
};

/* ── Related Tools Map ────────────────────────────────── */
const RELATED: Record<string, string[]> = {
  "json-formatter": ["diff-checker", "regex-tester", "html-editor", "schema-markup-generator"],
  "password-generator": ["hash-generator", "uuid-generator", "jwt-decoder"],
  "meta-tag-generator": ["og-preview", "schema-markup-generator", "robots-txt-generator", "youtube-tag-generator"],
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
  "slug-generator": ["url-encoder-decoder", "meta-tag-generator", "word-counter", "youtube-tag-generator"],
  "css-gradient-generator": ["color-converter", "box-shadow-generator", "html-editor"],
  "color-converter": ["css-gradient-generator", "box-shadow-generator", "html-editor"],
  "box-shadow-generator": ["css-gradient-generator", "color-converter", "html-editor"],
  "ai-content-detector": ["plagiarism-remover", "plagiarism-checker", "word-counter", "text-to-speech"],
  "ai-prompt-generator": ["word-counter", "ai-content-detector", "plagiarism-remover", "text-to-speech"],
  "ai-cv-builder": ["ai-prompt-generator", "word-counter", "plagiarism-remover", "text-to-speech"],
  "plagiarism-checker": ["plagiarism-remover", "ai-content-detector", "word-counter", "diff-checker"],
  "plagiarism-remover": ["plagiarism-checker", "ai-content-detector", "word-counter", "text-to-speech"],
  "html-editor": ["html-tag-generator", "css-gradient-generator", "json-formatter", "diff-checker"],
  "html-tag-generator": ["html-editor", "word-counter", "diff-checker", "slug-generator"],
  "code-formatter": ["json-formatter", "html-editor", "diff-checker", "regex-tester"],
  "youtube-tag-generator": ["meta-tag-generator", "slug-generator", "og-preview", "word-counter"],
  "text-to-speech": ["word-counter", "ai-content-detector", "plagiarism-remover", "slug-generator"],
  "qr-code-generator": ["image-compressor", "base64-encoder-decoder", "url-encoder-decoder", "color-converter"],
  "image-compressor": ["color-converter", "qr-code-generator", "css-gradient-generator", "og-preview"],
  "cron-expression-generator": ["timestamp-converter", "regex-tester", "code-formatter", "json-formatter"],
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
      <div className="relative border-t border-border pt-10">
        {/* Section header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
              <ArrowRight size={16} className="text-primary" />
            </span>
            Related Tools
          </h2>
          <Link
            href="/tools"
            className="group text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
          >
            All Tools
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Tool cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tools.slice(0, 4).map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.slug}
                href={`/tools/${tool.slug}`}
                className="group relative p-5 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3 group-hover:scale-110 transition-transform ${tool.color}`}>
                  <Icon size={20} />
                </div>
                {/* Text */}
                <h3 className="font-semibold text-sm group-hover:text-primary transition-colors mb-1">
                  {tool.name}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {tool.desc}
                </p>
                {/* Arrow indicator */}
                <ArrowRight
                  size={14}
                  className="absolute top-5 right-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
