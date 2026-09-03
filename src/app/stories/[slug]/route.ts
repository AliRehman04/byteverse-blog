import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { posts, categories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { siteConfig } from "@/lib/config";
import { getPostDisplayImage } from "@/lib/image-seo";

export const revalidate = 86400;

/** Extract key points from markdown content for story slides */
function extractSlides(content: string, title: string): { heading: string; text: string }[] {
  const slides: { heading: string; text: string }[] = [];

  // Get H2 headings and their first paragraph
  const sections = content.split(/^## /m).filter((s) => s.trim());
  for (const section of sections) {
    const newlineIdx = section.indexOf("\n");
    if (newlineIdx === -1) continue;

    const heading = section.slice(0, newlineIdx).trim()
      .replace(/[#*_`\[\]()]/g, "")
      .replace(/<[^>]+>/g, "");
    if (!heading || heading.toLowerCase().includes("faq") || heading.toLowerCase().includes("conclusion")) continue;

    const body = section.slice(newlineIdx + 1).trim();
    // Get first non-empty paragraph
    const paragraphs = body.split("\n\n").filter((p) => p.trim() && !p.startsWith("#") && !p.startsWith("!") && !p.startsWith("|") && !p.startsWith("```"));
    if (paragraphs.length === 0) continue;

    const text = paragraphs[0]
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // strip links
      .replace(/[*_`#]/g, "")                  // strip markdown
      .replace(/<[^>]+>/g, "")                 // strip html
      .trim()
      .slice(0, 200);

    if (text.length > 20) {
      slides.push({ heading: heading.slice(0, 70), text });
    }
    if (slides.length >= 8) break;
  }

  return slides;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!db) return new Response("Not Found", { status: 404 });

  const result = await db.select().from(posts).where(eq(posts.slug, slug)).limit(1);
  const post = result[0];
  if (!post || !post.published) return new Response("Not Found", { status: 404 });

  let category = null;
  if (post.categoryId) {
    const catResult = await db.select().from(categories).where(eq(categories.id, post.categoryId)).limit(1);
    category = catResult[0] || null;
  }

  const coverImage = getPostDisplayImage(post);
  const slides = extractSlides(post.content, post.title);
  if (slides.length < 2) return new Response("Not Found", { status: 404 });

  const storyUrl = `${siteConfig.url}/stories/${slug}`;
  const posterImage = coverImage || `${siteConfig.url}/opengraph-image`;

  // Color palette based on category
  const colors: Record<string, { bg: string; accent: string }> = {
    "ai-tools": { bg: "#1a1035", accent: "#8b5cf6" },
    "tech-guides": { bg: "#0c1e3a", accent: "#3b82f6" },
    "productivity": { bg: "#0a2420", accent: "#10b981" },
    "coding": { bg: "#1a1505", accent: "#f59e0b" },
    "software-reviews": { bg: "#1a0a0a", accent: "#ef4444" },
    "cybersecurity": { bg: "#0f1a2e", accent: "#06b6d4" },
  };
  const palette = colors[category?.slug || ""] || { bg: "#0f172a", accent: "#6366f1" };

  const ampStoryHtml = `<!doctype html>
<html amp lang="en">
<head>
  <meta charset="utf-8">
  <script async src="https://cdn.ampproject.org/v0.js"></script>
  <script async custom-element="amp-story" src="https://cdn.ampproject.org/v0/amp-story-1.0.js"></script>
  <title>${escapeHtml(post.title)} - ByteVerse</title>
  <link rel="canonical" href="${storyUrl}">
  <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
<style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style><noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;animation:none}</style></noscript>
  <style amp-custom>
    .slide-content {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 32px 24px;
      height: 100%;
    }
    .slide-heading {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 28px;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.2;
      margin-bottom: 12px;
      text-shadow: 0 2px 8px rgba(0,0,0,0.5);
    }
    .slide-text {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 16px;
      color: rgba(255,255,255,0.9);
      line-height: 1.5;
      text-shadow: 0 1px 4px rgba(0,0,0,0.4);
    }
    .slide-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: ${palette.accent};
      background: rgba(255,255,255,0.1);
      border: 1px solid ${palette.accent};
      padding: 4px 12px;
      border-radius: 20px;
      margin-bottom: 16px;
    }
    .slide-cta {
      display: inline-block;
      margin-top: 20px;
      padding: 12px 28px;
      background: ${palette.accent};
      color: #fff;
      font-weight: 700;
      font-size: 14px;
      border-radius: 12px;
      text-decoration: none;
      text-align: center;
    }
    .overlay {
      background: linear-gradient(0deg, ${palette.bg}ee 0%, ${palette.bg}aa 40%, transparent 100%);
    }
    .cover-title {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 34px;
      font-weight: 900;
      color: #ffffff;
      line-height: 1.15;
      text-shadow: 0 2px 12px rgba(0,0,0,0.6);
    }
    .step-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: ${palette.accent};
      color: #fff;
      font-weight: 800;
      font-size: 16px;
      margin-bottom: 12px;
    }
  </style>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": ${JSON.stringify(post.metaTitle || post.title)},
    "image": ${JSON.stringify(posterImage)},
    "datePublished": "${post.createdAt.toISOString()}",
    "dateModified": "${post.updatedAt.toISOString()}",
    "author": { "@type": "Person", "name": ${JSON.stringify(post.author)} },
    "publisher": { "@type": "Organization", "name": "ByteVerse", "logo": { "@type": "ImageObject", "url": "${siteConfig.url}/logo.png" } }
  }
  </script>
</head>
<body>
  <amp-story
    standalone
    title="${escapeHtml(post.title)}"
    publisher="ByteVerse"
    publisher-logo-src="${siteConfig.url}/logo.png"
    poster-portrait-src="${posterImage}"
  >
    <!-- Cover Page -->
    <amp-story-page id="cover" auto-advance-after="6s">
      <amp-story-grid-layer template="fill">
        ${coverImage ? `<amp-img src="${coverImage}" width="720" height="1280" layout="fill" object-fit="cover"></amp-img>` : ""}
      </amp-story-grid-layer>
      <amp-story-grid-layer template="fill" class="overlay"></amp-story-grid-layer>
      <amp-story-grid-layer template="vertical" class="slide-content">
        ${category ? `<span class="slide-badge">${escapeHtml(category.name)}</span>` : ""}
        <h1 class="cover-title">${escapeHtml(post.title)}</h1>
        <p class="slide-text" style="margin-top:12px;opacity:0.8">Swipe to read →</p>
      </amp-story-grid-layer>
    </amp-story-page>

    <!-- Content Slides -->
    ${slides.map((slide, i) => `
    <amp-story-page id="slide-${i + 1}" auto-advance-after="8s">
      <amp-story-grid-layer template="fill">
        ${coverImage ? `<amp-img src="${coverImage}" width="720" height="1280" layout="fill" object-fit="cover" style="opacity:0.3"></amp-img>` : ""}
      </amp-story-grid-layer>
      <amp-story-grid-layer template="fill" style="background:${palette.bg}"></amp-story-grid-layer>
      <amp-story-grid-layer template="vertical" class="slide-content">
        <span class="step-number">${i + 1}</span>
        <h2 class="slide-heading">${escapeHtml(slide.heading)}</h2>
        <p class="slide-text">${escapeHtml(slide.text)}</p>
      </amp-story-grid-layer>
    </amp-story-page>`).join("\n")}

    <!-- CTA Page -->
    <amp-story-page id="cta">
      <amp-story-grid-layer template="fill">
        ${coverImage ? `<amp-img src="${coverImage}" width="720" height="1280" layout="fill" object-fit="cover"></amp-img>` : ""}
      </amp-story-grid-layer>
      <amp-story-grid-layer template="fill" class="overlay"></amp-story-grid-layer>
      <amp-story-grid-layer template="vertical" class="slide-content" style="align-items:center;text-align:center;justify-content:center">
        <h2 class="slide-heading">Read the Full Article</h2>
        <p class="slide-text">${escapeHtml((post.metaDescription || post.excerpt).slice(0, 120))}</p>
        <a href="${siteConfig.url}/blog/${slug}" class="slide-cta">Read Full Article →</a>
      </amp-story-grid-layer>
    </amp-story-page>

    <amp-story-bookend layout="nodisplay">
      <script type="application/json">
      ${JSON.stringify({
        bookendVersion: "v1.0",
        shareProviders: [
          { provider: "twitter" },
          { provider: "linkedin" },
          { provider: "email" },
        ],
        components: [
          { type: "heading", text: "More from ByteVerse" },
          { type: "cta-link", links: [{ text: "Visit ByteVerse", url: siteConfig.url }] },
        ],
      }, null, 2)}
      </script>
    </amp-story-bookend>
  </amp-story>
</body>
</html>`;

  return new Response(ampStoryHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=2592000, stale-while-revalidate=86400",
    },
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
