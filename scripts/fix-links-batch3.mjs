import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

// Add internal links FROM existing posts TO new batch 3 posts
const linkUpdates = [
  // Link TO Git/GitHub guide (post 34) from coding posts
  {
    id: 15, // JavaScript Roadmap
    find: "Next, read [React 19 Best Practices 2026](/blog/react-19-best-practices-2026-faster-apps)",
    replace: "Next, read [Git and GitHub Beginners Guide 2026](/blog/git-github-beginners-guide-2026), [React 19 Best Practices 2026](/blog/react-19-best-practices-2026-faster-apps)",
  },
  {
    id: 25, // How to Learn Programming
    find: "Next, read [JavaScript Roadmap 2026](/blog/javascript-roadmap-2026-beginner-job-ready)",
    replace: "Next, read [Git and GitHub Beginners Guide 2026](/blog/git-github-beginners-guide-2026), [JavaScript Roadmap 2026](/blog/javascript-roadmap-2026-beginner-job-ready)",
  },
  {
    id: 24, // VS Code Extensions
    find: "Next, read [JavaScript Roadmap 2026](/blog/javascript-roadmap-2026-beginner-job-ready)",
    replace: "Next, read [Git and GitHub Beginners Guide 2026](/blog/git-github-beginners-guide-2026), [JavaScript Roadmap 2026](/blog/javascript-roadmap-2026-beginner-job-ready)",
  },

  // Link TO AI Video Generators (post 35) from AI posts
  {
    id: 22, // AI Image Generators
    find: "Next, read [Canva AI vs Adobe Express 2026](/blog/canva-ai-vs-adobe-express-2026)",
    replace: "Next, read [Best AI Video Generators 2026](/blog/best-ai-video-generators-2026), [Canva AI vs Adobe Express 2026](/blog/canva-ai-vs-adobe-express-2026)",
  },
  {
    id: 1, // 10 Best Free AI Tools
    find: "## Frequently Asked Questions",
    replace: "Also check out [Best AI Video Generators 2026](/blog/best-ai-video-generators-2026) for the latest in AI video creation.\n\n## Frequently Asked Questions",
  },
  {
    id: 21, // Make Money with AI
    find: "Next, read [Best AI Tools for Small Business 2026](/blog/best-ai-tools-for-small-business-2026)",
    replace: "Next, read [Best AI Video Generators 2026](/blog/best-ai-video-generators-2026), [Best AI Tools for Small Business 2026](/blog/best-ai-tools-for-small-business-2026)",
  },

  // Link TO Docker guide (post 36) from tech posts
  {
    id: 2, // Next.js Deployment
    find: "## Frequently Asked Questions",
    replace: "For containerized deployments, see our [Docker for Beginners 2026 Guide](/blog/docker-for-beginners-2026-guide).\n\n## Frequently Asked Questions",
  },
  {
    id: 17, // RAG Chatbot
    find: "Next, read [Python AI Agent Tutorial 2026](/blog/python-ai-agent-tutorial-2026-langgraph-rag-tools)",
    replace: "Next, read [Docker for Beginners 2026](/blog/docker-for-beginners-2026-guide), [Python AI Agent Tutorial 2026](/blog/python-ai-agent-tutorial-2026-langgraph-rag-tools)",
  },
];

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");
  let updated = 0;

  for (const upd of linkUpdates) {
    // Fetch current content
    const rows = await sql.query("SELECT content FROM posts WHERE id = $1", [upd.id]);
    if (!rows.length) { console.log(`⚠️ Post ${upd.id} not found`); continue; }

    const oldContent = rows[0].content;
    if (!oldContent.includes(upd.find)) {
      console.log(`⚠️ [${upd.id}] Pattern not found, skipping`);
      continue;
    }

    const newContent = oldContent.replace(upd.find, upd.replace);
    await sql.query("UPDATE posts SET content = $1, updated_at = NOW() WHERE id = $2", [newContent, upd.id]);
    console.log(`✅ [${upd.id}] Added internal link`);
    updated++;
  }

  console.log(`\nDone! Updated ${updated} posts with cross-links.`);
}

main().catch(e => { console.error(e); process.exit(1); });
