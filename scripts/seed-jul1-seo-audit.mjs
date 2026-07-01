import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const sql = neon(process.env.DATABASE_URL);

const img = (id, width = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;

const post = {
  day: "2026-07-01",
  category: "tech-guides",
  title: "How to Do a Free SEO Audit for Your Website in 2026",
  slug: "free-seo-audit-website-2026-step-by-step",
  excerpt:
    "A complete step-by-step SEO audit you can do for free in 2026 using Google Search Console, browser tools, and manual checks. Find and fix the issues that stop your site from ranking.",
  metaTitle: "How to Do a Free SEO Audit 2026 (Step-by-Step)",
  metaDescription:
    "Learn how to audit your website SEO for free in 2026. Step-by-step guide covering technical SEO, on-page, content, and link issues with free tools.",
  keywords:
    "free seo audit, how to do seo audit, website seo audit 2026, seo audit checklist, diy seo audit, seo audit free tools, technical seo audit, on page seo audit",
  summary:
    "A complete DIY SEO audit covers four layers: technical health, on-page optimization, content quality, and link structure.|Use Google Search Console, PageSpeed Insights, and manual checks to find real issues without paid tools.|Fix crawl errors, improve weak titles, strengthen internal links, and update thin content to see measurable ranking improvements within weeks.",
  coverImage: img("1460925895917-afdab827c52f"),
  content: `Most websites lose traffic not because of one big mistake but because of dozens of small issues that compound over time. A proper SEO audit finds those issues systematically so you can fix the ones that actually matter. The good news: you do not need expensive tools to do this. Google gives you most of the data for free.

![SEO audit workspace with analytics](${img("1460925895917-afdab827c52f")} "How to do a free SEO audit for your website in 2026")

This guide walks through a complete SEO audit you can do today using free tools. It covers technical SEO, on-page optimization, content health, and internal link structure. Whether you run a new blog or an established site, this process will surface the specific problems holding back your rankings.

If you have not set up your analytics yet, start with the [Google Search Console beginner guide](/blog/google-search-console-for-new-blogs-2026-beginner-guide) first. Everything in this audit depends on having access to real query and indexing data.

## What Is an SEO Audit?

An SEO audit is a structured review of your website to find issues that prevent pages from ranking well in search engines. It is not a one-time task. The best-performing sites run audits monthly or quarterly because search algorithms change, content gets outdated, and technical issues creep in.

A complete audit covers four layers:

1. **Technical SEO** — can Google crawl and index your pages correctly?
2. **On-page SEO** — are your titles, headings, and meta tags optimized?
3. **Content quality** — is your content deep, current, and matching search intent?
4. **Link structure** — are internal links connecting pages logically?

Each layer has specific checks with clear pass/fail criteria. Let us go through each one.

## Free Tools You Need

Before starting, gather these free tools:

- **Google Search Console** — your primary data source for indexing, queries, and crawl issues
- **Google PageSpeed Insights** — Core Web Vitals and performance scores
- **Chrome DevTools** — inspect page source, check meta tags, test mobile rendering
- **Screaming Frog SEO Spider** (free up to 500 URLs) — crawl your site for technical issues
- **Ahrefs Webmaster Tools** (free) — backlink profile and basic site audit
- **Your browser** — manual spot checks are still the most reliable method

You do not need paid Semrush, Ahrefs, or Moz subscriptions to find real problems. Paid tools are faster for large sites, but free tools give you the same insights for sites under 500 pages.

## Layer 1: Technical SEO Audit

Technical issues prevent Google from finding, crawling, and indexing your pages. If a page is not indexed, nothing else matters.

### Check 1: Indexing Status

Open Google Search Console → Pages. Look at:

- **Indexed pages** — does this match the number of pages you want indexed?
- **Not indexed pages** — check the reasons. Common issues: "Discovered but not indexed", "Crawled but not indexed", "Blocked by robots.txt"

If important pages show as not indexed, investigate why. Common fixes:

- submit them manually via URL Inspection
- add internal links pointing to them
- improve content quality so Google considers them worth indexing
- check robots.txt is not blocking them accidentally

### Check 2: Robots.txt and Sitemap

Visit \`yoursite.com/robots.txt\` and verify:

- important directories are not disallowed
- sitemap URL is listed
- no accidental blocks on blog posts, tools, or category pages

Then check your sitemap in Search Console → Sitemaps. Ensure:

- it is submitted and has no errors
- the URL count matches your actual published pages
- last read date is recent

### Check 3: Page Speed and Core Web Vitals

Run your homepage and top pages through [PageSpeed Insights](https://pagespeed.web.dev/). Focus on:

- **LCP (Largest Contentful Paint)** — should be under 2.5 seconds
- **INP (Interaction to Next Paint)** — should be under 200ms
- **CLS (Cumulative Layout Shift)** — should be under 0.1

If scores are poor, the most common fixes are image optimization, removing render-blocking resources, and lazy-loading below-fold content. For a full optimization workflow, follow the [website speed optimization checklist](/blog/website-speed-optimization-checklist-2026-core-web-vitals).

### Check 4: Mobile Usability

Google uses mobile-first indexing. Check:

- text is readable without zooming
- tap targets are large enough
- no horizontal scrolling
- content is identical on mobile and desktop

Use Chrome DevTools responsive mode to test key pages at 375px width.

### Check 5: HTTPS and Security

Every page should load over HTTPS. Check:

- no mixed content warnings (HTTP resources on HTTPS pages)
- SSL certificate is valid and not expiring soon
- HTTP URLs redirect to HTTPS with 301

### Check 6: Redirect Chains and Broken Links

Crawl your site with Screaming Frog or manually check your most-linked pages:

- are there redirect chains (A → B → C)? Each hop slows crawling.
- are there broken internal links returning 404?
- are there orphan pages with no internal links pointing to them?

Fix redirect chains by pointing directly to the final URL. Fix broken links by updating the href or removing the link.

## Layer 2: On-Page SEO Audit

On-page issues reduce your click-through rate and relevance signals even when Google can find your pages.

### Check 7: Title Tags

Open Search Console → Performance → Pages. For each top page:

- is the title under 60 characters? (Longer titles get truncated in SERPs)
- does it include the primary keyword?
- is it specific and compelling enough to click?
- does it avoid generic phrases like "Ultimate Guide" without context?

A title like "Blog Tips" is vague. A title like "Blog SEO Checklist 2026: 15 Steps Before Publishing" is specific, includes the keyword, has a number, and creates urgency.

For systematic title improvement, use an [SEO title analyzer](/tools/seo-title-analyzer) to score your titles before publishing.

### Check 8: Meta Descriptions

Check that every indexable page has a unique meta description that:

- is 120-155 characters
- includes the primary keyword naturally
- describes what the user will get from clicking
- is different from every other page's description

Missing or duplicate meta descriptions waste your impression-to-click conversion opportunity.

### Check 9: Heading Structure

For each page, verify:

- one H1 tag that matches the page topic
- H2s that break content into scannable sections
- no skipped heading levels (H1 → H3 without H2)
- headings contain relevant keywords naturally (not keyword-stuffed)

### Check 10: Image Optimization

Check your images for:

- descriptive alt text (not "image1.png" or empty)
- file size under 200KB for most images (use WebP format)
- width and height attributes to prevent layout shift
- lazy loading on below-fold images

If your images are large, run them through an [image compressor](/tools/image-compressor) before uploading.

### Check 11: URL Structure

Review your URLs for:

- clean, readable slugs (no random IDs or parameters)
- primary keyword inclusion
- consistent structure across the site
- no duplicate content at multiple URLs (use canonical tags)

Use a [slug generator](/tools/slug-generator) when creating new pages to ensure clean, SEO-friendly URLs.

## Layer 3: Content Quality Audit

Content issues are usually the biggest ranking factor for established sites. Google increasingly rewards depth, accuracy, and genuine usefulness.

### Check 12: Thin Content Pages

Find pages with:

- under 300 words of useful content
- no unique value compared to existing pages
- high bounce rate and low time-on-page in analytics

Options for thin pages: expand with useful information, merge with a related page, or noindex if they serve no search purpose.

### Check 13: Outdated Content

Find pages that:

- reference old dates, tools, or statistics
- have information that has changed since publishing
- show declining impressions in Search Console over the last 6 months

Updating outdated content often produces faster ranking improvements than publishing new pages. Follow a structured [process for updating old posts](/blog/how-to-update-old-blog-posts-for-more-traffic-in-2026) to maximize the impact.

### Check 14: Keyword Cannibalization

Check if multiple pages target the same primary keyword:

- search \\\`site:yoursite.com "keyword"\\\` in Google
- if two or more pages appear for the same query, they may be competing

Fix by either merging the pages, differentiating the intent clearly, or consolidating with canonical tags.

### Check 15: Search Intent Match

For your top 10-20 pages, search the target keyword and compare:

- does your content format match what Google shows? (listicle, how-to, comparison)
- does your content depth match or exceed the top results?
- does your page answer the actual question users are asking?

If Google shows listicles for a query and your page is a wall of text, you have an intent mismatch.

## Layer 4: Internal Link Audit

Internal links are one of the most underused SEO levers. They help Google discover pages, understand topic relationships, and distribute ranking authority.

### Check 16: Orphan Pages

Find pages with zero or one internal link pointing to them. These are nearly invisible to both users and search engines.

Fix by adding contextual links from related pages. Every important page should have at least 3-5 internal links from other relevant content.

### Check 17: Anchor Text Quality

Check that your internal links use descriptive anchor text:

- bad: "click here", "read more", "this article"
- good: "SEO checklist before publishing", "best AI writing tools"

Descriptive anchors help Google understand what the linked page is about.

### Check 18: Link Depth

Important pages should be reachable within 3 clicks from the homepage. Check:

- are key blog posts linked from category pages?
- do related posts link to each other within content?
- is navigation structure logical and complete?

Pages buried 5+ clicks deep get crawled less frequently and rank worse.

### Check 19: Contextual Link Placement

Links placed inside relevant paragraphs carry more weight than links dumped in a sidebar or footer list. Review your top pages and check:

- are internal links embedded naturally in explanatory text?
- do they appear where users would actually need the next piece of information?
- are they distributed across the page, not all clustered at the bottom?

Strong contextual linking is the difference between a site that passes topical signals and one that does not. If your blog covers a topic cluster deeply, connecting each piece through paragraph-level links builds the authority Google looks for. Learned more about this in our [topical authority SEO strategy](/blog/topical-authority-seo-strategy-2026-new-tech-blogs) guide.

## The 30-Minute Quick Audit (If You Are Short on Time)

If you cannot do the full audit right now, these 5 checks catch the most impactful issues:

1. Search Console → Pages → check for indexing errors on important pages
2. Search Console → Performance → find pages with high impressions but 0 clicks (title/meta problem)
3. PageSpeed Insights → test your 3 highest-traffic pages
4. Manual check → are your top 5 pages internally linked from at least 3 other pages?
5. Manual check → do your top 5 pages have unique, compelling title tags under 60 characters?

These five checks take about 30 minutes and usually surface the problems responsible for 80% of lost traffic.

## How to Prioritize Fixes After the Audit

You will likely find dozens of issues. Do not try to fix everything at once. Prioritize:

**High impact, quick fix (do first):**
- missing or duplicate title tags
- broken internal links
- pages blocked from indexing accidentally
- missing meta descriptions on high-impression pages

**High impact, more effort (do second):**
- thin content pages that need expansion
- outdated content that needs refreshing
- Core Web Vitals failures on top pages

**Lower impact (do when you have time):**
- image alt text improvements
- heading structure fixes
- URL cleanup on low-traffic pages

This prioritization ensures you get measurable results quickly rather than spending weeks on changes that barely move the needle.

## How Often Should You Audit?

For most sites:

- **Monthly:** quick audit (30-minute version above)
- **Quarterly:** full 4-layer audit
- **After major changes:** any time you redesign, migrate, or publish a large batch of content

Set a recurring reminder. Sites that audit regularly outperform those that only audit when traffic drops.

## Connecting Your Audit to a Growth Strategy

An audit finds problems. Fixing problems prevents decline. But growth requires a strategy beyond fixing.

After your audit is clean:

- target [low competition keywords](/blog/low-competition-keywords-for-new-blogs-2026) to build initial rankings
- follow a [blog SEO checklist](/blog/blog-seo-checklist-before-publishing-in-2026) for every new page
- build [topical authority](/blog/how-to-build-topical-authority-for-a-new-blog-in-2026) through connected content clusters
- use [AI SEO tools](/blog/best-ai-seo-tools-2026) to accelerate research without sacrificing quality
- track progress weekly in Google Search Console and adjust based on real data

The audit is the foundation. The strategy is what builds on top of it.

## Common Audit Mistakes

**Fixing everything at once.** Prioritize. Some issues have 10x more impact than others.

**Ignoring search intent.** Technical perfection means nothing if your content does not match what users actually want when they search.

**Auditing once and forgetting.** SEO is maintenance. New issues appear as you publish, as competitors change, and as Google updates.

**Relying only on tools.** Tools find patterns, but human judgment determines which patterns matter. Always verify tool recommendations manually.

**Not measuring results.** After fixing issues, track whether impressions, clicks, and positions actually improve. If they do not, your diagnosis was wrong.

## FAQ

### How long does a full SEO audit take?

For a site with 50-200 pages, expect 2-4 hours for a thorough audit covering all four layers. The 30-minute quick version catches the most critical issues.

### Can I do an SEO audit without paid tools?

Yes. Google Search Console, PageSpeed Insights, Screaming Frog (free tier), and manual browser checks cover everything a small-to-medium site needs.

### How quickly will I see results after fixing audit issues?

Technical fixes (indexing, crawl errors) can show results within days. Content and on-page improvements typically take 2-6 weeks to reflect in rankings.

### Should I hire someone for an SEO audit?

If your site has 500+ pages or complex technical architecture, professional help saves time. For sites under 200 pages, a DIY audit using this guide is sufficient.

### What is the most common issue found in SEO audits?

Poor internal linking and thin content are the two most common issues across sites of all sizes. They are also the easiest to fix.

## Final Recommendation

Start your audit today. Open Google Search Console, check your indexing status, review your top pages for title and content quality, and verify your internal link structure. You will almost certainly find issues you did not know existed.

The sites that rank consistently are not the ones with perfect content. They are the ones that find and fix problems faster than everyone else. A regular audit habit is the simplest competitive advantage in SEO.`
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
