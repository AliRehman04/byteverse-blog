import { NextRequest, NextResponse } from "next/server";

function isPrivateHost(hostname: string): boolean {
  return /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.0\.0\.0|\[?::1\]?|0:0:0:0:0:0:0:1)/i.test(
    hostname
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const raw = typeof body.domain === "string" ? body.domain.trim() : "";

    if (!raw) {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 });
    }

    let baseUrl: URL;
    try {
      baseUrl = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    } catch {
      return NextResponse.json({ error: "Invalid domain format" }, { status: 400 });
    }

    if (isPrivateHost(baseUrl.hostname)) {
      return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
    }

    const origin = baseUrl.origin;
    const candidates = [
      `${origin}/llms.txt`,
      `${origin}/.well-known/llms.txt`,
    ];

    if (!baseUrl.hostname.startsWith("www.")) {
      candidates.push(`https://www.${baseUrl.hostname}/llms.txt`);
    }

    const tried: string[] = [];

    for (const url of candidates) {
      tried.push(url);
      try {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(8000),
          headers: { "User-Agent": "ByteVerse-LlmsTxt-Validator/1.0" },
          redirect: "follow",
        });

        if (!res.ok) continue;

        const contentType = res.headers.get("content-type") || "";
        const body = await res.text();

        const isText =
          contentType.includes("text/") ||
          contentType.includes("application/octet-stream") ||
          /^[\x09\x0A\x0D\x20-\x7E]/.test(body.substring(0, 64));

        if (!isText) {
          return NextResponse.json({
            found: true,
            status: "invalid_content",
            url,
            tried,
            contentType,
            content: null,
            error: "File found but content is not plain text",
          });
        }

        return NextResponse.json({
          found: true,
          status: "present",
          url,
          tried,
          contentType,
          content: body.substring(0, 200 * 1024),
        });
      } catch {
        /* continue to next candidate */
      }
    }

    return NextResponse.json({
      found: false,
      status: "not_found",
      url: null,
      tried,
      content: null,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to check domain. Verify the URL and try again." },
      { status: 500 }
    );
  }
}
