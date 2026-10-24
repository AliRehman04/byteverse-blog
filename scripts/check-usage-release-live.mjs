// Read-only production checks for the usage-reduction release. GET/HEAD only; no writes.
const base = "https://www.byteverse.fyi";
const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ByteVerse-release-check";
async function probe(path, init = {}) {
  const response = await fetch(base + path, { redirect: "manual", headers: { "user-agent": ua, ...(init.headers ?? {}) }, method: init.method ?? "GET", signal: AbortSignal.timeout(60000) });
  const text = init.method === "HEAD" ? "" : await response.text();
  return { status: response.status, location: response.headers.get("location"), cache: response.headers.get("x-vercel-cache"), cacheControl: response.headers.get("cache-control"), type: response.headers.get("content-type"), length: text.length, text };
}
const out = {};
const r = out["/blog"] = await probe("/blog");
out["/blog"] = { status: r.status, cache: r.cache, cacheControl: r.cacheControl, hasIndex: r.text.includes("data-blog-index"), hasPage2Link: r.text.includes('href="/blog/page/2"'), hasQueryLink: r.text.includes("/blog?page=") };
const r2 = await probe("/blog/page/2");
out["/blog/page/2"] = { status: r2.status, cache: r2.cache, canonical: /rel="canonical" href="([^"]+)"/.exec(r2.text)?.[1], articles: (r2.text.match(/<article/g) ?? []).length };
for (const path of ["/blog?page=2", "/blog/page/1"]) { const x = await probe(path); out[path] = { status: x.status, location: x.location }; }
for (const path of ["/blog/page/99", "/blog/page/abc"]) { const x = await probe(path); out[path] = { status: x.status, cache: x.cache }; }
for (const path of ["/opengraph-image", "/blog/cursor-agent-stuck-planning-next-moves-2026/opengraph-image"]) { const x = await probe(path); out[path] = { status: x.status, type: x.type, cache: x.cache, cacheControl: x.cacheControl, bytes: x.length }; }
for (const path of ["/api/admin/newsletter", "/api/admin/authors", "/api/admin/categories"]) { const x = await probe(path); out[path] = { status: x.status, cacheControl: x.cacheControl }; }
const s = await probe("/stories/how-to-use-cursor-ai-2026-guide");
out["/stories/<slug>"] = { status: s.status, location: s.location, cacheControl: s.cacheControl };
const a = await probe("/admin/posts");
out["/admin/posts (no cookie)"] = { status: a.status, location: a.location };
const w = await probe("/wp-admin/");
out["/wp-admin/"] = { status: w.status };
const chat = await fetch(base + "/api/chat", { method: "POST", headers: { "content-type": "application/json", origin: "https://evil.example", "user-agent": ua }, body: JSON.stringify({ query: "hello" }), signal: AbortSignal.timeout(60000) });
out["/api/chat cross-origin"] = { status: chat.status };
const home = await probe("/");
out["/"] = { status: home.status, cache: home.cache };
console.log(JSON.stringify(out, null, 1));
