import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const CONCURRENCY = 10;
const TIMEOUT = 8000;

async function checkUrl(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ByteVerseBot/1.0)" },
    });
    clearTimeout(timer);
    if (res.ok) return { url, status: res.status, ok: true };
    // Retry with GET if HEAD fails (some servers reject HEAD)
    if (res.status === 405 || res.status === 403) {
      const res2 = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(TIMEOUT),
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ByteVerseBot/1.0)" },
      });
      return { url, status: res2.status, ok: res2.ok };
    }
    return { url, status: res.status, ok: false };
  } catch (err) {
    clearTimeout(timer);
    return { url, status: err.name === "AbortError" ? "TIMEOUT" : "ERROR", ok: false };
  }
}

async function main() {
  console.log("Fetching all posts...");
  const posts = await sql`SELECT id, slug, content FROM posts`;
  console.log(`Found ${posts.length} published posts\n`);

  // Extract external links from all posts
  const extLinkRegex = /https?:\/\/[^\s"'<>\)]+/g;
  const linkMap = new Map(); // url -> Set of slugs

  for (const post of posts) {
    const matches = post.content?.match(extLinkRegex) || [];
    for (let url of matches) {
      // Clean trailing punctuation
      url = url.replace(/[.,;:!\?\)]+$/, "");
      // Skip internal links
      if (url.includes("byteverse.fyi")) continue;
      // Skip image/asset URLs
      if (/\.(png|jpg|jpeg|gif|webp|svg|ico|pdf|zip)(\?.*)?$/i.test(url)) continue;
      if (!linkMap.has(url)) linkMap.set(url, new Set());
      linkMap.get(url).add(post.slug);
    }
  }

  const allUrls = [...linkMap.keys()];
  console.log(`Found ${allUrls.length} unique external URLs to check\n`);

  // Check in batches
  const broken = [];
  let checked = 0;

  for (let i = 0; i < allUrls.length; i += CONCURRENCY) {
    const batch = allUrls.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(checkUrl));
    for (const r of results) {
      if (!r.ok) {
        broken.push({ ...r, posts: [...linkMap.get(r.url)] });
      }
    }
    checked += batch.length;
    process.stdout.write(`\rChecked ${checked}/${allUrls.length} URLs — ${broken.length} broken so far`);
  }

  console.log(`\n\n========== BROKEN LINKS REPORT ==========\n`);
  console.log(`Total URLs checked: ${allUrls.length}`);
  console.log(`Broken: ${broken.length}\n`);

  // Group by status
  const byStatus = {};
  for (const b of broken) {
    const key = String(b.status);
    if (!byStatus[key]) byStatus[key] = [];
    byStatus[key].push(b);
  }

  for (const [status, links] of Object.entries(byStatus).sort()) {
    console.log(`\n--- Status: ${status} (${links.length} links) ---`);
    for (const link of links) {
      console.log(`  ${link.url}`);
      console.log(`    Posts: ${link.posts.join(", ")}`);
    }
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
