// Homepage revamp research (28 November 2026). Read-only public requests; writes each output file once (wx).
// Usage: node scripts/research-homepage-2026-11-28.mjs --keywords | --competitors | --serp | --live
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { parseDocument, DomUtils } from "htmlparser2";

const mode = process.argv[2];
assert(process.argv.length === 3 && ["--keywords", "--competitors", "--serp", "--live"].includes(mode));
const out = (name, value) => { writeFileSync(new URL(`../docs/content-research/2026-11-28-homepage-${name}.json`, import.meta.url), JSON.stringify(value, null, 2) + "\n", { flag: "wx" }); console.log(`saved ${name}`); };
const agent = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36", "accept-language": "en-US,en;q=0.9" };
const text = (node) => DomUtils.textContent(node).replace(/\s+/g, " ").trim();
const noMetrics = { monthlyVolume: null, keywordDifficulty: null, rankingProbability: null, trafficForecast: null };

if (mode === "--keywords") {
  const seeds = [
    "free online tools", "free online tools for developers", "free developer tools", "online developer tools", "developer tools online",
    "free web tools", "browser based tools", "online utilities", "dev tools online free", "web developer tools online",
    "json formatter online", "json validator", "url encoder decoder", "base64 encoder decoder", "uuid generator", "hash generator",
    "regex tester", "text tools online", "css tools online", "html tools online", "free seo tools", "online text tools",
    "free productivity tools online", "developer tutorials", "tech guides", "ai tutorials for beginners", "tech troubleshooting guides", "byteverse",
  ];
  const observations = [];
  for (const seed of seeds) {
    const row = { seed, google: [], bing: [] };
    try {
      const url = new URL("https://suggestqueries.google.com/complete/search");
      url.search = new URLSearchParams({ client: "firefox", hl: "en", gl: "us", q: seed });
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      row.google = (await response.json())[1] ?? [];
    } catch (error) { row.googleError = error.name; }
    try {
      const url = new URL("https://api.bing.com/osjson.aspx");
      url.search = new URLSearchParams({ query: seed, market: "en-US" });
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      row.bing = (await response.json())[1] ?? [];
    } catch (error) { row.bingError = error.name; }
    observations.push(row);
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  out("keywords", { checkedAt: new Date().toISOString(), sources: ["Google public autocomplete (hl=en, gl=us)", "Bing public autocomplete (en-US)"], context: "Wording evidence only, not measured demand.", observations, metrics: noMetrics });
}

if (mode === "--serp") {
  const queries = ["free online tools for developers", "free online developer tools", "online developer tools", "free online tools", "free web tools online", "json formatter online", "developer utilities online"];
  const results = [];
  for (const query of queries) {
    const row = { query, engine: "DuckDuckGo HTML", checkedAt: new Date().toISOString(), results: [] };
    try {
      const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=us-en`, { headers: agent, signal: AbortSignal.timeout(25000) });
      row.status = response.status;
      const dom = parseDocument(await response.text());
      for (const link of DomUtils.findAll((node) => node.name === "a" && /\bresult__a\b/.test(node.attribs.class ?? ""), dom.children).slice(0, 10)) {
        let href = link.attribs.href ?? "";
        const wrapped = /[?&]uddg=([^&]+)/.exec(href);
        if (wrapped) href = decodeURIComponent(wrapped[1]);
        row.results.push({ title: text(link), url: href });
      }
    } catch (error) { row.error = error.name; }
    results.push(row);
    await new Promise((resolve) => setTimeout(resolve, 1800));
  }
  out("serp", { note: "Result order in one unauthenticated session; not rank tracking.", results, metrics: noMetrics });
}

if (mode === "--competitors") {
  const sites = ["https://www.nextool.co/", "https://www.onedev.tools/", "https://www.mytoolstudio.com/", "https://www.browserling.com/tools", "https://www.freeformatter.com/",
    "https://it-tools.tech/", "https://10015.io/", "https://devutils.com/", "https://www.devtoollab.com/", "https://tinywow.com/", "https://smalldev.tools/", "https://codebeautify.org/", "https://jsonformatter.org/", "https://transform.tools/"];
  const competitors = [];
  for (const url of sites) {
    const row = { url, checkedAt: new Date().toISOString() };
    try {
      const response = await fetch(url, { headers: agent, redirect: "follow", signal: AbortSignal.timeout(30000) });
      const html = await response.text();
      const dom = parseDocument(html);
      const all = (predicate) => DomUtils.findAll(predicate, dom.children);
      const meta = (name) => all((node) => node.name === "meta" && (node.attribs.name === name || node.attribs.property === name))[0]?.attribs.content ?? null;
      const body = all((node) => node.name === "body")[0];
      const visible = body ? text({ ...body, children: body.children.filter((child) => !["script", "style", "noscript"].includes(child.name)) }) : "";
      Object.assign(row, {
        status: response.status, finalUrl: response.url, htmlBytes: Buffer.byteLength(html),
        title: all((node) => node.name === "title").map(text)[0] ?? null, description: meta("description"),
        h1: all((node) => node.name === "h1").map(text).slice(0, 3), h2: all((node) => node.name === "h2").map(text).slice(0, 24),
        navLinks: all((node) => node.name === "a" && DomUtils.findOne((parent) => ["nav", "header"].includes(parent.name), [node.parent ?? node], false) !== null).length,
        links: all((node) => node.name === "a").length, toolLinks: all((node) => node.name === "a" && /tool|format|convert|generat|encode|valid/i.test(node.attribs.href ?? "")).length,
        searchInputs: all((node) => node.name === "input" && /search|text/i.test(node.attribs.type ?? "text") && /search|find|filter/i.test(`${node.attribs.placeholder ?? ""} ${node.attribs["aria-label"] ?? ""} ${node.attribs.name ?? ""}`)).map((node) => node.attribs.placeholder ?? node.attribs["aria-label"] ?? "search"),
        scripts: all((node) => node.name === "script" && node.attribs.src).length,
        jsonLdTypes: all((node) => node.name === "script" && node.attribs.type === "application/ld+json").flatMap((node) => { try { const data = JSON.parse(DomUtils.textContent(node)); return (data["@graph"] ?? [data]).map((item) => item["@type"]).flat(); } catch { return ["invalid"]; } }),
        claims: [...new Set((visible.match(/\b(no sign[- ]?up|no login|no registration|100% (?:free|private|secure)|client[- ]side|in your browser|no (?:data )?upload\w*|offline|open[- ]source|privacy[- ]first|\d[\d,.]*\+? (?:free )?(?:tools|users|developers))\b/gi) ?? []).map((value) => value.toLowerCase()))].slice(0, 14),
        visibleWords: visible.split(/\s+/).length, firstText: visible.slice(0, 420),
      });
    } catch (error) { row.error = `${error.name}: ${error.message}`.slice(0, 160); }
    competitors.push(row);
  }
  out("competitors-raw", { note: "Server HTML only (no JavaScript rendering). Used for structure and wording patterns; no traffic or ranking figures.", competitors });
}

if (mode === "--live") {
  const url = "https://www.byteverse.fyi/";
  const response = await fetch(url, { signal: AbortSignal.timeout(25000), redirect: "manual" });
  const body = await response.text(), dom = parseDocument(body);
  const all = (predicate) => DomUtils.findAll(predicate, dom.children);
  const meta = (key, value) => all((node) => node.name === "meta" && node.attribs[key] === value).map((node) => node.attribs.content);
  const redirects = {};
  for (const variant of ["http://byteverse.fyi/", "https://byteverse.fyi/", "http://www.byteverse.fyi/"]) {
    try { const r = await fetch(variant, { redirect: "manual", signal: AbortSignal.timeout(20000) }); redirects[variant] = `${r.status} ${r.headers.get("location") ?? ""}`.trim(); } catch (error) { redirects[variant] = error.name; }
  }
  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(), url, status: response.status, htmlBytes: Buffer.byteLength(body),
    title: all((node) => node.name === "title").map(text), h1: all((node) => node.name === "h1").map(text),
    description: meta("name", "description"), robots: meta("name", "robots"), xRobots: response.headers.get("x-robots-tag"),
    canonical: all((node) => node.name === "link" && node.attribs.rel === "canonical").map((node) => node.attribs.href),
    og: Object.fromEntries(["og:title", "og:description", "og:image", "og:url", "og:type"].map((name) => [name, meta("property", name)[0] ?? null])),
    twitter: Object.fromEntries(["twitter:card", "twitter:title", "twitter:image"].map((name) => [name, meta("name", name)[0] ?? null])),
    headings: all((node) => /^h[23]$/.test(node.name ?? "")).map((node) => `${node.name}: ${text(node)}`),
    schemaTypes: all((node) => node.name === "script" && node.attribs.type === "application/ld+json").flatMap((node) => (JSON.parse(DomUtils.textContent(node))["@graph"] ?? []).map((item) => item["@type"])),
    scripts: all((node) => node.name === "script" && node.attribs.src).length,
    stylesheets: all((node) => node.name === "link" && node.attribs.rel === "stylesheet").length,
    images: all((node) => node.name === "img").length, internalLinks: new Set(all((node) => node.name === "a" && (node.attribs.href ?? "").startsWith("/")).map((node) => node.attribs.href)).size,
    cache: response.headers.get("cache-control"), redirects,
    limits: "Public server HTML only, not field performance or proof of Google indexing.",
  }, null, 2));
}
