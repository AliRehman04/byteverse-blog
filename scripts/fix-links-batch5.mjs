import { neon } from "@neondatabase/serverless";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());

const sql = neon(process.env.DATABASE_URL);

// Cross-link definitions: [postId, searchText, replacementText]
const links = [
  // === FROM EXISTING POSTS → NEW BATCH 5 POSTS ===

  // React 19 (16) → Tailwind CSS 4, Portfolio
  [16, "## Frequently Asked Questions",
    `## Keep Learning\n\nPair React 19 with [Tailwind CSS 4](/blog/tailwind-css-4-guide-2026) for rapid UI development. When you are ready to showcase your React projects, follow our [portfolio website guide](/blog/build-portfolio-website-2026) to build a professional portfolio.\n\n## Frequently Asked Questions`],

  // Next.js Deployment (2) → Tailwind CSS 4, Portfolio
  [2, "## Frequently Asked Questions",
    `## Related Resources\n\nIf you are styling your Next.js app, check out [what is new in Tailwind CSS 4](/blog/tailwind-css-4-guide-2026) for the latest CSS-first configuration approach. Ready to showcase your deployed projects? Our [portfolio website guide](/blog/build-portfolio-website-2026) walks you through building a professional dev portfolio.\n\n## Frequently Asked Questions`],

  // TypeScript (37) → Tailwind CSS 4, Portfolio
  [37, "## Frequently Asked Questions",
    `## What to Build Next\n\nCombine TypeScript with [Tailwind CSS 4](/blog/tailwind-css-4-guide-2026) for type-safe, beautifully styled apps. Then show off your TypeScript projects on a [professional portfolio website](/blog/build-portfolio-website-2026).\n\n## Frequently Asked Questions`],

  // JavaScript Roadmap (15) → Free APIs, Portfolio
  [15, "## Frequently Asked Questions",
    `## Next Steps\n\nPractice your JavaScript skills by building projects with [free APIs](/blog/best-free-apis-for-developers-2026) - we have curated 25+ APIs you can use right away. When you have built a few projects, create a [developer portfolio](/blog/build-portfolio-website-2026) to showcase your work.\n\n## Frequently Asked Questions`],

  // Git/GitHub (34) → Portfolio
  [34, "## Frequently Asked Questions",
    `## Put Git to Work\n\nNow that you know Git, use it to version control your [developer portfolio website](/blog/build-portfolio-website-2026). Hosting your portfolio on GitHub and deploying from there is a great way to demonstrate your Git skills to employers.\n\n## Frequently Asked Questions`],

  // Learn Programming (25) → Free APIs, Portfolio
  [25, "## Frequently Asked Questions",
    `## Keep Building\n\nOnce you have the basics down, start building projects with [free APIs](/blog/best-free-apis-for-developers-2026) to practice real-world coding. Then put everything together in a [portfolio website](/blog/build-portfolio-website-2026) that shows what you can do.\n\n## Frequently Asked Questions`],

  // VS Code Extensions (24) → Tailwind CSS 4
  [24, "## Frequently Asked Questions",
    `## Related Guides\n\nUsing Tailwind CSS IntelliSense? Check out our [Tailwind CSS 4 guide](/blog/tailwind-css-4-guide-2026) to learn what changed in the latest version and how to migrate.\n\n## Frequently Asked Questions`],

  // How to Start a Blog (9) → Tailwind CSS 4, Portfolio
  [9, "## Frequently Asked Questions",
    `## Related Resources\n\nStyling your blog? The [Tailwind CSS 4 guide](/blog/tailwind-css-4-guide-2026) covers the new CSS-first config and faster builds. Also consider building a [developer portfolio](/blog/build-portfolio-website-2026) alongside your blog to establish your online presence.\n\n## Frequently Asked Questions`],

  // Website Speed Optimization (10) → Tailwind CSS 4
  [10, "## Frequently Asked Questions",
    `## Tools for Speed\n\n[Tailwind CSS 4](/blog/tailwind-css-4-guide-2026) brings build speeds up to 100x faster with its new Oxide engine - a huge win for your development workflow and page performance.\n\n## Frequently Asked Questions`],

  // Docker (36) → Portfolio
  [36, "## Frequently Asked Questions",
    `## Show Your Skills\n\nNow that you know Docker, add containerized projects to your [developer portfolio](/blog/build-portfolio-website-2026). Knowing Docker is a strong signal to employers.\n\n## Frequently Asked Questions`],

  // === FROM NEW BATCH 5 POSTS → EXISTING POSTS ===

  // Tailwind CSS 4 (40) → React 19, Next.js, TypeScript, VS Code Extensions
  [40, "## Frequently Asked Questions",
    `## Related Guides\n\nUsing Tailwind 4 with a framework? Check out our [React 19 best practices](/blog/react-19-best-practices-2026-faster-apps) and [Next.js deployment guide](/blog/nextjs-16-deployment-guide-2026-vercel-seo-custom-domain). If you are new to typed CSS, our [TypeScript guide](/blog/typescript-for-beginners-2026-complete-guide) pairs well. And grab the right [VS Code extensions](/blog/best-vscode-extensions-2026-web-developers) for Tailwind IntelliSense.\n\n## Frequently Asked Questions`],

  // Free APIs (41) → JavaScript, React 19, Python, Learn Programming
  [41, "## Frequently Asked Questions",
    `## Build Something With These APIs\n\nNeed help getting started? Our [JavaScript roadmap](/blog/javascript-roadmap-2026-beginner-job-ready) covers the fundamentals. Build a frontend with [React 19](/blog/react-19-best-practices-2026-faster-apps), or try server-side API work with our [Python AI agent tutorial](/blog/python-ai-agent-tutorial-2026-langgraph-rag-tools). New to coding? Start with our [beginner programming guide](/blog/how-to-learn-programming-2026-beginner-roadmap).\n\n## Frequently Asked Questions`],

  // Portfolio (42) → React 19, Next.js, Tailwind CSS 4, Git/GitHub, VS Code, TypeScript
  [42, "## Frequently Asked Questions",
    `## Essential Skills for Your Portfolio\n\nBrush up on [React 19](/blog/react-19-best-practices-2026-faster-apps) and [Next.js deployment](/blog/nextjs-16-deployment-guide-2026-vercel-seo-custom-domain) for a production-ready portfolio. Style it with [Tailwind CSS 4](/blog/tailwind-css-4-guide-2026) and manage your code with [Git and GitHub](/blog/git-github-beginners-guide-2026). Boost your productivity with the [best VS Code extensions](/blog/best-vscode-extensions-2026-web-developers) and consider using [TypeScript](/blog/typescript-for-beginners-2026-complete-guide) for type safety.\n\n## Frequently Asked Questions`],
];

async function main() {
  console.log("Adding cross-links for Batch 5...\n");
  let success = 0;
  let failed = 0;

  for (const [postId, search, replace] of links) {
    const rows = await sql`SELECT content FROM posts WHERE id = ${postId}`;
    if (!rows.length) { console.log(`  ⚠️ Post ${postId} not found`); failed++; continue; }

    const content = rows[0].content;
    if (!content.includes(search)) {
      console.log(`  ⚠️ Post ${postId}: search text not found - "${search.slice(0, 40)}..."`);
      failed++;
      continue;
    }

    // Avoid duplicate links
    if (content.includes("## Related Guides") || content.includes("## Keep Learning") || content.includes("## Next Steps") || content.includes("## Keep Building") || content.includes("## Related Resources") || content.includes("## Put Git to Work") || content.includes("## Show Your Skills") || content.includes("## Tools for Speed") || content.includes("## Build Something With These APIs") || content.includes("## Essential Skills for Your Portfolio") || content.includes("## What to Build Next")) {
      console.log(`  ⏭️ Post ${postId}: cross-links already exist, skipping`);
      continue;
    }

    const updated = content.replace(search, replace);
    await sql`UPDATE posts SET content = ${updated} WHERE id = ${postId}`;
    console.log(`  ✅ Post ${postId}: cross-links added`);
    success++;
  }

  console.log(`\nDone! ${success} updated, ${failed} failed`);
}

main().catch(console.error);
