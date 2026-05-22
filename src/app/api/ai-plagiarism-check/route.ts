import { NextResponse } from "next/server";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function POST(request: Request) {
  try {
    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { error: "AI check is temporarily unavailable." },
        { status: 503 }
      );
    }

    const ip = getClientIp(request);
    const rl = rateLimit(`ai-plagiarism:${ip}`, { limit: 8, windowSeconds: 60 });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!text || text.length < 50) {
      return NextResponse.json(
        { error: "Text must be at least 50 characters." },
        { status: 400 }
      );
    }

    const inputText = text.slice(0, 5000);

    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a plagiarism and originality analyzer. Analyze the given text and respond in JSON format only. Evaluate:
1. Whether the text appears to be original or likely copied/common content
2. The writing style (formal/academic/casual/AI-generated)
3. Specific phrases that seem generic, templated, or commonly found online

Respond with ONLY this JSON structure (no markdown, no code fences):
{"score": <0-100 originality score>, "verdict": "<original|likely_original|suspicious|likely_copied>", "style": "<formal|academic|casual|mixed|ai_generated>", "flags": ["<specific concern 1>", "<specific concern 2>"], "summary": "<1-2 sentence assessment>"}

Scoring guide:
- 80-100: Highly original, personal voice, unique perspectives
- 60-79: Mostly original with some common phrasing
- 40-59: Mixed — contains notable generic/common content
- 20-39: Suspicious — heavily templated or commonly found phrasing
- 0-19: Likely copied — well-known text, Lorem Ipsum, famous quotes, etc.`,
          },
          {
            role: "user",
            content: inputText,
          },
        ],
        temperature: 0.1,
        max_tokens: 512,
      }),
    });

    if (!res.ok) {
      console.error("Groq API error:", res.status, await res.text());
      return NextResponse.json(
        { error: "AI service error. Please try again." },
        { status: 502 }
      );
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || "";

    try {
      // Parse the JSON response
      const analysis = JSON.parse(raw);
      return NextResponse.json({
        score: Math.max(0, Math.min(100, analysis.score || 0)),
        verdict: analysis.verdict || "unknown",
        style: analysis.style || "unknown",
        flags: Array.isArray(analysis.flags) ? analysis.flags.slice(0, 5) : [],
        summary: analysis.summary || "",
        remaining: rl.remaining,
      });
    } catch {
      // If JSON parsing fails, return a generic response
      return NextResponse.json({
        score: 50,
        verdict: "unknown",
        style: "unknown",
        flags: [],
        summary: raw.slice(0, 200),
        remaining: rl.remaining,
      });
    }
  } catch (err) {
    console.error("AI plagiarism check error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
