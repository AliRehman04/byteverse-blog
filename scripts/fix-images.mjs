import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const imageUrl = (id, width = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;

// Unique images for each post - all verified working Unsplash IDs
const updates = [
  // Posts 1-3 have NO cover image - add them
  { id: 1, slug: "10-best-free-ai-tools-in-2026", image: "1677442135703-1787eea5ce01" }, // AI robot hand
  { id: 2, slug: "nextjs-16-deployment-guide", image: "1461749280684-dccba630e2f6" }, // Code on screen
  { id: 3, slug: "ai-productivity-workflow", image: "1483058712412-4245e9b90334" }, // Clean workspace desk
  
  // Fix duplicates - assign unique images
  // 1555066931-4365d14bab8c was used 3 times (posts 4, 18, 24)
  { id: 4, slug: "python-ai-agent-tutorial", image: "1526379095098-d400fd0bf935" }, // Python code
  { id: 18, slug: "copilot-vs-chatgpt-for-coding", image: "1587620962725-abab7fe55159" }, // Coding on laptop
  { id: 24, slug: "best-vscode-extensions", image: "1629654297299-c8506221ca97" }, // VS Code editor
  
  // 1551288049-bebda4e38f71 was used 2 times (posts 5, 17)
  { id: 5, slug: "best-ai-coding-assistants", image: "1605379399642-870262d3d051" }, // Developer workspace
  { id: 17, slug: "build-rag-chatbot", image: "1620712943543-bcc4688e7485" }, // AI robot
  
  // 1434030216411-0b793f4b4173 was used 2 times (posts 6, 13)
  { id: 6, slug: "best-ai-tools-for-students", image: "1523240795612-9a054b0db644" }, // Students studying
  { id: 13, slug: "time-blocking-for-students", image: "1506784983877-45594efa4cbe" }, // Calendar planner
  
  // 1556761175-b413da4baf72 was used 2 times (posts 7, 21)
  { id: 7, slug: "best-ai-tools-for-small-business", image: "1552664730-d307ca884978" }, // Business team
  { id: 21, slug: "how-to-make-money-with-ai", image: "1563986768609-322da13575f3" }, // Money/success
  
  // 1516321318423-f06f85e504b3 was used 2 times (posts 8, 23)
  { id: 8, slug: "best-chatgpt-alternatives", image: "1531297484001-80022131f5a1" }, // AI tech
  { id: 23, slug: "best-chatgpt-prompts", image: "1499750310107-5fef28a66643" }, // Laptop workspace
  
  // 1517694712202-14dd9538aa97 was used 2 times (posts 15, 25)
  { id: 15, slug: "javascript-roadmap", image: "1627398242454-45a1465c2479" }, // JavaScript code
  { id: 25, slug: "how-to-learn-programming", image: "1515879218367-8466d910aaa4" }, // Learning to code
  
  // 1557804506-669a67965ba0 was used 2 times (posts 19, 22)
  { id: 19, slug: "canva-ai-vs-adobe-express", image: "1561070791-2526d30994b5" }, // Design tools
  { id: 22, slug: "best-ai-image-generators", image: "1633356122102-3fe601e05bd2" }, // AI art
];

async function main() {
  console.log("Updating cover images...\n");
  
  for (const update of updates) {
    const coverUrl = imageUrl(update.image);
    
    await sql`
      UPDATE posts 
      SET cover_image = ${coverUrl}, updated_at = now()
      WHERE id = ${update.id}
    `;
    
    console.log(`✓ Updated post ${update.id}: ${update.slug}`);
    console.log(`  New image: ${update.image}\n`);
  }
  
  console.log(`\nDone! Updated ${updates.length} posts with unique images.`);
}

main().catch(console.error);
