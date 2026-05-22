import type { Metadata } from "next";
import Link from "next/link";
import {
  Braces,
  KeyRound,
  Tags,
  Binary,
  Type,
  FileText,
  Regex,
  ShieldCheck,
  Hash,
  Fingerprint,
  Clock,
  Link2,
  GitCompareArrows,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Free Developer Tools - ByteVerse",
  description:
    "Free online tools for developers. JSON formatter, password generator, meta tag generator, Base64 encoder, word counter, and more. Fast, private, no sign-up.",
  keywords: [
    "developer tools",
    "free online tools",
    "web tools",
    "coding tools",
    "json formatter",
    "password generator",
    "regex tester",
    "jwt decoder",
    "hash generator",
    "uuid generator",
    "timestamp converter",
    "url encoder",
    "diff checker",
  ],
  alternates: { canonical: "https://www.byteverse.fyi/tools" },
};

const tools = [
  {
    title: "JSON Formatter & Validator",
    description:
      "Format, validate, and minify JSON with syntax error detection. Supports 2-space and 4-space indentation.",
    href: "/tools/json-formatter",
    icon: Braces,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    title: "Password Generator",
    description:
      "Generate strong, random passwords with customizable length and character options. Uses Web Crypto API.",
    href: "/tools/password-generator",
    icon: KeyRound,
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    title: "Meta Tag Generator",
    description:
      "Generate SEO meta tags with live Google and social media previews. Open Graph and Twitter Cards included.",
    href: "/tools/meta-tag-generator",
    icon: Tags,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    title: "Base64 Encoder & Decoder",
    description:
      "Encode text to Base64 or decode Base64 back to text. Full UTF-8 support for international characters.",
    href: "/tools/base64-encoder-decoder",
    icon: Binary,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    title: "Word & Character Counter",
    description:
      "Count words, characters, sentences, paragraphs, and reading time. Includes case conversion tools.",
    href: "/tools/word-counter",
    icon: Type,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
  {
    title: "llms.txt Generator & Validator",
    description:
      "Create and validate llms.txt files. Check format compliance, detect issues, and help AI models understand your site.",
    href: "/tools/llms-txt-generator-validator",
    icon: FileText,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  {
    title: "Regex Tester",
    description:
      "Test regular expressions with live highlighting, match details, replace mode, and a quick reference cheat sheet.",
    href: "/tools/regex-tester",
    icon: Regex,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    title: "JWT Decoder",
    description:
      "Decode JSON Web Tokens instantly. View header, payload, signature, expiration status, and registered claims.",
    href: "/tools/jwt-decoder",
    icon: ShieldCheck,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  {
    title: "Hash Generator",
    description:
      "Generate SHA-1, SHA-256, SHA-384, and SHA-512 hashes using the Web Crypto API. Compare and verify hashes.",
    href: "/tools/hash-generator",
    icon: Hash,
    color: "text-teal-500",
    bg: "bg-teal-500/10",
  },
  {
    title: "UUID Generator",
    description:
      "Generate UUID v4 (random) and v1-like (time-based) identifiers. Bulk generation and UUID validation included.",
    href: "/tools/uuid-generator",
    icon: Fingerprint,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
  },
  {
    title: "Unix Timestamp Converter",
    description:
      "Convert Unix timestamps to human-readable dates and vice versa. Supports seconds and milliseconds.",
    href: "/tools/timestamp-converter",
    icon: Clock,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  {
    title: "URL Encoder & Decoder",
    description:
      "Encode or decode URLs with component and full URI modes. Includes a URL parser to break down any URL.",
    href: "/tools/url-encoder-decoder",
    icon: Link2,
    color: "text-sky-500",
    bg: "bg-sky-500/10",
  },
  {
    title: "Diff Checker",
    description:
      "Compare two texts side by side with line-by-line diff. See additions, deletions, and unchanged lines.",
    href: "/tools/diff-checker",
    icon: GitCompareArrows,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
];

export default function ToolsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          Free Developer Tools
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
          Fast, private, no sign-up required. Every tool runs entirely in your
          browser - no data is sent to any server.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group p-6 bg-card border border-border rounded-xl card-hover"
          >
            <div
              className={`inline-flex p-3 rounded-lg mb-4 ${tool.bg}`}
            >
              <tool.icon size={24} className={tool.color} />
            </div>
            <h2 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
              {tool.title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {tool.description}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
