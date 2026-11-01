import type { LucideIcon } from "lucide-react";
import { toolCatalog, toolCategories, type ToolCategory, type ToolEntry } from "@/lib/tool-catalog";

export const toolsHubMeta = {
  title: "Free Online Developer, Writing & SEO Tools",
  heading: "Free online tools for developers, writers and SEO",
  description: `Browse ${toolCatalog.length} free online tools for developers, writers and SEO: JSON, CSV, regex, hashes, meta tags, readability, image compression and more. No sign-up needed.`,
  intro: "Format JSON, repair CSV exports, test regular expressions, build meta tags, check readability and compress images. Open a tool and start; there is no account or install. Each page explains what runs in your browser and what uses a server.",
} as const;

export interface HubCategory {
  title: ToolCategory;
  id: string;
  blurb: string;
  tone: string;
  icon: LucideIcon;
}

const categoryDetails: Record<ToolCategory, Omit<HubCategory, "title" | "icon">> = {
  "Formatters & Dev": { id: "formatters-dev", blurb: "Format, compare and convert code and data while you build.", tone: "#2563eb" },
  "Encoders & Converters": { id: "encoders-converters", blurb: "Move data between formats such as Base64, CSV, JSON, Markdown and QR codes.", tone: "#ea580c" },
  "Security & Crypto": { id: "security-crypto", blurb: "Generate passwords, hashes and UUIDs, and inspect tokens with Web Crypto.", tone: "#059669" },
  "SEO & Web": { id: "seo-web", blurb: "Prepare titles, meta tags, structured data and crawler files before publishing.", tone: "#7c3aed" },
  "Content Analysis": { id: "content-analysis", blurb: "Count, compare, read aloud and review text before it goes out.", tone: "#db2777" },
  "CSS & Design": { id: "css-design", blurb: "Build gradients, shadows and flex layouts, convert colors and compress images.", tone: "#dc2626" },
};

export const hubCategories: readonly HubCategory[] = toolCategories.map((category) => ({
  title: category.title,
  icon: category.icon,
  ...categoryDetails[category.title],
}));

export function toolsInCategory(title: ToolCategory, catalog: readonly ToolEntry[] = toolCatalog) {
  return catalog.filter((tool) => tool.category === title);
}

// Tools upgraded in the October 2026 releases; highlights summarize shipped features only.
export const upgradedToolHighlights: readonly { slug: string; highlight: string }[] = [
  { slug: "csv-repair", highlight: "Fix delimiters, encodings and quotes, then export Excel-ready XLSX." },
  { slug: "csv-diff", highlight: "Compare exports by key and save local CSV or JSON reports." },
  { slug: "image-compressor", highlight: "Compress to a byte ceiling, convert formats and batch-export ZIPs." },
  { slug: "json-to-csv", highlight: "Choose rows, flatten nested fields and guard against formula injection." },
  { slug: "json-to-typescript", highlight: "Infer interfaces from JSON or JSON Lines and download declarations." },
  { slug: "plagiarism-checker", highlight: "Review source overlap in context and save TXT or HTML reports." },
];

export function getUpgradedTools(catalog: readonly ToolEntry[] = toolCatalog) {
  return upgradedToolHighlights.flatMap((entry) => {
    const tool = catalog.find((item) => item.slug === entry.slug);
    return tool ? [{ ...entry, tool }] : [];
  });
}

// Extra search words for intents the tool names do not spell out.
const searchAliases: Record<string, string> = {
  "json-formatter": "validate minify pretty print beautify lint",
  "code-formatter": "beautify prettify indent",
  "timestamp-converter": "epoch unix time date milliseconds",
  "hash-generator": "sha256 sha1 sha512 checksum digest",
  "password-generator": "random secure passphrase",
  "uuid-generator": "guid identifier",
  "jwt-decoder": "token claims expiry",
  "base64-encoder-decoder": "encode decode binary text",
  "url-encoder-decoder": "percent encoding query string",
  "og-preview": "open graph social card share preview",
  "meta-tag-generator": "title description open graph twitter card",
  "seo-title-analyzer": "serp preview title length pixels",
  "schema-markup-generator": "json-ld structured data rich results",
  "robots-txt-generator": "crawler disallow sitemap",
  "llms-txt-generator-validator": "ai crawlers llms.txt",
  "plagiarism-checker": "plagiarism similarity duplicate compare texts",
  "plagiarism-remover": "paraphrase rewrite humanize",
  "ai-content-detector": "ai detector writing signals",
  "diff-checker": "compare text changes",
  "csv-diff": "compare csv spreadsheets changes",
  "csv-repair": "fix csv delimiter encoding leading zeros excel",
  "json-to-csv": "convert export spreadsheet excel",
  "invoice-pdf-to-excel": "invoice pdf xlsx extract",
  "json-to-typescript": "interfaces types declarations",
  "image-compressor": "compress resize crop webp avif heic png jpg",
  "qr-code-generator": "qr wifi svg png",
  "color-converter": "hex rgb hsl picker",
  "css-gradient-generator": "linear radial background",
  "box-shadow-generator": "css shadow",
  "flexbox-generator": "css flex layout",
  "word-counter": "characters sentences reading time",
  "readability-checker": "grade level reading ease",
  "text-to-speech": "read aloud voice",
  "lorem-ipsum-generator": "placeholder text dummy",
  "markdown-to-html": "convert markdown",
  "html-editor": "live preview html css javascript playground",
  "html-tag-generator": "strip tags wrap text",
  "cron-expression-generator": "schedule cron job",
  "regex-tester": "regular expression match replace",
  "slug-generator": "url slug permalink",
  "youtube-tag-generator": "video tags ideas",
  "ai-prompt-generator": "prompt template",
  "ai-cv-builder": "resume cv pdf",
  "privacy-policy-generator": "policy template gdpr",
};

export interface DirectoryTool {
  slug: string;
  name: string;
  description: string;
  category: ToolCategory;
  terms: string;
}

export function toDirectoryTools(catalog: readonly ToolEntry[] = toolCatalog): DirectoryTool[] {
  return catalog.map(({ slug, name, description, category }) => ({
    slug, name, description, category,
    terms: `${name} ${category} ${description} ${slug.replace(/-/g, " ")} ${searchAliases[slug] ?? ""}`.toLowerCase(),
  }));
}

export function filterDirectoryTools(tools: readonly DirectoryTool[], query: string, category: ToolCategory | "all") {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return tools.filter((tool) => (category === "all" || tool.category === category) && words.every((word) => tool.terms.includes(word)));
}

export const toolsHubFaqs: readonly { question: string; answer: string }[] = [
  {
    question: "Are the ByteVerse tools free to use?",
    answer: "Yes. Every tool on this page is free, and none of them needs an account or an installation. The site shows advertising and uses analytics, which the privacy policy describes.",
  },
  {
    question: "Do the tools upload my files or text?",
    answer: "It depends on the tool. Formatters, converters and generators, plus the CSV, image and comparison tools, process your input in your browser. Optional AI rewriting, AI CV writing, llms.txt website discovery and speech voices use server or external services, and each tool page states this before you use the feature.",
  },
  {
    question: "Which tool should I use for CSV or JSON files?",
    answer: "Use the JSON Formatter to validate and tidy JSON, JSON to CSV to build spreadsheet exports, JSON to TypeScript to generate types, CSV Repair to fix broken delimiters or encodings, CSV Diff to compare two exports by key, and Invoice PDF to Excel to turn selectable-text invoices into rows.",
  },
  {
    question: "Do the tools work on a phone or tablet?",
    answer: "Yes. The tools are responsive and run in current mobile browsers. Very large files depend on your device's memory, and features such as downloads, clipboard access and speech voices vary by browser.",
  },
  {
    question: "How do I report a bug or request a tool?",
    answer: "Use the contact page and include the tool name, your browser and a small example that contains no confidential data. Reports that show the expected and actual result are the quickest to fix.",
  },
];

export function getToolsHubStructuredData(siteUrl: string, catalog: readonly ToolEntry[] = toolCatalog) {
  const base = siteUrl.replace(/\/+$/, "");
  const url = `${base}/tools`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#collection`,
        url,
        name: toolsHubMeta.title,
        description: toolsHubMeta.description,
        inLanguage: "en",
        isPartOf: { "@id": `${base}/#website` },
        breadcrumb: { "@id": `${url}#breadcrumb` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: catalog.length,
          itemListElement: catalog.map((tool, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: tool.name,
            url: `${base}/tools/${tool.slug}`,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${base}/` },
          { "@type": "ListItem", position: 2, name: "Tools", item: url },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: toolsHubFaqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };
}

export function serializeToolsHubJsonLd(value: ReturnType<typeof getToolsHubStructuredData>) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
