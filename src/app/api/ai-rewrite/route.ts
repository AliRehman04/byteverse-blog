import { NextResponse } from "next/server";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function POST(request: Request) {
  try {
    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { error: "AI rewrite is temporarily unavailable." },
        { status: 503 }
      );
    }

    // Rate limit: 10 requests per IP per minute
    const ip = getClientIp(request);
    const rl = rateLimit(`ai-rewrite:${ip}`, { limit: 10, windowSeconds: 60 });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const strength = typeof body.strength === "number" ? body.strength : 50;

    if (!text || text.length < 50) {
      return NextResponse.json(
        { error: "Text must be at least 50 characters." },
        { status: 400 }
      );
    }

    // Cap input at 5000 chars to prevent abuse
    const inputText = text.slice(0, 5000);

    const strengthLabel =
      strength <= 30 ? "lightly" : strength <= 65 ? "moderately" : "heavily";

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
            content: `You are a text rewriter. Rewrite the given text to make it sound more human and natural while preserving the original meaning. ${strengthLabel === "lightly" ? "Make minimal changes — just swap a few words and add contractions." : strengthLabel === "moderately" ? "Restructure some sentences, use casual language, add contractions, and swap synonyms." : "Heavily restructure sentences, change word order, use very casual/conversational tone, add contractions everywhere, and make it sound like a real person wrote it."} Rules: 1) Keep the same language (if English, reply in English). 2) Preserve all facts and numbers. 3) Do NOT add any commentary — only return the rewritten text. 4) Do NOT wrap in quotes.`,
          },
          {
            role: "user",
            content: inputText,
          },
        ],
        temperature: strength <= 30 ? 0.3 : strength <= 65 ? 0.6 : 0.9,
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Groq API error:", res.status, errBody);
      return NextResponse.json(
        { error: "AI service error. Please try again." },
        { status: 502 }
      );
    }

    const data = await res.json();
    const rewritten =
      data.choices?.[0]?.message?.content?.trim() || "";

    if (!rewritten) {
      return NextResponse.json(
        { error: "AI returned empty response. Try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      text: rewritten,
      model: "llama-3.3-70b",
      remaining: rl.remaining,
    });
  } catch (err) {
    console.error("AI rewrite error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
