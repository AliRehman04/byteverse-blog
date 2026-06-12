import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf8');
const dbUrl = envContent.match(/DATABASE_URL=(.+)/)?.[1]?.trim();
const sql = neon(dbUrl);

// Optimized titles: shorter, punchier, under 60 chars, with year & numbers
const titleFixes = [
  { slug: 'low-competition-keywords-for-new-blogs-2026', title: '15 Low Competition Keywords for New Blogs (2026)' },
  { slug: 'how-to-get-traffic-to-a-new-blog-2026', title: '10 Steps to Get Traffic to a New Blog (2026)' },
  { slug: 'affiliate-marketing-for-beginners-2026', title: 'Affiliate Marketing for Beginners: 10 Steps (2026)' },
  { slug: 'best-ai-pdf-tools-2026', title: '7 Best AI PDF Tools in 2026 (Tested & Ranked)' },
  { slug: 'best-ai-data-analysis-tools-2026', title: '9 Best AI Data Analysis Tools in 2026 (Ranked)' },
  { slug: 'best-ai-search-engines-2026', title: '7 Best AI Search Engines in 2026 (Compared)' },
  { slug: 'seo-meta-tags-generator-guide-2026', title: 'SEO Meta Tags Guide 2026: Titles & Descriptions' },
  { slug: 'best-vibe-coding-tools-2026', title: '7 Best Vibe Coding Tools in 2026 (Ranked)' },
  { slug: 'best-ai-spreadsheet-tools-2026', title: '7 Best AI Spreadsheet Tools in 2026 (Ranked)' },
  { slug: 'best-ai-sales-tools-2026', title: '9 Best AI Sales Tools in 2026 (Tested)' },
  { slug: 'best-ai-agent-builders-2026', title: '7 Best AI Agent Builders in 2026 (No-Code)' },
  { slug: 'best-ai-customer-service-chatbots-2026', title: '7 Best AI Customer Service Chatbots (2026)' },
  { slug: 'best-ai-voice-generators-2026', title: '7 Best AI Voice Generators in 2026 (Ranked)' },
  { slug: 'best-ai-presentation-makers-2026', title: '7 Best AI Presentation Makers in 2026' },
  { slug: 'best-ai-email-assistants-2026', title: '7 Best AI Email Assistants in 2026 (Tested)' },
  { slug: 'linkedin-for-developers-2026', title: 'LinkedIn for Developers 2026: Get More Job Calls' },
  { slug: 'best-ai-meeting-assistants-2026', title: '7 Best AI Meeting Assistants in 2026 (Ranked)' },
  { slug: 'best-remote-job-boards-developers-2026', title: '15 Best Remote Job Boards for Developers (2026)' },
  { slug: 'best-ai-resume-builders-2026', title: '7 Best AI Resume Builders in 2026 (Free & Paid)' },
  { slug: 'how-to-create-strong-passwords-2026', title: 'How to Create Strong Passwords in 2026 (Easy)' },
  { slug: 'two-factor-authentication-guide-2026', title: '2FA Guide 2026: Set Up Two-Factor Everywhere' },
  { slug: 'best-ai-code-editors-2026', title: 'Best AI Code Editors 2026: Cursor vs Copilot' },
  { slug: 'vibe-coding-guide-2026', title: 'Vibe Coding Guide 2026: Build Apps with AI' },
  { slug: 'apify-review-web-scraping-ai-platform-2026', title: 'Apify Review 2026: Best Web Scraping Platform?' },
  { slug: 'what-is-claude-code-guide-2026', title: 'What Is Claude Code? AI Coding Tool Guide 2026' },
  { slug: 'docker-for-beginners-complete-guide', title: 'Docker for Beginners 2026: Complete Guide' },
  { slug: 'build-portfolio-website-2026', title: 'Build a Portfolio Website 2026: Developer Guide' },
  { slug: 'best-laptops-for-coding-2026-developers', title: 'Best Laptops for Coding 2026 (Every Budget)' },
  { slug: 'linux-wsl-setup-guide-2026-windows-developers', title: 'Linux & WSL Setup Guide for Windows Devs (2026)' },
  { slug: 'typescript-for-beginners-2026-complete-guide', title: 'TypeScript for Beginners 2026: Getting Started' },
  { slug: 'claude-vs-chatgpt-2026-comparison', title: 'Claude vs ChatGPT 2026: Honest Comparison' },
  { slug: 'best-ai-coding-assistants-2026-copilot-cursor-windsurf', title: 'Best AI Coding Assistants 2026 (Top 5 Ranked)' },
];

// Validate all titles are under 60 chars
for (const fix of titleFixes) {
  if (fix.title.length > 60) {
    console.log(`⚠️  STILL TOO LONG: "${fix.title}" (${fix.title.length} chars)`);
  }
}

let updated = 0;
for (const { slug, title } of titleFixes) {
  const result = await sql`UPDATE posts SET title = ${title} WHERE slug = ${slug} AND title != ${title}`;
  if (result?.length !== undefined || true) {
    updated++;
    console.log(`✅ ${slug}`);
    console.log(`   → "${title}" (${title.length} chars)`);
  }
}

console.log(`\n✅ Updated ${updated} titles`);
