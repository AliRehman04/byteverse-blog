import { toolCatalog } from "./tool-catalog";

export const homepageMeta = {
  title: "Free Developer Tools & Practical Tech Guides | ByteVerse",
  description: "Free online developer tools for JSON, images, SEO and everyday tasks. Explore practical coding tutorials, AI explainers and tech guides on ByteVerse.",
} as const;

export interface HomepagePost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  readingTime: string | null;
  createdAt: Date;
  categoryName: string | null;
  categorySlug: string | null;
}

// Editorial shortcuts, not a usage ranking. Route names and icons stay in the catalog.
const selectedTools = [
  { slug: "image-compressor", task: "Prepare an image", detail: "Compress, crop, resize and convert images locally with ImageFixer." },
  { slug: "json-to-csv", task: "Make data usable", detail: "Choose rows, flatten nested JSON and preview your CSV columns." },
  { slug: "json-formatter", task: "Untangle your JSON", detail: "Format, validate or minify JSON and find syntax errors." },
  { slug: "seo-title-analyzer", task: "Check a page title", detail: "Compare title drafts with approximate pixel widths and search previews." },
  { slug: "meta-tag-generator", task: "Set up your metadata", detail: "Build page titles, descriptions and social sharing tags." },
  { slug: "json-to-typescript", task: "Start with useful types", detail: "Infer TypeScript declarations from JSON, then review the result." },
  { slug: "invoice-pdf-to-excel", task: "Review invoice data", detail: "Extract selectable-text PDF fields for XLSX or CSV. No OCR." },
  { slug: "plagiarism-checker", task: "Compare your wording", detail: "Check a draft against sources you supply. Not a web plagiarism scan." },
] as const;

export const homepageTools = selectedTools.map((selection) => {
  const tool = toolCatalog.find((entry) => entry.slug === selection.slug);
  if (!tool) throw new Error(`Missing homepage tool: ${selection.slug}`);
  return { ...tool, ...selection, href: `/tools/${tool.slug}` };
});

export const homepageTopics = [
  { slug: "ai-tools", name: "AI tools", description: "Understand assistants, compare options and explore useful AI workflows." },
  { slug: "coding", name: "Coding", description: "Work through JavaScript, Python, React and practical development problems." },
  { slug: "tech-guides", name: "Tech guides", description: "Find setup walkthroughs and troubleshoot the tools you work with." },
  { slug: "productivity", name: "Productivity", description: "Explore automation, better app setups and everyday workflows." },
  { slug: "software-reviews", name: "Software reviews", description: "Compare features and trade-offs before choosing your next app." },
  { slug: "cybersecurity", name: "Cybersecurity", description: "Learn about passwords, online privacy and safer digital habits." },
] as const;

export const homepageQuestions = [
  {
    question: "Are the tools free to use?",
    answer: "ByteVerse tools are free to access without a ByteVerse account. Supported formats, file sizes and request limits vary by tool; check the guidance on the tool page before you start.",
  },
  {
    question: "Where is my data processed?",
    answer: "It depends on the tool and feature. Many utilities process input in your browser, while features such as optional AI writing and website checks use server requests. Read the tool’s processing and privacy notes before entering sensitive information.",
  },
  {
    question: "What can I learn on ByteVerse?",
    answer: "The guides cover coding, AI tools, software comparisons, productivity, cybersecurity and technical troubleshooting. Check an article’s dates, sources and version details when following instructions: software and services change.",
  },
] as const;

export function getHomepageStructuredData(siteUrl: string) {
  const url = `${siteUrl.replace(/\/+$/, "")}/`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization", "@id": `${url}#organization`,
        name: "ByteVerse", url,
        logo: { "@type": "ImageObject", url: `${url}logo.png`, width: 500, height: 500 },
      },
      {
        "@type": "WebSite", "@id": `${url}#website`,
        name: "ByteVerse", url, description: homepageMeta.description, inLanguage: "en",
        publisher: { "@id": `${url}#organization` },
      },
      {
        "@type": "WebPage", "@id": `${url}#webpage`,
        name: homepageMeta.title, url, description: homepageMeta.description, inLanguage: "en",
        isPartOf: { "@id": `${url}#website` }, about: { "@id": `${url}#organization` },
      },
    ],
  };
}

export function serializeHomepageJsonLd(value: ReturnType<typeof getHomepageStructuredData>) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

// Match the existing Next image host policy. Missing/unsupported covers get a
// decorative fallback instead of fetching entire article bodies for an image.
const coverHosts = new Set(["res.cloudinary.com", "images.unsplash.com", "images.pexels.com", "www.byteverse.fyi", "byteverse.fyi"]);
export function getHomepageCover(source: string | null): string | null {
  if (!source || source.includes("\\")) return null;
  try {
    const url = new URL(source, "https://www.byteverse.fyi");
    if (url.protocol !== "https:" || url.username || url.password || url.port || !coverHosts.has(url.hostname)) return null;
    if (/\.svg$/i.test(url.pathname)) return null;
    if (source.startsWith("/") && !source.startsWith("//")) return source;
    return source.startsWith("https://") ? source : null;
  } catch {
    return null;
  }
}

export function formatHomepageDate(date: Date) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}