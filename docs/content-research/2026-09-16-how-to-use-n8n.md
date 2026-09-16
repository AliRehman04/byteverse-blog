# Editorial research: How to Use n8n (beginner tutorial)

Research date: 2026-09-16. Status: draft only; publication requires separate approval.

## Audience and search intent

- Audience: beginners (small-business operators, students, tinkerers) who heard about n8n and want to build a first workflow without prior automation experience.
- Primary query: **how to use n8n** / **n8n tutorial for beginners**. Autocomplete confirms 2026-dated variants.
- Supporting intents (from autocomplete): run it **for free**, run it **locally** (Docker), **AI agent** in n8n, **templates**, **workflow examples**.
- Proposed angle: tutorial that follows the official first-workflow path but explains WHY each step exists, plus free-vs-paid honesty, template safety, and a first AI agent with human approval. Companion to the live n8n vs Zapier comparison (#221) — method guide vs comparison, same pattern as study-methods vs student-tools (no cannibalization).

## Live keyword evidence collected before writing (2026-09-16)

Google Autocomplete (`client=firefox&hl=en&gl=us`):

| Seed | Returned phrases relevant to the outline |
| --- | --- |
| how to use n8n | for free; locally; for free with docker; ai agent; workflow; for free forever; in docker; templates |
| n8n tutorial for beginners | ...pdf; in hindi; **2026**; youtube; free; n8n basics for beginners; n8n workflow tutorial for beginners |
| n8n workflow examples | github; ai workflow examples; agentic workflow examples; simple n8n workflow examples; json examples |
| how to automate tasks with ai | how to automate daily tasks with ai |

Autocomplete = phrasing evidence, NOT volume/difficulty/rank guarantees. No GSC (still unconfigured on Vercel), no paid keyword dataset.

Rejected candidates (checked same day): ChatGPT Atlas (0 posts; browser-download intent, weaker fit with site cluster), perplexity vs claude (comparison series continuation possible later), best AI video editor (listicle, heavier hands-on-testing claim risk), local SEO/shopify/wordpress (0 posts but off-cluster). n8n tutorial chosen because: automation roadmap cluster literally names an "n8n workflow tutorial" slot; yesterday's comparison is live to link to; demand phrasing is fresh (2026).

## Existing-content gap and cannibalization check

- 0 drafts pending; slug `how-to-use-n8n%` free; only n8n title = the comparison (#221).
- "How to Use X" series precedent: DeepSeek/Grok guides in category 1 (AI Tools); comparison lives in Software Reviews. This tutorial goes to **AI Tools (category 1)**.
- Overlapping posts read (headings/excerpts): comparison #221 (pricing/decision, not build steps), `how-to-build-ai-agent-without-coding-2026` (platform-agnostic method), `ai-automation-roadmap-2026-what-to-automate-first` (what to automate), `best-ai-agent-builders-2026` (roundup). None walks through building an n8n workflow.

## Verified fact ledger

| Source | Verified facts used | Caveats |
| --- | --- | --- |
| https://docs.n8n.io/build-your-first-workflow.md | Two ways to run (manual Execute Workflow vs trigger node); Schedule Trigger weekly example (Monday 9am); NASA node + create-credential flow (API key emailed); expression `{{ $today.minus(7, 'days') }}`; If node drag classType → String Contains "X"; Postbin output; per-node **Execute step** testing; **Publish** makes it run automatically; Cloud recommended for new users w/ free trial; one-line local install `curl -fsSL https://get.n8n.io | sh` → http://localhost:5678 | Tutorial specifics can change; Postbin bins expire ~30 min; solar-flare data is live (may be empty some weeks) |
| https://docs.n8n.io/key-concept-glossary.md | Definitions: workflow, node, trigger node, credential, expression, canvas, template, data pinning (dev-only; production ignores pinned data), project; AI agent vs chain (chains have no persistent memory), AI memory, AI tool | Glossary is definitional, not exhaustive behavior |
| https://docs.n8n.io/build/ways-of-building-workflows/use-templates.md | Templates button opens n8n.io/workflows library; templates provide starting points/examples/best practices; may need credentials filled and config adjusted | Marketplace/creator program details "likely to change" |
| https://docs.n8n.io/deploy/host-n8n/install-options.md | Install options: one-line setup, Docker, Docker Compose, npm, cloud provider | Exact commands live in sub-pages |
| n8n.io/pricing + docs (verified 2026-09-15, ledger in 2026-09-15 file) | Cloud Starter $20/mo annual = 2.5k executions; Pro $50/mo = 10k; execution = one full workflow run; Community edition free self-host; Community excludes projects, sharing, SSO, external secrets, Git version control; Sustainable Use License = internal business use fine, selling hosted access needs agreement; human-in-the-loop approval for agent tool calls (pause → reviewer sees tool+params → approve/deny) | Prices dated; recheck at purchase. HITL availability depends on deployment/version |
| Windows one-line install caveat | `curl ... | sh` is a Unix-shell command; Windows users need Docker/WSL or npm | Stated in article to avoid misleading Windows readers |

- 404s hit during research: `build/manage-workflows/use-workflow-templates.md` and `build/handle-errors-and-debug/create-error-workflows.md` (old paths) — replaced via sitemap with `build/ways-of-building-workflows/use-templates.md`. Error-workflow specifics NOT asserted beyond pricing-page feature names (error workflows / custom actions when workflow fails) verified 09-15.

## Original worked example (NOT hands-on measurement)

- Inquiry→sheet→notification second-workflow pattern is an editorial design exercise mirroring #221's example, with mapping/dedup advice. No claimed benchmark.
- Any time/cost figures are labelled assumptions.

## Image review (Pexels, real URLs from search pages; visually inspected in local contact sheet)

| Role | Photo ID | Accurate description | Canonical credit page |
| --- | --- | --- | --- |
| Cover | 1181311 | Hand-drawn red flowchart on a whiteboard | pexels.com/photo/white-dry-erase-board-with-red-diagram-1181311/ |
| Concepts | 7947839 | Pencil on a printed circular planning chart | pexels.com/photo/a-pencil-on-a-chart-7947839/ |
| Templates | 7605981 | Printed project charts and documents on a desk | pexels.com/photo/photo-of-papers-on-table-7605981/ |
| Self-host | 36496927 | Programmer typing code on a laptop beside a monitor | pexels.com/photo/close-up-of-programmer-typing-code-on-laptop-36496927/ |
| AI agent | 30530419 | AI chatbot interface on a laptop screen in a dark room | pexels.com/photo/ai-chatbot-interface-on-laptop-screen-30530419/ |

All five: HTTP 200 image/jpeg, unused site-wide (DB check), captured canonical page URLs from live search results (no guessed IDs). Newer IDs (36496927, 30530419) require the long slug-path CDN URL format.

## Linking and publication boundary

- 12-13 unique in-paragraph internal links; verify against DB published rows before insert; production page checks happen at publish time (site soft-404 caveat).
- Candidate future inbound links (add ONLY on publish approval): n8n-vs-zapier-2026-comparison (natural "step-by-step tutorial" mention), ai-automation-roadmap (cluster list "Wednesday: n8n workflow tutorial" line), best-ai-agent-builders (n8n section), how-to-build-ai-agent-without-coding (n8n paragraph). DO NOT touch live posts now.
- Save with `published=false`, `featured=false`, `scheduled_at=NULL`. No commit/push/deploy in this task.
