import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const sql = neon(process.env.DATABASE_URL);

// ── PUBLISH SWITCH ──────────────────────────────────────────────────
// Post is seeded as a DRAFT. Flip to true and re-run when ready to go live.
const PUBLISH = false;

const img = (id, width = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;

const post = {
  day: "2026-08-31",
  category: "tech-guides",
  title: "How to Learn SEO in 2026: Free Step-by-Step Roadmap",
  slug: "how-to-learn-seo-2026-roadmap",
  excerpt:
    "Learn SEO from scratch in 2026 — free. A 12-week roadmap through keywords, on-page, technical, links, and AI search, with the exact tools and practice site plan.",
  metaTitle: "How to Learn SEO in 2026: Free Beginner Roadmap",
  metaDescription:
    "Learn SEO in 2026 step by step, free: a 12-week beginner roadmap covering keywords, on-page, technical SEO, backlinks, and AI search — with practice projects.",
  keywords:
    "how to learn seo, learn seo 2026, how to learn seo for free, learn seo step by step, seo for beginners, learn seo from scratch, seo roadmap 2026, how long to learn seo, seo course free, learn seo optimization, seo content writing, ai search seo",
  summary:
    "SEO in 2026 is learnable free in about 12 weeks of practice — the syllabus is keywords, on-page, technical, authority, and the new AI-search layer, in that order.|The single non-negotiable: learn on a real site you own, because SEO is a feedback-loop skill and Search Console on your own pages is the only teacher that never lies.|AI changed the exam, not the subject — engines now cite sources instead of just ranking them, which makes clear structure, real expertise, and measurement skills more valuable, not less.",
  coverImage: img("1571171637578-41bc2dd41cd2"),
  content: `SEO has been declared dead every year since it was born — and 2026's version of the obituary says AI answers killed it. The data says otherwise: Google still handles well over ten billion searches a day, organic search still drives more traffic to most websites than every social platform combined, and the sites winning AI citations are overwhelmingly the ones that rank in classic search first. What did die is the shortcut era. SEO in 2026 is a real skill with a real syllabus — and you can learn all of it free, in about twelve weeks, if you follow the right order.

![Person studying SEO analytics on a laptop with graphs](${img("1571171637578-41bc2dd41cd2")} "How to learn SEO in 2026 - free step-by-step roadmap")

This is that syllabus. Not a list of 40 courses to someday take — a week-by-week roadmap from zero to genuinely employable: what to learn in each phase, the free tools that replace paid ones, the practice site that makes it stick, the AI-search layer most 2026 guides still ignore, and honest answers on timelines and jobs. Every phase links to the deep-dive guide for that skill, so this page works as your semester plan.

## Before You Start: The Three Rules of Learning SEO

**Rule 1 — You cannot learn SEO by reading about SEO.** It is a feedback-loop skill, like cooking or lifting: theory tells you what to try; only *your own site's data* tells you what worked. Every successful self-taught SEO shares one biography line: they had a site of their own to break and fix.

**Rule 2 — Learn in order.** Beginners drown because they start with hacks (schema! backlinks! AI content!) before fundamentals (how search works, what a keyword is). The order below exists because each layer builds on the previous one.

**Rule 3 — Free is genuinely enough.** The paid-tool industry wants you to believe otherwise, but Google gives you the two tools professionals live in — Search Console and Analytics — free forever, and free tiers cover the rest at learning scale. Spend money on nothing until a client or employer pays you to.

## Week 0: Set Up Your Laboratory

Before the first lesson, create the thing you will practice on: a real, live website about a topic you genuinely know — a hobby, your profession, your city's food scene. Ten posts of sincere effort on a niche you understand beats a fake "test site" every time, because you will actually care whether it ranks.

The setup takes one weekend: pick the niche with the same logic as any [new blog launch](/blog/how-to-start-a-tech-blog-2026-seo-checklist), get it live on [free hosting](/blog/best-free-hosting-platforms-2026) or any $3/month plan, verify [Google Search Console](/blog/google-search-console-for-new-blogs-2026-beginner-guide) and [Google Analytics 4](/blog/google-analytics-4-for-bloggers-2026) on day one, and submit your sitemap. From this moment, every concept you learn gets tested on pages you own — and if the site refuses to appear in results at all, the [not-showing-on-Google checklist](/blog/website-not-showing-on-google-fixes-2026) is your first real diagnostic exercise.

## Weeks 1–2: How Search Actually Works + Keyword Research

**The mental model first.** Search engines do three things: crawl (discover pages), index (store and understand them), and rank (order them for each query by relevance, quality, and authority signals). Every SEO tactic ever invented maps to one of those three verbs. In 2026 there is a fourth: **retrieve-and-cite** — AI systems pulling indexed pages into generated answers — but it sits on top of the same index, which is why fundamentals still come first.

**Then the foundational skill: keyword research.** A keyword is a demand signal — proof that real people want something. Learning to find keywords you can actually win is the difference between publishing into a void and publishing into demand. Work through the [free keyword research process](/blog/how-to-do-keyword-research-free-2026) — seed terms, autocomplete mining, question extraction, difficulty judgment — and practice the beginner's most important sub-skill: recognizing [low-competition keywords](/blog/low-competition-keywords-for-new-blogs-2026) where a new site has a real chance. Google Keyword Planner, autocomplete, and the free tiers of keyword tools cover everything at this stage.

**Deliverable:** a list of 30 keywords for your practice site — 10 you can win now, 20 to grow into — organized into 3–4 topic groups.

## Weeks 3–5: On-Page SEO and Content That Ranks

This is the largest phase because it is the job's largest part: making pages that deserve to rank and machines can understand.

- **Content structure:** search intent matching, answer-first sections, one H1, question-style H2s — the entire craft is in [how to write SEO-friendly blog posts](/blog/how-to-write-seo-friendly-blog-posts-2026), and it applies to every page type, not just blogs.
- **Titles and metas:** the 60-character sales pitch that decides your click-through rate. Learn the [title formulas that earn clicks](/blog/how-to-write-seo-titles-2026), then make our free [SEO title checker](/tools/seo-title-analyzer) and [meta tag generator](/tools/meta-tag-generator) part of your publish routine.
- **The full tag layer:** [meta tags explained properly](/blog/seo-meta-tags-generator-guide-2026) — descriptions, Open Graph, canonicals — plus [schema markup](/tools/schema-markup-generator) once the basics feel comfortable.
- **Internal linking:** the most underrated on-page lever. Every new post links to 3–5 older relevant posts and receives links back — this is how sites build [topical authority](/blog/how-to-build-topical-authority-for-a-new-blog-in-2026), the pattern where twenty interlinked posts on one subject outrank a hundred scattered ones.

**Deliverable:** 8–10 published posts on your practice site, each run through the [pre-publish SEO checklist](/blog/blog-seo-checklist-before-publishing-in-2026) until the checklist becomes reflex. Writing with AI assistance is fine — and honestly, industry-standard now — as long as you follow the [AI-writing workflow](/blog/how-to-write-blog-posts-with-ai-2026) rules: verified facts, your experience, your voice.

![Notebook with SEO planning notes beside a laptop](${img("1499750310107-5fef28a66643")} "On-page SEO and content are the largest part of the job")

## Weeks 6–7: Technical SEO (Less Scary Than It Sounds)

Technical SEO answers one question: *can search engines crawl, render, and index your site without friction?* For 90 percent of sites, it reduces to a checklist you can genuinely master in two weeks:

1. **Indexing hygiene:** site: searches, Search Console's Pages report, robots.txt (use our [robots.txt generator](/tools/robots-txt-generator) to understand the syntax), canonical tags, and the difference between "crawled" and "indexed."
2. **Speed and Core Web Vitals:** what LCP/INP/CLS measure and the fix priority — the [speed optimization checklist](/blog/website-speed-optimization-checklist-2026-core-web-vitals) is the curriculum, PageSpeed Insights is the free examiner, and [image optimization](/blog/how-to-optimize-images-for-web-2026) is usually the biggest single win.
3. **Mobile and structure:** mobile rendering, clean URLs, sitemaps, and structured data validation with Google's Rich Results Test.

Then internalize the professional habit: the **quarterly audit**. The [free SEO audit walkthrough](/blog/free-seo-audit-website-2026-step-by-step) turns the entire technical layer into a repeatable checklist — run it on your practice site now, and on every site you ever touch after.

**Deliverable:** your practice site passes Core Web Vitals, has zero indexing errors, and you have completed one full audit with written findings — the exact artifact that impresses in job interviews.

## Weeks 8–9: Authority and Links

Backlinks remain among the strongest ranking signals in 2026 because they are the hardest to fake at quality. The learning goals: understand *why* links count as votes, what makes one link worth a hundred others (relevance, real traffic, editorial placement), and how white-hat acquisition actually works — linkable assets, journalist requests, guest posts, unlinked mentions. The complete playbook is in [how to get backlinks](/blog/how-to-get-backlinks-2026), and at learning stage your goal is modest: earn 3–5 real links to your practice site so you experience the outreach loop end to end.

Pair links with the wider promotion picture — communities, social, the compounding loops in [getting traffic to a new blog](/blog/how-to-get-traffic-to-a-new-blog-2026) — because authority in 2026 is entity-wide: mentions, brand searches, and consistent presence all feed the machine's trust model.

## Week 10: The AI Search Layer (2026's New Chapter)

Here is what makes a 2026 SEO education different from a 2020 one: search results are increasingly *answers with citations* — Google AI Overviews, ChatGPT search, Perplexity — and optimizing to be the cited source is now part of the job description. The good news for beginners: it is 70 percent the same skills (rank first, structure clearly), plus a learnable new layer.

Study [generative engine optimization](/blog/how-to-rank-in-ai-search-2026) — answer capsules, quotable statistics, machine-friendly structure, AI-crawler access — and understand the [answer-engine landscape](/blog/best-ai-search-engines-2026) you are optimizing for. Then measure it: watch for chatgpt.com and perplexity.ai referrals in GA4, and ask the engines your target questions monthly to log who gets cited. Modern [AI-powered SEO tools](/blog/best-ai-seo-tools-2026) increasingly track this automatically, but the manual habit teaches you what the dashboards mean.

**Deliverable:** retrofit your three best practice posts with answer-first sections and sourced statistics, then track citation checks for a month.

## Weeks 11–12: Measurement and the Optimization Loop

The skill that separates SEOs from content hobbyists: reading data and acting on it. Two reports run the profession — Search Console's Performance (queries, impressions, CTR, position) and GA4's landing pages/conversions. The looping habit: find pages with impressions but no clicks (title problem), pages ranking 8–15 (improvement candidates one push from page one), and decaying old posts. Then execute: the [old-post update workflow](/blog/how-to-update-old-blog-posts-for-more-traffic-in-2026) is where easy wins live, and [understanding traffic timelines](/blog/how-many-blog-posts-before-traffic-starts-2026) keeps you sane while the compounding builds.

**Deliverable:** one full optimization cycle — identify three underperformers on your site, improve them, re-request indexing, and document what moved over the following weeks. Congratulations: that documented cycle *is* professional SEO work.

## Your Free Tool Stack (Total Cost: $0)

| Job | Free tool |
|---|---|
| Rankings, queries, indexing | Google Search Console |
| Behavior, conversions, AI referrals | Google Analytics 4 |
| Keyword discovery | Autocomplete, Keyword Planner, free tiers |
| Speed | PageSpeed Insights |
| Titles & metas | [SEO title checker](/tools/seo-title-analyzer) + [meta tag generator](/tools/meta-tag-generator) |
| Structured data | [Schema generator](/tools/schema-markup-generator) + Rich Results Test |
| Readability | [Readability checker](/tools/readability-checker) |
| Crawling (small sites) | Screaming Frog free tier (500 URLs) |

## How Long Until Money? (The Honest Timeline)

Learnable in 12 weeks; *provable* in about six months — because SEO results lag effort by 2–4 months, and your practice site's growth curve is your portfolio. The realistic paths, in order of accessibility: freelance local SEO (small businesses pay $300–1,000/month for basics you will know by week 12), content-SEO roles at agencies (entry salaries commonly $45–65k US, remote-friendly), in-house junior roles, and the long game — your own sites earning through [content monetization](/blog/how-to-monetize-a-blog-2026). What every path demands is the same artifact: a real site you grew, with Search Console screenshots to prove it. That is why Week 0 was the most important week of the roadmap.

## FAQ

### Can I learn SEO for free in 2026?

Completely. Google's own tools (Search Console, Analytics, Keyword Planner, PageSpeed Insights), free tool tiers, and guides like this site's SEO cluster cover the entire curriculum. Paid tools add convenience at professional scale — they teach you nothing the free stack cannot.

### How long does it take to learn SEO?

Twelve weeks of consistent practice (5–8 hours weekly) covers the full fundamentals on a real site. Expect six months to first provable results — rankings and traffic on pages you optimized — because search results lag actions by 2–4 months regardless of skill.

### Is SEO still worth learning in 2026 with AI answering searches?

More than ever — the skill evolved rather than died. AI answers cite sources, and citation optimization (GEO) is built on classic SEO foundations. Businesses now need people who understand both layers, and that combination is scarcer than either alone.

### Do I need to know coding to learn SEO?

No. Technical SEO needs comfort with concepts (crawling, indexing, page speed) and fearlessness with tools — not programming. Basic HTML awareness (what a title tag looks like) helps and takes an afternoon. Developers have an edge in implementation; writers have an edge in content. Both become good SEOs.

### What should I learn first in SEO?

In order: how search works (crawl/index/rank), then keyword research, then on-page content optimization — on a real site you own from day one. Everything else (technical, links, AI search) builds on those three. Starting with hacks before fundamentals is why most self-taught attempts stall.

## Bottom Line

SEO in 2026 is the rare high-income skill with zero tuition, zero gatekeepers, and a built-in lie detector — your own Search Console data. The roadmap is twelve weeks: a real site, keywords, on-page craft, technical hygiene, a few earned links, the AI-search layer, and one full measurement loop. Start Week 0 this weekend — the niche you already know, the free hosting, the two Google tools — and publish your first optimized post within seven days. Six months from now you will have the one thing every employer, client, and algorithm actually trusts: a site you grew yourself, with the receipts to prove it.`,
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
      ${"Ali Rehman"}, ${PUBLISH}, false, ${post.metaTitle}, ${post.metaDescription}, ${post.keywords},
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
    RETURNING id
  `;

  console.log(`${PUBLISH ? "PUBLISHED" : "DRAFT"}: ${post.slug} (id ${saved.id}, ${rt}, ${words} words)`);
}

await seed();
