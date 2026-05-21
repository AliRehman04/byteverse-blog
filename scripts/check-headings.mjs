import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const slugs = [
  "javascript-roadmap-2026-beginner-job-ready",
  "react-19-best-practices-2026-faster-apps",
  "docker-for-beginners-2026-guide",
  "git-github-beginners-guide-2026",
  "best-ai-coding-assistants-2026-copilot-cursor-windsurf",
  "best-vscode-extensions-2026-web-developers",
  "how-to-learn-programming-2026-beginner-roadmap",
];

for (const s of slugs) {
  const rows = await sql.query("SELECT content FROM posts WHERE slug = $1", [s]);
  if (rows.length) {
    const headings = rows[0].content.match(/^## .+$/gm);
    console.log(`=== ${s} ===`);
    if (headings) console.log(headings.join(" | "));
    else console.log("(no h2 headings found)");
    console.log();
  }
}
