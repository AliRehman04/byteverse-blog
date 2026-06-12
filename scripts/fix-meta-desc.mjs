import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf8');
const dbUrl = envContent.match(/DATABASE_URL=(.+)/)?.[1]?.trim();
const sql = neon(dbUrl);

// Optimized meta descriptions: 120-155 chars, with CTA and keywords
const descFixes = [
  { slug: '10-best-free-ai-tools-in-2026-that-will-blow-your-mind',
    excerpt: 'Discover 10 free AI tools in 2026 for writing, coding, design, and productivity. All tested with real-world use cases.' },
  { slug: '50-blog-post-ideas-for-new-bloggers-in-2026',
    excerpt: '50 proven blog post ideas for new bloggers in 2026. Covers trending niches, evergreen topics, and traffic-friendly formats.' },
  { slug: 'affiliate-marketing-for-beginners-2026',
    excerpt: 'Start affiliate marketing in 2026 with this beginner guide. Learn to pick niches, join programs, and earn your first commission.' },
  { slug: 'apify-review-web-scraping-ai-platform-2026',
    excerpt: 'Honest Apify review 2026: web scraping, AI actors, pricing, and real results. Is it worth it for developers and marketers?' },
  { slug: 'best-ai-agent-builders-2026',
    excerpt: 'Compare 7 best AI agent builders in 2026. No-code platforms to build autonomous AI agents for business and automation.' },
  { slug: 'best-ai-code-editors-2026',
    excerpt: 'Compare Cursor, GitHub Copilot, Windsurf, and more. Find the best AI code editor for your workflow in 2026.' },
  { slug: 'best-ai-customer-service-chatbots-2026',
    excerpt: '7 best AI customer service chatbots in 2026. Automate support tickets, reduce costs, and improve response times.' },
  { slug: 'best-ai-sales-tools-2026',
    excerpt: '9 best AI sales tools in 2026 for lead gen, outreach, and CRM automation. Tested tools to close more deals faster.' },
  { slug: 'best-ai-seo-tools-2026',
    excerpt: 'Best AI SEO tools in 2026 for keyword research, content optimization, and rank tracking. Tested and compared.' },
  { slug: 'best-laptops-for-coding-2026-developers',
    excerpt: 'Best laptops for coding in 2026 at every budget. Compared by performance, battery life, and developer experience.' },
  { slug: 'best-remote-job-boards-developers-2026',
    excerpt: '15 best remote job boards for developers in 2026. Find high-paying remote dev jobs on curated, legit platforms.' },
  { slug: 'best-vibe-coding-tools-2026',
    excerpt: '7 best vibe coding tools in 2026 to build apps with AI prompts. No-code and low-code platforms compared and ranked.' },
  { slug: 'check-if-email-hacked-2026',
    excerpt: 'Check if your email has been hacked in 2026. Free tools, warning signs, and step-by-step recovery instructions.' },
  { slug: 'docker-for-beginners-2026-guide',
    excerpt: 'Docker for beginners 2026: learn containers, images, Docker Compose, and deployment step by step. Complete hands-on guide.' },
  { slug: 'how-to-get-traffic-to-a-new-blog-2026',
    excerpt: '10 proven steps to get traffic to a new blog in 2026. SEO, social media, and content strategies that actually work.' },
  { slug: 'linkedin-for-developers-2026',
    excerpt: 'Optimize your LinkedIn profile as a developer in 2026. Get more recruiter calls, connections, and job opportunities.' },
  { slug: 'linux-wsl-setup-guide-2026-windows-developers',
    excerpt: 'Set up Linux and WSL on Windows in 2026. Complete guide for developers to run Ubuntu, install tools, and code faster.' },
  { slug: 'low-competition-keywords-for-new-blogs-2026',
    excerpt: '15 low competition keywords for new blogs in 2026. Easy-to-rank topics with real search volume for quick traffic.' },
  { slug: 'seo-meta-tags-generator-guide-2026',
    excerpt: 'SEO meta tags guide 2026: write perfect title tags and meta descriptions. Free generator tool and best practices.' },
  { slug: 'vibe-coding-guide-2026',
    excerpt: 'Vibe coding guide 2026: build full apps using AI prompts. Learn the new coding paradigm with practical examples.' },
  { slug: 'what-is-claude-code-guide-2026',
    excerpt: 'What is Claude Code? Complete guide to Anthropic\'s AI coding tool in 2026. Features, pricing, and real usage examples.' },
];

// Validate lengths
for (const fix of descFixes) {
  if (fix.excerpt.length > 160) {
    console.log(`⚠️  STILL TOO LONG: ${fix.slug} (${fix.excerpt.length} chars)`);
  }
  if (fix.excerpt.length < 120) {
    console.log(`⚠️  TOO SHORT: ${fix.slug} (${fix.excerpt.length} chars)`);
  }
}

let updated = 0;
for (const { slug, excerpt } of descFixes) {
  await sql`UPDATE posts SET excerpt = ${excerpt} WHERE slug = ${slug}`;
  updated++;
  console.log(`✅ ${slug} (${excerpt.length} chars)`);
}

console.log(`\n✅ Fixed ${updated} meta descriptions`);
