import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts, contentGaps } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "edge";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/* ── Tools Knowledge Base ──────────────────────────────── */
const TOOLS: { slug: string; name: string; desc: string; keywords: string[] }[] = [
  { slug: "plagiarism-checker", name: "Plagiarism Checker", desc: "Check text uniqueness and compare documents for plagiarism.", keywords: ["plagiarism", "copy", "duplicate", "similarity", "check", "naqal", "cheating", "original"] },
  { slug: "plagiarism-remover", name: "Plagiarism Remover & AI Humanizer", desc: "Remove plagiarism and humanize AI-generated text.", keywords: ["plagiarism", "remover", "rewrite", "humanize", "paraphrase", "unique", "rewriter", "humanizer"] },
  { slug: "ai-content-detector", name: "AI Content Detector", desc: "Detect AI-generated text using linguistic signals.", keywords: ["ai", "detect", "chatgpt", "artificial", "intelligence", "detector", "ai-check", "written"] },
  { slug: "ai-prompt-generator", name: "AI Prompt Generator", desc: "Build better prompts for ChatGPT, Claude, Gemini.", keywords: ["prompt", "chatgpt", "claude", "gemini", "ai", "generate", "write"] },
  { slug: "ai-cv-builder", name: "AI CV Builder", desc: "Create professional CVs and resumes with AI, export to PDF.", keywords: ["cv", "resume", "job", "career", "naukri", "application", "hire", "interview", "pdf"] },
  { slug: "word-counter", name: "Word Counter", desc: "Count words, characters, sentences, paragraphs.", keywords: ["word", "count", "character", "sentence", "paragraph", "reading", "length"] },
  { slug: "json-formatter", name: "JSON Formatter", desc: "Format, validate, and minify JSON data.", keywords: ["json", "format", "validate", "minify", "beautify", "data", "api"] },
  { slug: "password-generator", name: "Password Generator", desc: "Generate strong, secure random passwords.", keywords: ["password", "security", "random", "strong", "secure", "generate"] },
  { slug: "meta-tag-generator", name: "Meta Tag Generator", desc: "Generate SEO meta tags with live preview.", keywords: ["meta", "tag", "seo", "title", "description", "search", "google", "ranking"] },
  { slug: "base64-encoder-decoder", name: "Base64 Encoder/Decoder", desc: "Encode and decode Base64 strings.", keywords: ["base64", "encode", "decode", "convert", "binary", "string"] },
  { slug: "regex-tester", name: "Regex Tester", desc: "Test regular expressions with live highlighting.", keywords: ["regex", "regular", "expression", "pattern", "test", "match", "validate"] },
  { slug: "jwt-decoder", name: "JWT Decoder", desc: "Decode and inspect JSON Web Tokens.", keywords: ["jwt", "token", "decode", "json", "web", "auth", "authentication"] },
  { slug: "hash-generator", name: "Hash Generator", desc: "Generate SHA-256, SHA-512, MD5 hashes.", keywords: ["hash", "sha", "md5", "encrypt", "security", "checksum"] },
  { slug: "uuid-generator", name: "UUID Generator", desc: "Generate and validate UUIDs (v4).", keywords: ["uuid", "unique", "id", "identifier", "generate", "guid"] },
  { slug: "timestamp-converter", name: "Timestamp Converter", desc: "Convert Unix timestamps to dates.", keywords: ["timestamp", "unix", "date", "time", "convert", "epoch"] },
  { slug: "url-encoder-decoder", name: "URL Encoder/Decoder", desc: "Encode and decode URLs.", keywords: ["url", "encode", "decode", "link", "percent", "encoding"] },
  { slug: "diff-checker", name: "Diff Checker", desc: "Compare two texts side by side.", keywords: ["diff", "compare", "difference", "text", "merge", "change"] },
  { slug: "og-preview", name: "OG Preview", desc: "Preview how links appear on social media.", keywords: ["og", "open", "graph", "social", "preview", "twitter", "facebook", "share"] },
  { slug: "robots-txt-generator", name: "robots.txt Generator", desc: "Build robots.txt files visually.", keywords: ["robots", "txt", "seo", "crawl", "search", "engine", "sitemap"] },
  { slug: "schema-markup-generator", name: "Schema Markup Generator", desc: "Generate JSON-LD structured data.", keywords: ["schema", "markup", "jsonld", "structured", "data", "rich", "snippet", "google"] },
  { slug: "slug-generator", name: "Slug Generator", desc: "Create URL-friendly slugs from text.", keywords: ["slug", "url", "friendly", "permalink", "blog", "seo"] },
  { slug: "css-gradient-generator", name: "CSS Gradient Generator", desc: "Create CSS gradients visually.", keywords: ["css", "gradient", "linear", "radial", "color", "design", "style"] },
  { slug: "color-converter", name: "Color Converter", desc: "Convert between HEX, RGB, HSL.", keywords: ["color", "hex", "rgb", "hsl", "convert", "picker", "design"] },
  { slug: "box-shadow-generator", name: "Box Shadow Generator", desc: "Create CSS box shadows visually.", keywords: ["box", "shadow", "css", "design", "visual", "effect"] },
  { slug: "html-editor", name: "HTML Editor", desc: "Live HTML/CSS/JS playground.", keywords: ["html", "editor", "css", "javascript", "code", "playground", "live", "preview"] },
  { slug: "html-tag-generator", name: "HTML Tag Generator", desc: "Add or strip HTML tags from text.", keywords: ["html", "tag", "strip", "clean", "format", "remove"] },
  { slug: "code-formatter", name: "Code Formatter", desc: "Format and beautify code in multiple languages.", keywords: ["code", "format", "beautify", "indent", "prettier", "javascript", "python"] },
  { slug: "youtube-tag-generator", name: "YouTube Tag Generator", desc: "Generate optimized YouTube tags.", keywords: ["youtube", "tag", "video", "seo", "channel", "views", "generate"] },
  { slug: "text-to-speech", name: "Text to Speech", desc: "Convert text to natural-sounding speech.", keywords: ["text", "speech", "voice", "audio", "tts", "speak", "read", "aloud", "sunna", "bolna"] },
  { slug: "qr-code-generator", name: "QR Code Generator", desc: "Generate custom QR codes.", keywords: ["qr", "code", "generate", "scan", "barcode", "link", "wifi"] },
  { slug: "image-compressor", name: "Image Compressor", desc: "Compress and resize images.", keywords: ["image", "compress", "resize", "photo", "picture", "optimize", "tasveer"] },
  { slug: "cron-expression-generator", name: "Cron Expression Generator", desc: "Build cron schedules visually.", keywords: ["cron", "schedule", "timer", "job", "expression", "task", "automate"] },
  { slug: "llms-txt-generator-validator", name: "llms.txt Generator & Validator", desc: "Generate and validate llms.txt files.", keywords: ["llms", "txt", "llm", "ai", "validate", "generate"] },
  { slug: "json-to-csv", name: "JSON to CSV Converter", desc: "Convert JSON data to CSV.", keywords: ["json", "csv", "convert", "data", "export", "table", "excel"] },
  { slug: "markdown-to-html", name: "Markdown to HTML", desc: "Convert Markdown to HTML.", keywords: ["markdown", "html", "convert", "preview", "md", "documentation"] },
  { slug: "lorem-ipsum-generator", name: "Lorem Ipsum Generator", desc: "Generate placeholder text.", keywords: ["lorem", "ipsum", "placeholder", "dummy", "text", "mockup"] },
  { slug: "privacy-policy-generator", name: "Privacy Policy Generator", desc: "Generate privacy policies for websites.", keywords: ["privacy", "policy", "gdpr", "ccpa", "legal", "terms", "website"] },
  { slug: "seo-title-analyzer", name: "SEO Title Analyzer", desc: "Analyze and optimize page titles.", keywords: ["seo", "title", "analyze", "optimize", "headline", "blog"] },
];

/* ── Hinglish → English Keyword Map ─────────────────────── */
const HINGLISH_MAP: Record<string, string[]> = {
  "mujhe": ["need", "want"], "muje": ["need", "want"], "chahiye": ["need", "want"],
  "chhaye": ["need", "want"], "chahye": ["need", "want"], "karo": ["do", "make"], "kro": ["do", "make"],
  "batao": ["tell", "show"], "dikhao": ["show"], "free": ["free"],
  "accha": ["good", "best"], "acha": ["good", "best"], "behtareen": ["best"],
  "sabse": ["best", "top"], "zaroorat": ["need"], "madad": ["help"],
  "kaise": ["how"], "kahan": ["where"], "konsa": ["which"], "kitna": ["how much"],
  "likhna": ["write", "writing"], "padhna": ["read", "reading"],
  "banana": ["make", "create", "build"], "bnana": ["make", "create", "build"],
  "paise": ["money", "earn", "income"], "paisa": ["money", "earn"],
  "naukri": ["job", "career"], "kaam": ["work", "job"],
  "seekhna": ["learn"], "sikhna": ["learn"], "sikho": ["learn"],
  "shuru": ["start", "begin"], "naya": ["new"], "purana": ["old"],
  "tasveer": ["image", "photo"], "rang": ["color"],
  "awaz": ["voice", "speech", "audio"], "sunna": ["speech", "audio", "listen"],
  "bolna": ["speech", "speak"], "naqal": ["plagiarism", "copy"],
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
  "hai", "hain", "ka", "ki", "ke", "ko", "se", "mein", "par",
  "ne", "ho", "toh", "bhi", "na", "ek", "yeh", "ye", "wo",
  "kya", "main", "hum", "aap", "tum",
]);

/* ── Detect Language ────────────────────────────────────── */
function detectLanguage(query: string): "hinglish" | "english" {
  const hinglishPatterns = /\b(kya|ha|hai|hain|mujhe|muje|chahiye|chhaye|karo|kro|batao|dikhao|accha|acha|behtareen|zaroorat|madad|kaise|kahan|konsa|kitna|banana|bnana|paise|paisa|naukri|kaam|seekhna|sikhna|sikho|shuru|naya|yar|bhai|bro|haan|nahi|nai|krna|krne|krdo|krdein|wala|wale|wali|apko|apka|apki|mera|meri|mere|iska|iski|iske|humara|tumhara|unka|unki|unke|sab|sari|sara|koi|kuch|bohot|boht|bahut|thoda|zyada|kam|aur|lekin|magar|isliye|kyunke|phir|pehle|baad|abhi|hona|chhaye|chahye|chaye|btao|bta|pta|chal|chalo|dekho|dakho|smj|samjh|pooch|poch|mila|milta|milega|hoga|hogi|hoge|kaisa|kaisi|yahan|idhar|udhar|abi|matlab|mtlb|sahi|galat|theek|thik)\b/gi;
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
function extractBestParagraphs(content: string, keywords: string[], maxParas: number = 3): string[] {
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
    .filter((p) => p.length > 40 && p.length < 1000);

  const scored = paragraphs.map((para) => {
    const paraLower = para.toLowerCase();
    let score = 0;
    let matchedKeywords = 0;
    for (const kw of keywords) {
      if (kw.length < 2) continue;
      const count = paraLower.split(kw).length - 1;
      if (count > 0) { matchedKeywords++; score += count * 2; }
    }
    if (matchedKeywords >= 2) score += matchedKeywords * 3;
    if (para.length > 80 && para.length < 500) score += 2;
    return { text: para, score };
  });

  return scored
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxParas)
    .map((p) => {
      let text = p.text;
      if (text.length > 400) text = text.slice(0, 400).replace(/\s\S*$/, "") + "...";
      return text;
    });
}

/* ── Log Content Gap (fire-and-forget) ──────────────────── */
async function logContentGap(query: string, intent: string, lang: string) {
  if (!db) return;
  try {
    const normalized = query.toLowerCase().trim().slice(0, 500);
    const existing = await db
      .select({ id: contentGaps.id, count: contentGaps.count })
      .from(contentGaps)
      .where(eq(contentGaps.query, normalized))
      .limit(1);

    if (existing.length > 0) {
      await db.update(contentGaps)
        .set({ count: existing[0].count + 1, updatedAt: new Date() })
        .where(eq(contentGaps.id, existing[0].id));
    } else {
      await db.insert(contentGaps).values({ query: normalized, intent, language: lang });
    }
  } catch {
    // Silent fail
  }
}

/* ── System Prompt for LLM ─────────────────────────────── */
const SYSTEM_PROMPT = `You are ByteVerse Bot — a friendly, knowledgeable assistant for ByteVerse (www.byteverse.fyi), a tech platform with 35+ free browser-based tools and 100+ articles.

STRICT RULES:
1. ONLY answer questions about: AI, SEO, blogging, coding, web development, tech tools, online earning, affiliate marketing, cybersecurity, digital marketing, and ByteVerse's tools/articles.
2. If a question is COMPLETELY OUTSIDE these topics (cooking, sports, politics, religion, movies, personal life, medical, legal), politely refuse and list what you CAN help with. Be STRICT about this.
3. LANGUAGE RULE (CRITICAL): Respond in the SAME language as the user. If they write in Hinglish/Urdu-English mix (like "mujhe batao", "kya hai", "tool chahiye"), you MUST respond in Hinglish. If they write in pure English, respond in English. Match their style.
4. Keep answers concise — 2-4 short paragraphs max. Use bullet points for lists.
5. When referencing articles from the CONTEXT, mention the title naturally.
6. When recommending tools, mention them by name — the UI will show clickable links automatically.
7. NEVER make up information not present in the provided CONTEXT. If no context is relevant, give a general helpful response about the topic based on your knowledge, but mention you don't have a specific article on it.
8. Use emojis sparingly (1-2 max per response).
9. Be conversational and helpful, not robotic.
10. If the user says hi/hello/salam, greet them warmly and tell them what you can help with.`;

/* ── Call Groq LLM ─────────────────────────────────────── */
async function callGroq(systemPrompt: string, userMessage: string): Promise<string | null> {
  if (!GROQ_API_KEY) return null;
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 500,
        top_p: 0.9,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
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

    // Quick check for simple intents — no LLM or DB needed
    if (/^(hi|hello|hey|salam|assalam|aoa|hlo|hii+|namaste|sup|kya hal)\b/i.test(queryLower)) {
      const greeting = lang === "hinglish"
        ? "Assalam-o-Alaikum! 👋 Main ByteVerse Bot hoon — AI powered! AI tools, SEO, blogging, coding — kuch bhi poochein, main detail mein jawab dunga!"
        : "Hello! 👋 I'm ByteVerse Bot — powered by AI! Ask me about AI tools, SEO, blogging, coding & more. I'll give you detailed answers from our 100+ articles!";
      return NextResponse.json({ answer: greeting, results: [], tools: [] });
    }
    if (/^(shukriya|thanks|thank you|dhanyavad|meharbani)\b/i.test(queryLower)) {
      const thanks = lang === "hinglish"
        ? "Koi baat nahi! 😊 Agar aur kuch poochna ho to zaroor poochein."
        : "You're welcome! 😊 Feel free to ask anything else.";
      return NextResponse.json({ answer: thanks, results: [], tools: [] });
    }

    // Extract & expand keywords
    let keywords = queryLower
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
    keywords = expandKeywords(keywords);

    // Search tools
    const toolMatches = searchTools(keywords);
    const toolResults = toolMatches.map((t) => ({
      title: t.name,
      slug: `tools/${t.slug}`,
      excerpt: t.desc.slice(0, 120),
      type: "tool" as const,
    }));

    // Search blog posts
    let scored: { title: string; slug: string; excerpt: string | null; score: number; bestParagraphs: string[] }[] = [];

    if (db) {
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

      scored = allPosts
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
            if (titleLower.includes(kw)) { score += 15; titleMatches++; }
            if (postKeywords.includes(kw)) score += 8;
            if (summaryLower.includes(kw)) score += 6;
            if (excerptLower.includes(kw)) score += 5;
            const contentHits = contentLower.split(kw).length - 1;
            score += Math.min(contentHits, 5) * 2;
          }

          if (titleMatches >= 2) score += titleMatches * 8;

          const bestParagraphs = score > 0
            ? extractBestParagraphs(post.content, keywords, 3)
            : [];

          return { title: post.title, slug: post.slug, excerpt: post.excerpt, score, bestParagraphs };
        })
        .filter((p) => p.score > 12)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    }

    // Build context for LLM
    const contextParts: string[] = [];

    if (toolMatches.length > 0) {
      contextParts.push("MATCHING TOOLS ON OUR SITE:");
      toolMatches.forEach((t) => {
        contextParts.push(`- ${t.name} (${t.desc}) → Link: /tools/${t.slug}`);
      });
    }

    if (scored.length > 0) {
      contextParts.push("\nMATCHING ARTICLES ON OUR SITE:");
      scored.slice(0, 3).forEach((post) => {
        contextParts.push(`\nArticle: "${post.title}"`);
        if (post.bestParagraphs.length > 0) {
          contextParts.push("Relevant excerpts:");
          post.bestParagraphs.forEach((p) => contextParts.push(`  "${p}"`));
        }
      });
    }

    if (contextParts.length === 0) {
      contextParts.push("NO MATCHING ARTICLES OR TOOLS FOUND for this query.");
      contextParts.push("Available tool categories: plagiarism checking, AI detection, CV builder, SEO tools, code formatters, image compression, QR codes, color tools, and more.");
    }

    const userLanguageNote = lang === "hinglish"
      ? "\n\n[USER IS WRITING IN HINGLISH — YOU MUST RESPOND IN HINGLISH (mix of Hindi/Urdu + English)]"
      : "\n\n[USER IS WRITING IN ENGLISH — RESPOND IN ENGLISH]";

    const contextString = contextParts.join("\n");
    const userMessageForLLM = `CONTEXT FROM BYTEVERSE:\n${contextString}${userLanguageNote}\n\nUSER QUESTION: ${query}`;

    // Call Groq LLM
    const llmAnswer = await callGroq(SYSTEM_PROMPT, userMessageForLLM);

    // Log content gap if no matches found
    if (scored.length === 0 && toolMatches.length === 0) {
      logContentGap(query, "no_match", lang);
    } else if (scored.length > 0 && scored[0].score < 10 && toolMatches.length === 0) {
      logContentGap(query, "weak_match", lang);
    }

    // Use LLM answer if available, otherwise fallback
    const answer = llmAnswer || getFallbackAnswer(query, scored, toolMatches, lang);

    return NextResponse.json({
      answer,
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

/* ── Fallback (no LLM) ─────────────────────────────────── */
function getFallbackAnswer(
  query: string,
  scored: { title: string; bestParagraphs: string[] }[],
  toolMatches: typeof TOOLS[number][],
  lang: "hinglish" | "english",
): string {
  const q = query.toLowerCase().trim();

  // Greeting
  if (/^(hi|hello|hey|salam|assalam|aoa|hlo|hii+|namaste|sup)\b/i.test(q)) {
    return lang === "hinglish"
      ? "Assalam-o-Alaikum! 👋 Main ByteVerse Bot hoon. AI, SEO, blogging, coding — kuch bhi poochein!"
      : "Hello! 👋 I'm ByteVerse Bot. Ask me about AI, SEO, coding, tools & more!";
  }

  const parts: string[] = [];
  if (toolMatches.length > 0) {
    parts.push(lang === "hinglish" ? "Ye tools mil gaye:" : "Found these tools:");
    toolMatches.slice(0, 3).forEach((t) => parts.push(`• ${t.name} — ${t.desc}`));
  }
  if (scored.length > 0 && scored[0].bestParagraphs.length > 0) {
    if (parts.length > 0) parts.push("");
    parts.push(lang === "hinglish" ? `"${scored[0].title}" se:` : `From "${scored[0].title}":`);
    parts.push(scored[0].bestParagraphs[0]);
  }
  if (parts.length === 0) {
    return lang === "hinglish"
      ? "Is topic pe abhi specific content nahi mila. Kuch aur poochein ya site explore karein!"
      : "No specific content found on this topic. Try asking something else!";
  }
  return parts.join("\n");
}
