import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts, contentGaps } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export const runtime = "edge";

/* ── Site Scope Definition ──────────────────────────────── */
const SITE_SCOPE = [
  "ai", "artificial intelligence", "machine learning", "chatgpt", "claude", "gemini", "openai",
  "seo", "search engine", "ranking", "google", "meta tags", "keywords", "backlink", "sitemap",
  "blog", "blogging", "content", "writing", "article", "post", "traffic", "monetize",
  "tool", "tools", "free tool", "online tool", "generator", "checker", "converter", "builder",
  "coding", "programming", "web development", "javascript", "python", "html", "css", "react", "nextjs",
  "tech", "technology", "software", "app", "website", "site", "digital", "online",
  "affiliate", "marketing", "earn", "money", "income", "freelance", "side hustle",
  "cybersecurity", "security", "password", "privacy", "hacking",
  "plagiarism", "cv", "resume", "job", "career",
  "image", "compress", "qr", "code", "json", "csv", "markdown", "html",
  "vibe coding", "ai tools", "productivity", "automation", "byteverse",
  // Hinglish scope words
  "naukri", "kaam", "paise", "paisa", "kamana", "likhna",
];

/* ── Complete Tools Knowledge Base ─────────────────────── */
const TOOLS: { slug: string; name: string; desc: string; keywords: string[] }[] = [
  { slug: "plagiarism-checker", name: "Plagiarism Checker", desc: "Check text uniqueness and compare documents for plagiarism using n-gram analysis, cosine similarity, and sentence matching. 100% free, private, browser-based.", keywords: ["plagiarism", "copy", "duplicate", "similarity", "check", "naqal", "cheating", "original"] },
  { slug: "plagiarism-remover", name: "Plagiarism Remover & AI Humanizer", desc: "Remove plagiarism and humanize AI-generated text. Replaces AI phrases, swaps synonyms, adds contractions, makes content unique.", keywords: ["plagiarism", "remover", "rewrite", "humanize", "paraphrase", "unique", "rewriter", "humanizer"] },
  { slug: "ai-content-detector", name: "AI Content Detector", desc: "Detect AI-generated text using 8 linguistic signals. Check if content was written by ChatGPT, Claude, or other AI models.", keywords: ["ai", "detect", "chatgpt", "artificial", "intelligence", "detector", "ai-check", "written"] },
  { slug: "ai-prompt-generator", name: "AI Prompt Generator", desc: "Build better prompts for ChatGPT, Claude, Gemini and other AI tools. Generate optimized prompts for any task.", keywords: ["prompt", "chatgpt", "claude", "gemini", "ai", "generate", "write"] },
  { slug: "ai-cv-builder", name: "AI CV Builder", desc: "Create professional CVs and resumes with AI. Export to PDF. Modern templates for job applications.", keywords: ["cv", "resume", "job", "career", "naukri", "application", "hire", "interview", "pdf"] },
  { slug: "word-counter", name: "Word Counter", desc: "Count words, characters, sentences, paragraphs, and estimate reading time. Free online word counter tool.", keywords: ["word", "count", "character", "sentence", "paragraph", "reading", "length"] },
  { slug: "json-formatter", name: "JSON Formatter", desc: "Format, validate, and minify JSON data. Beautify messy JSON with syntax highlighting.", keywords: ["json", "format", "validate", "minify", "beautify", "data", "api"] },
  { slug: "password-generator", name: "Password Generator", desc: "Generate strong, secure random passwords. Customize length, characters, and strength.", keywords: ["password", "security", "random", "strong", "secure", "generate"] },
  { slug: "meta-tag-generator", name: "Meta Tag Generator", desc: "Generate SEO meta tags with live preview. Create title, description, OG tags for better search rankings.", keywords: ["meta", "tag", "seo", "title", "description", "search", "google", "ranking"] },
  { slug: "base64-encoder-decoder", name: "Base64 Encoder/Decoder", desc: "Encode and decode Base64 strings. Convert text, images, and files to Base64 format.", keywords: ["base64", "encode", "decode", "convert", "binary", "string"] },
  { slug: "regex-tester", name: "Regex Tester", desc: "Test regular expressions with live highlighting. Debug and validate regex patterns instantly.", keywords: ["regex", "regular", "expression", "pattern", "test", "match", "validate"] },
  { slug: "jwt-decoder", name: "JWT Decoder", desc: "Decode and inspect JSON Web Tokens. View header, payload, and verify JWT signatures.", keywords: ["jwt", "token", "decode", "json", "web", "auth", "authentication"] },
  { slug: "hash-generator", name: "Hash Generator", desc: "Generate SHA-256, SHA-512, MD5 hashes. Hash any text for security and verification.", keywords: ["hash", "sha", "md5", "encrypt", "security", "checksum"] },
  { slug: "uuid-generator", name: "UUID Generator", desc: "Generate and validate UUIDs (v4). Create unique identifiers for databases and APIs.", keywords: ["uuid", "unique", "id", "identifier", "generate", "guid"] },
  { slug: "timestamp-converter", name: "Timestamp Converter", desc: "Convert Unix timestamps to human-readable dates and vice versa. Support multiple date formats.", keywords: ["timestamp", "unix", "date", "time", "convert", "epoch"] },
  { slug: "url-encoder-decoder", name: "URL Encoder/Decoder", desc: "Encode and decode URLs. Handle special characters in URLs safely.", keywords: ["url", "encode", "decode", "link", "percent", "encoding"] },
  { slug: "diff-checker", name: "Diff Checker", desc: "Compare two texts side by side. Find differences between documents with highlighting.", keywords: ["diff", "compare", "difference", "text", "merge", "change"] },
  { slug: "og-preview", name: "OG Preview", desc: "Preview how your links appear on social media. Test Open Graph tags for Twitter, Facebook, LinkedIn.", keywords: ["og", "open", "graph", "social", "preview", "twitter", "facebook", "share"] },
  { slug: "robots-txt-generator", name: "robots.txt Generator", desc: "Build robots.txt files visually. Control search engine crawling for your website.", keywords: ["robots", "txt", "seo", "crawl", "search", "engine", "sitemap"] },
  { slug: "schema-markup-generator", name: "Schema Markup Generator", desc: "Generate JSON-LD structured data for rich snippets in Google search results.", keywords: ["schema", "markup", "jsonld", "structured", "data", "rich", "snippet", "google"] },
  { slug: "slug-generator", name: "Slug Generator", desc: "Create URL-friendly slugs from text. Perfect for blog post URLs and SEO.", keywords: ["slug", "url", "friendly", "permalink", "blog", "seo"] },
  { slug: "css-gradient-generator", name: "CSS Gradient Generator", desc: "Create beautiful CSS linear and radial gradients visually. Copy CSS code instantly.", keywords: ["css", "gradient", "linear", "radial", "color", "design", "style"] },
  { slug: "color-converter", name: "Color Converter", desc: "Convert between HEX, RGB, HSL color formats. Color picker with live preview.", keywords: ["color", "hex", "rgb", "hsl", "convert", "picker", "design"] },
  { slug: "box-shadow-generator", name: "Box Shadow Generator", desc: "Create CSS box shadows visually. Customize blur, spread, offset, and color.", keywords: ["box", "shadow", "css", "design", "visual", "effect"] },
  { slug: "html-editor", name: "HTML Editor", desc: "Live HTML, CSS, and JavaScript playground. Write and preview code in real-time.", keywords: ["html", "editor", "css", "javascript", "code", "playground", "live", "preview"] },
  { slug: "html-tag-generator", name: "HTML Tag Generator", desc: "Add or strip HTML tags from text. Clean HTML formatting tools.", keywords: ["html", "tag", "strip", "clean", "format", "remove"] },
  { slug: "code-formatter", name: "Code Formatter", desc: "Format and beautify code in multiple languages. Support for JavaScript, Python, HTML, CSS, and more.", keywords: ["code", "format", "beautify", "indent", "prettier", "javascript", "python"] },
  { slug: "youtube-tag-generator", name: "YouTube Tag Generator", desc: "Generate optimized YouTube tags for better video SEO and discoverability.", keywords: ["youtube", "tag", "video", "seo", "channel", "views", "generate"] },
  { slug: "text-to-speech", name: "Text to Speech", desc: "Convert any text to natural-sounding speech. Multiple voices and languages supported.", keywords: ["text", "speech", "voice", "audio", "tts", "speak", "read", "aloud", "sunna", "bolna"] },
  { slug: "qr-code-generator", name: "QR Code Generator", desc: "Generate custom QR codes for URLs, text, Wi-Fi, and more. Download as PNG or SVG.", keywords: ["qr", "code", "generate", "scan", "barcode", "link", "wifi"] },
  { slug: "image-compressor", name: "Image Compressor", desc: "Compress and resize images without losing quality. Supports PNG, JPG, WebP formats.", keywords: ["image", "compress", "resize", "photo", "picture", "optimize", "tasveer"] },
  { slug: "cron-expression-generator", name: "Cron Expression Generator", desc: "Build cron schedules visually. Generate cron expressions for scheduled tasks.", keywords: ["cron", "schedule", "timer", "job", "expression", "task", "automate"] },
  { slug: "llms-txt-generator-validator", name: "llms.txt Generator & Validator", desc: "Generate and validate llms.txt files for LLM-friendly websites.", keywords: ["llms", "txt", "llm", "ai", "validate", "generate"] },
  { slug: "json-to-csv", name: "JSON to CSV Converter", desc: "Convert JSON data to CSV format and vice versa. Easy data transformation.", keywords: ["json", "csv", "convert", "data", "export", "table", "excel"] },
  { slug: "markdown-to-html", name: "Markdown to HTML", desc: "Convert Markdown to HTML with live preview. Perfect for documentation and blog posts.", keywords: ["markdown", "html", "convert", "preview", "md", "documentation"] },
  { slug: "lorem-ipsum-generator", name: "Lorem Ipsum Generator", desc: "Generate placeholder text for design mockups. Custom paragraphs and word count.", keywords: ["lorem", "ipsum", "placeholder", "dummy", "text", "mockup"] },
  { slug: "privacy-policy-generator", name: "Privacy Policy Generator", desc: "Generate a privacy policy for your website. GDPR and CCPA compliant templates.", keywords: ["privacy", "policy", "gdpr", "ccpa", "legal", "terms", "website"] },
  { slug: "seo-title-analyzer", name: "SEO Title Analyzer", desc: "Analyze and optimize your page titles for SEO. Check length, power words, and readability.", keywords: ["seo", "title", "analyze", "optimize", "headline", "blog"] },
];

/* ── Hinglish → English Keyword Map ─────────────────────── */
const HINGLISH_MAP: Record<string, string[]> = {
  "kya": [], "hai": [], "mujhe": ["need", "want"], "muje": ["need", "want"], "chahiye": ["need", "want"],
  "chhaye": ["need", "want"], "chahye": ["need", "want"], "karo": ["do", "make"], "kro": ["do", "make"],
  "batao": ["tell", "show"], "dikhao": ["show"], "tool": ["tool"], "free": ["free"],
  "accha": ["good", "best"], "acha": ["good", "best"], "behtareen": ["best"],
  "sabse": ["best", "top"], "zaroorat": ["need"], "madad": ["help"],
  "kaise": ["how"], "kahan": ["where"], "konsa": ["which"], "kitna": ["how much"],
  "likhna": ["write", "writing"], "padhna": ["read", "reading"],
  "banana": ["make", "create", "build"], "bnana": ["make", "create", "build"],
  "paise": ["money", "earn", "income"], "paisa": ["money", "earn"],
  "naukri": ["job", "career"], "kaam": ["work", "job"],
  "seekhna": ["learn"], "sikhna": ["learn"], "sikho": ["learn"],
  "website": ["website"], "blog": ["blog"], "coding": ["coding"],
  "shuru": ["start", "begin"], "naya": ["new"], "purana": ["old"],
  "cv": ["cv", "resume"], "resume": ["cv", "resume"],
  "tasveer": ["image", "photo"], "photo": ["image", "photo"],
  "password": ["password"], "rang": ["color"],
  "awaz": ["voice", "speech", "audio"], "sunna": ["speech", "audio", "listen"],
  "bolna": ["speech", "speak"], "likhawat": ["writing", "text"],
  "naqal": ["plagiarism", "copy"], "cheating": ["plagiarism"],
  "check": ["check", "test"], "detect": ["detect"],
  "rank": ["rank", "ranking", "seo"], "traffic": ["traffic", "views", "visitors"],
};

/* ── Stop Words ──────────────────────────────────────────── */
const STOP_WORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can",
  "had", "her", "was", "one", "our", "out", "day", "has", "his",
  "how", "its", "may", "new", "now", "old", "see", "way", "who",
  "did", "get", "let", "say", "she", "too", "use", "what", "when",
  "why", "with", "this", "that", "from", "have", "been", "will",
  "your", "they", "them", "then", "than", "into", "some", "more",
  "also", "just", "about", "which", "would", "there", "their",
  "could", "other", "after", "these", "should", "where", "being",
  // Hinglish stop words
  "hai", "hain", "ka", "ki", "ke", "ko", "se", "mein", "par",
  "ne", "ho", "toh", "bhi", "na", "ek", "yeh", "ye", "wo",
  "kya", "main", "hum", "aap", "tum",
]);

/* ── Intent Categories ──────────────────────────────────── */
type Intent = "greeting" | "tool_query" | "blog_query" | "vague" | "help" | "thanks" | "out_of_scope" | "site_info";

function isInScope(query: string, keywords: string[]): boolean {
  const q = query.toLowerCase();
  // Check if any scope term appears in the query
  for (const term of SITE_SCOPE) {
    if (q.includes(term)) return true;
  }
  // Check if any keyword matches a tool keyword
  for (const kw of keywords) {
    for (const tool of TOOLS) {
      if (tool.keywords.includes(kw) || tool.slug.includes(kw)) return true;
    }
  }
  return false;
}

function detectIntent(query: string, keywords: string[]): Intent {
  const q = query.toLowerCase().trim();

  if (/^(hi|hello|hey|salam|assalam|aoa|hlo|hii+|namaste|kya hal|sup)\b/i.test(q)) return "greeting";
  if (/^(shukriya|thanks|thank you|dhanyavad|meharbani)\b/i.test(q)) return "thanks";
  if (/^(help|madad|guide|how to use|kaise use)\b/i.test(q)) return "help";

  // Site info — questions about the site itself
  if (/\b(site|website|byteverse)\b/.test(q) && /\b(kya|what|about|related|baare|konsa|hai|ha|hain|kaisa|purpose|intro)\b/.test(q)) return "site_info";
  if (/\b(yahan|yaha|idhar)\b/.test(q) && /\b(kya|what|milta|milega|available|hota)\b/.test(q)) return "site_info";
  if (/\b(tum|aap|bot|you)\b/.test(q) && /\b(kya|kaun|who|what|kon)\b/.test(q) && /\b(ho|hai|ha|are|do)\b/.test(q)) return "site_info";

  // Check scope — must happen before tool/blog detection
  if (!isInScope(query, keywords)) return "out_of_scope";

  // Tool intent
  const toolKeywords = ["tool", "checker", "generator", "converter", "builder", "encoder", "decoder",
    "formatter", "tester", "compressor", "editor", "remover", "detector", "analyzer"];
  for (const tk of toolKeywords) {
    if (keywords.includes(tk)) return "tool_query";
  }
  for (const t of TOOLS) {
    for (const tk of t.keywords) {
      if (keywords.includes(tk)) return "tool_query";
    }
  }

  if (keywords.length <= 1 && q.length < 15) return "vague";

  return "blog_query";
}

/* ── Detect Language ────────────────────────────────────── */
function detectLanguage(query: string): "hinglish" | "english" {
  const hinglishPatterns = /\b(kya|ha|hai|hain|mujhe|muje|chahiye|chhaye|karo|kro|batao|dikhao|accha|acha|behtareen|zaroorat|madad|kaise|kahan|konsa|kitna|banana|bnana|paise|paisa|naukri|kaam|seekhna|sikhna|sikho|shuru|naya|yar|bhai|bro|haan|nahi|nai|krna|krne|krdo|krdein|wala|wale|wali|apko|apka|apki|mera|meri|mere|iska|iski|iske|humara|tumhara|unka|unki|unke|sab|sari|sara|koi|kuch|bohot|boht|bahut|thoda|zyada|kam|aur|lekin|magar|isliye|kyunke|phir|pehle|baad|abhi|hona|chhaye|chahye|chaye|btao|bta|pta|chal|chalo|dekho|dakho|smj|samjh|pooch|poch|mila|milta|milega|hoga|hogi|hoge|kaisa|kaisi|kaise|yahan|idhar|udhar|abhi|abi|matlab|mtlb|sahi|galat|theek|thik)\b/gi;
  const matches = query.match(hinglishPatterns);
  return matches && matches.length >= 1 ? "hinglish" : "english";
}

/* ── Expand Hinglish Keywords ───────────────────────────── */
function expandKeywords(keywords: string[]): string[] {
  const expanded = new Set(keywords);
  for (const kw of keywords) {
    const mapped = HINGLISH_MAP[kw];
    if (mapped) mapped.forEach((m) => expanded.add(m));
  }
  return Array.from(expanded);
}

/* ── Tool Search ────────────────────────────────────────── */
function searchTools(keywords: string[]): typeof TOOLS[number][] {
  return TOOLS
    .map((tool) => {
      let score = 0;
      const nameLower = tool.name.toLowerCase();
      const descLower = tool.desc.toLowerCase();
      for (const kw of keywords) {
        if (nameLower.includes(kw)) score += 10;
        if (tool.slug.includes(kw)) score += 8;
        if (tool.keywords.includes(kw)) score += 6;
        if (descLower.includes(kw)) score += 3;
      }
      return { ...tool, score };
    })
    .filter((t) => t.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

/* ── Extract Best Paragraphs from Content ──────────────── */
function extractBestParagraphs(content: string, keywords: string[], maxParas: number = 2): string[] {
  // Strip markdown/HTML syntax
  const clean = content
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/#{1,6}\s*/g, "")
    .replace(/[*_`~>]/g, "")
    .replace(/\|.*\|/g, "")
    .replace(/-{3,}/g, "");

  const paragraphs = clean
    .split(/\n\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 50 && p.length < 800);

  const scored = paragraphs.map((para) => {
    const paraLower = para.toLowerCase();
    let score = 0;
    let matchedKeywords = 0;
    for (const kw of keywords) {
      if (kw.length < 2) continue;
      const count = paraLower.split(kw).length - 1;
      if (count > 0) {
        matchedKeywords++;
        score += count * 2;
      }
    }
    // Bonus for multiple keyword matches in same paragraph
    if (matchedKeywords >= 2) score += matchedKeywords * 3;
    // Prefer paragraphs that look like informative content (not lists of links)
    if (para.length > 100 && para.length < 400) score += 2;
    return { text: para, score };
  });

  return scored
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxParas)
    .map((p) => {
      let text = p.text;
      if (text.length > 280) text = text.slice(0, 280).replace(/\s\S*$/, "") + "...";
      return text;
    });
}

/* ── Generate Clarifying Questions ──────────────────────── */
function getClarifyingQuestion(query: string, lang: "hinglish" | "english"): string {
  const q = query.toLowerCase().trim();
  const clarifications: Record<string, { en: string; hi: string }> = {
    tool: { en: "What kind of tool are you looking for? For example: plagiarism checker, word counter, JSON formatter, password generator, AI detector, or CV builder?", hi: "Apko kis type ka tool chahiye? Jaise: plagiarism checker, word counter, JSON formatter, password generator, AI detector, ya CV builder?" },
    cv: { en: "Are you looking to build a CV/resume? We have a free AI CV Builder tool! Would you like me to show you that?", hi: "Kya aap CV/resume banana chahte hain? Humare paas free AI CV Builder tool hai! Kya main aapko wo dikhau?" },
    resume: { en: "Are you looking to build a resume? We have a free AI CV Builder tool!", hi: "Resume banana hai? Humare paas free AI CV Builder tool hai!" },
    seo: { en: "What do you need help with in SEO? We have tools for meta tags, schema markup, robots.txt, slug generator, SEO title analyzer, and many articles on SEO strategies.", hi: "SEO mein kya help chahiye? Humare paas meta tags, schema markup, robots.txt, slug generator, SEO title analyzer tools hain, aur bohot se SEO articles bhi hain." },
    ai: { en: "What would you like to know about AI? We have AI tools (content detector, prompt generator, CV builder) and many articles on AI tools and trends.", hi: "AI ke baare mein kya jaanna chahte hain? Humare paas AI tools hain (content detector, prompt generator, CV builder) aur bohot se AI articles bhi." },
    coding: { en: "What programming topic? We have articles on vibe coding, web development, and tools like code formatter, HTML editor, and regex tester.", hi: "Kaunsa programming topic? Humare paas vibe coding, web development ke articles hain aur code formatter, HTML editor, regex tester jaise tools bhi." },
    blog: { en: "Are you looking for blogging tips? We have articles on blog traffic, SEO, affiliate marketing, and content creation.", hi: "Blogging ke tips chahiye? Humare paas blog traffic, SEO, affiliate marketing, aur content creation ke articles hain." },
    earn: { en: "Want to learn about earning online? We have articles on affiliate marketing, blogging for income, and AI tools.", hi: "Online earning ke baare mein jaanna hai? Humare paas affiliate marketing, blogging se income, aur AI tools ke articles hain." },
    money: { en: "Want to learn about earning online? We have articles on affiliate marketing, blogging for income, and AI tools.", hi: "Online earning ke baare mein jaanna hai? Humare paas affiliate marketing, blogging se income, aur AI tools ke articles hain." },
    free: { en: "Looking for free tools? We have 35+ free browser-based tools, and articles about the best free AI tools.", hi: "Free tools dhundh rahe hain? Humare paas 35+ free browser-based tools hain aur best free AI tools ke articles bhi." },
  };

  for (const [key, messages] of Object.entries(clarifications)) {
    if (q.includes(key)) return lang === "hinglish" ? messages.hi : messages.en;
  }

  return lang === "hinglish"
    ? "Thoda detail mein batayein — aapko kya chahiye? Koi specific tool, article, ya topic?"
    : "Could you tell me more? Are you looking for a specific tool, article, or topic?";
}

/* ── Log Content Gap (fire-and-forget) ──────────────────── */
async function logContentGap(query: string, intent: string, lang: string) {
  if (!db) return;
  try {
    const normalized = query.toLowerCase().trim().slice(0, 500);
    // Check if similar query already exists
    const existing = await db
      .select({ id: contentGaps.id, count: contentGaps.count })
      .from(contentGaps)
      .where(eq(contentGaps.query, normalized))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(contentGaps)
        .set({ count: existing[0].count + 1, updatedAt: new Date() })
        .where(eq(contentGaps.id, existing[0].id));
    } else {
      await db.insert(contentGaps).values({
        query: normalized,
        intent,
        language: lang,
      });
    }
  } catch {
    // Silent fail — don't break chat for logging
  }
}

/* ── Build Smart Answer from Blog Content ──────────────── */
function buildContentAnswer(
  topResults: { title: string; excerpt: string; bestParagraphs: string[] }[],
  toolMatches: typeof TOOLS[number][],
  lang: "hinglish" | "english",
  intent: Intent,
): string {
  const parts: string[] = [];

  // Tool results
  if (toolMatches.length > 0 && (intent === "tool_query" || intent === "blog_query")) {
    const intro = lang === "hinglish"
      ? "Apke liye ye tools mil gaye hain:"
      : "Here are the tools I found for you:";
    parts.push(intro);
    toolMatches.slice(0, 3).forEach((t) => {
      parts.push(`• ${t.name} — ${t.desc.split(".")[0]}`);
    });
  }

  // Blog content answer — extract actual info from blog paragraphs
  if (topResults.length > 0) {
    const top = topResults[0];
    if (top.bestParagraphs.length > 0) {
      if (parts.length > 0) parts.push("");
      const articleIntro = lang === "hinglish"
        ? `Humare article "${top.title}" se:`
        : `From our article "${top.title}":`;
      parts.push(articleIntro);
      parts.push(top.bestParagraphs[0]);
      if (top.bestParagraphs[1]) {
        parts.push(top.bestParagraphs[1]);
      }
    } else if (top.excerpt) {
      if (parts.length > 0) parts.push("");
      parts.push(top.excerpt);
    }

    if (topResults.length > 1) {
      const moreInfo = lang === "hinglish"
        ? "\nMazeed detail ke liye niche diye gaye articles dekhein 👇"
        : "\nCheck out the articles below for more details 👇";
      parts.push(moreInfo);
    }
  }

  return parts.join("\n");
}

/* ── Out of Scope Response ──────────────────────────────── */
function getOutOfScopeResponse(lang: "hinglish" | "english"): string {
  if (lang === "hinglish") {
    return "Maaf kijiye, yeh sawal mere scope se baahir hai. 🚫\n\nMain sirf ByteVerse se related topics mein help kar sakta hoon:\n• AI tools aur technology\n• SEO aur blog ranking\n• Coding aur web development\n• Online earning aur affiliate marketing\n• Humare 35+ free tools\n\nKya in mein se kisi topic pe koi sawal hai?";
  }
  return "Sorry, this question is outside my scope. 🚫\n\nI can only help with ByteVerse-related topics:\n• AI tools & technology\n• SEO & blog ranking\n• Coding & web development\n• Online earning & affiliate marketing\n• Our 35+ free tools\n\nWould you like to ask about any of these topics?";
}

/* ── Main API Handler ───────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 1) {
      return NextResponse.json({ answer: "Please type something!", results: [], tools: [] });
    }

    const lang = detectLanguage(query);
    const queryLower = query.toLowerCase().trim();

    // Extract keywords
    let keywords = queryLower
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

    // Expand with Hinglish mappings
    keywords = expandKeywords(keywords);

    const intent = detectIntent(query, keywords);

    // ── Greeting ──
    if (intent === "greeting") {
      const greetings = lang === "hinglish"
        ? [
            "Assalam-o-Alaikum! 👋 Main ByteVerse Bot hoon. AI tools, SEO, blogging, coding — kuch bhi poochein! Kya help chahiye?",
            "Hello! 👋 ByteVerse Bot yahan hai. Batayein — koi tool chahiye, article dhundhna hai, ya kuch aur?",
          ]
        : [
            "Hello! 👋 I'm ByteVerse Bot. I can help you find free tools, answer questions from our 100+ articles on AI, SEO, coding & tech. What do you need?",
            "Hey there! 👋 Welcome to ByteVerse! Ask me about any of our 35+ free tools, tech articles, or topics like AI, SEO & blogging. How can I help?",
          ];
      return NextResponse.json({
        answer: greetings[Math.floor(Math.random() * greetings.length)],
        results: [],
        tools: [],
      });
    }

    // ── Thanks ──
    if (intent === "thanks") {
      const thanks = lang === "hinglish"
        ? "Koi baat nahi! 😊 Agar aur kuch poochna ho to zaroor poochein."
        : "You're welcome! 😊 Feel free to ask anything else.";
      return NextResponse.json({ answer: thanks, results: [], tools: [] });
    }

    // ── Help ──
    if (intent === "help") {
      const helpMsg = lang === "hinglish"
        ? "Main ByteVerse Bot hoon! Aap mujhse ye pooch sakte hain:\n\n• Koi bhi tool dhundhein (jaise \"plagiarism checker\", \"cv builder\")\n• Articles se info poochein (jaise \"SEO kaise karein\", \"best AI tools\")\n• Tech topics explore karein (jaise \"vibe coding\", \"affiliate marketing\")\n\nBas apna sawal likhein! 🚀"
        : "I'm ByteVerse Bot! You can ask me:\n\n• Find any of our 35+ free tools (e.g. \"plagiarism checker\")\n• Get answers from our 100+ articles (e.g. \"SEO tips\", \"best AI tools\")\n• Explore topics like coding, AI, blogging, and earning online\n\nJust type your question! 🚀";
      return NextResponse.json({ answer: helpMsg, results: [], tools: [] });
    }

    // ── Site Info ──
    if (intent === "site_info") {
      const siteInfo = lang === "hinglish"
        ? "ByteVerse ek tech platform hai jahan aapko milega:\n\n🛠️ 35+ Free Tools — Plagiarism Checker, AI Content Detector, CV Builder, Password Generator, Meta Tag Generator, aur bohot kuch\n\n📝 100+ Articles — AI tools, SEO tips, blogging strategies, coding tutorials, online earning, affiliate marketing\n\n🔍 Topics: AI, SEO, Web Development, Vibe Coding, Cybersecurity, Freelancing\n\nAap mujhse kisi bhi tool ya article ke baare mein pooch sakte hain! Kya dhundhna hai?"
        : "ByteVerse is a tech platform where you'll find:\n\n🛠️ 35+ Free Tools — Plagiarism Checker, AI Content Detector, CV Builder, Password Generator, Meta Tag Generator, and many more\n\n📝 100+ Articles — AI tools, SEO tips, blogging strategies, coding tutorials, online earning, affiliate marketing\n\n🔍 Topics: AI, SEO, Web Development, Vibe Coding, Cybersecurity, Freelancing\n\nAsk me about any tool or article! What would you like to explore?";
      return NextResponse.json({ answer: siteInfo, results: [], tools: [] });
    }

    // ── Out of Scope ──
    if (intent === "out_of_scope") {
      return NextResponse.json({
        answer: getOutOfScopeResponse(lang),
        results: [],
        tools: [],
      });
    }

    // ── Vague ──
    if (intent === "vague") {
      const clarification = getClarifyingQuestion(query, lang);
      const toolMatches = searchTools(keywords);
      const toolResults = toolMatches.map((t) => ({
        title: t.name,
        slug: `tools/${t.slug}`,
        excerpt: t.desc.slice(0, 120),
        type: "tool" as const,
      }));
      return NextResponse.json({ answer: clarification, results: [], tools: toolResults });
    }

    // ── Search tools ──
    const toolMatches = searchTools(keywords);
    const toolResults = toolMatches.map((t) => ({
      title: t.name,
      slug: `tools/${t.slug}`,
      excerpt: t.desc.slice(0, 120),
      type: "tool" as const,
    }));

    // ── Search blog posts (deep content search) ──
    if (!db) {
      if (toolMatches.length > 0) {
        const answer = buildContentAnswer([], toolMatches, lang, intent);
        return NextResponse.json({ answer, results: [], tools: toolResults });
      }
      return NextResponse.json({
        answer: lang === "hinglish" ? "Service abhi available nahi hai." : "Service temporarily unavailable.",
        results: [],
        tools: [],
      });
    }

    const allPosts = await db
      .select({
        title: posts.title,
        slug: posts.slug,
        excerpt: posts.excerpt,
        content: posts.content,
        keywords: posts.keywords,
        summary: posts.summary,
      })
      .from(posts)
      .where(eq(posts.published, true));

    // Score each post deeply
    const scored = allPosts
      .map((post) => {
        const titleLower = post.title.toLowerCase();
        const excerptLower = (post.excerpt || "").toLowerCase();
        const contentLower = post.content.toLowerCase();
        const postKeywords = (post.keywords || "").toLowerCase();
        const summaryLower = (post.summary || "").toLowerCase();

        let score = 0;
        let titleMatches = 0;

        for (const kw of keywords) {
          if (kw.length < 2) continue;
          // Title match (highest weight)
          if (titleLower.includes(kw)) { score += 15; titleMatches++; }
          // Post keywords match
          if (postKeywords.includes(kw)) score += 8;
          // Summary match
          if (summaryLower.includes(kw)) score += 6;
          // Excerpt match
          if (excerptLower.includes(kw)) score += 5;
          // Content match — count occurrences, cap at 5
          const contentHits = contentLower.split(kw).length - 1;
          score += Math.min(contentHits, 5) * 2;
        }

        // Bonus: multi-keyword match in title
        if (titleMatches >= 2) score += titleMatches * 8;

        // Extract best matching paragraphs
        const bestParagraphs = score > 0
          ? extractBestParagraphs(post.content, keywords, 2)
          : [];

        return { ...post, score, bestParagraphs };
      })
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Build answer
    const answer = buildContentAnswer(scored, toolMatches, lang, intent);

    // If nothing found at all — log as content gap and give helpful response
    if (!answer && scored.length === 0 && toolMatches.length === 0) {
      // Log this as a content gap (relevant query with no content)
      logContentGap(query, intent, lang);

      const noResult = lang === "hinglish"
        ? "Is topic pe abhi humare paas specific content nahi hai, lekin hum ise note kar rahe hain aur jald add karenge! 📝\n\nFilhaal, aap aur kuch pooch sakte hain ya humari site explore kar sakte hain."
        : "We don't have specific content on this topic yet, but we've noted it and will add it soon! 📝\n\nFeel free to ask about something else or explore our site.";
      return NextResponse.json({ answer: noResult, results: [], tools: [] });
    }

    // If we have tool results but no blog match, still a useful answer
    // If blog match but score is low, log as potential content gap
    if (scored.length === 0 && toolMatches.length === 0) {
      logContentGap(query, intent, lang);
    } else if (scored.length > 0 && scored[0].score < 10 && toolMatches.length === 0) {
      // Weak match — might need better content
      logContentGap(query, "weak_match", lang);
    }

    return NextResponse.json({
      answer: answer || (lang === "hinglish" ? "Ye related articles dekh lein:" : "Check out these related articles:"),
      results: scored.slice(0, 3).map((p) => ({
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt?.slice(0, 120) || "",
      })),
      tools: toolResults,
    });
  } catch {
    return NextResponse.json(
      { answer: "Something went wrong. Please try again.", results: [], tools: [] },
      { status: 500 },
    );
  }
}
