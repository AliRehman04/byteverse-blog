import {
  Braces, KeyRound, Tags, Binary, Type, FileText, Regex, ShieldCheck,
  Hash, Fingerprint, Clock, Link2, GitCompareArrows, Eye, Bot, Code,
  TextCursorInput, Paintbrush, Pipette, Square, Brain, FileSearch,
  CodeXml, RemoveFormatting, Wand2, FileCode, Video, Speech, QrCode,
  Clock3, Sparkles, FileImage, BarChart3, AlignLeft, FileDown,
  Table2, ScrollText, FileType, Rows3, FileSpreadsheet,
} from "lucide-react";

export const toolCategories = [
  { title: "Formatters & Dev", icon: Braces, color: "text-blue-500" },
  { title: "Encoders & Converters", icon: Binary, color: "text-orange-500" },
  { title: "Security & Crypto", icon: ShieldCheck, color: "text-green-500" },
  { title: "SEO & Web", icon: Tags, color: "text-purple-500" },
  { title: "Content Analysis", icon: Brain, color: "text-pink-500" },
  { title: "CSS & Design", icon: Paintbrush, color: "text-red-500" },
] as const;

type ToolCategory = (typeof toolCategories)[number]["title"];

interface ToolEntry {
  slug: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: typeof Braces;
  color: string;
  bg: string;
}

export const toolCatalog: readonly ToolEntry[] = [
  { slug: "json-formatter", name: "JSON Formatter & Validator", description: "Format, validate and minify JSON with syntax error feedback and adjustable indentation.", category: "Formatters & Dev", icon: Braces, color: "text-blue-500", bg: "bg-blue-500/10" },
  { slug: "password-generator", name: "Password Generator", description: "Generate random passwords with Web Crypto and configurable length and character options.", category: "Security & Crypto", icon: KeyRound, color: "text-green-500", bg: "bg-green-500/10" },
  { slug: "meta-tag-generator", name: "Meta Tag Generator", description: "Build title, description, Open Graph and Twitter Card tags with illustrative previews.", category: "SEO & Web", icon: Tags, color: "text-purple-500", bg: "bg-purple-500/10" },
  { slug: "seo-title-analyzer", name: "SEO Title Checker", description: "Measure title characters and approximate pixels, preview desktop/mobile snippets and compare three drafts.", category: "SEO & Web", icon: BarChart3, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { slug: "base64-encoder-decoder", name: "Base64 Encoder & Decoder", description: "Encode UTF-8 text to Base64 or decode it back to text in your browser.", category: "Encoders & Converters", icon: Binary, color: "text-orange-500", bg: "bg-orange-500/10" },
  { slug: "word-counter", name: "Word & Character Counter", description: "Count words, characters, sentences and paragraphs with estimated reading time.", category: "Content Analysis", icon: Type, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { slug: "readability-checker", name: "Readability Checker", description: "Estimate English reading ease and grade level, and review long sentences and complex words.", category: "Content Analysis", icon: BarChart3, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { slug: "llms-txt-generator-validator", name: "llms.txt Generator & Validator", description: "Draft and check llms.txt structure. Website discovery and URL checks use server requests.", category: "SEO & Web", icon: FileText, color: "text-rose-500", bg: "bg-rose-500/10" },
  { slug: "regex-tester", name: "Regex Tester", description: "Test JavaScript regular expressions with match highlighting, flags and replacement previews.", category: "Formatters & Dev", icon: Regex, color: "text-amber-500", bg: "bg-amber-500/10" },
  { slug: "jwt-decoder", name: "JWT Decoder", description: "Inspect token headers, payloads and expiry. Decoding does not verify the signature or establish trust.", category: "Security & Crypto", icon: ShieldCheck, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { slug: "hash-generator", name: "Hash Generator", description: "Compute and compare SHA-1, SHA-256, SHA-384 and SHA-512 digests with Web Crypto.", category: "Security & Crypto", icon: Hash, color: "text-teal-500", bg: "bg-teal-500/10" },
  { slug: "uuid-generator", name: "UUID Generator", description: "Generate random v4 UUIDs in bulk or try the clearly labeled experimental v1-like mode.", category: "Security & Crypto", icon: Fingerprint, color: "text-pink-500", bg: "bg-pink-500/10" },
  { slug: "timestamp-converter", name: "Unix Timestamp Converter", description: "Convert Unix seconds or milliseconds to dates and back, with UTC and local-time views.", category: "Encoders & Converters", icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  { slug: "url-encoder-decoder", name: "URL Encoder & Decoder", description: "Encode or decode URLs and query components, and inspect a URL's individual parts.", category: "Encoders & Converters", icon: Link2, color: "text-sky-500", bg: "bg-sky-500/10" },
  { slug: "diff-checker", name: "Diff Checker", description: "Compare two pasted texts and see line-by-line additions, deletions and unchanged content.", category: "Formatters & Dev", icon: GitCompareArrows, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { slug: "og-preview", name: "Open Graph Preview", description: "Mock up social share cards from your title, description and image. This is not a live URL audit.", category: "SEO & Web", icon: Eye, color: "text-violet-500", bg: "bg-violet-500/10" },
  { slug: "robots-txt-generator", name: "robots.txt Generator", description: "Build crawler directives with user-agent groups, allow/disallow rules and sitemap URLs.", category: "SEO & Web", icon: Bot, color: "text-slate-500", bg: "bg-slate-500/10" },
  { slug: "schema-markup-generator", name: "Schema Markup Generator", description: "Build JSON-LD for articles, products, businesses and more; validate eligibility before publishing.", category: "SEO & Web", icon: Code, color: "text-fuchsia-500", bg: "bg-fuchsia-500/10" },
  { slug: "slug-generator", name: "Slug Generator", description: "Turn Latin-script titles into URL slugs with separator and case options; review non-Latin text manually.", category: "Encoders & Converters", icon: TextCursorInput, color: "text-lime-500", bg: "bg-lime-500/10" },
  { slug: "css-gradient-generator", name: "CSS Gradient Generator", description: "Create linear and radial CSS gradients with multiple color stops and a live preview.", category: "CSS & Design", icon: Paintbrush, color: "text-red-500", bg: "bg-red-500/10" },
  { slug: "color-converter", name: "Color Converter", description: "Convert HEX, RGB and HSL values using a visual picker and editable color controls.", category: "CSS & Design", icon: Pipette, color: "text-pink-400", bg: "bg-pink-400/10" },
  { slug: "box-shadow-generator", name: "Box Shadow Generator", description: "Build layered CSS shadows and adjust offset, blur, spread, color and opacity.", category: "CSS & Design", icon: Square, color: "text-stone-500", bg: "bg-stone-500/10" },
  { slug: "ai-content-detector", name: "AI Content Detector", description: "Explore heuristic writing-style signals. Results cannot establish whether text was written by AI.", category: "Content Analysis", icon: Brain, color: "text-pink-500", bg: "bg-pink-500/10" },
  { slug: "plagiarism-checker", name: "Similarity & Plagiarism Checker", description: "Compare supplied texts for overlap. This is not an internet-wide plagiarism or originality check.", category: "Content Analysis", icon: FileSearch, color: "text-rose-500", bg: "bg-rose-500/10" },
  { slug: "html-editor", name: "Live HTML Editor", description: "Try HTML, CSS and JavaScript with a sandboxed preview, starter templates and layout controls.", category: "Formatters & Dev", icon: CodeXml, color: "text-orange-500", bg: "bg-orange-500/10" },
  { slug: "html-tag-generator", name: "HTML Tag Generator & Remover", description: "Wrap plain text in basic HTML tags or strip tags to recover text for editing.", category: "Formatters & Dev", icon: RemoveFormatting, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { slug: "plagiarism-remover", name: "Text Rewriter & Paraphrasing Tool", description: "Try local rephrasing or optional server-based AI rewriting. Rewriting does not remove citation obligations.", category: "Content Analysis", icon: Wand2, color: "text-fuchsia-500", bg: "bg-fuchsia-500/10" },
  { slug: "code-formatter", name: "Code Formatter & Beautifier", description: "Format JSON and try basic formatting for other languages. Review output before using it in production.", category: "Formatters & Dev", icon: FileCode, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { slug: "youtube-tag-generator", name: "YouTube Tag Generator", description: "Brainstorm tag ideas from a video title. Suggestions are not search-volume data or ranking forecasts.", category: "Content Analysis", icon: Video, color: "text-red-500", bg: "bg-red-500/10" },
  { slug: "text-to-speech", name: "Text to Speech Reader", description: "Listen to text using voices available in your browser or OS. Voice availability varies; there is no MP3 export.", category: "Content Analysis", icon: Speech, color: "text-teal-500", bg: "bg-teal-500/10" },
  { slug: "qr-code-generator", name: "QR Code Generator", description: "Create QR codes for URLs, text, Wi-Fi and email, then download PNG or SVG output.", category: "Encoders & Converters", icon: QrCode, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { slug: "image-compressor", name: "Image Compressor", description: "Resize and re-encode JPG, PNG and WebP images in your browser, comparing input and output sizes.", category: "CSS & Design", icon: FileImage, color: "text-sky-500", bg: "bg-sky-500/10" },
  { slug: "cron-expression-generator", name: "Cron Expression Generator", description: "Build five-field cron expressions from schedule presets and review the generated syntax.", category: "Formatters & Dev", icon: Clock3, color: "text-amber-500", bg: "bg-amber-500/10" },
  { slug: "ai-prompt-generator", name: "AI Prompt Generator", description: "Assemble structured prompt templates with a goal, context, tone and constraints; no AI request is needed.", category: "Content Analysis", icon: Sparkles, color: "text-violet-500", bg: "bg-violet-500/10" },
  { slug: "ai-cv-builder", name: "AI CV Builder", description: "Edit a CV with templates and PDF export. Optional AI writing features send the supplied text to a server.", category: "Content Analysis", icon: FileText, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { slug: "lorem-ipsum-generator", name: "Lorem Ipsum Generator", description: "Generate placeholder words, sentences or paragraphs with optional HTML wrapping.", category: "Formatters & Dev", icon: AlignLeft, color: "text-stone-500", bg: "bg-stone-500/10" },
  { slug: "markdown-to-html", name: "Markdown to HTML Converter", description: "Convert basic Markdown into HTML for review and copying; inspect complex documents before publishing.", category: "Encoders & Converters", icon: FileDown, color: "text-blue-500", bg: "bg-blue-500/10" },
  { slug: "json-to-csv", name: "JSON to CSV Converter", description: "Convert JSON objects and arrays to CSV or TSV, with nested-object flattening and delimiter options.", category: "Encoders & Converters", icon: Table2, color: "text-green-500", bg: "bg-green-500/10" },
  { slug: "invoice-pdf-to-excel", name: "Invoice PDF to Excel", description: "Extract summary fields from selectable-text invoice PDFs, review each invoice and export XLSX or CSV locally. No OCR.", category: "Encoders & Converters", icon: FileSpreadsheet, color: "text-teal-600", bg: "bg-teal-500/10" },
  { slug: "privacy-policy-generator", name: "Privacy Policy Template Generator", description: "Draft an editable website policy template. Review it against your real data practices and legal requirements.", category: "SEO & Web", icon: ScrollText, color: "text-purple-500", bg: "bg-purple-500/10" },
  { slug: "json-to-typescript", name: "JSON to TypeScript Converter", description: "Draft interfaces or type aliases from a JSON sample. Review inferred optional fields and mixed arrays.", category: "Formatters & Dev", icon: FileType, color: "text-sky-500", bg: "bg-sky-500/10" },
  { slug: "flexbox-generator", name: "CSS Flexbox Generator", description: "Explore flex direction, alignment, wrapping and gaps with a live layout preview and copyable CSS.", category: "CSS & Design", icon: Rows3, color: "text-violet-500", bg: "bg-violet-500/10" },
];

export const relatedToolSlugs: Readonly<Record<string, readonly string[]>> = {
  "json-formatter": ["json-to-csv", "json-to-typescript", "diff-checker", "code-formatter"],
  "password-generator": ["hash-generator", "uuid-generator", "jwt-decoder"],
  "meta-tag-generator": ["seo-title-analyzer", "og-preview", "schema-markup-generator", "robots-txt-generator"],
  "seo-title-analyzer": ["meta-tag-generator", "readability-checker", "og-preview", "word-counter"],
  "base64-encoder-decoder": ["url-encoder-decoder", "jwt-decoder", "hash-generator"],
  "word-counter": ["readability-checker", "diff-checker", "text-to-speech", "ai-prompt-generator"],
  "readability-checker": ["word-counter", "seo-title-analyzer", "text-to-speech", "diff-checker"],
  "llms-txt-generator-validator": ["robots-txt-generator", "schema-markup-generator", "markdown-to-html", "meta-tag-generator"],
  "regex-tester": ["diff-checker", "json-formatter", "code-formatter", "slug-generator"],
  "jwt-decoder": ["base64-encoder-decoder", "timestamp-converter", "hash-generator", "uuid-generator"],
  "hash-generator": ["password-generator", "base64-encoder-decoder", "uuid-generator"],
  "uuid-generator": ["password-generator", "hash-generator", "timestamp-converter"],
  "timestamp-converter": ["cron-expression-generator", "jwt-decoder", "uuid-generator"],
  "url-encoder-decoder": ["base64-encoder-decoder", "slug-generator", "qr-code-generator", "meta-tag-generator"],
  "diff-checker": ["json-formatter", "word-counter", "regex-tester", "plagiarism-checker"],
  "og-preview": ["meta-tag-generator", "seo-title-analyzer", "image-compressor", "schema-markup-generator"],
  "robots-txt-generator": ["llms-txt-generator-validator", "meta-tag-generator", "schema-markup-generator", "privacy-policy-generator"],
  "schema-markup-generator": ["meta-tag-generator", "json-formatter", "robots-txt-generator", "llms-txt-generator-validator"],
  "slug-generator": ["url-encoder-decoder", "meta-tag-generator", "word-counter", "seo-title-analyzer"],
  "css-gradient-generator": ["color-converter", "box-shadow-generator", "flexbox-generator", "html-editor"],
  "color-converter": ["css-gradient-generator", "box-shadow-generator", "image-compressor", "flexbox-generator"],
  "box-shadow-generator": ["css-gradient-generator", "color-converter", "flexbox-generator", "html-editor"],
  "ai-content-detector": ["readability-checker", "word-counter", "diff-checker", "plagiarism-checker"],
  "plagiarism-checker": ["diff-checker", "word-counter", "readability-checker", "plagiarism-remover"],
  "html-editor": ["html-tag-generator", "markdown-to-html", "flexbox-generator", "lorem-ipsum-generator"],
  "html-tag-generator": ["html-editor", "markdown-to-html", "word-counter", "diff-checker"],
  "plagiarism-remover": ["diff-checker", "plagiarism-checker", "readability-checker", "word-counter"],
  "code-formatter": ["json-formatter", "html-editor", "diff-checker", "regex-tester"],
  "youtube-tag-generator": ["word-counter", "ai-prompt-generator", "meta-tag-generator", "image-compressor"],
  "text-to-speech": ["word-counter", "readability-checker", "ai-prompt-generator", "ai-cv-builder"],
  "qr-code-generator": ["image-compressor", "url-encoder-decoder", "color-converter"],
  "image-compressor": ["og-preview", "qr-code-generator", "color-converter", "meta-tag-generator"],
  "cron-expression-generator": ["timestamp-converter", "regex-tester", "code-formatter", "json-formatter"],
  "ai-prompt-generator": ["word-counter", "readability-checker", "text-to-speech", "youtube-tag-generator"],
  "ai-cv-builder": ["word-counter", "readability-checker", "ai-prompt-generator", "text-to-speech"],
  "lorem-ipsum-generator": ["html-editor", "word-counter", "flexbox-generator", "html-tag-generator"],
  "markdown-to-html": ["html-editor", "html-tag-generator", "diff-checker", "word-counter"],
  "json-to-csv": ["json-formatter", "json-to-typescript", "diff-checker", "invoice-pdf-to-excel"],
  "invoice-pdf-to-excel": ["json-to-csv", "json-formatter", "diff-checker"],
  "privacy-policy-generator": ["robots-txt-generator", "meta-tag-generator", "html-tag-generator", "word-counter"],
  "json-to-typescript": ["json-formatter", "json-to-csv", "code-formatter", "diff-checker"],
  "flexbox-generator": ["html-editor", "css-gradient-generator", "box-shadow-generator", "color-converter"],
};

export function getRelatedTools(slug: string) {
  return (relatedToolSlugs[slug] || [])
    .map((relatedSlug) => toolCatalog.find((tool) => tool.slug === relatedSlug))
    .filter((tool): tool is ToolEntry => Boolean(tool));
}