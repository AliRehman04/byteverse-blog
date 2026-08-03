import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const sql = neon(process.env.DATABASE_URL);

// ── PUBLISH SWITCH ──────────────────────────────────────────────────
// Post is seeded as a DRAFT. Flip to true and re-run when ready to go live.
const PUBLISH = true;

const img = (id, width = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;

const post = {
  day: "2026-08-03",
  category: "tech-guides",
  title: "How to Rank in AI Search in 2026 (GEO Guide That Works)",
  slug: "how-to-rank-in-ai-search-2026",
  excerpt:
    "AI Overviews, ChatGPT, and Perplexity now answer before anyone clicks. This 7-step GEO guide shows exactly how to become the source AI search cites in 2026.",
  metaTitle: "How to Rank in AI Search 2026: 7-Step GEO Guide",
  metaDescription:
    "Rank in AI search in 2026: a 7-step generative engine optimization (GEO) guide for Google AI Overviews, ChatGPT, and Perplexity — with real study data.",
  keywords:
    "how to rank in ai search, generative engine optimization, geo seo 2026, ai overviews seo, rank in chatgpt search, get cited by ai, perplexity seo, llms.txt, ai search optimization, chatgpt seo",
  summary:
    "AI search engines do not replace SEO — they sit on top of it: most AI citations already rank in the top ten, so classic indexing and keyword work still come first.|The biggest GEO wins are answer-first sections, hard statistics with named sources, machine-friendly structure, and letting AI crawlers like OAI-SearchBot and PerplexityBot in.|Measure AI traffic through GA4 referrals from chatgpt.com and perplexity.ai, keep content fresh, and build entity signals so engines recommend your brand by name.",
  coverImage: img("1676299081847-824916de030a"),
  content: `Search stopped being ten blue links. In 2026, Google shows an AI Overview above the first result on a huge share of informational queries, ChatGPT answers questions for hundreds of millions of weekly users, and Perplexity has turned "answer engine" into a category of its own. When an AI assembles the answer, it cites a handful of sources — and either you are one of them, or you are invisible.

![AI search interface answering a question with cited sources](${img("1676299081847-824916de030a")} "How to rank in AI search in 2026 - generative engine optimization guide")

The practice of earning those citations is called **generative engine optimization (GEO)** — and unlike most new-acronym marketing, it is backed by actual research and measurable referral traffic. This guide walks through the seven steps that reliably get sites cited by AI Overviews, ChatGPT search, and Perplexity in 2026, what the studies really say, and how to measure whether any of it is working. Everything here is doable for free on a normal blog.

## How AI Search Actually Picks Its Sources

Before optimizing, understand the machine. Every major AI search product works on the same loop, called retrieval-augmented generation: it takes your question, retrieves relevant pages and passages from a search index, then writes a summary and cites the passages it leaned on. It does not "know" your site — it retrieves it, exactly like a search engine, and then quotes it, exactly like a journalist.

That single fact explains almost every finding in the research so far:

- **AI citations overlap heavily with classic rankings.** Multiple large 2025 studies found that roughly half to three-quarters of the pages cited in Google's AI Overviews already rank in the top ten organic results for that query. AI search is not a separate lottery — it draws from the winners of the old one.
- **Formatting changes visibility dramatically.** The original GEO research paper (a joint Princeton, Georgia Tech, and IIT Delhi study) tested nine optimization tactics across thousands of queries and found that adding quotations, statistics, and citations to a page improved its visibility in generative answers by up to 40 percent — while keyword stuffing did almost nothing.
- **Retrieval happens at passage level.** Engines cite sections, not whole pages. A single well-structured paragraph can earn a citation even if the rest of the page is mediocre — and a brilliant page with rambling structure can be skipped entirely.

The three engines differ in flavor — AI Overviews draw from Google's index, ChatGPT search leans on Bing's index plus its own crawling, and Perplexity runs its own crawler with a strong preference for fresh, well-sourced pages (the full landscape is mapped in our [AI search engines comparison](/blog/best-ai-search-engines-2026)). But the seven steps below move the needle on all three at once.

## Step 1: Win Classic SEO First — AI Search Sits on Top of It

Here is the honest part most GEO articles skip: **you cannot be cited by an engine that never retrieves you.** Since AI answers overwhelmingly cite pages that already rank, the fastest way to appear in AI search is to rank in normal search — which makes classic SEO the first step of GEO, not its rival.

That means the fundamentals are non-negotiable. Your site has to be indexed and technically clean — if \`site:yourdomain.com\` looks thin or key pages are missing, fix that first with the [website not showing on Google checklist](/blog/website-not-showing-on-google-fixes-2026) before touching anything AI-specific. Pages need to load fast and render properly on mobile, because crawl-hostile sites get retrieved less by every engine; the [Core Web Vitals checklist](/blog/website-speed-optimization-checklist-2026-core-web-vitals) covers the fixes in impact order.

Keyword targeting changes shape slightly under GEO. People type fragments into Google but ask full questions in ChatGPT — "best static site generator for a photography portfolio" instead of "static site generator." So when you run the [free keyword research process](/blog/how-to-do-keyword-research-free-2026), weight question-style and long-tail queries more heavily than before: they map one-to-one onto the prompts people actually give AI assistants, and they are exactly the queries where a smaller site can still take the top ten.

![SEO fundamentals remain the foundation that AI search visibility is built on](${img("1562577309-4932fdd64cd1")} "Classic SEO is step one of generative engine optimization")

## Step 2: Write Answer Capsules — the 40-to-80-Word Trick

Because retrieval is passage-level, the highest-leverage writing habit in 2026 is the **answer capsule**: open every major section with 40 to 80 words that answer the section's question completely, before adding nuance, examples, and caveats below.

Look at how this very article's sections open — a direct claim first, evidence after. That shape matters because an AI engine scanning candidates for "what is GEO" will lift a self-contained definition long before it reconstructs one from a story that meanders for three paragraphs. The pattern to internalize:

1. **Heading asks or implies a question** — ideally phrased the way a person would ask it out loud
2. **First sentences answer it outright** — with a number, a definition, or a verdict
3. **The rest of the section earns the answer** — data, examples, edge cases

Two supporting habits multiply the effect. Write headings as natural-language questions or clear noun phrases ("How long does GEO take?" beats "Timeline considerations"), and keep each section on exactly one idea so a lifted passage never depends on context the engine did not retrieve. Both habits happen to be identical to what already works for featured snippets and humans — the complete system is in our [SEO-friendly writing guide](/blog/how-to-write-seo-friendly-blog-posts-2026), and the same clarity principles behind [titles that earn clicks](/blog/how-to-write-seo-titles-2026) apply to every heading inside the page too.

## Step 3: Load Pages With Statistics, Quotes, and Named Sources

This is the step with the strongest experimental evidence behind it. The GEO study tested tactics head-to-head, and the three that consistently boosted citation visibility — by up to 40 percent on lower-ranked pages — were adding **statistics**, **quotations from credible sources**, and **citations to authoritative references**. The tactics that did nothing? Keyword stuffing and vague "unique words" sprinkling.

The mechanism is intuitive: a language model composing an answer needs concrete, attributable facts, and it prefers to quote a page that hands it "the study of 10,000 queries found a 40 percent visibility lift" over one that mumbles "many experts believe this helps a lot." Specificity is machine-quotable; fluff is not.

Applying it takes minutes per post:

- Replace every vague claim with a number, and name where the number came from
- Quote a named expert, documentation page, or study instead of paraphrasing anonymously
- Add your own first-hand data — timings, test results, screenshots described in text, real prices. Original numbers are the one thing competitors cannot copy and engines treat as unique supply
- Date your claims ("as of mid-2026") so engines can trust freshness

There is a quality bar hiding in here too. Mass-produced AI content typically contains zero original data points, which is precisely why it struggles to earn citations — engines have no reason to quote a page that only re-states what fifty other pages say. Our [AI content detector testing](/blog/do-ai-content-detectors-work-2026) reached the same conclusion from the other direction: detection is unreliable, but *genuine first-hand specificity* is what separates content that performs from content that merely exists.

## Step 4: Structure Pages So Machines Can Parse Them

Engines lift structured fragments far more easily than walls of prose. After the answer capsules, the structural checklist that measurably helps:

- **Strict heading hierarchy** — one H1, logical H2/H3 nesting, no skipped levels
- **Short paragraphs** — two to four sentences, one idea each
- **Lists and tables for anything comparative** — AI Overviews visibly favor lifting tables for "X vs Y" and "best tools" queries
- **A definition near the top** — if your page is about a concept, define it plainly in one sentence someone could read aloud
- **Descriptive alt text** on every image, since multimodal retrieval reads it

Then add the machine-readable layer: **schema markup**. Article, FAQPage, and HowTo structured data give engines a pre-parsed version of your content's meaning, and clean [meta titles and descriptions](/blog/seo-meta-tags-generator-guide-2026) remain the fields engines echo when they name your page as a source. None of this requires plugins or budget — it is a formatting discipline, and it takes ten minutes per post once it becomes part of your [pre-publish SEO checklist](/blog/blog-seo-checklist-before-publishing-in-2026).

## Step 5: Open the Door to AI Crawlers (Most Sites Block the Wrong Ones)

You cannot be cited by a bot you have banned. In 2023-2024, thousands of sites reflexively blocked every AI user agent to protest training-data scraping — and in doing so, silently removed themselves from AI *search* citations, which are a traffic source, not a theft. In 2026 the crawlers worth knowing:

| Crawler | Who | What it feeds | Block it? |
|---|---|---|---|
| \`GPTBot\` | OpenAI | Model training | Your call — no traffic impact |
| \`OAI-SearchBot\` | OpenAI | **ChatGPT search citations** | Blocking removes you from ChatGPT results |
| \`ChatGPT-User\` | OpenAI | Live page fetches when users ask | Keep allowed |
| \`PerplexityBot\` | Perplexity | **Perplexity answers and citations** | Blocking removes you |
| \`Google-Extended\` | Google | Gemini training only | Blocking does NOT remove you from AI Overviews — those use normal Googlebot |
| \`ClaudeBot\` | Anthropic | Claude training and retrieval | Your call |

Three practical moves follow. First, audit your \`robots.txt\` right now and make sure \`OAI-SearchBot\` and \`PerplexityBot\` are not caught in a blanket ban — this two-minute check belongs in every [site audit routine](/blog/free-seo-audit-website-2026-step-by-step). Second, verify your site in **Bing Webmaster Tools**, because ChatGPT search draws heavily on Bing's index; a site invisible to Bing is handicapped in the fastest-growing AI engine. Third, consider adding an \`llms.txt\` file — a proposed standard that lists your key pages in plain markdown for AI systems. Honest assessment: Google has said it does not use it, adoption elsewhere is unconfirmed, and nobody has published proof it drives citations. It costs five minutes and cannot hurt, so treat it as cheap insurance rather than a strategy.

## Step 6: Build Entity and Brand Signals AI Engines Recognize

Ask ChatGPT to "recommend a blog about X" and it names brands it has repeatedly encountered across the web — not necessarily the best pages, but the most consistently *known* entities. That is the part of GEO that lives off your own site.

On-site, make your entity unambiguous: a real about page, a consistent author name with credentials on every post, and the same site name and description everywhere. Off-site, the signal is repetition in trusted places — being mentioned (even unlinked) in Reddit threads, niche communities, tool directories, newsletters, and reviews teaches models that your brand belongs to the topic. The playbook overlaps almost entirely with ordinary [new-blog promotion](/blog/how-to-get-traffic-to-a-new-blog-2026), which is convenient: every genuine community mention now pays twice.

The strongest entity signal of all is **topical depth**. Engines associate domains with subjects, and twenty interlinked posts on one subject beat a hundred scattered ones — the exact cluster architecture from our [topical authority guide](/blog/how-to-build-topical-authority-for-a-new-blog-in-2026) is what makes a model complete the sentence "for this topic, a reliable source is…" with your name.

## Step 7: Refresh Content on a Schedule — AI Search Has a Freshness Bias

AI engines demonstrably prefer recently updated sources, and Perplexity is the most aggressive about it — ask it anything and watch how many citations are weeks old, not years. A page last touched in 2024 loses citation share to a thinner page updated last month, which is infuriating but exploitable.

The exploit is a refresh cycle: every quarter, update your most important pages with current numbers, new sections for new developments, and a visible updated date, then re-request indexing. The workflow — which pages to prioritize and what actually counts as an update versus cosmetic fiddling — is exactly the [old-post update system](/blog/how-to-update-old-blog-posts-for-more-traffic-in-2026), now with a second payoff in AI visibility. Posts with fresh statistics also become more quotable under Step 3 with every refresh, so the steps compound.

## How to Measure Whether AI Search Sends You Anything

GEO without measurement is faith. Four ways to see it working in 2026:

**GA4 referral traffic.** Build a report filtering session sources for \`chatgpt.com\`, \`perplexity.ai\`, \`copilot.microsoft.com\`, and \`gemini.google.com\`. These visits are usually few but absurdly high-intent — users arrive pre-sold by an AI recommendation.

**Search Console, read carefully.** Google folds AI Overview impressions and clicks into the regular Web totals — there is no separate AI filter. The tell is diverging curves: impressions climbing while CTR sinks often means you are being *shown* inside AI Overviews without earning the click. Tracking that divergence per query is a [Search Console skill](/blog/google-search-console-for-new-blogs-2026-beginner-guide) worth building now.

**Ask the engines directly.** Once a month, put your ten money queries to ChatGPT, Perplexity, and Google, and log who gets cited. Five minutes with a spreadsheet beats any dashboard — though several [AI SEO tools](/blog/best-ai-seo-tools-2026) now track AI-answer visibility automatically, and [Perplexity itself](/blog/how-to-use-perplexity-ai-2026-complete-guide) is the fastest way to check citations because it shows its sources for every single answer.

**Watch branded search.** When AI assistants recommend you, people google your name afterward. A rising branded-impressions line in Search Console is often the first visible GEO win.

## The 30-Day GEO Plan

| Week | Focus | Actions |
|---|---|---|
| 1 | Foundation | Indexing check, robots.txt audit for AI crawlers, Bing Webmaster Tools verification |
| 2 | Retrofit | Add answer capsules + statistics with named sources to your 10 most important pages |
| 3 | Structure | FAQ schema, tables for comparisons, question-style headings, alt text sweep |
| 4 | Entity + baseline | About/author pages, one community contribution, log current AI citations for 10 queries |

## FAQ

### What is generative engine optimization (GEO)?

GEO is the practice of optimizing content so AI search engines — Google AI Overviews, ChatGPT, Perplexity — retrieve it and cite it in generated answers. It builds on classic SEO and adds answer-first structure, quotable statistics, machine-readable formatting, and AI-crawler access.

### Is GEO different from SEO, or is it the same thing?

They overlap about 70 percent: indexing, rankings, and topical authority feed both. GEO adds passage-level optimization (answer capsules), citation-worthiness (stats and named sources), and crawler policy for AI bots — layers classic SEO never needed.

### Does blocking GPTBot hurt my Google rankings or AI Overviews visibility?

No. GPTBot only feeds OpenAI model training, and Google-Extended only affects Gemini training. AI Overviews use the normal Googlebot crawl. The one to never block for traffic is OAI-SearchBot, which powers ChatGPT search citations, plus PerplexityBot for Perplexity.

### How long does it take to get cited by AI search engines?

If you already rank in the top ten, formatting improvements can earn citations within days to weeks of re-crawling — Perplexity reacts fastest. If you do not rank yet, expect the normal SEO timeline of two to six months first, because AI engines cite pages their underlying indexes already trust.

### Is traditional SEO dead now that AI answers questions directly?

No — it moved one layer down. AI answers cite sources retrieved from classic search indexes, and most citations already rank in the top ten, so traditional SEO is now the qualifying round for AI visibility. What did die is the fluffy 300-word post with no original information: engines have no reason to ever quote it.

## Final Recommendation

Do not treat AI search as a new channel that needs a new strategy — treat it as a new *judge* of the strategy you should already be running. Rank first, because engines cite what they retrieve. Then make every important page quotable: an answer in the first 80 words of each section, a statistic with a named source where a vague claim used to be, a table where prose used to sprawl, and a robots.txt that lets OAI-SearchBot and PerplexityBot in.

Start with the week-one audit today — indexing, crawler access, Bing verification — then retrofit your ten most valuable pages before writing anything new. Sites doing this now are compounding citations while most of the web is still arguing about whether AI search matters. By the time the argument ends, the sources will already be chosen.`
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
    RETURNING id, slug, published
  `;

  console.log(
    `${saved.published ? "PUBLISHED" : "DRAFT saved"}: ${saved.slug} (id ${saved.id}, ${rt}, ${words} words)`
  );
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
