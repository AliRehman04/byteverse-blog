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
    headers: {
      "User-Agent": "ByteVerse-LlmsTxt-Generator/1.0",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
}

function extractLocs(xml: string): string[] {
  const urls: string[] = [];
  for (const m of xml.matchAll(/<loc>\s*([\s\S]*?)\s*<\/loc>/gi)) {
    urls.push(
      m[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim()
    );
  }
  return urls;
}

/** Slug → friendly heading mapping */
const SLUG_MAP: Record<string, string> = {
  blog: "Blogs",
  blogs: "Blogs",
  post: "Blogs",
  posts: "Blogs",
  article: "Articles",
  articles: "Articles",
  news: "News",
  service: "Services",
  services: "Services",
  about: "About",
  "about-us": "About",
  contact: "Contact",
  "contact-us": "Contact",
  careers: "Careers",
  jobs: "Careers",
  privacy: "Legal",
  "privacy-policy": "Legal",
  terms: "Legal",
  "terms-of-service": "Legal",
  legal: "Legal",
  product: "Products",
  products: "Products",
  shop: "Shop",
  store: "Shop",
  "case-study": "Case Studies",
  "case-studies": "Case Studies",
  portfolio: "Portfolio",
  work: "Portfolio",
  projects: "Portfolio",
  docs: "Documentation",
  documentation: "Documentation",
  help: "Help & Support",
  support: "Help & Support",
  faq: "FAQ",
  faqs: "FAQ",
  pricing: "Pricing",
  plans: "Pricing",
  tools: "Tools",
  resources: "Resources",
  guides: "Guides",
  tutorials: "Tutorials",
  category: "Categories",
  categories: "Categories",
  tag: "Tags",
  tags: "Tags",
  author: "Authors",
  authors: "Authors",
  team: "Team",
};

interface NavLink {
  href: string;
  text: string;
}

/**
 * Convert a relative URL to absolute.
 */
function relToAbs(rel: string, base: string): string {
  try {
    return new URL(rel, base).href;
  } catch {
    return rel;
  }
}

/**
 * Extract structured nav and footer links from homepage HTML.
 */
function extractNavAndFooter(
  html: string,
  origin: string,
  baseHost: string
): Record<string, NavLink[]> {
  const sections: Record<string, NavLink[]> = {};

  const normalizeLink = (
    href: string,
    text: string
  ): NavLink | null => {
    href = href.trim();
    if (/^(#|mailto:|tel:|javascript:)/i.test(href)) return null;
    const abs = relToAbs(href, origin);
    try {
      const u = new URL(abs);
      if (u.hostname !== baseHost) return null;
    } catch {
      return null;
    }
    text = text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    if (!text) text = abs;
    return { href: abs.replace(/\/$/, ""), text };
  };

  // 1) Parse <nav> blocks
  const navRegex = /<nav\b([^>]*)>([\s\S]*?)<\/nav>/gi;
  let navIdx = 0;
  for (const nav of html.matchAll(navRegex)) {
    const attrs = nav[1];
    const navHtml = nav[2];
    let name = "";
    const ariaMatch = attrs.match(/aria-label=["']([^"']+)["']/i);
    const idMatch = attrs.match(/id=["']([^"']+)["']/i);
    if (ariaMatch) name = ariaMatch[1];
    else if (idMatch) name = idMatch[1];
    if (!name) name = `Navigation ${++navIdx}`;
    name = name
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();

    const links: NavLink[] = [];
    for (const a of navHtml.matchAll(
      /<a\s[^>]*href=["'](.*?)["'][^>]*>([\s\S]*?)<\/a>/gi
    )) {
      const link = normalizeLink(a[1], a[2]);
      if (link) links.push(link);
    }
    if (links.length > 0) sections[name] = links;
  }

  // 2) Parse <footer> with heading+list groups
  const footerMatch = html.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/i);
  if (footerMatch) {
    const footerHtml = footerMatch[1];
    // Try heading + ul pattern
    const headingGroups = [
      ...footerHtml.matchAll(
        /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>[\s\S]*?<ul\b[^>]*>([\s\S]*?)<\/ul>/gi
      ),
    ];
    if (headingGroups.length > 0) {
      for (const g of headingGroups) {
        const heading =
          g[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() ||
          "Footer Links";
        const ul = g[2];
        const links: NavLink[] = [];
        for (const a of ul.matchAll(
          /<a\s[^>]*href=["'](.*?)["'][^>]*>([\s\S]*?)<\/a>/gi
        )) {
          const link = normalizeLink(a[1], a[2]);
          if (link) links.push(link);
        }
        if (links.length > 0)
          sections[`Footer: ${heading}`] = links;
      }
    } else {
      // Fallback: all footer links
      const links: NavLink[] = [];
      for (const a of footerHtml.matchAll(
        /<a\s[^>]*href=["'](.*?)["'][^>]*>([\s\S]*?)<\/a>/gi
      )) {
        const link = normalizeLink(a[1], a[2]);
        if (link) links.push(link);
        if (links.length >= 50) break;
      }
      if (links.length > 0) sections["Footer Links"] = links;
    }
  }

  // Deduplicate across sections
  const hrefSeen = new Set<string>();
  const deduped: Record<string, NavLink[]> = {};
  for (const [name, links] of Object.entries(sections)) {
    const unique = links.filter((l) => {
      if (hrefSeen.has(l.href)) return false;
      hrefSeen.add(l.href);
      return true;
    });
    if (unique.length > 0) deduped[name] = unique;
  }
  return deduped;
}

/**
 * Extract internal links from homepage HTML as fallback when sitemap unavailable.
 */
function extractInternalLinks(
  html: string,
  origin: string,
  baseHost: string,
  limit = 200
): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const a of html.matchAll(
    /<a\s[^>]*href=["'](.*?)["']/gi
  )) {
    const href = a[1].trim();
    if (/^(#|mailto:|tel:|javascript:)/i.test(href)) continue;
    const abs = relToAbs(href, origin).split("?")[0].replace(/\/$/, "");
    try {
      const u = new URL(abs);
      if (u.hostname !== baseHost) continue;
      if (seen.has(u.pathname)) continue;
      seen.add(u.pathname);
      urls.push(abs);
      if (urls.length >= limit) break;
    } catch {
      continue;
    }
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
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }

    let baseUrl: URL;
    try {
      baseUrl = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    } catch {
      return NextResponse.json(
        { error: "Invalid domain format" },
        { status: 400 }
      );
    }

    if (isPrivateHost(baseUrl.hostname)) {
      return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
    }

    const origin = baseUrl.origin;
    const baseHost = baseUrl.hostname;

    /* ---------- Parallel: sitemap + homepage ---------- */
    const [sitemapResult, homeResult] = await Promise.allSettled([
      /* ---- sitemap (follow ALL child sitemaps) ---- */
      (async () => {
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
              const sitemapMatches = [
                ...txt.matchAll(/Sitemap:\s*(\S+)/gi),
              ];
              for (const sm of sitemapMatches) {
                try {
                  res = await safeFetch(sm[1], 6000);
                  if (res.ok) break;
                } catch {
                  /* ignore */
                }
              }
            }
          } catch {
            /* ignore */
          }
        }

        if (!res || !res.ok) return [];
        const xml = await res.text();

        // Sitemap index → follow ALL child sitemaps (up to 10)
        if (xml.includes("<sitemapindex")) {
          const childUrls = extractLocs(xml);
          const allUrls: string[] = [];
          const childFetches = childUrls.slice(0, 10).map(async (curl) => {
            try {
              const u = new URL(curl);
              if (u.hostname !== baseHost) return [];
              const childRes = await safeFetch(curl, 5000);
              if (childRes.ok) return extractLocs(await childRes.text());
            } catch {
              /* ignore */
            }
            return [];
          });
          const results = await Promise.allSettled(childFetches);
          for (const r of results) {
            if (r.status === "fulfilled") allUrls.push(...r.value);
          }
          return allUrls;
        }

        return extractLocs(xml);
      })(),

      /* ---- homepage HTML + meta ---- */
      (async () => {
        try {
          const res = await safeFetch(origin, 6000);
          if (!res.ok)
            return {
              title: baseUrl.hostname,
              description: "",
              html: "",
            };
          const html = await res.text();

          // Title
          let title = baseUrl.hostname;
          const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          if (titleMatch) {
            title =
              titleMatch[1]
                .replace(/\s+/g, " ")
                .replace(/\s*[|–—-]\s*.{1,50}$/, "")
                .trim() || baseUrl.hostname;
          }

          // Description: meta → og:description → twitter:description
          let description = "";
          const descMatch =
            html.match(
              /<meta\s[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i
            ) ||
            html.match(
              /<meta\s[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["'][^>]*>/i
            );
          if (descMatch) {
            description = descMatch[1].replace(/\s+/g, " ").trim();
          }

          // Fallback: og:description
          if (!description) {
            const ogMatch =
              html.match(
                /<meta\s[^>]*property=["']og:description["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i
              ) ||
              html.match(
                /<meta\s[^>]*content=["']([\s\S]*?)["'][^>]*property=["']og:description["'][^>]*>/i
              );
            if (ogMatch) description = ogMatch[1].replace(/\s+/g, " ").trim();
          }

          // Fallback: twitter:description
          if (!description) {
            const twMatch =
              html.match(
                /<meta\s[^>]*name=["']twitter:description["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i
              ) ||
              html.match(
                /<meta\s[^>]*content=["']([\s\S]*?)["'][^>]*name=["']twitter:description["'][^>]*>/i
              );
            if (twMatch) description = twMatch[1].replace(/\s+/g, " ").trim();
          }

          return { title, description, html };
        } catch {
          return { title: baseUrl.hostname, description: "", html: "" };
        }
      })(),
    ]);

    const sitemapUrls =
      sitemapResult.status === "fulfilled" ? sitemapResult.value : [];
    const homeData =
      homeResult.status === "fulfilled"
        ? (homeResult.value as {
            title: string;
            description: string;
            html: string;
          })
        : { title: baseUrl.hostname, description: "", html: "" };

    /* ---------- Extract nav/footer from homepage ---------- */
    const navSections = homeData.html
      ? extractNavAndFooter(homeData.html, origin, baseHost)
      : {};

    /* ---------- Fallback: homepage links when no sitemap ---------- */
    let urls = sitemapUrls;
    const usedFallback = urls.length === 0 && homeData.html;
    if (usedFallback) {
      urls = extractInternalLinks(homeData.html, origin, baseHost, 200);
    }

    /* ---------- Deduplicate & filter ---------- */
    const seen = new Set<string>();
    const filtered = urls.filter((u) => {
      try {
        const p = new URL(u);
        if (p.hostname !== baseHost) return false;
        const norm = p.pathname.replace(/\/$/, "") || "/";
        if (seen.has(norm)) return false;
        seen.add(norm);
        return true;
      } catch {
        return false;
      }
    });

    /* ---------- Build nav lookup for smart grouping ---------- */
    const navLookup = new Map<string, string>();
    for (const [section, links] of Object.entries(navSections)) {
      for (const link of links) {
        navLookup.set(link.href.replace(/\/$/, ""), section);
      }
    }

    /* ---------- Group URLs with smart matching ---------- */
    const groups: Record<string, { title: string; url: string }[]> = {};
    const groupCounts: Record<string, number> = {};

    for (const url of filtered.slice(0, 500)) {
      try {
        const parsed = new URL(url);
        if (
          /\.(xml|json|txt|ico|png|jpg|jpeg|gif|svg|css|js|woff2?|map|webp|avif)$/i.test(
            parsed.pathname
          )
        )
          continue;

        const urlNorm = url.replace(/\/$/, "");
        const segments = parsed.pathname.split("/").filter(Boolean);
        let group: string;
        let title: string;

        // 1) Nav exact match
        if (navLookup.has(urlNorm)) {
          group = navLookup.get(urlNorm)!;
          title =
            navSections[group]?.find((l) => l.href.replace(/\/$/, "") === urlNorm)
              ?.text || titleFromSlug(segments[segments.length - 1] || "Homepage");
        }
        // 2) Nav startsWith match (URL is under a nav link path)
        else {
          let navMatch = "";
          for (const [href, sec] of navLookup.entries()) {
            if (urlNorm.startsWith(href + "/")) {
              navMatch = sec;
              break;
            }
          }
          if (navMatch) {
            group = navMatch;
            title = titleFromSlug(segments[segments.length - 1] || "Homepage");
          }
          // 3) Slug map
          else if (segments.length > 0 && SLUG_MAP[segments[0].toLowerCase()]) {
            group = SLUG_MAP[segments[0].toLowerCase()];
            title = titleFromSlug(segments[segments.length - 1]);
          }
          // 4) Default grouping
          else if (segments.length === 0) {
            group = "Main Pages";
            title = "Homepage";
          } else if (segments.length === 1) {
            group = "Main Pages";
            title = titleFromSlug(segments[0]);
          } else {
            group = titleFromSlug(segments[0]);
            title = titleFromSlug(segments[segments.length - 1]);
          }
        }

        groupCounts[group] = (groupCounts[group] || 0) + 1;
        if (!groups[group]) groups[group] = [];
        if (groups[group].length < 30) {
          groups[group].push({ title, url });
        }
      } catch {
        /* skip invalid */
      }
    }

    return NextResponse.json({
      siteTitle: homeData.title,
      siteDescription: homeData.description,
      groups,
      groupCounts,
      navSections: Object.fromEntries(
        Object.entries(navSections).map(([k, v]) => [
          k,
          v.map((l) => ({ title: l.text, url: l.href })),
        ])
      ),
      totalUrls: filtered.length,
      usedFallback: !!usedFallback,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch site data. Check the domain and try again." },
      { status: 500 }
    );
  }
}
