import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const sql = neon(process.env.DATABASE_URL);

const img = (id, width = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;

const post = {
  day: "2026-07-21",
  category: "productivity",
  title: "How to Write a Resume with AI in 2026 (Without Sounding Fake)",
  slug: "how-to-write-resume-with-ai-2026",
  excerpt:
    "A step-by-step guide to writing a resume with AI in 2026: ATS-ready formatting, accomplishment bullets, tailoring per job, and keeping it authentically you.",
  metaTitle: "How to Write a Resume with AI in 2026 (ATS-Ready)",
  metaDescription:
    "Write a resume with AI in 2026: ATS formatting, accomplishment bullets with real numbers, per-job tailoring prompts, and avoiding the generic AI sound.",
  keywords:
    "how to write a resume with ai, ai resume 2026, chatgpt resume, ats resume ai, resume writing ai, ai cv builder, tailor resume job description ai",
  summary:
    "AI writes strong resumes only when you feed it real raw material — your projects, numbers, and outcomes — instead of asking it to invent.|The workflow: brain dump, ATS-safe structure, AI-drafted accomplishment bullets, then per-job tailoring by mirroring the job description.|Recruiters filter generic AI phrasing instantly, so the final pass is always yours: verify every claim, cut the filler, keep your voice.",
  coverImage: img("1586281380349-632531db7ed4"),
  content: `Recruiters in 2026 can spot a lazy AI resume in four seconds: "results-driven professional leveraging synergies to spearhead innovative solutions." The phrasing is smooth, the content is empty, and it reads identically to the two hundred other AI resumes in the same inbox. Yet the candidates winning interviews right now are also using AI — they just use it differently.

![Resume documents and laptop on a desk](${img("1586281380349-632531db7ed4")} "How to write a resume with AI in 2026")

The difference is direction. AI cannot invent your career, but it is exceptional at compressing your real experience into sharp, scannable bullets — once you hand it the raw material and control the output. This guide is that complete workflow: what screening systems actually parse, how to brain-dump the material AI needs, the prompts that produce accomplishment bullets instead of buzzword soup, and the tailoring pass that beats keyword filters without keyword stuffing.

## What Your Resume Faces in 2026

Three filters stand between your resume and a human conversation:

**The ATS parse.** Applicant tracking systems extract your text into structured fields. Tables, columns, graphics, and creative headings break the extraction — a beautiful resume that parses into garbage is an automatic rejection nobody ever sees.

**The AI screen.** Most mid-size and large companies now run AI-assisted first-pass screening that scores relevance against the job description. It reads semantically — related terms count — but it fundamentally rewards resumes that mirror the role's actual language.

**The six-second human scan.** Recruiters who open your resume skim: current title, company names, dates, and the first bullet under each role. If nothing concrete registers in six seconds, the close-tab reflex wins.

Every step below optimizes for all three at once — and the same proof-of-work logic that runs through our [first tech job guide](/blog/how-to-get-first-tech-job-2026) applies here: specifics beat adjectives at every layer.

## Step 1: Brain Dump Before You Touch AI

The single biggest AI resume mistake is starting with a prompt like "write me a resume for a marketing role." The AI has nothing real to work with, so it generates plausible filler — and plausible filler is exactly what recruiters filter out.

Instead, spend twenty minutes producing raw material. For each role or project, answer in rough notes:

- What did you actually do day to day?
- What changed because you were there? (numbers, percentages, time saved, revenue, users)
- What did you build, fix, launch, or improve?
- What would have broken if you had not been there?
- What tools and skills did you genuinely use?

Do not polish anything — mess is fine. This document is what AI transforms; without it, AI invents. Students and career-switchers short on work history should mine projects instead: the portfolio pieces from our [portfolio website guide](/blog/build-portfolio-website-2026) and freelance work from the [freelancing路径](/blog/how-to-start-freelancing-developer-2026) are all resume raw material.

## Step 2: Structure for the ATS Parse

Before content, lock the skeleton. ATS-safe means:

- **Standard headings:** Summary, Experience, Projects, Skills, Education — clever alternatives ("My Journey") break parsing
- **Single column, no tables or text boxes** — multi-column layouts scramble extraction order
- **Standard fonts, no icons in critical fields** — decoration reads as noise
- **Reverse-chronological order** with consistent date formats
- **PDF export** with real text (never an image scan)

One page for under ten years of experience; two pages maximum after that. A free [AI CV builder](/tools/ai-cv-builder) handles this entire layer — clean templates, visual and code modes, AI writing help, and PDF export — so the formatting battle is already won and you can spend your effort on content. The broader tool landscape, including paid options, is compared in our [AI resume builders roundup](/blog/best-ai-resume-builders-2026).

## Step 3: Draft Accomplishment Bullets with AI

This is where AI earns its keep. The formula for every experience bullet:

**Action verb + what you did + measurable result.**

Weak: "Responsible for social media accounts."
Strong: "Grew Instagram engagement 47% in six months by shifting to short-form video."

The prompt pattern that produces this reliably:

*"Here are my rough notes about a role: [paste brain dump]. Write 4 resume bullets. Each must start with a strong action verb, include a concrete metric or scope, and stay under 20 words. No buzzwords like 'synergy', 'passionate', 'results-driven', or 'spearheaded'. Plain, confident language."*

Then iterate — ask for tighter versions, swap weak verbs, and push back on anything vague. The banned-word constraint matters: without it, every model drifts into the same recognizable phrasing that screams template. The structured prompting behind this — role, constraints, format, examples — is the same system from our [prompt engineering guide](/blog/prompt-engineering-guide-2026-write-better-ai-prompts), and both [ChatGPT](/blog/how-to-use-chatgpt-2026-complete-guide) and [Claude](/blog/how-to-use-claude-ai-2026-complete-guide) handle this workflow well — Claude is particularly strong at preserving your phrasing when you ask it to edit rather than rewrite.

**The iron rule: never let AI add a number you did not give it.** Models pad thin notes with invented metrics, and one unverifiable claim collapsing in an interview costs the offer.

## Step 4: Tailor Every Application in Ten Minutes

Generic resumes lose to tailored ones at every screening layer, and AI collapsed the cost of tailoring from an hour to ten minutes:

*"Here is my resume: [paste]. Here is the job description: [paste]. List the top 8 skills and terms this role emphasizes. Then suggest which of my existing bullets to reorder, reword, or swap to mirror this language — without inventing anything new."*

Apply the suggestions selectively: mirror the job's exact terminology where you genuinely have the experience ("customer retention" vs "churn reduction" — same skill, match their words), reorder so the most relevant bullets lead each role, and align your Skills section to their stack. This is semantic keyword matching, not stuffing — the same intent-mirroring principle behind [SEO keyword research](/blog/how-to-do-keyword-research-free-2026), applied to a one-reader audience.

## Step 5: Write the Summary Last

The three-line block under your name is a hook, not an objective. Objectives state what you want; summaries state what they get:

*"Frontend developer with 3 years shipping React applications for fintech. Cut load times 60% at [Company]; maintain a component library used by 40+ developers. Looking to bring performance-focused engineering to a product-led team."*

Draft it after everything else — ask AI to compress your three strongest resume points into three sentences, first person, zero adjectives that could describe anyone. "Hardworking team player" describes eight billion people; delete it wherever it appears.

## Step 6: The De-AI Pass

Before sending anything, run the authenticity pass:

- **Read every bullet aloud.** Anything you would not say in an interview gets rewritten in words you would actually use.
- **Verify every number and claim.** You will be asked about each one; rehearse the story behind it.
- **Hunt the tells:** "leveraged," "spearheaded," "honed," "delved," em-dash chains, and perfectly parallel triads are 2026's recognized AI fingerprints.
- **Check consistency:** AI edits across sessions drift in tense and formatting; unify past tense for old roles, present for current.

Do recruiters run AI detectors on resumes? Some claim to, but as our [AI detector accuracy breakdown](/blog/do-ai-content-detectors-work-2026) shows, detection is probabilistic and false-positive-prone — the real filter is the human one: generic content reads as generic regardless of origin. A resume full of your specifics passes every meaningful test automatically.

## Step 7: The Cover Letter Multiplier

Where required, the cover letter follows the same pipeline in five minutes: paste your resume plus the job description and prompt — *"Write a 150-word cover letter connecting my two most relevant accomplishments to this role's needs. Conversational-professional tone, no flattery, no 'I am writing to express.'"* Then personalize the first line with something true about the company that is not on their homepage banner.

Pair the finished resume with an aligned [LinkedIn profile](/blog/linkedin-for-developers-2026) — recruiters check within minutes of shortlisting, and mismatched dates or titles between the two documents is a silent rejection. Then aim both at the right pipelines using the [remote job boards guide](/blog/best-remote-job-boards-developers-2026).

## What If You Have Almost No Experience?

The AI workflow changes for students, fresh graduates, and career-switchers — because the raw material lives outside job history:

- **Projects become roles.** A deployed app, a research assignment, or an event you organized each gets the same bullet treatment: action, scope, result. "Built a expense-tracking app with 200+ downloads" outweighs any coursework list.
- **Quantify the unusual.** Group sizes led, deadlines hit, marks improved, budgets handled — numbers exist everywhere once you look.
- **Skills section carries more weight,** so keep it honest and specific: tools you have actually used on something real, not tutorials you once opened.
- **Prompt accordingly:** *"I am a fresh graduate with no formal work experience. Here are my projects and activities: [dump]. Write experience-style bullets that emphasize initiative and measurable outcomes without exaggerating."*

The deeper fix is generating raw material worth writing about — the project sequence in our [first tech job guide](/blog/how-to-get-first-tech-job-2026) exists precisely to give thin resumes real substance within a few months.

## Common AI Resume Mistakes

**Prompting from nothing.** "Write me a resume" produces fiction. Brain dump first, always.

**Accepting invented metrics.** AI pads confidently. Every number must trace to something you can defend.

**One resume for every job.** Ten minutes of tailoring beats a hundred identical submissions.

**Keyword stuffing the Skills section.** Listing forty technologies reads as desperation; the AI screen scores relevance, not volume.

**Over-designing.** Photos, skill bars, and two-column art break ATS parsing. Clean and boring wins the machine round.

**Skipping the read-aloud pass.** If a bullet embarrasses you spoken, it embarrasses you screened.

## FAQ

### Can recruiters tell if a resume was written with AI?

They detect generic content, not AI specifically. A resume packed with your real numbers and specifics reads authentic regardless of tooling; buzzword-heavy filler reads fake even when human-written.

### Is it cheating to use AI for a resume?

No — the resume's claims must be true, not hand-typed. AI is a writing tool like spell-check; the accountability for accuracy stays yours, especially in interviews.

### What is the best AI tool for resume writing?

ChatGPT and Claude both draft strong bullets when given real raw material. For formatting and export, a dedicated CV builder with ATS-safe templates completes the pipeline — free options cover the entire workflow.

### How do I make my resume pass ATS systems in 2026?

Single column, standard headings, real-text PDF, consistent dates, and terminology mirrored from the job description. Avoid tables, graphics, and icon-heavy templates that scramble parsing.

### Should every job application get a different resume?

The core stays stable; the emphasis shifts. Reorder bullets, mirror the role's language where genuine, and align the summary — ten minutes per application, dramatically higher callback rates.

## Final Recommendation

Write the brain dump today — twenty minutes of rough notes about what you actually did and what actually changed. That document, not any prompt trick, is what separates an AI-accelerated resume from AI-generated noise. Then run the pipeline: ATS-safe structure, constrained bullet prompts, per-job tailoring, and the read-aloud pass that keeps your voice in the final draft.

The candidates winning in 2026 are not hiding their AI use — they are directing it with better raw material and stricter quality control than the competition. Your career happened; make the machine describe it accurately.`
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
