import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const dbUrl = env.match(/DATABASE_URL=(.+)/)[1].trim();
const sql = neon(dbUrl);

// For each post with <5 internal links, add a "Related Articles" section
// with contextually relevant posts

const RELATED_MAP = {
  "apify-review-web-scraping-ai-platform-2026": [
    ["Best AI Data Analysis Tools", "/blog/best-ai-data-analysis-tools-2026"],
    ["Best AI Tools for Small Business", "/blog/best-ai-tools-for-small-business-2026"],
    ["Best Free APIs for Developers", "/blog/best-free-apis-for-developers-2026"],
    ["Best AI Agent Builders", "/blog/best-ai-agent-builders-2026"],
    ["How to Make Money with AI", "/blog/how-to-make-money-with-ai-2026"],
  ],
  "best-ai-apps-for-iphone-2026": [
    ["Best AI Writing Tools", "/blog/best-ai-writing-tools-2026"],
    ["Best ChatGPT Alternatives", "/blog/best-chatgpt-alternatives-2026-free-paid"],
    ["Best AI Image Generators", "/blog/best-ai-image-generators-2026-free-paid"],
    ["Best AI Voice Generators", "/blog/best-ai-voice-generators-2026"],
    ["Best AI Tools for Students", "/blog/best-ai-tools-for-students-2026-free-study-apps"],
  ],
  "best-ai-code-editors-2026": [
    ["GitHub Copilot Complete Guide", "/blog/github-copilot-guide-2026"],
    ["How to Use Cursor AI", "/blog/how-to-use-cursor-ai-2026-guide"],
    ["Vibe Coding Guide", "/blog/vibe-coding-guide-2026"],
    ["Best VS Code Extensions", "/blog/best-vscode-extensions-2026"],
    ["What Is Claude Code", "/blog/what-is-claude-code-guide-2026"],
  ],
  "best-ai-email-assistants-2026": [
    ["Best AI Productivity Apps for Freelancers", "/blog/best-ai-productivity-apps-for-freelancers-2026"],
    ["Best AI Writing Tools", "/blog/best-ai-writing-tools-2026"],
    ["Best AI Meeting Assistants", "/blog/best-ai-meeting-assistants-2026"],
    ["Best ChatGPT Prompts for Work", "/blog/best-chatgpt-prompts-for-work-2026"],
    ["Best AI Sales Tools", "/blog/best-ai-sales-tools-2026"],
  ],
  "best-ai-logo-generators-2026": [
    ["Best AI Image Generators", "/blog/best-ai-image-generators-2026-free-paid"],
    ["Best AI Website Builders", "/blog/best-ai-website-builders-2026"],
    ["Canva AI vs Adobe Express", "/blog/canva-ai-vs-adobe-express-2026"],
    ["Build a Portfolio Website", "/blog/build-portfolio-website-2026"],
    ["Best AI Tools for Small Business", "/blog/best-ai-tools-for-small-business-2026"],
  ],
  "best-ai-meeting-assistants-2026": [
    ["Best AI Email Assistants", "/blog/best-ai-email-assistants-2026"],
    ["AI Productivity Workflow Guide", "/blog/ai-productivity-workflow-2026-time-blocking-automation"],
    ["Best AI Tools for Small Business", "/blog/best-ai-tools-for-small-business-2026"],
    ["Best ChatGPT Prompts for Work", "/blog/best-chatgpt-prompts-for-work-2026"],
    ["Best AI Sales Tools", "/blog/best-ai-sales-tools-2026"],
  ],
  "best-ai-presentation-makers-2026": [
    ["Best AI Image Generators", "/blog/best-ai-image-generators-2026-free-paid"],
    ["Best AI Video Generators", "/blog/best-ai-video-generators-2026"],
    ["Canva AI vs Adobe Express", "/blog/canva-ai-vs-adobe-express-2026"],
    ["Best AI Writing Tools", "/blog/best-ai-writing-tools-2026"],
    ["Best AI Data Analysis Tools", "/blog/best-ai-data-analysis-tools-2026"],
  ],
  "best-ai-productivity-apps-for-freelancers-2026": [
    ["How to Start Freelancing as a Developer", "/blog/how-to-start-freelancing-developer-2026"],
    ["Best AI Email Assistants", "/blog/best-ai-email-assistants-2026"],
    ["Best AI Meeting Assistants", "/blog/best-ai-meeting-assistants-2026"],
    ["Best Remote Job Boards", "/blog/best-remote-job-boards-developers-2026"],
    ["Best ChatGPT Prompts for Work", "/blog/best-chatgpt-prompts-for-work-2026"],
  ],
  "best-ai-resume-builders-2026": [
    ["LinkedIn for Developers", "/blog/linkedin-for-developers-2026"],
    ["Best Remote Job Boards", "/blog/best-remote-job-boards-developers-2026"],
    ["How to Start Freelancing", "/blog/how-to-start-freelancing-developer-2026"],
    ["Build a Portfolio Website", "/blog/build-portfolio-website-2026"],
    ["Best AI Writing Tools", "/blog/best-ai-writing-tools-2026"],
  ],
  "best-ai-tools-for-small-business-2026": [
    ["Best AI Sales Tools", "/blog/best-ai-sales-tools-2026"],
    ["Best AI Customer Service Chatbots", "/blog/best-ai-customer-service-chatbots-2026"],
    ["Best AI Email Assistants", "/blog/best-ai-email-assistants-2026"],
    ["Best AI Website Builders", "/blog/best-ai-website-builders-2026"],
    ["How to Make Money with AI", "/blog/how-to-make-money-with-ai-2026"],
  ],
  "best-ai-video-generators-2026": [
    ["Best AI Image Generators", "/blog/best-ai-image-generators-2026-free-paid"],
    ["Best AI Voice Generators", "/blog/best-ai-voice-generators-2026"],
    ["Best AI Presentation Makers", "/blog/best-ai-presentation-makers-2026"],
    ["Canva AI vs Adobe Express", "/blog/canva-ai-vs-adobe-express-2026"],
    ["How to Make Money with AI", "/blog/how-to-make-money-with-ai-2026"],
  ],
  "best-ai-voice-generators-2026": [
    ["Best AI Video Generators", "/blog/best-ai-video-generators-2026"],
    ["Best AI Writing Tools", "/blog/best-ai-writing-tools-2026"],
    ["Best AI Apps for iPhone", "/blog/best-ai-apps-for-iphone-2026"],
    ["Best AI Presentation Makers", "/blog/best-ai-presentation-makers-2026"],
    ["How to Make Money with AI", "/blog/how-to-make-money-with-ai-2026"],
  ],
  "best-ai-website-builders-2026": [
    ["Best AI Logo Generators", "/blog/best-ai-logo-generators-2026"],
    ["Best AI SEO Tools", "/blog/best-ai-seo-tools-2026"],
    ["Build a Portfolio Website", "/blog/build-portfolio-website-2026"],
    ["Best Free Hosting Platforms", "/blog/best-free-hosting-platforms-2026"],
    ["Best AI Image Generators", "/blog/best-ai-image-generators-2026-free-paid"],
  ],
  "best-chatgpt-alternatives-2026-free-paid": [
    ["Claude vs ChatGPT Comparison", "/blog/claude-vs-chatgpt-2026-comparison"],
    ["Best AI Search Engines", "/blog/best-ai-search-engines-2026"],
    ["Perplexity vs Google Gemini", "/blog/perplexity-vs-google-gemini-2026-research"],
    ["Best ChatGPT Prompts for Work", "/blog/best-chatgpt-prompts-for-work-2026"],
    ["Best AI Apps for iPhone", "/blog/best-ai-apps-for-iphone-2026"],
  ],
  "best-chatgpt-prompts-for-work-2026": [
    ["Best AI Email Assistants", "/blog/best-ai-email-assistants-2026"],
    ["Best AI Writing Tools", "/blog/best-ai-writing-tools-2026"],
    ["ChatGPT Alternatives", "/blog/best-chatgpt-alternatives-2026-free-paid"],
    ["Claude vs ChatGPT", "/blog/claude-vs-chatgpt-2026-comparison"],
    ["AI Productivity Workflow", "/blog/ai-productivity-workflow-2026-time-blocking-automation"],
  ],
  "best-chrome-extensions-developers-2026": [
    ["Best VS Code Extensions", "/blog/best-vscode-extensions-2026"],
    ["Best AI Coding Assistants", "/blog/best-ai-coding-assistants-2026-copilot-cursor-windsurf"],
    ["Best Free APIs for Developers", "/blog/best-free-apis-for-developers-2026"],
    ["Best AI Code Editors", "/blog/best-ai-code-editors-2026"],
    ["Best Password Managers", "/blog/best-password-managers-2026"],
  ],
  "best-free-apis-for-developers-2026": [
    ["JavaScript Roadmap for Beginners", "/blog/javascript-roadmap-2026-beginner-job-ready"],
    ["Build a Portfolio Website", "/blog/build-portfolio-website-2026"],
    ["Docker for Beginners", "/blog/docker-for-beginners-2026-guide"],
    ["Git and GitHub Guide", "/blog/git-github-beginners-guide-2026"],
    ["Best Free Hosting Platforms", "/blog/best-free-hosting-platforms-2026"],
  ],
  "best-free-hosting-platforms-2026": [
    ["Build a Portfolio Website", "/blog/build-portfolio-website-2026"],
    ["Next.js Deployment Guide", "/blog/nextjs-16-deployment-guide-2026-vercel-seo-custom-domain"],
    ["Docker for Beginners", "/blog/docker-for-beginners-2026-guide"],
    ["Best AI Website Builders", "/blog/best-ai-website-builders-2026"],
    ["Website Speed Optimization", "/blog/website-speed-optimization-checklist-2026-core-web-vitals"],
  ],
  "best-free-vpn-2026": [
    ["Online Security Checklist", "/blog/online-security-checklist-2026-passkeys-2fa"],
    ["Best Password Managers", "/blog/best-password-managers-2026"],
    ["Two-Factor Authentication Guide", "/blog/two-factor-authentication-guide-2026"],
    ["Check If Your Email Was Hacked", "/blog/check-if-email-hacked-2026"],
    ["How to Create Strong Passwords", "/blog/how-to-create-strong-passwords-2026"],
  ],
  "best-laptops-for-coding-2026-developers": [
    ["Best VS Code Extensions", "/blog/best-vscode-extensions-2026"],
    ["Best AI Code Editors", "/blog/best-ai-code-editors-2026"],
    ["Linux WSL Setup Guide", "/blog/linux-wsl-setup-guide-2026-windows-developers"],
    ["How to Learn Programming", "/blog/how-to-learn-programming-2026-beginner-roadmap"],
    ["Build a Portfolio Website", "/blog/build-portfolio-website-2026"],
  ],
  "best-remote-job-boards-developers-2026": [
    ["How to Start Freelancing", "/blog/how-to-start-freelancing-developer-2026"],
    ["LinkedIn for Developers", "/blog/linkedin-for-developers-2026"],
    ["Build a Portfolio Website", "/blog/build-portfolio-website-2026"],
    ["Best AI Resume Builders", "/blog/best-ai-resume-builders-2026"],
    ["How to Learn Programming", "/blog/how-to-learn-programming-2026-beginner-roadmap"],
  ],
  "canva-ai-vs-adobe-express-2026": [
    ["Best AI Image Generators", "/blog/best-ai-image-generators-2026-free-paid"],
    ["Best AI Logo Generators", "/blog/best-ai-logo-generators-2026"],
    ["Best AI Video Generators", "/blog/best-ai-video-generators-2026"],
    ["Best AI Presentation Makers", "/blog/best-ai-presentation-makers-2026"],
    ["Build a Portfolio Website", "/blog/build-portfolio-website-2026"],
  ],
  "check-if-email-hacked-2026": [
    ["Best Password Managers", "/blog/best-password-managers-2026"],
    ["Two-Factor Authentication Guide", "/blog/two-factor-authentication-guide-2026"],
    ["How to Create Strong Passwords", "/blog/how-to-create-strong-passwords-2026"],
    ["Online Security Checklist", "/blog/online-security-checklist-2026-passkeys-2fa"],
    ["Best Free VPN", "/blog/best-free-vpn-2026"],
  ],
  "claude-vs-chatgpt-2026-comparison": [
    ["Best ChatGPT Alternatives", "/blog/best-chatgpt-alternatives-2026-free-paid"],
    ["Perplexity vs Google Gemini", "/blog/perplexity-vs-google-gemini-2026-research"],
    ["Copilot vs ChatGPT for Coding", "/blog/copilot-vs-chatgpt-for-coding-2026"],
    ["What Is Claude Code", "/blog/what-is-claude-code-guide-2026"],
    ["Best AI Search Engines", "/blog/best-ai-search-engines-2026"],
  ],
  "docker-for-beginners-complete-guide": [
    ["Docker for Beginners 2026", "/blog/docker-for-beginners-2026-guide"],
    ["Linux WSL Setup Guide", "/blog/linux-wsl-setup-guide-2026-windows-developers"],
    ["Git and GitHub Guide", "/blog/git-github-beginners-guide-2026"],
    ["Best Free Hosting Platforms", "/blog/best-free-hosting-platforms-2026"],
    ["Best VS Code Extensions", "/blog/best-vscode-extensions-2026"],
  ],
  "github-copilot-guide-2026": [
    ["Best AI Code Editors", "/blog/best-ai-code-editors-2026"],
    ["How to Use Cursor AI", "/blog/how-to-use-cursor-ai-2026-guide"],
    ["What Is Claude Code", "/blog/what-is-claude-code-guide-2026"],
    ["Vibe Coding Guide", "/blog/vibe-coding-guide-2026"],
    ["Copilot vs ChatGPT for Coding", "/blog/copilot-vs-chatgpt-for-coding-2026"],
  ],
  "how-to-build-portfolio-website-2026": [
    ["Build a Portfolio Website", "/blog/build-portfolio-website-2026"],
    ["Best Free Hosting Platforms", "/blog/best-free-hosting-platforms-2026"],
    ["Best AI Website Builders", "/blog/best-ai-website-builders-2026"],
    ["How to Start Freelancing", "/blog/how-to-start-freelancing-developer-2026"],
    ["LinkedIn for Developers", "/blog/linkedin-for-developers-2026"],
  ],
  "how-to-create-strong-passwords-2026": [
    ["Best Password Managers", "/blog/best-password-managers-2026"],
    ["Two-Factor Authentication Guide", "/blog/two-factor-authentication-guide-2026"],
    ["Check If Your Email Was Hacked", "/blog/check-if-email-hacked-2026"],
    ["Online Security Checklist", "/blog/online-security-checklist-2026-passkeys-2fa"],
    ["Best Free VPN", "/blog/best-free-vpn-2026"],
  ],
  "how-to-start-freelancing-developer-2026": [
    ["Build a Portfolio Website", "/blog/build-portfolio-website-2026"],
    ["Best Remote Job Boards", "/blog/best-remote-job-boards-developers-2026"],
    ["LinkedIn for Developers", "/blog/linkedin-for-developers-2026"],
    ["Best AI Resume Builders", "/blog/best-ai-resume-builders-2026"],
    ["Best AI Productivity Apps for Freelancers", "/blog/best-ai-productivity-apps-for-freelancers-2026"],
  ],
  "linux-wsl-setup-guide-2026-windows-developers": [
    ["Docker for Beginners", "/blog/docker-for-beginners-2026-guide"],
    ["Best VS Code Extensions", "/blog/best-vscode-extensions-2026"],
    ["Git and GitHub Guide", "/blog/git-github-beginners-guide-2026"],
    ["Best Laptops for Coding", "/blog/best-laptops-for-coding-2026-developers"],
    ["How to Learn Programming", "/blog/how-to-learn-programming-2026-beginner-roadmap"],
  ],
  "notion-vs-obsidian-vs-apple-notes-2026": [
    ["AI Productivity Workflow", "/blog/ai-productivity-workflow-2026-time-blocking-automation"],
    ["Best AI Writing Tools", "/blog/best-ai-writing-tools-2026"],
    ["Time Blocking for Students", "/blog/time-blocking-for-students-2026-ai-study-planner"],
    ["Best AI Tools for Students", "/blog/best-ai-tools-for-students-2026-free-study-apps"],
    ["Best ChatGPT Prompts for Work", "/blog/best-chatgpt-prompts-for-work-2026"],
  ],
  "perplexity-vs-google-gemini-2026-research": [
    ["Best AI Search Engines", "/blog/best-ai-search-engines-2026"],
    ["Best ChatGPT Alternatives", "/blog/best-chatgpt-alternatives-2026-free-paid"],
    ["Claude vs ChatGPT", "/blog/claude-vs-chatgpt-2026-comparison"],
    ["Best AI Tools for Students", "/blog/best-ai-tools-for-students-2026-free-study-apps"],
    ["Best AI Data Analysis Tools", "/blog/best-ai-data-analysis-tools-2026"],
  ],
  "tailwind-css-4-guide-2026": [
    ["React 19 Best Practices", "/blog/react-19-best-practices-2026-faster-apps"],
    ["Next.js Deployment Guide", "/blog/nextjs-16-deployment-guide-2026-vercel-seo-custom-domain"],
    ["Best VS Code Extensions for Web Developers", "/blog/best-vscode-extensions-2026-web-developers"],
    ["Build a Portfolio Website", "/blog/build-portfolio-website-2026"],
    ["Website Speed Optimization", "/blog/website-speed-optimization-checklist-2026-core-web-vitals"],
  ],
  "time-blocking-for-students-2026-ai-study-planner": [
    ["Best AI Tools for Students", "/blog/best-ai-tools-for-students-2026-free-study-apps"],
    ["AI Productivity Workflow", "/blog/ai-productivity-workflow-2026-time-blocking-automation"],
    ["Notion vs Obsidian vs Apple Notes", "/blog/notion-vs-obsidian-vs-apple-notes-2026"],
    ["Best ChatGPT Prompts for Work", "/blog/best-chatgpt-prompts-for-work-2026"],
    ["How to Learn Programming", "/blog/how-to-learn-programming-2026-beginner-roadmap"],
  ],
  "top-programming-languages-2026": [
    ["JavaScript Roadmap for Beginners", "/blog/javascript-roadmap-2026-beginner-job-ready"],
    ["TypeScript for Beginners", "/blog/typescript-for-beginners-2026-complete-guide"],
    ["How to Learn Programming", "/blog/how-to-learn-programming-2026-beginner-roadmap"],
    ["Best Remote Job Boards", "/blog/best-remote-job-boards-developers-2026"],
    ["Best AI Coding Assistants", "/blog/best-ai-coding-assistants-2026-copilot-cursor-windsurf"],
  ],
  "two-factor-authentication-guide-2026": [
    ["Best Password Managers", "/blog/best-password-managers-2026"],
    ["How to Create Strong Passwords", "/blog/how-to-create-strong-passwords-2026"],
    ["Check If Your Email Was Hacked", "/blog/check-if-email-hacked-2026"],
    ["Online Security Checklist", "/blog/online-security-checklist-2026-passkeys-2fa"],
    ["Best Free VPN", "/blog/best-free-vpn-2026"],
  ],
  "what-is-claude-code-guide-2026": [
    ["Best AI Code Editors", "/blog/best-ai-code-editors-2026"],
    ["GitHub Copilot Guide", "/blog/github-copilot-guide-2026"],
    ["How to Use Cursor AI", "/blog/how-to-use-cursor-ai-2026-guide"],
    ["Vibe Coding Guide", "/blog/vibe-coding-guide-2026"],
    ["Best AI Coding Assistants", "/blog/best-ai-coding-assistants-2026-copilot-cursor-windsurf"],
  ],
};

async function main() {
  const allPosts = await sql`SELECT id, slug, content FROM posts WHERE published = true`;
  let totalUpdated = 0;
  let totalLinksAdded = 0;

  for (const post of allPosts) {
    const relatedLinks = RELATED_MAP[post.slug];
    if (!relatedLinks) continue;

    // Count existing internal links
    const existingInternalLinks = [...post.content.matchAll(/\[([^\]]*)\]\((\/[^)]+)\)/g)];
    if (existingInternalLinks.length >= 5) {
      console.log(`⏭️  ${post.slug}: already has ${existingInternalLinks.length} links`);
      continue;
    }

    // Get existing targets to avoid duplicates
    const existingTargets = new Set(existingInternalLinks.map(m => m[2]));
    
    // Filter out already-linked targets
    const newLinks = relatedLinks.filter(([_, target]) => !existingTargets.has(target));
    
    if (newLinks.length === 0) {
      console.log(`⏭️  ${post.slug}: all related links already present`);
      continue;
    }

    // Build the related articles section
    const relatedSection = `\n\n---\n\n## Keep Reading\n\nIf you found this helpful, check out these related guides:\n\n${newLinks.map(([title, target]) => `- [${title}](${target})`).join('\n')}\n`;

    // Append to content
    const newContent = post.content.trimEnd() + relatedSection;

    await sql`UPDATE posts SET content = ${newContent}, updated_at = NOW() WHERE id = ${post.id}`;
    console.log(`✅ ${post.slug}: +${newLinks.length} links (Keep Reading section)`);
    totalUpdated++;
    totalLinksAdded += newLinks.length;
  }

  console.log(`\n📊 Updated ${totalUpdated} posts, added ${totalLinksAdded} related links total`);
}

main().catch(console.error);
