import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!GROQ_API_KEY) {
    return NextResponse.json(
      { error: "GROQ_API_KEY not configured in environment variables" },
      { status: 500 }
    );
  }

  const { title, content, category } = await request.json();

  if (!title || !content) {
    return NextResponse.json(
      { error: "Title and content are required" },
      { status: 400 }
    );
  }

  // Truncate content to ~3000 chars to stay within limits
  const truncatedContent = content.slice(0, 3000);

  const prompt = `You are an expert SEO specialist for a tech blog called ByteVerse (byteverse.fyi). 
Analyze the following blog post and generate SEO-optimized metadata.

Blog Post Title: ${title}
Category: ${category || "General"}
Content (partial): ${truncatedContent}

Generate the following in valid JSON format (no markdown, no code blocks, just raw JSON):
{
  "metaTitle": "SEO-optimized title under 60 characters, include primary keyword naturally",
  "metaDescription": "Compelling meta description under 155 characters, include primary keyword, end with a call-to-action or benefit",
  "keywords": "comma-separated list of 6-8 relevant long-tail keywords",
  "excerpt": "2-3 sentence engaging excerpt under 200 characters that hooks the reader",
  "readingTime": "X min read (calculate based on ~200 words per minute)"
}

Rules:
- metaTitle MUST be under 60 characters
- metaDescription MUST be under 155 characters
- Keywords should be long-tail and specific to the topic
- Excerpt should be engaging and concise
- All text in English
- Return ONLY the JSON object, nothing else`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      return NextResponse.json(
        { error: errorData.error?.message || "Groq API error" },
        { status: 500 }
      );
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    // Parse JSON from response (handle potential markdown wrapping)
    const cleanJson = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const seoData = JSON.parse(cleanJson);

    return NextResponse.json(seoData);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate SEO data. Check your API key." },
      { status: 500 }
    );
  }
}
