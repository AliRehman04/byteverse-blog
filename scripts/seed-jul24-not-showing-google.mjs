import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const sql = neon(process.env.DATABASE_URL);

const img = (id, width = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;

const post = {
  day: "2026-07-24",
  category: "tech-guides",
  title: "Website Not Showing on Google? 10 Fixes That Work (2026)",
  slug: "website-not-showing-on-google-fixes-2026",
  excerpt:
    "Website not showing on Google? Diagnose the exact cause in 2 minutes, then apply the right fix: indexing, noindex accidents, canonicals, sandbox timelines, and more.",
  metaTitle: "Website Not Showing on Google? 10 Fixes (2026)",
  metaDescription:
    "Fix a website not showing on Google in 2026: 2-minute diagnosis, indexing requests, noindex accidents, canonical errors, and realistic new-site timelines.",
  keywords:
    "website not showing on google, google not indexing my site, site not indexed, blog not showing on google, how to get indexed by google 2026, new website not ranking, crawled currently not indexed",
  summary:
    "A website missing from Google has one of three problems: not indexed, indexed but ranking too low to see, or actively blocked — each has a 2-minute diagnosis.|Most cases are accidental noindex tags, missing sitemaps, thin content, or simply new-domain timelines that nobody explained honestly.|Work through the 10 fixes in order: verify indexing, remove blocks, strengthen content and internal links, then target keywords you can actually win.",
  coverImage: img("1555421689-491a97ff2040"),
  content: `You published your website, waited, searched for it on Google — nothing. Not on page one, not on page five, nowhere. It is the most common panic in all of SEO, and the good news is that the cause is almost always one of a short list of fixable problems. The bad news is that generic advice ("just make great content!") never tells you which problem is yours.

![Searching for a website on Google with analytics open](${img("1555421689-491a97ff2040")} "Website not showing on Google - diagnosis and fixes for 2026")

This guide starts with a two-minute diagnosis that identifies your exact situation, then walks through the ten fixes in the order that resolves the most cases fastest. Every step uses free tools, and the realistic timelines are stated honestly — because half of "not showing on Google" is actually "not showing yet," and knowing the difference saves weeks of wrong-direction panic.

## The 2-Minute Diagnosis

Before fixing anything, find out which of the three problems you have:

**Test 1 — the site: search.** Type \`site:yourdomain.com\` into Google. This shows every page Google has indexed from your site.

- **Zero results** → your site is not indexed at all. Fixes 1 through 4 are yours.
- **Some pages appear** → you are indexed but ranking too low to find. Skip to fixes 6 through 10.
- **Pages appear but the wrong ones** → indexing works, structure is confused. Fixes 4 and 7.

**Test 2 — the exact-title search.** Search your homepage title in quotes. If the site: search shows pages but your title search shows nothing, you have a severe relevance or quality issue rather than a technical one.

That is the whole diagnosis. Now the fixes, in order of frequency.

## Fix 1: Verify Indexing in Google Search Console

Everything runs through Google Search Console — if you have not set it up, that is the first fifteen minutes of this entire process, and our [Search Console beginner guide](/blog/google-search-console-for-new-blogs-2026-beginner-guide) walks through verification step by step.

Once inside, open **Pages** under Indexing. This report names your exact problem: how many pages are indexed, how many are excluded, and — critically — the specific reason for every exclusion. "Discovered, currently not crawled", "Crawled, currently not indexed", "Excluded by noindex tag", "Duplicate without user-selected canonical" — each label maps to a fix below.

Then use **URL Inspection** on your homepage and two important pages. It shows Google's live view: indexed or not, when it was last crawled, and any blocking issues.

## Fix 2: Submit a Sitemap and Request Indexing

New sites are discovered slowly without help. Two accelerators:

**Submit your sitemap** in Search Console under Sitemaps. Most platforms generate one automatically at \`/sitemap.xml\` — verify it loads in your browser, submit the URL, and confirm it shows "Success" with a page count matching reality.

**Request indexing manually** for your five most important pages via URL Inspection → Request Indexing. This queues a priority crawl and typically works within hours to days for new pages, versus weeks of waiting passively.

Do not spam requests for every page daily — it does not accelerate anything beyond the initial queue jump.

## Fix 3: Hunt the Accidental noindex

The most embarrassing and most common cause of complete invisibility: your site is politely telling Google to go away.

Check three places:

- **Meta robots tags:** view your page source and search for \`noindex\`. Site builders and WordPress themes ship "discourage search engines" toggles that people enable during development and forget.
- **robots.txt:** visit \`yourdomain.com/robots.txt\`. A line reading \`Disallow: /\` blocks everything.
- **HTTP headers:** rarer, but hosting-level settings and password protection can block crawlers invisibly — URL Inspection reveals this as "Blocked" status.

If you find a block, remove it, then Request Indexing again. Recovery typically takes days. A full technical sweep of these silent killers — plus canonical, redirect, and speed issues — is exactly what our [free SEO audit walkthrough](/blog/free-seo-audit-website-2026-step-by-step) systematizes into thirty minutes.

## Fix 4: Repair Canonical Confusion

Canonical tags tell Google which version of a page is the "real" one. When they point to the wrong place — every page canonicalized to the homepage, or to an old domain — Google obediently ignores the pages you want indexed.

View source on a missing page and find the \`rel="canonical"\` link. It should point to the page's own URL. Common breakages: site migrations that kept old-domain canonicals, www versus non-www mismatches, and http versus https splits. Fix the tags, ensure one consistent domain version redirects to the other, and re-request indexing.

## Fix 5: Accept the New-Domain Timeline (But Verify You Are In It)

Here is the honest part most guides skip: **new domains take time, and no fix accelerates trust.** The realistic 2026 timeline for a brand-new site:

- **Days 1 to 14:** indexing begins (with sitemap + requests)
- **Weeks 2 to 8:** impressions appear for long-tail queries, positions 30 to 60
- **Months 2 to 4:** first clicks trickle on low-competition terms
- **Months 4 to 8:** meaningful traffic if content and consistency held

The critical distinction: this timeline is only "normal" if the Pages report shows your content indexed and impressions are climbing — slowly is fine, but climbing. Zero impressions after eight indexed weeks means a content or targeting problem (fixes 6 and 10), not a patience problem. The realistic publishing math behind this curve is covered in [how many posts before traffic starts](/blog/how-many-blog-posts-before-traffic-starts-2026).

## Fix 6: Clear the Quality Threshold

"Crawled — currently not indexed" is Google's polite way of saying: *we saw it, and it was not worth keeping.* Google no longer indexes everything; thin, duplicative, and generic pages get crawled and discarded silently.

Pages that clear the threshold share traits: they answer a specific query completely, add something the existing results lack, and demonstrate genuine effort — original examples, real depth, working internal structure. The complete quality system is in our [SEO-friendly writing guide](/blog/how-to-write-seo-friendly-blog-posts-2026), and every page should pass the [pre-publish checklist](/blog/blog-seo-checklist-before-publishing-in-2026) before it goes live.

If your existing pages sit in "crawled, not indexed" purgatory: expand and improve the best candidates substantially, then re-request. Deleting or consolidating genuinely thin pages helps the site-wide quality signal too — the workflow in [updating old posts](/blog/how-to-update-old-blog-posts-for-more-traffic-in-2026) applies directly.

## Fix 7: Rescue Orphan Pages with Internal Links

Google discovers and values pages through links. A page with zero internal links pointing at it — an orphan — may never be crawled, and if crawled, signals "even this site does not care about this page."

Every important page needs at least three contextual internal links from related content, using descriptive anchors. Blog posts should link to each other where topics genuinely connect, category and hub pages should link down to articles, and the whole structure should put any important page within three clicks of the homepage. This linking discipline is half of what builds [topical authority](/blog/how-to-build-topical-authority-for-a-new-blog-in-2026) — connected clusters get indexed faster and rank longer than scattered posts.

## Fix 8: Fix the Technical Health Basics

Slow, broken, or mobile-hostile sites get crawled less and ranked lower. The priority list:

- **Mobile rendering:** most crawling is mobile-first; a broken phone layout suppresses everything
- **Speed:** pages that load in under three seconds get crawled more generously — the biggest wins are almost always oversized images, fixable in an afternoon with the [image optimization workflow](/blog/how-to-optimize-images-for-web-2026)
- **Core Web Vitals:** the field data in Search Console's report feeds rankings directly; the [speed optimization checklist](/blog/website-speed-optimization-checklist-2026-core-web-vitals) covers the fixes in impact order
- **HTTPS everywhere** with one consistent domain version

None of these alone causes invisibility, but together they set the ceiling on everything else.

## Fix 9: Give Google Reasons to Return

Crawl frequency follows site activity. A site that published five pages in January and nothing since gets visited accordingly. Consistent publishing — even weekly — trains Google to return, and each new interlinked page strengthens the discovery web for every older page.

Consistency also compounds the trust curve from Fix 5. The complete strategy for turning a new domain into a traffic-earning one — publishing cadence, promotion channels, and the signals that matter — is mapped in [how to get traffic to a new blog](/blog/how-to-get-traffic-to-a-new-blog-2026).

## Fix 10: You Are Indexed — Now Rank Where You Can Win

If the site: search shows your pages but searches never surface them, the problem is not visibility — it is competition. Ranking position 45 for "best laptops" is indistinguishable from invisible.

The fix is targeting: keywords specific enough that a young site can crack the top ten. That means long-tail, question-based, and low-competition terms — found through the [free keyword research process](/blog/how-to-do-keyword-research-free-2026) and filtered through the winnability lens in [low-competition keywords for new blogs](/blog/low-competition-keywords-for-new-blogs-2026).

And once impressions exist, clicks follow titles: a page at position 8 with a compelling title out-clicks a boring one at position 5. The [SEO title formulas](/blog/how-to-write-seo-titles-2026) — numbers, brackets, years, specificity — are the highest-leverage fix for the indexed-but-unclicked stage.

## The Timeline Cheat Sheet

| Situation | Expected resolution |
|---|---|
| Accidental noindex removed | Days |
| Sitemap + indexing requests (new site) | 1 to 2 weeks to index |
| Canonical fixes | 1 to 3 weeks |
| Quality improvements re-indexed | 2 to 6 weeks |
| New domain earning first clicks | 2 to 4 months |
| Competitive rankings | 6 to 12 months |

## FAQ

### Why is my website not showing up on Google at all?

Run \`site:yourdomain.com\` — zero results means you are not indexed, usually from a noindex tag, robots.txt block, missing sitemap, or simply new-site lag. Search Console's Pages report names the exact reason per page.

### How long does it take for a new website to show on Google?

Indexing: days to two weeks with a submitted sitemap. First impressions: two to eight weeks. First clicks: typically two to four months for a new domain publishing consistently.

### What does "Crawled — currently not indexed" mean?

Google saw the page and chose not to index it — a quality signal. Expand the content substantially, add internal links, and re-request indexing rather than waiting.

### How do I force Google to index my site?

You cannot force it, but you can accelerate: submit a sitemap, use URL Inspection → Request Indexing on key pages, add internal links, and publish consistently so crawlers return often.

### My site is indexed but gets no traffic — why?

Indexed means visible, not competitive. You are likely ranking below position 30 for terms too competitive for a young site. Target long-tail, low-competition keywords and improve titles for click-through.

## Final Recommendation

Run the two-minute diagnosis now: \`site:yourdomain.com\`, then the Search Console Pages report. Your situation is one of three, and the matching fixes above resolve the overwhelming majority of cases — most within days for technical blocks, and within a predictable timeline for new-domain trust.

The sites that escape invisibility fastest do three things in parallel: clear every technical block this week, raise every page above the quality threshold, and aim new content exclusively at keywords they can actually win. Do all three, keep publishing, and the first clicks stop being a mystery and become a schedule.`
};

// ── helpers ─────────────────────────────────────────────────────────
function readingTime(content) {
  const words = content.trim().split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 220))} min read`;
}

// ── seed logic ──────────────────────────────────────────────────────
async function seed() {
  const categoryRows = await sql`SELECT id, slug FROM categories`;
  const categoryIds = new Map(categoryRows.map((r) => [r.slug, r.id]));

  const categoryId = categoryIds.get(post.category);
  if (!categoryId) {
    console.log(`Category not found: ${post.category}`);
    return;
  }

  const rt = readingTime(post.content);
  const words = post.content.trim().split(/\s+/).length;
  const publishDate = new Date(`${post.day}T09:00:00.000Z`);

  const [saved] = await sql`
    INSERT INTO posts (
      title, slug, excerpt, content, cover_image, category_id, author, published, featured,
      meta_title, meta_description, keywords, summary, reading_time, created_at, updated_at
    ) VALUES (
      ${post.title}, ${post.slug}, ${post.excerpt}, ${post.content}, ${post.coverImage}, ${categoryId},
      ${"Ali Rehman"}, true, false, ${post.metaTitle}, ${post.metaDescription}, ${post.keywords},
      ${post.summary}, ${rt}, ${publishDate}, ${publishDate}
    )
    ON CONFLICT (slug) DO UPDATE SET
      title = excluded.title,
      excerpt = excluded.excerpt,
      content = excluded.content,
      cover_image = excluded.cover_image,
      category_id = excluded.category_id,
      meta_title = excluded.meta_title,
      meta_description = excluded.meta_description,
      keywords = excluded.keywords,
      summary = excluded.summary,
      reading_time = excluded.reading_time,
      published = excluded.published,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at
    RETURNING id, slug
  `;

  console.log(`Published: ${saved.slug} (${rt}, ${words} words)`);
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
