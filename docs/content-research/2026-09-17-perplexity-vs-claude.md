# Editorial research: Perplexity vs Claude comparison

Research date: 2026-09-17. Status: draft only; publication requires separate approval.

## Audience and search intent

- Audience: researchers, students, writers, and professionals deciding which AI subscription fits their work.
- Primary query: **perplexity vs claude** (autocomplete: "which is better", "for research" with 10 sub-variants — academic/deep/market/legal/scientific, "reddit", "claude code", "vs chatgpt vs gemini").
- Series context: 7 live comparisons; perplexity-vs-claude was the flagged remaining gap in the matrix (memory 2026-09-06). Slug `perplexity-vs-claude%` free; category = Software Reviews (5) like the other comparisons.
- Angle: these are DIFFERENT tool categories (answer engine vs reasoning/writing assistant) — and the twist that Perplexity Pro resells Claude models (Sonnet 4.6; Opus for Max) inside search, while Claude-only features (Claude Code, Artifacts, Projects, Research mode) stay exclusive. Decision = workflow, not model quality.
- Rejected same-day candidates: ChatGPT Atlas (download/install intent, facts churn fast, weaker cluster fit), best AI video editor (hands-on-testing claim risk), local SEO/Shopify/WordPress (off-cluster).

## Live keyword evidence collected before writing (2026-09-17)

Google Autocomplete (`client=firefox&hl=en&gl=us`):

| Seed | Returned phrases |
| --- | --- |
| perplexity vs claude | ...ai; vs chatgpt; vs chatgpt vs gemini; **for research**; reddit; vs gemini; claude code; **which is better**; cowork |
| perplexity vs claude for research | reddit; or claude; **for academic research**; **for deep research**; **for market research**; **for legal research**; for scientific research; vs chatgpt vs claude |
| claude for research | writing; paper; paper writing; reddit; labs; teams; skills |
| perplexity pro worth it | reddit; ai pro worth it |
| comet browser | download; perplexity; for windows/android |

Autocomplete = phrasing evidence, NOT volume/difficulty/rank guarantees. No GSC (unconfigured), no paid keyword dataset.

## Existing-content gap and cannibalization check

- 0 pending drafts. Existing Perplexity/Claude posts: how-to guides for both, perplexity-vs-chatgpt, claude-vs-chatgpt, claude-vs-gemini, perplexity-vs-google-gemini (research-focused vs GEMINI, not Claude), what-is-claude-code. None compares Perplexity with Claude directly.
- New post links INTO these; keeps method/how-to content out (guides already exist).

## Verified fact ledger

| Source | Verified facts used | Caveats |
| --- | --- | --- |
| https://claude.com/pricing (fetched 2026-09-17) | Free $0: Sonnet + Haiku, web search, memory, create files/run code, Artifacts, connectors, voice, incognito, up to 5 projects; **Research feature = No on Free**. Pro **$17/mo annual ($200 billed up front) or $20 monthly**: more usage, Claude Code, Claude Science, Research, Design/Slides/Docs, Chrome + Microsoft 365, Opus, Fable usage credits. Max **from $100/mo** (5x/20x usage, priority). Context "up to 1M varies by model". Model training: **opt-out** (all consumer tiers). Models: Mythos/Fable/Opus/Sonnet/Haiku. | "Prices subject to change at Anthropic's discretion" — dated observation. Usage limits page not fetched; describe limits qualitatively. |
| https://www.perplexity.ai/help-center/en/articles/11187416 (plan comparison, fetched 2026-09-17) | Free (Standard): practically unlimited basic searches, **3 Pro Searches/day, 1 Research query/month**, auto model pick, basic uploads, NO advanced models/image gen. Pro: extended Pro Search (weekly limits), Research monthly limits, Comet Assistant (browser agent) monthly limits (Free = No), file uploads weekly limits, opt-out AI training. **Education Pro $10/mo (SheerID): "everything in Pro — access to Perplexity Computer, access to Learn Mode, unlimited Pro Searches, file and image uploads, access to premium models, and more"** (direct quote). Enterprise Pro **$40/mo or $400/yr/seat**; Enterprise = data never trained. Max: highest model access, extended Create files/apps, Brain preview, early access. | Individual Pro monthly price not printed in these two articles; cross-checked as **$20/month** with the site's own Sep 6 verified comparison ("which one deserves your $20") — flag as standard published price, recheck at purchase. |
| https://www.perplexity.ai/help-center/en/articles/10352901 (What is Pro, fetched 2026-09-17) | Pro: "10x as many citations per answer"; models incl **GPT-5.2, Claude Sonnet 4.6, Gemini 3.1 Pro, Sonar**; reasoning: Sonnet 4.6 Thinking, Grok 4 (**o3-Pro & Claude 4.5 Opus for Max**); image gen + limited video; up to 50 file uploads/project; modes Best (no quota)/Pro Search/Reasoning/Research + Create files and apps; Pro Discord support. | "Access may be limited during weeks of especially heavy usage" — quote as-is. |
| Site's own verified articles (perplexity-vs-chatgpt 09-06, claude-vs-gemini 09-06) | $20 Pro framing; Claude free tier facts consistent | Older verification dates; today's fetches take precedence where they differ. |

## Image review (Pexels, real URLs from search pages; visually inspected in local contact sheet at 1500×900)

| Role | Photo ID | Accurate description | Canonical credit page |
| --- | --- | --- | --- |
| Cover | 5985294 | Person working on a laptop at a wooden table beside stacks of books and an open notebook | pexels.com/photo/person-working-on-laptop-sitting-at-wooden-table-with-books-5985294/ |
| Research | 8199566 | Student taking handwritten notes beside a laptop in a university library | pexels.com/photo/woman-in-blue-long-sleeve-shirt-holding-a-pen-8199566/ |
| Writing | 8036340 | Laptop on a desk surrounded by printed documents and books | pexels.com/photo/laptop-around-documents-and-books-8036340/ |
| Pricing | 1181595 | Overhead view of a desk with an open book, a laptop, and study materials | pexels.com/photo/person-holding-open-book-on-table-inside-room-1181595/ |
| Library | 8085250 | Woman researching on a laptop between library shelves | pexels.com/photo/a-woman-using-a-laptop-8085250/ |

All five: HTTP 200 image/jpeg, unused site-wide (DB check), canonical hrefs captured from live search results (no guessed IDs).

## Linking and publication boundary

- 13-14 unique in-paragraph internal links; verify against published DB rows before insert.
- Candidate future inbound links (ONLY on publish approval): perplexity-vs-chatgpt (comparison-matrix mention), claude-vs-gemini, how-to-use-perplexity, how-to-use-claude-ai, best-ai-research-tools. Grep exact anchors first; avoid stacking where a same-cluster link already exists in the paragraph.
- Save with `published=false`, `featured=false`, `scheduled_at=NULL`. No commit/push/deploy in this task.
