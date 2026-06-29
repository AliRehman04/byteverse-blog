import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

async function main() {
  // Step 1: Get all actual slugs from DB
  const rows = await sql`SELECT slug FROM posts`;
  const validSlugs = new Set(rows.map((r) => r.slug));
  console.log(`DB has ${validSlugs.size} valid slugs\n`);

  // Step 2: Get all posts with byteverse.blog links
  const posts = await sql`SELECT id, slug, content FROM posts WHERE content LIKE '%byteverse.blog%'`;
  console.log(`Found ${posts.length} posts with byteverse.blog links\n`);

  // Step 3: Build mapping from wrong URL slug to correct slug
  function findCorrectSlug(wrongSlug) {
    // Exact match
    if (validSlugs.has(wrongSlug)) return wrongSlug;

    // Try removing common suffixes
    const suffixPatterns = [
      /-2026-free-paid$/,
      /-2026-comparison$/,
      /-2026-research$/,
      /-2026-seo-checklist$/,
      /-2026-write-better-ai-prompts$/,
      /-2026-what-to-automate-first$/,
      /-2026-langgraph-rag-tools$/,
      /-2026-tips-tricks$/,
      /-2026-core-web-vitals$/,
      /-2026-build-without-coding$/,
      /-in-2026-tested$/,
      /-in-2026-free-and-paid$/,
      /-in-2026-ranked-by-workflow$/,
      /-in-2026-build-without-coding$/,
      /-2026$/,
    ];

    for (const pattern of suffixPatterns) {
      const stripped = wrongSlug.replace(pattern, "");
      if (validSlugs.has(stripped)) return stripped;
      // Also try with -2026 added (for newer posts)
      if (validSlugs.has(stripped + "-2026")) return stripped + "-2026";
    }

    // Try removing "-guide-2026" → "-guide"
    const withoutYear = wrongSlug.replace(/-2026/g, "");
    if (validSlugs.has(withoutYear)) return withoutYear;

    // Try common known mappings
    const manualMappings = {
      "best-ai-research-tools-in-2026-ranked-by-workflow": "best-ai-research-tools",
      "9-best-ai-social-media-tools-in-2026-tested": "9-best-ai-social-media-tools",
      "9-best-ai-photo-editors-in-2026-free-and-paid": "9-best-ai-photo-editors",
      "9-best-no-code-app-builders-in-2026-build-without-coding": "9-best-no-code-app-builders",
      "best-ai-tools-for-students-2026": "best-ai-tools-for-students",
      "best-ai-tools-for-small-business-2026": "best-ai-tools-for-small-business",
      "best-ai-customer-service-chatbots-2026": "best-ai-customer-service-chatbots",
      "best-ai-agent-builders-2026": "best-ai-agent-builders",
      "best-ai-spreadsheet-tools-2026": "best-ai-spreadsheet-tools",
      "best-ai-pdf-tools-2026": "best-ai-pdf-tools",
      "best-ai-search-engines-2026": "best-ai-search-engines",
      "how-to-start-a-tech-blog-2026-seo-checklist": "how-to-start-a-tech-blog",
      "how-to-start-a-tech-blog-2026": "how-to-start-a-tech-blog",
      "prompt-engineering-guide-2026-write-better-ai-prompts": "prompt-engineering-guide",
      "prompt-engineering-guide-2026": "prompt-engineering-guide",
      "how-to-get-traffic-to-a-new-blog-2026": "how-to-get-traffic",
      "ai-automation-roadmap-2026-what-to-automate-first": "ai-automation-roadmap",
      "python-ai-agent-tutorial-2026-langgraph-rag-tools": "python-ai-agent-tutorial",
      "website-speed-optimization-checklist-2026-core-web-vitals": "website-speed-optimization",
      "git-github-beginners-guide-2026": "git-github-beginners",
      "how-to-start-freelancing-developer-2026": "how-to-start-freelancing-developer",
      "seo-meta-tags-generator-guide-2026": "seo-meta-tags-generator",
      "best-ai-image-generators-2026-free-paid": "best-ai-image-generators",
      "best-chatgpt-alternatives-2026-free-paid": "best-chatgpt-alternatives",
      "best-chatgpt-alternatives-2026": "best-chatgpt-alternatives",
      "claude-vs-chatgpt-2026-comparison": "claude-vs-chatgpt",
      "copilot-vs-chatgpt-for-coding-2026-comparison": "copilot-vs-chatgpt-for-coding",
      "perplexity-vs-google-gemini-2026-research": "perplexity-vs-google-gemini",
      "perplexity-vs-google-gemini-2026-comparison": "perplexity-vs-google-gemini",
      "github-copilot-guide-2026-tips-tricks": "github-copilot-guide",
      "best-vscode-extensions-2026-web-developers": "best-vscode-extensions-web-developers",
      "10-best-free-ai-tools-2026": "10-best-free-ai-tools",
      "docker-for-beginners-2026-guide": "docker-for-beginners",
      "nextjs-16-deployment-guide-2026-vercel-seo-custom-domain": "nextjs-16-deployment",
      "best-free-apis-for-developers-2026": "best-free-apis",
    };

    if (manualMappings[wrongSlug]) {
      if (validSlugs.has(manualMappings[wrongSlug])) return manualMappings[wrongSlug];
    }

    return null; // Not found
  }

  // Step 4: Process each post
  let totalFixed = 0;
  let totalNotFound = 0;
  const notFoundUrls = [];

  for (const post of posts) {
    let content = post.content;
    let changed = false;

    // Find all byteverse.blog URLs
    const regex = /https?:\/\/byteverse\.blog\/blog\/([a-z0-9-]+)/g;
    let match;
    const replacements = [];

    while ((match = regex.exec(content)) !== null) {
      const wrongSlug = match[1];
      const correctSlug = findCorrectSlug(wrongSlug);
      if (correctSlug) {
        replacements.push({
          from: match[0],
          to: `/blog/${correctSlug}`,
        });
      } else {
        totalNotFound++;
        notFoundUrls.push({ url: match[0], slug: wrongSlug, inPost: post.slug });
      }
    }

    // Apply replacements
    for (const r of replacements) {
      content = content.split(r.from).join(r.to);
      changed = true;
      totalFixed++;
    }

    if (changed) {
      await sql`UPDATE posts SET content = ${content}, updated_at = NOW() WHERE id = ${post.id}`;
      console.log(`✅ ${post.slug} — fixed ${replacements.length} links`);
      for (const r of replacements) {
        console.log(`   ${r.from} → ${r.to}`);
      }
    }
  }

  console.log(`\n========== SUMMARY ==========`);
  console.log(`Total links fixed: ${totalFixed}`);
  console.log(`Not found: ${totalNotFound}`);
  if (notFoundUrls.length > 0) {
    console.log(`\nUnresolved URLs:`);
    for (const u of notFoundUrls) {
      console.log(`  ${u.url} (in ${u.inPost}) — slug "${u.slug}" not found in DB`);
    }
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
