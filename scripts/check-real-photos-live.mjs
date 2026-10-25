// Read-only live verification: each article's cover and inline photo are referenced, served as JPEG, and the old diagrams are gone.
const base = "https://www.byteverse.fyi";
const posts = { "cursor-agent-stuck-planning-next-moves-2026": "cursor-planning-next-moves", "png-to-jpg-black-background": "png-jpg-background", "claude-code-not-recognized-windows-2026": "claude-code-windows", "excel-csv-leading-zeros-2026": "csv-excel", "gemini-not-showing-google-docs-gmail-2026": "gemini-workspace", "ollama-not-using-gpu-windows-2026": "ollama-gpu", "excel-csv-special-characters-utf8": "csv-utf8", "ollama-models-folder-windows-move-2026": "ollama-models-folder" };
const ua = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ByteVerse-release-check" };
let failures = 0;
for (const [slug, dir] of Object.entries(posts)) {
  const response = await fetch(`${base}/blog/${slug}`, { headers: ua, signal: AbortSignal.timeout(60000) });
  const html = await response.text();
  const og = /property="og:image" content="([^"]+)"/.exec(html)?.[1] ?? "";
  const cover = `${base}/blog/${dir}/photo-cover.jpg`, inline = `${base}/blog/${dir}/photo-inline.jpg`;
  const imgs = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map(m => m[1]);
  const hasCover = imgs.some(src => src.includes(`/blog/${dir}/photo-cover.jpg`) || src.includes(encodeURIComponent(cover)));
  const hasInline = imgs.some(src => src.includes(`/blog/${dir}/photo-inline.jpg`) || src.includes(encodeURIComponent(inline)));
  const oldDiagram = new RegExp(`/blog/${dir}/(?:processor-states|diagnostic-path|eligibility-map|settings-path|source-vs-import|import-order|diagnostic-map|terminal-environments|recovery-map|decode-vs-save|cover(?:-v2)?)\\.png`).test(html);
  const credits = /via Pexels/.test(html);
  const [c, i] = await Promise.all([cover, inline].map(async url => { const r = await fetch(url, { headers: ua }); await r.arrayBuffer(); return `${r.status} ${r.headers.get("content-type")}`; }));
  const ok = response.status === 200 && hasCover && hasInline && !oldDiagram && credits && c.startsWith("200 image/jpeg") && i.startsWith("200 image/jpeg");
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${slug}: status=${response.status} cover=${hasCover} inline=${hasInline} oldDiagrams=${oldDiagram} credits=${credits} ogImage=${og.includes("photo-cover") ? "photo-cover" : og.slice(0, 60)} assets=[${c} | ${i}]`);
}
const home = await (await fetch(`${base}/`, { headers: ua })).text();
console.log(`homepage references new covers: ${(home.match(/photo-cover\.jpg/g) ?? []).length}`);
process.exitCode = failures ? 1 : 0;
