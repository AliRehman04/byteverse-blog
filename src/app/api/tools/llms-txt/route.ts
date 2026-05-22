import { NextRequest, NextResponse } from "next/server";

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

function titleFromSlug(slug: string): string {
  return slug
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function isPrivateHost(hostname: string): boolean {
  return /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.0\.0\.0|\[?::1\]?|0:0:0:0:0:0:0:1)/i.test(
    hostname
  );
}

async function safeFetch(url: string, timeoutMs: number): Promise<Response> {
  return fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "User-Agent": "ByteVerse-LlmsTxt-Generator/1.0" },
  });
}

function extractLocs(xml: string): string[] {
  const urls: string[] = [];
  for (const m of xml.matchAll(/<loc>\s*([\s\S]*?)\s*<\/loc>/gi)) {
    urls.push(m[1].replace(/&amp;/g, "&").trim());
  }
  return urls;
}

/* ------------------------------------------------------------------ */
/*  ROUTE                                                              */
/* ------------------------------------------------------------------ */

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

    /* ---------- Parallel: sitemap + homepage ---------- */
    const [sitemapResult, homeResult] = await Promise.allSettled([
      /* ---- sitemap ---- */
      (async () => {
        // Try /sitemap.xml
        let res: Response | null = null;
        try {
          res = await safeFetch(`${origin}/sitemap.xml`, 6000);
        } catch {
          /* ignore */
        }

        // Fallback: robots.txt Sitemap directive
        if (!res || !res.ok) {
          try {
            const r = await safeFetch(`${origin}/robots.txt`, 4000);
            if (r.ok) {
              const txt = await r.text();
              const match = txt.match(/Sitemap:\s*(\S+)/i);
              if (match) {
                res = await safeFetch(match[1], 6000);
              }
            }
          } catch {
            /* ignore */
          }
        }

        if (!res || !res.ok) return [];
        const xml = await res.text();

        // Sitemap index → follow first child
        if (xml.includes("<sitemapindex")) {
          const childUrls = extractLocs(xml);
          if (childUrls.length > 0) {
            try {
              const childRes = await safeFetch(childUrls[0], 5000);
              if (childRes.ok) return extractLocs(await childRes.text());
            } catch {
              /* ignore */
            }
          }
          return [];
        }

        return extractLocs(xml);
      })(),

      /* ---- homepage meta ---- */
      (async () => {
        try {
          const res = await safeFetch(origin, 6000);
          if (!res.ok) return { title: baseUrl.hostname, description: "" };
          const html = await res.text();

          let title = baseUrl.hostname;
          const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          if (titleMatch) {
            title =
              titleMatch[1]
                .replace(/\s+/g, " ")
                .replace(/\s*[|–—-]\s*.{1,50}$/, "")
                .trim() || baseUrl.hostname;
          }

          let description = "";
          const descMatch =
            html.match(/<meta\s[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i) ||
            html.match(/<meta\s[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["'][^>]*>/i);
          if (descMatch) {
            description = descMatch[1].replace(/\s+/g, " ").trim();
          }

          return { title, description };
        } catch {
          return { title: baseUrl.hostname, description: "" };
        }
      })(),
    ]);

    const urls = sitemapResult.status === "fulfilled" ? sitemapResult.value : [];
    const meta =
      homeResult.status === "fulfilled"
        ? (homeResult.value as { title: string; description: string })
        : { title: baseUrl.hostname, description: "" };

    /* ---------- Deduplicate & filter ---------- */
    const seen = new Set<string>();
    const filtered = urls.filter((u) => {
      try {
        const p = new URL(u);
        if (p.origin !== origin) return false;
        if (seen.has(p.pathname)) return false;
        seen.add(p.pathname);
        return true;
      } catch {
        return false;
      }
    });

    /* ---------- Group by first path segment ---------- */
    const groups: Record<string, { title: string; url: string }[]> = {};

    for (const url of filtered.slice(0, 200)) {
      try {
        const parsed = new URL(url);
        if (/\.(xml|json|txt|ico|png|jpg|jpeg|gif|svg|css|js|woff2?)$/i.test(parsed.pathname))
          continue;

        const segments = parsed.pathname.split("/").filter(Boolean);
        let group: string;
        let title: string;

        if (segments.length === 0) {
          group = "Main URLs";
          title = "Homepage";
        } else if (segments.length === 1) {
          group = "Main URLs";
          title = titleFromSlug(segments[0]);
        } else {
          group = titleFromSlug(segments[0]);
          title = titleFromSlug(segments[segments.length - 1]);
        }

        if (!groups[group]) groups[group] = [];
        if (groups[group].length < 30) {
          groups[group].push({ title, url });
        }
      } catch {
        /* skip invalid */
      }
    }

    return NextResponse.json({
      siteTitle: meta.title,
      siteDescription: meta.description,
      groups,
      totalUrls: filtered.length,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch site data. Check the domain and try again." },
      { status: 500 }
    );
  }
}
