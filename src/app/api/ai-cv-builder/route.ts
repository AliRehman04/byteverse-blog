import { NextResponse } from "next/server";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { GROQ_MODEL, GROQ_URL, groqModelOptions, toPlainText } from "@/lib/groq";

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_MODEL = process.env.XAI_MODEL || "grok-3-mini";
const XAI_URL = "https://api.x.ai/v1/chat/completions";
const CV_GROQ_API_KEY = process.env.CV_GROQ_API_KEY || process.env.GROQ_CV_API_KEY;
const CV_GROQ_MODEL = process.env.CV_GROQ_MODEL || GROQ_MODEL;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

type Provider = "xai" | "groq";

function getProvider(): { provider: Provider; apiKey: string; url: string; model: string } | null {
  if (CV_GROQ_API_KEY) {
    return { provider: "groq", apiKey: CV_GROQ_API_KEY, url: GROQ_URL, model: CV_GROQ_MODEL };
  }
  if (XAI_API_KEY) {
    return { provider: "xai", apiKey: XAI_API_KEY, url: XAI_URL, model: XAI_MODEL };
  }
  if (GROQ_API_KEY) {
    return { provider: "groq", apiKey: GROQ_API_KEY, url: GROQ_URL, model: GROQ_MODEL };
  }
  return null;
}

function safeText(value: unknown, maxLength = 4000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function buildInstruction(action: string, body: Record<string, unknown>) {
  const resume = typeof body.resume === "object" ? JSON.stringify(body.resume).slice(0, 7000) : "";
  const text = safeText(body.text, 2000);
  const jobDescription = safeText(body.jobDescription, 3500);
  const targetRole = safeText(body.targetRole, 200);

  if (action === "summary") {
    return `Write a modern CV professional summary for this candidate. Make it 2-3 sentences, specific, confident, ATS-friendly, and free from generic filler. Target role: ${targetRole || "not specified"}. Resume JSON: ${resume}`;
  }

  if (action === "bullet") {
    return `Rewrite this CV bullet into a stronger achievement-focused bullet. Keep it truthful and concise, and start with a strong action verb. Keep any numbers already in the bullet, but do not add new numbers, percentages or metrics. Return only one bullet sentence. Bullet: ${text}`;
  }

  if (action === "tailor") {
    return `Tailor this CV for the target job. Return JSON only with keys summary, skills, skillGroups, bulletSuggestions. summary must be 2 sentences. skills must be an array of 8-14 skills. skillGroups must be an array of 3-5 objects with title and items arrays for grouped CV skills. bulletSuggestions must be an array of 5 stronger bullets based only on facts in the resume; do not add numbers, percentages or metrics that are not in the resume. Target role: ${targetRole}. Job description: ${jobDescription}. Resume JSON: ${resume}`;
  }

  if (action === "design") {
    return `Choose the best original CV design settings for this candidate. Return JSON only. Allowed template values: studio, executive, compact, sidebar, modern, ats. Allowed fonts: Inter, Serif, Mono. Allowed spacing: compact, normal, roomy. Allowed fontSize: sm, md, lg. Allowed lineHeight: tight, normal, relaxed. Allowed margin: compact, normal, wide. Allowed columnWidth: balanced, content, sidebar. sectionOrder must use these exact values once: profile, skills, experience, projects, education, certifications, languages, custom. Choose an accent hex color. Prefer studio or compact for web developers and technical profiles, ats for conservative jobs, executive for senior leadership. Return keys: template, accent, font, spacing, fontSize, lineHeight, margin, columnWidth, sectionOrder. Target role: ${targetRole}. Job description: ${jobDescription}. Resume JSON: ${resume}`;
  }

  return `Improve this CV content. Return concise, modern, ATS-friendly wording only. Content: ${text || resume}`;
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`ai-cv-builder:${ip}`, { limit: 8, windowSeconds: 60 });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const provider = getProvider();
    if (!provider) {
      return NextResponse.json(
        { error: "AI CV features need CV_GROQ_API_KEY, XAI_API_KEY for Grok, or GROQ_API_KEY fallback." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const action = safeText(body.action, 50) || "improve";
    const instruction = buildInstruction(action, body);
    const isGroq = provider.provider === "groq";
    const wantsJson = action === "tailor" || action === "design";
    const maxTokens = action === "tailor" ? 1500 : action === "design" ? 700 : 600;

    const res = await fetch(provider.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          {
            role: "system",
            content:
              "You are an expert resume writer and ATS optimization assistant. Be specific, honest, concise, and modern. Do not invent employers, degrees, numbers, or certifications.",
          },
          { role: "user", content: instruction },
        ],
        temperature: wantsJson ? 0.35 : 0.55,
        ...(isGroq
          ? { max_completion_tokens: maxTokens, ...groqModelOptions(provider.model), ...(wantsJson ? { response_format: { type: "json_object" } } : {}) }
          : { max_tokens: maxTokens }),
      }),
    });

    if (!res.ok) {
      console.error("AI CV API error:", provider.provider, res.status, await res.text());
      return NextResponse.json({ error: "AI service error. Please try again." }, { status: 502 });
    }

    const data = await res.json();
    const output = toPlainText(data.choices?.[0]?.message?.content || "").trim();
    if (!output) {
      return NextResponse.json({ error: "AI returned empty response." }, { status: 502 });
    }

    return NextResponse.json({ text: output, provider: provider.provider, model: provider.model, remaining: rl.remaining });
  } catch (error) {
    console.error("AI CV builder error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}