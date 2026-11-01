import { NextResponse } from "next/server";
import { createBraveExactPhraseSearch } from "@/lib/plagiarism/brave-search";
import { runWebCheck, selectCheckSentences, WEB_CHECK_LIMITS } from "@/lib/plagiarism/web-check";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_BODY_BYTES = 20000;
const CHECKS_PER_HOUR = 10;

function configuredApiKey(): string | null {
  return process.env.BRAVE_SEARCH_API_KEY?.trim() || null;
}

export function GET() {
  return NextResponse.json({ enabled: configuredApiKey() !== null }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  const apiKey = configuredApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "The online check is not set up yet." },
      { status: 503, headers: NO_STORE },
    );
  }

  const limit = rateLimit(`plagiarism-web:${getClientIp(request)}`, {
    limit: CHECKS_PER_HOUR,
    windowSeconds: 3600,
  });
  if (!limit.success) return rateLimitResponse(limit.resetAt);

  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "The text is too large." }, { status: 413, headers: NO_STORE });
  }

  const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (text.length < WEB_CHECK_LIMITS.minChars || text.length > WEB_CHECK_LIMITS.maxChars) {
    return NextResponse.json(
      { error: `Enter ${WEB_CHECK_LIMITS.minChars} to ${WEB_CHECK_LIMITS.maxChars} characters.` },
      { status: 400, headers: NO_STORE },
    );
  }
  if (selectCheckSentences(text).eligibleCount === 0) {
    return NextResponse.json(
      { error: "Add at least one sentence with 8 or more words." },
      { status: 400, headers: NO_STORE },
    );
  }

  const report = await runWebCheck(text, createBraveExactPhraseSearch({ apiKey }));
  if (report.checkedSentences === 0) {
    return NextResponse.json(
      { error: "Search is temporarily unavailable. Try again shortly." },
      { status: 502, headers: NO_STORE },
    );
  }
  return NextResponse.json(report, { headers: NO_STORE });
}
