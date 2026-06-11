import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "edge";

/** Simple keyword-based content search across all blog posts */
export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return NextResponse.json({ answer: "Please ask a more specific question.", results: [] });
    }

    if (!db) {
      return NextResponse.json({ answer: "Service temporarily unavailable.", results: [] });
    }

    const allPosts = await db
      .select({
        title: posts.title,
        slug: posts.slug,
        excerpt: posts.excerpt,
        content: posts.content,
      })
      .from(posts)
      .where(eq(posts.published, true));

    const queryLower = query.toLowerCase().trim();
    const keywords = queryLower
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

    if (keywords.length === 0) {
      return NextResponse.json({ answer: "Could you rephrase your question?", results: [] });
    }

    // Score each post by keyword match density
    const scored = allPosts
      .map((post) => {
        const titleLower = post.title.toLowerCase();
        const excerptLower = (post.excerpt || "").toLowerCase();
        const contentLower = post.content.toLowerCase();

        let score = 0;
        for (const kw of keywords) {
          // Title match = 10 points, excerpt = 5, content = 1 per occurrence (max 3)
          if (titleLower.includes(kw)) score += 10;
          if (excerptLower.includes(kw)) score += 5;
          const contentMatches = contentLower.split(kw).length - 1;
          score += Math.min(contentMatches, 3);
        }

        // Extract best matching paragraph from content
        let bestParagraph = "";
        if (score > 0) {
          const paragraphs = post.content
            .split(/\n\n+/)
            .map((p) => p.replace(/[#*_`>\[\]()!-]/g, "").trim())
            .filter((p) => p.length > 40 && p.length < 500);

          let bestParaScore = 0;
          for (const para of paragraphs) {
            const paraLower = para.toLowerCase();
            let paraScore = 0;
            for (const kw of keywords) {
              if (paraLower.includes(kw)) paraScore += 1;
            }
            if (paraScore > bestParaScore) {
              bestParaScore = paraScore;
              bestParagraph = para;
            }
          }
        }

        return { ...post, score, bestParagraph };
      })
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (scored.length === 0) {
      return NextResponse.json({
        answer: "I couldn't find a specific answer. Try browsing our articles or refine your question.",
        results: [],
      });
    }

    const topResult = scored[0];
    const snippet = topResult.bestParagraph || topResult.excerpt || "";
    const answer = snippet.length > 200 ? snippet.slice(0, 200).trim() + "..." : snippet;

    return NextResponse.json({
      answer,
      results: scored.map((p) => ({
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt?.slice(0, 120) || "",
      })),
    });
  } catch {
    return NextResponse.json({ answer: "Something went wrong. Please try again.", results: [] }, { status: 500 });
  }
}

const STOP_WORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can",
  "had", "her", "was", "one", "our", "out", "day", "has", "his",
  "how", "its", "may", "new", "now", "old", "see", "way", "who",
  "did", "get", "let", "say", "she", "too", "use", "what", "when",
  "why", "with", "this", "that", "from", "have", "been", "will",
  "your", "they", "them", "then", "than", "into", "some", "more",
  "also", "just", "about", "which", "would", "there", "their",
  "could", "other", "after", "these", "should", "where", "being",
]);
