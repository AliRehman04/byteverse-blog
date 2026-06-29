import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

// Check for any remaining byteverse.blog links
const remaining = await sql`SELECT slug FROM posts WHERE content LIKE '%byteverse.blog%'`;
console.log("Posts still with byteverse.blog:", remaining.length);
remaining.forEach(p => console.log("  -", p.slug));

// Also check for specific broken URLs from Semrush report
const checks = [
  "google-search-console-new-blogs-2026",
  "blog-seo-checklist-before-publishing-2026",
  "best-ai-seo-tools-2026",
  "best-ai-writing-tools-2026",
  "best-ai-video-generators-2026",
  "best-ai-voice-generators-2026",
  "canva-ai-vs-adobe-express-2026",
  "best-ai-presentation-makers-2026",
  "best-ai-note-taking-apps-2026",
  "best-ai-productivity-apps-for-freelancers-2026",
  "affiliate-marketing-for-beginners-2026",
  "best-ai-meeting-assistants-2026",
  "best-ai-marketing-tools-2026",
  "best-ai-email-assistants-2026",
  "best-ai-data-analysis-tools-2026",
  "claude-vs-chatgpt-2026-comparison",
  "best-ai-image-generators-2026-free-paid",
  "best-chatgpt-alternatives-2026-free-paid",
  "9-best-ai-social-media-tools-in-2026-tested",
  "9-best-ai-photo-editors-in-2026-free-and-paid",
  "9-best-no-code-app-builders-in-2026-build-without-coding",
  "how-to-start-a-tech-blog-2026-seo-checklist",
  "prompt-engineering-guide-2026-write-better-ai-prompts",
  "ai-automation-roadmap-2026-what-to-automate-first",
  "how-to-get-traffic-to-a-new-blog-2026",
  "best-chatgpt-prompts-for-work-2026",
  "notion-vs-obsidian-vs-apple-notes-2026",
  "best-vscode-extensions-2026-web-developers",
  "git-github-beginners-guide-2026",
  "how-to-start-freelancing-developer-2026",
  "best-ai-website-builders-2026",
  "perplexity-vs-google-gemini-2026-research",
  "best-ai-customer-service-chatbots-2026",
  "best-ai-tools-for-small-business-2026",
  "best-ai-sales-tools-2026",
  "seo-meta-tags-generator-guide-2026",
  "website-speed-optimization-checklist-2026-core-web-vitals",
  "python-ai-agent-tutorial-2026-langgraph-rag-tools",
  "best-ai-research-tools-in-2026-ranked-by-workflow",
  "best-ai-code-editors-2026",
  "best-ai-logo-generators-2026",
  "copilot-vs-chatgpt-for-coding-2026",
  "github-copilot-guide-2026",
];

// Check which of these exist as actual slugs
const allSlugs = await sql`SELECT slug FROM posts`;
const validSet = new Set(allSlugs.map(r => r.slug));

console.log("\nSlug validation:");
const invalid = [];
for (const slug of checks) {
  if (!validSet.has(slug)) {
    invalid.push(slug);
    console.log(`  ❌ NOT IN DB: ${slug}`);
  }
}

// Also search content for these slug patterns (as relative links now)
if (invalid.length > 0) {
  console.log(`\n${invalid.length} slugs NOT in DB. Checking if they appear in content as /blog/...`);
  for (const slug of invalid) {
    const found = await sql`SELECT slug as post_slug FROM posts WHERE content LIKE ${`%/blog/${slug}%`}`;
    if (found.length > 0) {
      console.log(`  ⚠️  /blog/${slug} found in: ${found.map(f => f.post_slug).join(", ")}`);
    }
  }
}
