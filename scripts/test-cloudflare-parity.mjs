import { readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Read-only parity check between the live site (A, Vercel) and a Cloudflare copy (B) before moving traffic.
// Compares every sitemap URL plus redirects, error pages and static files: status, redirect target, SEO tags in
// the HTML, structured data and security headers. Usage:
//   node scripts/test-cloudflare-parity.mjs [--a https://www.byteverse.fyi] [--b https://byteverse.<account>.workers.dev]
// On a non-production host B must answer noindex; that is asserted instead of comparing X-Robots-Tag.
const root = fileURLToPath(new URL("../", import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => (value.startsWith("--") ? [...pairs, [value.slice(2), all[index + 1]]] : pairs), []));
const A = (args.a || "https://www.byteverse.fyi").replace(/\/$/, "");
const B = (args.b || "https://byteverse.alirehmanvu786.workers.dev").replace(/\/$/, "");
const bIsProduction = new URL(B).hostname === new URL(A).hostname;
const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/142.0 ByteVerse-parity-check" };
const SECURITY_HEADERS = ["content-security-policy", "x-frame-options", "x-content-type-options", "referrer-policy", "permissions-policy", "strict-transport-security", "service-worker-allowed"];

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const sameOrigin = (value) => (value ? value.replaceAll(B, A) : value);

function seo(html) {
  const head = html.split(/<\/head>/i)[0] || "";
  const meta = (attr, key) => {
    for (const m of head.matchAll(/<meta\b[^>]*>/gi)) {
      if (new RegExp(`${attr}="${key}"`, "i").test(m[0])) return decode(m[0].match(/content="([^"]*)"/i)?.[1] ?? "");
    }
    return null;
  };
  const types = [];
  for (const block of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === "object") { if (o["@type"]) types.push([].concat(o["@type"]).join("+")); if (o["@graph"]) walk(o["@graph"]); } };
      walk(JSON.parse(block[1]));
    } catch { types.push("INVALID_JSON"); }
  }
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  const main = body.match(/<article\b[\s\S]*<\/article>/i)?.[0] ?? body.match(/<main\b[\s\S]*<\/main>/i)?.[0] ?? body;
  return {
    title: decode(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim(),
    description: meta("name", "description"),
    robots: meta("name", "robots"),
    canonical: decode(head.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/i)?.[1] ?? head.match(/<link[^>]*href="([^"]*)"[^>]*rel="canonical"/i)?.[1] ?? ""),
    ogUrl: meta("property", "og:url"),
    ogImage: meta("property", "og:image"),
    h1: (body.match(/<h1\b/gi) || []).length,
    jsonLd: [...new Set(types)].sort().join(","),
    blogLinks: new Set([...body.matchAll(/href="(\/blog\/[^"#?]+)"/g)].map((m) => m[1])).size,
    words: decode(main.replace(/<[^>]+>/g, " ")).split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length,
  };
}

async function get(base, path) {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(base + path, { redirect: "manual", headers: UA });
      const type = response.headers.get("content-type") || "";
      const text = /html/.test(type) ? await response.text() : (await response.arrayBuffer(), "");
      return { status: response.status, type: type.split(";")[0].trim(), location: response.headers.get("location"), headers: response.headers, text };
    } catch (error) {
      if (attempt === 3) return { status: 0, error: String(error), headers: new Headers(), text: "", type: "" };
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

function publicFiles() {
  const dir = resolve(root, "public");
  const out = [];
  const walk = (d) => { for (const name of readdirSync(d)) { const p = join(d, name); if (statSync(p).isDirectory()) walk(p); else out.push("/" + relative(dir, p).replaceAll("\\", "/")); } };
  walk(dir);
  // _headers is configuration for Cloudflare, not a served file.
  return out.filter((p) => p !== "/_headers" && !p.endsWith(".txt") && !/\/sources\//.test(p));
}

const sitemap = await (await fetch(`${A}/sitemap.xml`, { headers: UA })).text();
const sitemapPaths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1]).replace(A, "") || "/");
const extraPaths = [
  "/blog/page/2", "/blog/page/3", "/blog?page=2", "/blog/page/1", "/index.html", "/index.php", "/.well-known/llms.txt", "/stories", "/author/byteverse",
  "/stories/best-ai-tools-for-ecommerce-2026", "/blog/best-photo-editors-2026-typo-does-not-exist", "/blog/best-ai-photo-editors-2026", "/blog/best-vscode-extensions-2026",
  "/this-page-does-not-exist", "/admin", "/robots.txt", "/sitemap.xml", "/image-sitemap.xml", "/feed.xml", "/llms.txt", "/opengraph-image", "/manifest.webmanifest",
];
const staticPaths = publicFiles();
const paths = [...new Set([...sitemapPaths, ...extraPaths, ...staticPaths])];

const failures = [];
const warnings = [];
let checked = 0;
async function compare(path) {
  const [a, b] = await Promise.all([get(A, path), get(B, path)]);
  checked++;
  const fail = (what) => failures.push(`${path}: ${what}`);
  const warn = (what) => warnings.push(`${path}: ${what}`);
  // Vercel answers unknown blog slugs with a 200 "Post Not Found" page (a soft 404); a real 404 on B is an improvement.
  if (a.status === 200 && b.status === 404 && /Not Found/.test(seo(a.text).title) && /noindex/.test(seo(a.text).robots || "")) {
    return warn("live soft 404 (200 + noindex) is a real 404 on B");
  }
  if (a.status !== b.status) return fail(`status ${a.status} vs ${b.status}`);
  // Redirects have no body: compare the target only. Vercel also attaches page headers to them; OpenNext does not.
  if (a.status >= 300 && a.status < 400) {
    if (sameOrigin(b.location) !== a.location) fail(`redirect ${a.location} vs ${sameOrigin(b.location)}`);
    return;
  }
  const mime = (type) => (type === "application/javascript" ? "text/javascript" : type);
  if (mime(a.type) !== mime(b.type)) fail(`content-type ${a.type} vs ${b.type}`);
  for (const key of SECURITY_HEADERS) if ((a.headers.get(key) || "") !== (b.headers.get(key) || "")) fail(`${key}: "${(a.headers.get(key) || "").slice(0, 60)}" vs "${(b.headers.get(key) || "").slice(0, 60)}"`);
  if (bIsProduction) {
    if ((a.headers.get("x-robots-tag") || "") !== (b.headers.get("x-robots-tag") || "")) fail(`x-robots-tag "${a.headers.get("x-robots-tag")}" vs "${b.headers.get("x-robots-tag")}"`);
  } else if (b.status === 200 && !/noindex/i.test(b.headers.get("x-robots-tag") || "")) {
    fail("test host is missing X-Robots-Tag noindex");
  }
  if (staticPaths.includes(path) && a.status === 200 && (a.headers.get("cache-control") || "") !== (b.headers.get("cache-control") || "")) warn(`static cache-control "${a.headers.get("cache-control")}" vs "${b.headers.get("cache-control")}"`);
  if (a.type === "text/html" && a.status === 200) {
    const sa = seo(a.text), sb = seo(sameOrigin(b.text));
    for (const key of ["title", "description", "robots", "canonical", "ogUrl", "h1", "jsonLd"]) if (sa[key] !== sb[key]) fail(`${key} "${String(sa[key]).slice(0, 70)}" vs "${String(sb[key]).slice(0, 70)}"`);
    if ((sa.ogImage || "").split("?")[0] !== (sb.ogImage || "").split("?")[0]) fail(`og:image ${sa.ogImage} vs ${sb.ogImage}`);
    if (sa.blogLinks !== sb.blogLinks) warn(`internal blog links ${sa.blogLinks} vs ${sb.blogLinks}`);
    if (Math.abs(sa.words - sb.words) > Math.max(5, sa.words * 0.01)) warn(`visible words ${sa.words} vs ${sb.words}`);
  }
}

const queue = [...paths];
await Promise.all(Array.from({ length: 4 }, async () => { while (queue.length) await compare(queue.shift()); }));
console.log(`Compared ${checked} paths (${sitemapPaths.length} sitemap, ${staticPaths.length} static, ${extraPaths.length} special) between ${A} and ${B}.`);
for (const w of warnings) console.log(`WARN ${w}`);
for (const f of failures) console.log(`FAIL ${f}`);
console.log(failures.length ? `FAILED: ${failures.length} difference(s).` : `PASS: no blocking differences (${warnings.length} warning(s)).`);
process.exitCode = failures.length ? 1 : 0;
