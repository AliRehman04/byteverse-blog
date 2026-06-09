import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/config";
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
  Eye,
  Bot,
  Code,
  TextCursorInput,
  Paintbrush,
  Pipette,
  Square,
  Brain,
  FileSearch,
  CodeXml,
  RemoveFormatting,
  Wand2,
  FileCode,
  Video,
  Speech,
  QrCode,
  Clock3,
  Sparkles,
  FileImage,
  BarChart3,
  AlignLeft,
  FileDown,
  Table2,
  ScrollText,
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
  alternates: { canonical: `${siteConfig.url}/tools` },
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
    title: "SEO Title Analyzer",
    description:
      "Score blog titles for length, intent words, specificity, and click potential. Useful for improving search impressions into clicks.",
    href: "/tools/seo-title-analyzer",
    icon: BarChart3,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
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
  {
    title: "Open Graph Preview",
    description:
      "Preview how your links appear on Google, Facebook, LinkedIn, and Twitter/X. Generate Open Graph and Twitter Card meta tags.",
    href: "/tools/og-preview",
    icon: Eye,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    title: "robots.txt Generator",
    description:
      "Build robots.txt files visually with user-agent groups, allow/disallow rules, sitemaps, and crawl delays.",
    href: "/tools/robots-txt-generator",
    icon: Bot,
    color: "text-slate-500",
    bg: "bg-slate-500/10",
  },
  {
    title: "Schema Markup Generator",
    description:
      "Generate JSON-LD structured data for Article, FAQ, HowTo, Product, LocalBusiness, Breadcrumb, and more.",
    href: "/tools/schema-markup-generator",
    icon: Code,
    color: "text-fuchsia-500",
    bg: "bg-fuchsia-500/10",
  },
  {
    title: "Slug Generator",
    description:
      "Convert any text into a clean, URL-friendly slug. Handles accented characters, special symbols, and unicode.",
    href: "/tools/slug-generator",
    icon: TextCursorInput,
    color: "text-lime-500",
    bg: "bg-lime-500/10",
  },
  {
    title: "CSS Gradient Generator",
    description:
      "Create beautiful linear and radial CSS gradients with multiple color stops, angle controls, and presets.",
    href: "/tools/css-gradient-generator",
    icon: Paintbrush,
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
  {
    title: "Color Converter",
    description:
      "Convert colors between HEX, RGB, and HSL formats. Visual color picker with sliders and live preview.",
    href: "/tools/color-converter",
    icon: Pipette,
    color: "text-pink-400",
    bg: "bg-pink-400/10",
  },
  {
    title: "Box Shadow Generator",
    description:
      "Build CSS box-shadow effects visually. Stack multiple layers, adjust blur, spread, color, and opacity.",
    href: "/tools/box-shadow-generator",
    icon: Square,
    color: "text-stone-500",
    bg: "bg-stone-500/10",
  },
  {
    title: "AI Content Detector",
    description:
      "Detect AI-generated text using 8 linguistic signals. Check if content was written by ChatGPT, Claude, or other AI models.",
    href: "/tools/ai-content-detector",
    icon: Brain,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
  },
  {
    title: "Plagiarism Checker",
    description:
      "Check text uniqueness and compare documents for plagiarism. Uses n-gram analysis, cosine similarity, and sentence matching.",
    href: "/tools/plagiarism-checker",
    icon: FileSearch,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  {
    title: "Live HTML Editor",
    description:
      "Write HTML, CSS, and JavaScript with instant live preview. 7 templates, split layouts, mobile preview, and fullscreen mode.",
    href: "/tools/html-editor",
    icon: CodeXml,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    title: "HTML Tag Generator & Remover",
    description:
      "Add HTML tags to plain text or strip all tags from HTML. Supports paragraphs, headings, lists, links, bold, and custom tags.",
    href: "/tools/html-tag-generator",
    icon: RemoveFormatting,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
  {
    title: "Plagiarism Remover & AI Humanizer",
    description:
      "Rewrite text to remove plagiarism and humanize AI-generated content. Replaces AI phrases, swaps synonyms, and adds contractions.",
    href: "/tools/plagiarism-remover",
    icon: Wand2,
    color: "text-fuchsia-500",
    bg: "bg-fuchsia-500/10",
  },
  {
    title: "Code Formatter & Beautifier",
    description:
      "Format, beautify, and minify code instantly. Supports JSON, HTML, CSS, JavaScript, SQL, and XML.",
    href: "/tools/code-formatter",
    icon: FileCode,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    title: "YouTube Tag Generator",
    description:
      "Generate optimized YouTube tags instantly. Enter your video title or keyword and get SEO-friendly tags to boost rankings.",
    href: "/tools/youtube-tag-generator",
    icon: Video,
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
  {
    title: "Text to Speech Converter",
    description:
      "Convert text to speech online for free. Choose from 100+ voices, adjust speed, pitch, and volume. Runs entirely in your browser.",
    href: "/tools/text-to-speech",
    icon: Speech,
    color: "text-teal-500",
    bg: "bg-teal-500/10",
  },
  {
    title: "QR Code Generator",
    description:
      "Generate custom QR codes for URLs, text, WiFi, email, and more. Choose colors, size, and error correction level. Download as PNG or SVG.",
    href: "/tools/qr-code-generator",
    icon: QrCode,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  {
    title: "Image Compressor",
    description:
      "Compress, resize, and convert JPG, PNG, and WebP images in your browser. Preview savings and download optimized files.",
    href: "/tools/image-compressor",
    icon: FileImage,
    color: "text-sky-500",
    bg: "bg-sky-500/10",
  },
  {
    title: "Cron Expression Generator",
    description:
      "Build cron expressions visually for crontab schedules. Generate every-minute, daily, weekly, monthly, and custom cron syntax.",
    href: "/tools/cron-expression-generator",
    icon: Clock3,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    title: "AI Prompt Generator",
    description:
      "Build better prompts for ChatGPT, Claude, Gemini, coding assistants, marketing copy, and image generation with goals, tone, context, and constraints.",
    href: "/tools/ai-prompt-generator",
    icon: Sparkles,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    title: "AI CV Builder",
    description:
      "Create a modern CV online with visual and code modes, AI writing help, profile image upload, templates, customization, and PDF download.",
    href: "/tools/ai-cv-builder",
    icon: FileText,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    title: "Lorem Ipsum Generator",
    description:
      "Generate placeholder text for designs and layouts. Choose paragraphs, sentences, or words with customizable count and HTML wrapping.",
    href: "/tools/lorem-ipsum-generator",
    icon: AlignLeft,
    color: "text-stone-500",
    bg: "bg-stone-500/10",
  },
  {
    title: "Markdown to HTML Converter",
    description:
      "Convert Markdown to clean, semantic HTML instantly. Supports headings, bold, italic, code blocks, links, images, lists, and blockquotes.",
    href: "/tools/markdown-to-html",
    icon: FileDown,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    title: "JSON to CSV Converter",
    description:
      "Convert JSON arrays to CSV or TSV format. Supports nested objects, custom delimiters, file upload, and download.",
    href: "/tools/json-to-csv",
    icon: Table2,
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    title: "Privacy Policy Generator",
    description:
      "Generate a customized privacy policy for your website or app. Covers cookies, analytics, GDPR basics, and more. Download as Markdown.",
    href: "/tools/privacy-policy-generator",
    icon: ScrollText,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
];

export default function ToolsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Free Developer Tools",
    description: "Fast, private, no sign-up required. Free online tools for developers that run entirely in your browser.",
    url: "https://www.byteverse.fyi/tools",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: tools.length,
      itemListElement: tools.map((tool, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: tool.title,
        url: `https://www.byteverse.fyi${tool.href}`,
      })),
    },
  };

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
