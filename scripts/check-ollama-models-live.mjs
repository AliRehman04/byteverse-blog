// Read-only live verification for the Ollama models-folder article (page, FAQ, photos, credits, sitemap/feed/index presence).
const base = "https://www.byteverse.fyi";
const slug = "ollama-models-folder-windows-move-2026";
const ua = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ByteVerse-release-check" };
const get = async path => { const r = await fetch(`${base}${path}`, { headers: ua, redirect: "manual", signal: AbortSignal.timeout(60000) }); return { status: r.status, text: await r.text() }; };

const page = await get(`/blog/${slug}`);
const h = page.text;
const attr = (name, value) => new RegExp(`${name}="${value}"[^>]*(?:href|content)="([^"]+)"`).exec(h)?.[1];
const result = {
  status: page.status,
  canonical: attr("rel", "canonical"),
  title: /<title>([^<]+)/.exec(h)?.[1],
  details: (h.match(/<details/g) ?? []).length,
  faqSchema: h.includes('"FAQPage"'),
  cover: h.includes(`/blog/ollama-models-folder/photo-cover.jpg`),
  inline: h.includes(`/blog/ollama-models-folder/photo-inline.jpg`),
  pexelsCreditMeta: (h.match(/Royalty-free stock photo from Pexels/g) ?? []).length,
  rightsReserved: (h.match(/All rights reserved/g) ?? []).length,
  ogImageIsCover: (attr("property", "og:image") ?? "").includes("photo-cover"),
  notFound: h.includes("Post Not Found"),
  h2: (h.match(/<h2/g) ?? []).length,
  tables: (h.match(/<table/g) ?? []).length,
  backlinkToGpuPost: h.includes("/blog/ollama-not-using-gpu-windows-2026"),
};
console.log(JSON.stringify(result, null, 1));
for (const match of h.matchAll(/All rights reserved/g)) console.log("rights notice context:", h.slice(Math.max(0, match.index - 70), match.index + 25).replace(/\s+/g, " "));

const host = await get("/blog/ollama-not-using-gpu-windows-2026");
console.log("GPU post status", host.status, "links to new article:", host.text.includes(`/blog/${slug}`), "(expected after rebuild/ISR)");
for (const path of ["/", "/blog", "/sitemap.xml", "/feed.xml", "/rss.xml"]) {
  const r = await get(path);
  console.log(path, r.status, "mentions slug:", r.text.includes(slug));
}
