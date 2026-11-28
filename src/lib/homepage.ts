import { toolCatalog, type ToolEntry } from "./tool-catalog";
import { hubCategories, toolsInCategory } from "./tools-hub";

const toolCount = toolCatalog.length;

export const homepageMeta = {
  title: "Free Online Developer Tools & Tech Guides | ByteVerse",
  description: `Use ${toolCount} free online tools for JSON, CSV, images, SEO and text with no sign-up. Then fix real errors with practical guides on AI tools, coding and software.`,
} as const;

export const homepageHero = {
  badge: `${toolCount} free tools · No account needed`,
  headingLead: "Free online developer tools and",
  headingAccent: "practical tech guides",
  intro: "Format JSON, repair CSV files, compress images and check page titles in your browser. When software misbehaves, the guides walk you through the fix.",
  searchPlaceholder: `Search ${toolCount} tools: JSON, CSV, image, SEO…`,
  note: "No account needed. Each tool page explains where your data is processed.",
} as const;

export interface HomepagePost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  readingTime: string | null;
  author: string;
  createdAt: Date;
  categoryName: string | null;
  categorySlug: string | null;
}

function requireTool(slug: string): ToolEntry {
  const tool = toolCatalog.find((entry) => entry.slug === slug);
  if (!tool) throw new Error(`Missing homepage tool: ${slug}`);
  return tool;
}

// Editorial selection, not a usage ranking: tools that already earn search visits plus the tools rebuilt in October 2026.
const selectedTools = [
  { slug: "json-formatter", task: "Format and validate JSON", detail: "Format, validate or minify JSON and find the line with the syntax error." },
  { slug: "image-compressor", task: "Compress an image", detail: "Compress, crop, resize and convert images in your browser. No uploads." },
  { slug: "csv-repair", task: "Fix a broken CSV", detail: "Repair delimiters, encodings and quotes, and keep leading zeros as text." },
  { slug: "seo-title-analyzer", task: "Check a page title", detail: "Compare title drafts with approximate pixel widths and search previews." },
  { slug: "json-to-csv", task: "Turn JSON into a spreadsheet", detail: "Choose rows, flatten nested JSON and preview the CSV columns." },
  { slug: "plagiarism-checker", task: "Compare two texts", detail: "Check a draft against sources you supply. Not a web plagiarism scan." },
  { slug: "html-editor", task: "Try HTML, CSS and JavaScript", detail: "Write code next to a sandboxed live preview with starter templates." },
  { slug: "meta-tag-generator", task: "Build meta tags", detail: "Create title, description, Open Graph and Twitter Card tags." },
] as const;

export const homepageTools = selectedTools.map((selection) => ({ ...requireTool(selection.slug), ...selection, href: `/tools/${selection.slug}` }));

// Short labels for the links under the hero search.
export const homepageShortcuts = [
  { slug: "json-formatter", label: "JSON formatter" },
  { slug: "image-compressor", label: "Image compressor" },
  { slug: "csv-repair", label: "CSV repair" },
  { slug: "seo-title-analyzer", label: "Title checker" },
  { slug: "regex-tester", label: "Regex tester" },
].map((shortcut) => ({ ...shortcut, href: `/tools/${requireTool(shortcut.slug).slug}` }));

// Category names, anchors and counts come from the tools hub, so the links land on real sections.
export const homepageToolCategories = hubCategories.map((category) => {
  const tools = toolsInCategory(category.title);
  return { ...category, count: tools.length, href: `/tools#${category.id}`, examples: tools.slice(0, 3).map((tool) => tool.name) };
});

export const homepageBenefits = [
  { key: "free", title: "Free, with no account", text: "Every tool opens straight away. There is no sign-up and nothing to install. Advertising pays for the site." },
  { key: "processing", title: "Clear about your data", text: "Most tools process your input in the browser. The few features that use a server, such as AI rewriting and website checks, say so on the tool page first." },
  { key: "files", title: "Made for real files", text: "CSV Repair keeps leading zeros and long IDs, the image compressor works to a byte limit, and JSON to CSV guards against spreadsheet formula injection." },
  { key: "guides", title: "Guides you can check", text: "Newer guides name the software version they were checked against, link their sources and say what was not tested." },
] as const;

// Evergreen picks: troubleshooting guides readers arrive for, two of them paired with the tool that solves the same problem.
export const featuredGuides: readonly { slug: string; tool?: string }[] = [
  { slug: "gemini-not-showing-google-docs-gmail-2026" },
  { slug: "excel-csv-leading-zeros-2026", tool: "csv-repair" },
  { slug: "unexpected-token-html-not-valid-json", tool: "json-formatter" },
  { slug: "ollama-not-using-gpu-windows-2026" },
  { slug: "github-copilot-not-working-vscode-2026" },
  { slug: "how-to-use-n8n-2026-complete-guide" },
];
export const featuredGuideSlugs = featuredGuides.map((guide) => guide.slug);
export const LATEST_GUIDE_COUNT = 6;

export function getGuideTool(slug: string) {
  const pairing = featuredGuides.find((guide) => guide.slug === slug)?.tool;
  if (!pairing) return null;
  const tool = requireTool(pairing);
  return { name: tool.name, href: `/tools/${tool.slug}` };
}

// Curated guides keep their editorial order; the latest list never repeats a curated guide.
export function arrangeHomepagePosts(featured: readonly HomepagePost[], newest: readonly HomepagePost[]) {
  const order = new Map(featuredGuideSlugs.map((slug, index) => [slug, index]));
  const picks = featured.filter((post) => order.has(post.slug)).sort((a, b) => order.get(a.slug)! - order.get(b.slug)!);
  const shown = new Set(picks.map((post) => post.slug));
  return { featured: picks, latest: newest.filter((post) => !shown.has(post.slug)).slice(0, LATEST_GUIDE_COUNT) };
}

export const homepageTopics = [
  { slug: "ai-tools", name: "AI tools", color: "#8b5cf6", description: "Understand assistants, compare options and explore useful AI workflows." },
  { slug: "coding", name: "Coding", color: "#f59e0b", description: "Work through JavaScript, Python, React and practical development problems." },
  { slug: "tech-guides", name: "Tech guides", color: "#3b82f6", description: "Find setup walkthroughs and troubleshoot the tools you work with." },
  { slug: "productivity", name: "Productivity", color: "#10b981", description: "Explore automation, better app setups and everyday workflows." },
  { slug: "software-reviews", name: "Software reviews", color: "#ef4444", description: "Compare features and trade-offs before choosing your next app." },
  { slug: "cybersecurity", name: "Cybersecurity", color: "#06b6d4", description: "Learn about passwords, online privacy and safer digital habits." },
] as const;

export const homepageEditor = {
  name: "Ali Rehman",
  role: "Founder and editor",
  href: "/author/ali-rehman",
  bio: "ByteVerse is an independent site founded and edited by Ali Rehman, a self-taught developer. It started as a place to test tools and share what actually works.",
} as const;

export const homepageStandards = [
  "Tool pages state what runs in your browser and what uses a server.",
  "Guides link to their sources. Newer ones name the version they were checked against.",
  "Corrections and bug reports go straight to the editor through the contact page.",
] as const;

export const homepageTrustLinks = [
  { label: "About ByteVerse", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy policy", href: "/privacy" },
  { label: "Disclaimer", href: "/disclaimer" },
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
  {
    question: "How do I report a bug or suggest a tool?",
    answer: "Use the contact page and include the tool name, your browser and a small example that contains no confidential data. Reports that show the expected and the actual result are the quickest to fix.",
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
        founder: { "@type": "Person", name: homepageEditor.name, url: `${url}author/ali-rehman` },
        contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: "contact@byteverse.fyi", url: `${url}contact` },
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
