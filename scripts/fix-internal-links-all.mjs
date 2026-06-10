import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const dbUrl = env.match(/DATABASE_URL=(.+)/)[1].trim();
const sql = neon(dbUrl);

// ── Topical link map: for each post, define related posts & tools to link ──
// Key phrases map to link targets. The script will find the FIRST unlinked occurrence
// of each phrase in the post's content and convert it to an internal link.
// It skips phrases that are already linked.

const LINK_MAP = {
  // ── AI Tools category ──
  "10-best-free-ai-tools-in-2026-that-will-blow-your-mind": {
    "AI writing tools": "/blog/best-ai-writing-tools-2026",
    "AI image generators": "/blog/best-ai-image-generators-2026-free-paid",
    "ChatGPT alternatives": "/blog/best-chatgpt-alternatives-2026-free-paid",
    "AI video generators": "/blog/best-ai-video-generators-2026",
    "AI productivity": "/blog/ai-productivity-workflow-2026-time-blocking-automation",
    "AI tools for students": "/blog/best-ai-tools-for-students-2026-free-study-apps",
    "small business": "/blog/best-ai-tools-for-small-business-2026",
    "make money with AI": "/blog/how-to-make-money-with-ai-2026",
    "Word Counter": "/tools/word-counter",
    "JSON Formatter": "/tools/json-formatter",
  },
  "best-ai-agent-builders-2026": {
    "AI tools for small business": "/blog/best-ai-tools-for-small-business-2026",
    "AI customer service chatbots": "/blog/best-ai-customer-service-chatbots-2026",
    "AI sales tools": "/blog/best-ai-sales-tools-2026",
    "AI email assistants": "/blog/best-ai-email-assistants-2026",
    "make money with AI": "/blog/how-to-make-money-with-ai-2026",
    "AI productivity": "/blog/ai-productivity-workflow-2026-time-blocking-automation",
    "AI data analysis": "/blog/best-ai-data-analysis-tools-2026",
    "AI spreadsheet": "/blog/best-ai-spreadsheet-tools-2026",
  },
  "best-ai-apps-for-iphone-2026": {
    "AI writing tools": "/blog/best-ai-writing-tools-2026",
    "ChatGPT alternatives": "/blog/best-chatgpt-alternatives-2026-free-paid",
    "AI image generators": "/blog/best-ai-image-generators-2026-free-paid",
    "AI voice generators": "/blog/best-ai-voice-generators-2026",
    "AI productivity": "/blog/ai-productivity-workflow-2026-time-blocking-automation",
    "AI tools for students": "/blog/best-ai-tools-for-students-2026-free-study-apps",
    "password manager": "/blog/best-password-managers-2026",
    "AI resume builders": "/blog/best-ai-resume-builders-2026",
  },
  "best-ai-code-editors-2026": {
    "GitHub Copilot": "/blog/github-copilot-guide-2026",
    "Cursor AI": "/blog/how-to-use-cursor-ai-2026-guide",
    "vibe coding": "/blog/vibe-coding-guide-2026",
    "AI coding assistants": "/blog/best-ai-coding-assistants-2026-copilot-cursor-windsurf",
    "VS Code extensions": "/blog/best-vscode-extensions-2026",
    "best laptops for coding": "/blog/best-laptops-for-coding-2026-developers",
    "Claude Code": "/blog/what-is-claude-code-guide-2026",
    "vibe coding tools": "/blog/best-vibe-coding-tools-2026",
    "Code Formatter": "/tools/code-formatter",
  },
  "best-ai-coding-assistants-2026-copilot-cursor-windsurf": {
    "AI code editors": "/blog/best-ai-code-editors-2026",
    "GitHub Copilot": "/blog/github-copilot-guide-2026",
    "Cursor AI": "/blog/how-to-use-cursor-ai-2026-guide",
    "vibe coding": "/blog/vibe-coding-guide-2026",
    "VS Code extensions": "/blog/best-vscode-extensions-2026",
    "Claude Code": "/blog/what-is-claude-code-guide-2026",
    "vibe coding tools": "/blog/best-vibe-coding-tools-2026",
    "Code Formatter": "/tools/code-formatter",
  },
  "best-ai-customer-service-chatbots-2026": {
    "AI sales tools": "/blog/best-ai-sales-tools-2026",
    "AI tools for small business": "/blog/best-ai-tools-for-small-business-2026",
    "AI email assistants": "/blog/best-ai-email-assistants-2026",
    "AI agent builders": "/blog/best-ai-agent-builders-2026",
    "AI data analysis": "/blog/best-ai-data-analysis-tools-2026",
    "ChatGPT prompts": "/blog/best-chatgpt-prompts-for-work-2026",
    "AI productivity": "/blog/ai-productivity-workflow-2026-time-blocking-automation",
  },
  "best-ai-data-analysis-tools-2026": {
    "AI spreadsheet tools": "/blog/best-ai-spreadsheet-tools-2026",
    "AI tools for small business": "/blog/best-ai-tools-for-small-business-2026",
    "AI presentation makers": "/blog/best-ai-presentation-makers-2026",
    "ChatGPT prompts": "/blog/best-chatgpt-prompts-for-work-2026",
    "AI productivity": "/blog/ai-productivity-workflow-2026-time-blocking-automation",
    "make money with AI": "/blog/how-to-make-money-with-ai-2026",
    "AI PDF tools": "/blog/best-ai-pdf-tools-2026",
  },
  "best-ai-email-assistants-2026": {
    "AI productivity apps": "/blog/best-ai-productivity-apps-for-freelancers-2026",
    "AI writing tools": "/blog/best-ai-writing-tools-2026",
    "ChatGPT prompts": "/blog/best-chatgpt-prompts-for-work-2026",
    "AI tools for small business": "/blog/best-ai-tools-for-small-business-2026",
    "AI sales tools": "/blog/best-ai-sales-tools-2026",
    "AI meeting assistants": "/blog/best-ai-meeting-assistants-2026",
    "AI customer service": "/blog/best-ai-customer-service-chatbots-2026",
    "time blocking": "/blog/ai-productivity-workflow-2026-time-blocking-automation",
  },
  "best-ai-image-generators-2026-free-paid": {
    "AI video generators": "/blog/best-ai-video-generators-2026",
    "AI logo generators": "/blog/best-ai-logo-generators-2026",
    "AI writing tools": "/blog/best-ai-writing-tools-2026",
    "Canva AI": "/blog/canva-ai-vs-adobe-express-2026",
    "AI website builders": "/blog/best-ai-website-builders-2026",
    "AI presentation makers": "/blog/best-ai-presentation-makers-2026",
    "make money with AI": "/blog/how-to-make-money-with-ai-2026",
    "Image Compressor": "/tools/image-compressor",
  },
  "best-ai-logo-generators-2026": {
    "AI image generators": "/blog/best-ai-image-generators-2026-free-paid",
    "AI website builders": "/blog/best-ai-website-builders-2026",
    "Canva AI": "/blog/canva-ai-vs-adobe-express-2026",
    "portfolio website": "/blog/build-portfolio-website-2026",
    "AI tools for small business": "/blog/best-ai-tools-for-small-business-2026",
    "AI presentation makers": "/blog/best-ai-presentation-makers-2026",
    "Color Converter": "/tools/color-converter",
    "CSS Gradient Generator": "/tools/css-gradient-generator",
  },
  "best-ai-meeting-assistants-2026": {
    "AI email assistants": "/blog/best-ai-email-assistants-2026",
    "AI productivity apps": "/blog/best-ai-productivity-apps-for-freelancers-2026",
    "AI tools for small business": "/blog/best-ai-tools-for-small-business-2026",
    "AI sales tools": "/blog/best-ai-sales-tools-2026",
    "ChatGPT prompts": "/blog/best-chatgpt-prompts-for-work-2026",
    "AI writing tools": "/blog/best-ai-writing-tools-2026",
    "time blocking": "/blog/ai-productivity-workflow-2026-time-blocking-automation",
    "remote job boards": "/blog/best-remote-job-boards-developers-2026",
  },
  "best-ai-pdf-tools-2026": {
    "AI data analysis": "/blog/best-ai-data-analysis-tools-2026",
    "AI writing tools": "/blog/best-ai-writing-tools-2026",
    "AI tools for students": "/blog/best-ai-tools-for-students-2026-free-study-apps",
    "AI resume builders": "/blog/best-ai-resume-builders-2026",
    "ChatGPT prompts": "/blog/best-chatgpt-prompts-for-work-2026",
    "AI productivity": "/blog/ai-productivity-workflow-2026-time-blocking-automation",
  },
  "best-ai-presentation-makers-2026": {
    "AI image generators": "/blog/best-ai-image-generators-2026-free-paid",
    "Canva AI": "/blog/canva-ai-vs-adobe-express-2026",
    "AI writing tools": "/blog/best-ai-writing-tools-2026",
    "AI data analysis": "/blog/best-ai-data-analysis-tools-2026",
    "AI tools for small business": "/blog/best-ai-tools-for-small-business-2026",
    "AI video generators": "/blog/best-ai-video-generators-2026",
    "ChatGPT prompts": "/blog/best-chatgpt-prompts-for-work-2026",
    "AI meeting assistants": "/blog/best-ai-meeting-assistants-2026",
  },
  "best-ai-resume-builders-2026": {
    "AI writing tools": "/blog/best-ai-writing-tools-2026",
    "AI CV Builder": "/tools/ai-cv-builder",
    "ChatGPT prompts": "/blog/best-chatgpt-prompts-for-work-2026",
    "LinkedIn for developers": "/blog/linkedin-for-developers-2026",
    "remote job boards": "/blog/best-remote-job-boards-developers-2026",
    "freelancing": "/blog/how-to-start-freelancing-developer-2026",
    "portfolio website": "/blog/build-portfolio-website-2026",
    "AI productivity": "/blog/ai-productivity-workflow-2026-time-blocking-automation",
  },
  "best-ai-sales-tools-2026": {
    "AI customer service chatbots": "/blog/best-ai-customer-service-chatbots-2026",
    "AI email assistants": "/blog/best-ai-email-assistants-2026",
    "AI tools for small business": "/blog/best-ai-tools-for-small-business-2026",
    "AI agent builders": "/blog/best-ai-agent-builders-2026",
    "ChatGPT prompts": "/blog/best-chatgpt-prompts-for-work-2026",
    "AI data analysis": "/blog/best-ai-data-analysis-tools-2026",
    "make money with AI": "/blog/how-to-make-money-with-ai-2026",
  },
  "best-ai-search-engines-2026": {
    "ChatGPT alternatives": "/blog/best-chatgpt-alternatives-2026-free-paid",
    "Claude vs ChatGPT": "/blog/claude-vs-chatgpt-2026-comparison",
    "Perplexity vs Gemini": "/blog/perplexity-vs-google-gemini-2026-research",
    "AI writing tools": "/blog/best-ai-writing-tools-2026",
    "AI tools for students": "/blog/best-ai-tools-for-students-2026-free-study-apps",
    "AI SEO tools": "/blog/best-ai-seo-tools-2026",
    "AI data analysis": "/blog/best-ai-data-analysis-tools-2026",
  },
  "best-ai-spreadsheet-tools-2026": {
    "AI data analysis tools": "/blog/best-ai-data-analysis-tools-2026",
    "AI tools for small business": "/blog/best-ai-tools-for-small-business-2026",
    "AI productivity": "/blog/ai-productivity-workflow-2026-time-blocking-automation",
    "ChatGPT prompts": "/blog/best-chatgpt-prompts-for-work-2026",
    "AI PDF tools": "/blog/best-ai-pdf-tools-2026",
    "make money with AI": "/blog/how-to-make-money-with-ai-2026",
  },
  "best-ai-tools-for-small-business-2026": {
    "AI sales tools": "/blog/best-ai-sales-tools-2026",
    "AI customer service chatbots": "/blog/best-ai-customer-service-chatbots-2026",
    "AI email assistants": "/blog/best-ai-email-assistants-2026",
    "AI website builders": "/blog/best-ai-website-builders-2026",
    "AI agent builders": "/blog/best-ai-agent-builders-2026",
    "AI writing tools": "/blog/best-ai-writing-tools-2026",
    "make money with AI": "/blog/how-to-make-money-with-ai-2026",
    "AI SEO tools": "/blog/best-ai-seo-tools-2026",
    "AI spreadsheet": "/blog/best-ai-spreadsheet-tools-2026",
  },
  "best-ai-tools-for-students-2026-free-study-apps": {
    "AI writing tools": "/blog/best-ai-writing-tools-2026",
    "ChatGPT alternatives": "/blog/best-chatgpt-alternatives-2026-free-paid",
    "AI presentation makers": "/blog/best-ai-presentation-makers-2026",
    "time blocking": "/blog/time-blocking-for-students-2026-ai-study-planner",
    "AI resume builders": "/blog/best-ai-resume-builders-2026",
    "ChatGPT prompts": "/blog/best-chatgpt-prompts-for-work-2026",
    "AI PDF tools": "/blog/best-ai-pdf-tools-2026",
    "Plagiarism Checker": "/tools/plagiarism-checker",
    "Word Counter": "/tools/word-counter",
  },
  "best-ai-video-generators-2026": {
    "AI image generators": "/blog/best-ai-image-generators-2026-free-paid",
    "AI voice generators": "/blog/best-ai-voice-generators-2026",
    "AI presentation makers": "/blog/best-ai-presentation-makers-2026",
    "AI writing tools": "/blog/best-ai-writing-tools-2026",
    "Canva AI": "/blog/canva-ai-vs-adobe-express-2026",
    "make money with AI": "/blog/how-to-make-money-with-ai-2026",
    "YouTube Tag Generator": "/tools/youtube-tag-generator",
    "AI tools for small business": "/blog/best-ai-tools-for-small-business-2026",
  },
  "best-ai-voice-generators-2026": {
    "AI video generators": "/blog/best-ai-video-generators-2026",
    "AI writing tools": "/blog/best-ai-writing-tools-2026",
    "AI presentation makers": "/blog/best-ai-presentation-makers-2026",
    "AI apps for iPhone": "/blog/best-ai-apps-for-iphone-2026",
    "make money with AI": "/blog/how-to-make-money-with-ai-2026",
    "AI tools for students": "/blog/best-ai-tools-for-students-2026-free-study-apps",
    "Text to Speech": "/tools/text-to-speech",
  },
  "best-ai-website-builders-2026": {
    "AI logo generators": "/blog/best-ai-logo-generators-2026",
    "portfolio website": "/blog/build-portfolio-website-2026",
    "AI SEO tools": "/blog/best-ai-seo-tools-2026",
    "AI image generators": "/blog/best-ai-image-generators-2026-free-paid",
    "AI writing tools": "/blog/best-ai-writing-tools-2026",
    "AI tools for small business": "/blog/best-ai-tools-for-small-business-2026",
    "free hosting": "/blog/best-free-hosting-platforms-2026",
    "Meta Tag Generator": "/tools/meta-tag-generator",
    "Schema Markup Generator": "/tools/schema-markup-generator",
  },
  "best-ai-writing-tools-2026": {
    "AI SEO tools": "/blog/best-ai-seo-tools-2026",
    "ChatGPT alternatives": "/blog/best-chatgpt-alternatives-2026-free-paid",
    "AI content detector": "/blog/best-ai-tools-for-students-2026-free-study-apps",
    "ChatGPT prompts": "/blog/best-chatgpt-prompts-for-work-2026",
    "make money with AI": "/blog/how-to-make-money-with-ai-2026",
    "AI Content Detector": "/tools/ai-content-detector",
    "Plagiarism Checker": "/tools/plagiarism-checker",
    "Word Counter": "/tools/word-counter",
  },
  "best-chatgpt-alternatives-2026-free-paid": {
    "Claude vs ChatGPT": "/blog/claude-vs-chatgpt-2026-comparison",
    "AI search engines": "/blog/best-ai-search-engines-2026",
    "AI writing tools": "/blog/best-ai-writing-tools-2026",
    "AI coding assistants": "/blog/best-ai-coding-assistants-2026-copilot-cursor-windsurf",
    "Perplexity vs Gemini": "/blog/perplexity-vs-google-gemini-2026-research",
    "ChatGPT prompts": "/blog/best-chatgpt-prompts-for-work-2026",
    "AI tools for students": "/blog/best-ai-tools-for-students-2026-free-study-apps",
    "AI apps for iPhone": "/blog/best-ai-apps-for-iphone-2026",
  },
  "best-chatgpt-prompts-for-work-2026": {
    "AI writing tools": "/blog/best-ai-writing-tools-2026",
    "AI productivity": "/blog/ai-productivity-workflow-2026-time-blocking-automation",
    "AI email assistants": "/blog/best-ai-email-assistants-2026",
    "ChatGPT alternatives": "/blog/best-chatgpt-alternatives-2026-free-paid",
    "Claude vs ChatGPT": "/blog/claude-vs-chatgpt-2026-comparison",
    "AI SEO tools": "/blog/best-ai-seo-tools-2026",
    "make money with AI": "/blog/how-to-make-money-with-ai-2026",
    "AI tools for small business": "/blog/best-ai-tools-for-small-business-2026",
  },
  "best-ai-seo-tools-2026": {
    "low-competition keywords": "/blog/low-competition-keywords-for-new-blogs-2026",
    "blog traffic": "/blog/how-to-get-traffic-to-a-new-blog-2026",
    "AI writing tools": "/blog/best-ai-writing-tools-2026",
    "tech blog checklist": "/blog/how-to-start-a-tech-blog-2026-seo-checklist",
    "content plan": "/blog/90-day-blog-content-plan-for-new-websites-in-2026",
  },
  "github-copilot-guide-2026": {
    "AI code editors": "/blog/best-ai-code-editors-2026",
    "AI coding assistants": "/blog/best-ai-coding-assistants-2026-copilot-cursor-windsurf",
    "Cursor AI": "/blog/how-to-use-cursor-ai-2026-guide",
    "VS Code extensions": "/blog/best-vscode-extensions-2026",
    "vibe coding": "/blog/vibe-coding-guide-2026",
    "Claude Code": "/blog/what-is-claude-code-guide-2026",
    "Copilot vs ChatGPT": "/blog/copilot-vs-chatgpt-for-coding-2026",
    "Code Formatter": "/tools/code-formatter",
  },
  "how-to-make-money-with-ai-2026": {
    "AI writing tools": "/blog/best-ai-writing-tools-2026",
    "affiliate marketing": "/blog/affiliate-marketing-for-beginners-2026",
    "AI tools for small business": "/blog/best-ai-tools-for-small-business-2026",
    "freelancing": "/blog/how-to-start-freelancing-developer-2026",
    "AI website builders": "/blog/best-ai-website-builders-2026",
    "AI video generators": "/blog/best-ai-video-generators-2026",
    "AI SEO tools": "/blog/best-ai-seo-tools-2026",
    "tech blog": "/blog/how-to-start-a-tech-blog-2026-seo-checklist",
  },
  "what-is-claude-code-guide-2026": {
    "AI code editors": "/blog/best-ai-code-editors-2026",
    "AI coding assistants": "/blog/best-ai-coding-assistants-2026-copilot-cursor-windsurf",
    "GitHub Copilot": "/blog/github-copilot-guide-2026",
    "Cursor AI": "/blog/how-to-use-cursor-ai-2026-guide",
    "vibe coding": "/blog/vibe-coding-guide-2026",
    "Claude vs ChatGPT": "/blog/claude-vs-chatgpt-2026-comparison",
    "VS Code extensions": "/blog/best-vscode-extensions-2026",
    "vibe coding tools": "/blog/best-vibe-coding-tools-2026",
  },

  // ── Software Reviews category ──
  "apify-review-web-scraping-ai-platform-2026": {
    "AI data analysis": "/blog/best-ai-data-analysis-tools-2026",
    "AI tools for small business": "/blog/best-ai-tools-for-small-business-2026",
    "free APIs": "/blog/best-free-apis-for-developers-2026",
    "AI SEO tools": "/blog/best-ai-seo-tools-2026",
    "make money with AI": "/blog/how-to-make-money-with-ai-2026",
    "AI agent builders": "/blog/best-ai-agent-builders-2026",
    "Python": "/blog/python-ai-agent-tutorial-2026-langgraph-rag-tools",
    "JSON Formatter": "/tools/json-formatter",
  },
  "canva-ai-vs-adobe-express-2026": {
    "AI image generators": "/blog/best-ai-image-generators-2026-free-paid",
    "AI logo generators": "/blog/best-ai-logo-generators-2026",
    "AI video generators": "/blog/best-ai-video-generators-2026",
    "AI presentation makers": "/blog/best-ai-presentation-makers-2026",
    "AI writing tools": "/blog/best-ai-writing-tools-2026",
    "portfolio website": "/blog/build-portfolio-website-2026",
    "Image Compressor": "/tools/image-compressor",
    "AI tools for small business": "/blog/best-ai-tools-for-small-business-2026",
  },
  "claude-vs-chatgpt-2026-comparison": {
    "ChatGPT alternatives": "/blog/best-chatgpt-alternatives-2026-free-paid",
    "AI search engines": "/blog/best-ai-search-engines-2026",
    "Copilot vs ChatGPT": "/blog/copilot-vs-chatgpt-for-coding-2026",
    "AI writing tools": "/blog/best-ai-writing-tools-2026",
    "AI coding assistants": "/blog/best-ai-coding-assistants-2026-copilot-cursor-windsurf",
    "Claude Code": "/blog/what-is-claude-code-guide-2026",
    "ChatGPT prompts": "/blog/best-chatgpt-prompts-for-work-2026",
    "Perplexity vs Gemini": "/blog/perplexity-vs-google-gemini-2026-research",
  },
  "copilot-vs-chatgpt-for-coding-2026": {
    "AI code editors": "/blog/best-ai-code-editors-2026",
    "AI coding assistants": "/blog/best-ai-coding-assistants-2026-copilot-cursor-windsurf",
    "GitHub Copilot": "/blog/github-copilot-guide-2026",
    "Cursor AI": "/blog/how-to-use-cursor-ai-2026-guide",
    "Claude vs ChatGPT": "/blog/claude-vs-chatgpt-2026-comparison",
    "vibe coding": "/blog/vibe-coding-guide-2026",
    "VS Code extensions": "/blog/best-vscode-extensions-2026",
    "Claude Code": "/blog/what-is-claude-code-guide-2026",
  },
  "best-ai-image-generators-2026-free-paid": {
    "AI video generators": "/blog/best-ai-video-generators-2026",
    "AI logo generators": "/blog/best-ai-logo-generators-2026",
    "AI website builders": "/blog/best-ai-website-builders-2026",
    "AI presentation makers": "/blog/best-ai-presentation-makers-2026",
    "Canva AI": "/blog/canva-ai-vs-adobe-express-2026",
    "make money with AI": "/blog/how-to-make-money-with-ai-2026",
    "Image Compressor": "/tools/image-compressor",
  },
  "best-laptops-for-coding-2026-developers": {
    "VS Code extensions": "/blog/best-vscode-extensions-2026",
    "AI code editors": "/blog/best-ai-code-editors-2026",
    "Docker": "/blog/docker-for-beginners-2026-guide",
    "Linux WSL setup": "/blog/linux-wsl-setup-guide-2026-windows-developers",
    "learn programming": "/blog/how-to-learn-programming-2026-beginner-roadmap",
    "freelancing": "/blog/how-to-start-freelancing-developer-2026",
    "portfolio website": "/blog/build-portfolio-website-2026",
    "remote job boards": "/blog/best-remote-job-boards-developers-2026",
  },
  "best-password-managers-2026": {
    "strong passwords": "/blog/how-to-create-strong-passwords-2026",
    "two-factor authentication": "/blog/two-factor-authentication-guide-2026",
    "email hacked": "/blog/check-if-email-hacked-2026",
    "online security checklist": "/blog/online-security-checklist-2026-passkeys-2fa",
    "VPN": "/blog/best-free-vpn-2026",
    "Password Generator": "/tools/password-generator",
    "AI tools for small business": "/blog/best-ai-tools-for-small-business-2026",
  },
  "perplexity-vs-google-gemini-2026-research": {
    "AI search engines": "/blog/best-ai-search-engines-2026",
    "ChatGPT alternatives": "/blog/best-chatgpt-alternatives-2026-free-paid",
    "Claude vs ChatGPT": "/blog/claude-vs-chatgpt-2026-comparison",
    "AI writing tools": "/blog/best-ai-writing-tools-2026",
    "AI tools for students": "/blog/best-ai-tools-for-students-2026-free-study-apps",
    "AI SEO tools": "/blog/best-ai-seo-tools-2026",
    "AI data analysis": "/blog/best-ai-data-analysis-tools-2026",
  },
  "notion-vs-obsidian-vs-apple-notes-2026": {
    "AI productivity": "/blog/ai-productivity-workflow-2026-time-blocking-automation",
    "time blocking": "/blog/time-blocking-for-students-2026-ai-study-planner",
    "AI writing tools": "/blog/best-ai-writing-tools-2026",
    "ChatGPT prompts": "/blog/best-chatgpt-prompts-for-work-2026",
    "AI tools for students": "/blog/best-ai-tools-for-students-2026-free-study-apps",
    "AI productivity apps for freelancers": "/blog/best-ai-productivity-apps-for-freelancers-2026",
    "Markdown to HTML": "/tools/markdown-to-html",
  },

  // ── Productivity category ──
  "ai-productivity-workflow-2026-time-blocking-automation": {
    "AI email assistants": "/blog/best-ai-email-assistants-2026",
    "AI meeting assistants": "/blog/best-ai-meeting-assistants-2026",
    "ChatGPT prompts": "/blog/best-chatgpt-prompts-for-work-2026",
    "AI writing tools": "/blog/best-ai-writing-tools-2026",
    "AI tools for small business": "/blog/best-ai-tools-for-small-business-2026",
    "AI productivity apps for freelancers": "/blog/best-ai-productivity-apps-for-freelancers-2026",
    "time blocking for students": "/blog/time-blocking-for-students-2026-ai-study-planner",
    "Notion vs Obsidian": "/blog/notion-vs-obsidian-vs-apple-notes-2026",
  },
  "best-ai-productivity-apps-for-freelancers-2026": {
    "AI email assistants": "/blog/best-ai-email-assistants-2026",
    "AI writing tools": "/blog/best-ai-writing-tools-2026",
    "AI meeting assistants": "/blog/best-ai-meeting-assistants-2026",
    "freelancing": "/blog/how-to-start-freelancing-developer-2026",
    "ChatGPT prompts": "/blog/best-chatgpt-prompts-for-work-2026",
    "AI productivity": "/blog/ai-productivity-workflow-2026-time-blocking-automation",
    "AI tools for small business": "/blog/best-ai-tools-for-small-business-2026",
    "remote job boards": "/blog/best-remote-job-boards-developers-2026",
  },
  "time-blocking-for-students-2026-ai-study-planner": {
    "AI tools for students": "/blog/best-ai-tools-for-students-2026-free-study-apps",
    "AI productivity": "/blog/ai-productivity-workflow-2026-time-blocking-automation",
    "ChatGPT prompts": "/blog/best-chatgpt-prompts-for-work-2026",
    "Notion vs Obsidian": "/blog/notion-vs-obsidian-vs-apple-notes-2026",
    "AI writing tools": "/blog/best-ai-writing-tools-2026",
    "AI productivity apps": "/blog/best-ai-productivity-apps-for-freelancers-2026",
    "learn programming": "/blog/how-to-learn-programming-2026-beginner-roadmap",
  },
  "best-chrome-extensions-developers-2026": {
    "VS Code extensions": "/blog/best-vscode-extensions-2026",
    "AI coding assistants": "/blog/best-ai-coding-assistants-2026-copilot-cursor-windsurf",
    "AI productivity": "/blog/ai-productivity-workflow-2026-time-blocking-automation",
    "JSON Formatter": "/tools/json-formatter",
    "Regex Tester": "/tools/regex-tester",
    "password manager": "/blog/best-password-managers-2026",
    "free APIs": "/blog/best-free-apis-for-developers-2026",
    "AI code editors": "/blog/best-ai-code-editors-2026",
  },
  "how-to-start-freelancing-developer-2026": {
    "portfolio website": "/blog/build-portfolio-website-2026",
    "remote job boards": "/blog/best-remote-job-boards-developers-2026",
    "LinkedIn for developers": "/blog/linkedin-for-developers-2026",
    "AI resume builders": "/blog/best-ai-resume-builders-2026",
    "AI productivity apps for freelancers": "/blog/best-ai-productivity-apps-for-freelancers-2026",
    "make money with AI": "/blog/how-to-make-money-with-ai-2026",
    "AI writing tools": "/blog/best-ai-writing-tools-2026",
    "ChatGPT prompts": "/blog/best-chatgpt-prompts-for-work-2026",
  },

  // ── Coding category ──
  "best-free-apis-for-developers-2026": {
    "JavaScript roadmap": "/blog/javascript-roadmap-2026-beginner-job-ready",
    "React best practices": "/blog/react-19-best-practices-2026-faster-apps",
    "portfolio website": "/blog/build-portfolio-website-2026",
    "Docker": "/blog/docker-for-beginners-2026-guide",
    "free hosting": "/blog/best-free-hosting-platforms-2026",
    "JSON Formatter": "/tools/json-formatter",
    "learn programming": "/blog/how-to-learn-programming-2026-beginner-roadmap",
    "Git and GitHub": "/blog/git-github-beginners-guide-2026",
  },
  "best-remote-job-boards-developers-2026": {
    "freelancing": "/blog/how-to-start-freelancing-developer-2026",
    "LinkedIn for developers": "/blog/linkedin-for-developers-2026",
    "portfolio website": "/blog/build-portfolio-website-2026",
    "AI resume builders": "/blog/best-ai-resume-builders-2026",
    "AI productivity apps": "/blog/best-ai-productivity-apps-for-freelancers-2026",
    "learn programming": "/blog/how-to-learn-programming-2026-beginner-roadmap",
    "AI CV Builder": "/tools/ai-cv-builder",
  },
  "best-vibe-coding-tools-2026": {
    "vibe coding guide": "/blog/vibe-coding-guide-2026",
    "AI code editors": "/blog/best-ai-code-editors-2026",
    "AI coding assistants": "/blog/best-ai-coding-assistants-2026-copilot-cursor-windsurf",
    "GitHub Copilot": "/blog/github-copilot-guide-2026",
    "Cursor AI": "/blog/how-to-use-cursor-ai-2026-guide",
    "Claude Code": "/blog/what-is-claude-code-guide-2026",
    "Next.js deployment": "/blog/nextjs-16-deployment-guide-2026-vercel-seo-custom-domain",
  },
  "best-vscode-extensions-2026": {
    "VS Code extensions for web developers": "/blog/best-vscode-extensions-2026-web-developers",
    "AI code editors": "/blog/best-ai-code-editors-2026",
    "GitHub Copilot": "/blog/github-copilot-guide-2026",
    "AI coding assistants": "/blog/best-ai-coding-assistants-2026-copilot-cursor-windsurf",
    "Chrome extensions": "/blog/best-chrome-extensions-developers-2026",
    "Git and GitHub": "/blog/git-github-beginners-guide-2026",
    "TypeScript": "/blog/typescript-for-beginners-2026-complete-guide",
    "Code Formatter": "/tools/code-formatter",
  },
  "best-vscode-extensions-2026-web-developers": {
    "VS Code extensions": "/blog/best-vscode-extensions-2026",
    "AI code editors": "/blog/best-ai-code-editors-2026",
    "Tailwind CSS 4": "/blog/tailwind-css-4-guide-2026",
    "React best practices": "/blog/react-19-best-practices-2026-faster-apps",
    "GitHub Copilot": "/blog/github-copilot-guide-2026",
    "TypeScript": "/blog/typescript-for-beginners-2026-complete-guide",
  },
  "build-rag-chatbot-nextjs-2026": {
    "Python AI agent": "/blog/python-ai-agent-tutorial-2026-langgraph-rag-tools",
    "Next.js deployment": "/blog/nextjs-16-deployment-guide-2026-vercel-seo-custom-domain",
    "TypeScript": "/blog/typescript-for-beginners-2026-complete-guide",
    "AI coding assistants": "/blog/best-ai-coding-assistants-2026-copilot-cursor-windsurf",
    "free APIs": "/blog/best-free-apis-for-developers-2026",
    "Docker": "/blog/docker-for-beginners-2026-guide",
    "AI tools for small business": "/blog/best-ai-tools-for-small-business-2026",
  },
  "git-github-beginners-guide-2026": {
    "VS Code extensions": "/blog/best-vscode-extensions-2026",
    "learn programming": "/blog/how-to-learn-programming-2026-beginner-roadmap",
    "portfolio website": "/blog/build-portfolio-website-2026",
    "AI code editors": "/blog/best-ai-code-editors-2026",
    "Docker": "/blog/docker-for-beginners-2026-guide",
    "Linux WSL": "/blog/linux-wsl-setup-guide-2026-windows-developers",
  },
  "how-to-use-cursor-ai-2026-guide": {
    "AI code editors": "/blog/best-ai-code-editors-2026",
    "AI coding assistants": "/blog/best-ai-coding-assistants-2026-copilot-cursor-windsurf",
    "GitHub Copilot": "/blog/github-copilot-guide-2026",
    "vibe coding": "/blog/vibe-coding-guide-2026",
    "Claude Code": "/blog/what-is-claude-code-guide-2026",
    "Copilot vs ChatGPT": "/blog/copilot-vs-chatgpt-for-coding-2026",
    "vibe coding tools": "/blog/best-vibe-coding-tools-2026",
    "VS Code extensions": "/blog/best-vscode-extensions-2026",
  },
  "javascript-roadmap-2026-beginner-job-ready": {
    "TypeScript": "/blog/typescript-for-beginners-2026-complete-guide",
    "React best practices": "/blog/react-19-best-practices-2026-faster-apps",
    "learn programming": "/blog/how-to-learn-programming-2026-beginner-roadmap",
    "VS Code extensions": "/blog/best-vscode-extensions-2026",
    "free APIs": "/blog/best-free-apis-for-developers-2026",
    "portfolio website": "/blog/build-portfolio-website-2026",
    "Git and GitHub": "/blog/git-github-beginners-guide-2026",
  },
  "python-ai-agent-tutorial-2026-langgraph-rag-tools": {
    "RAG chatbot": "/blog/build-rag-chatbot-nextjs-2026",
    "AI coding assistants": "/blog/best-ai-coding-assistants-2026-copilot-cursor-windsurf",
    "free APIs": "/blog/best-free-apis-for-developers-2026",
    "AI agent builders": "/blog/best-ai-agent-builders-2026",
    "learn programming": "/blog/how-to-learn-programming-2026-beginner-roadmap",
    "Docker": "/blog/docker-for-beginners-2026-guide",
    "AI data analysis": "/blog/best-ai-data-analysis-tools-2026",
    "JSON Formatter": "/tools/json-formatter",
  },
  "react-19-best-practices-2026-faster-apps": {
    "TypeScript": "/blog/typescript-for-beginners-2026-complete-guide",
    "Next.js deployment": "/blog/nextjs-16-deployment-guide-2026-vercel-seo-custom-domain",
    "Tailwind CSS 4": "/blog/tailwind-css-4-guide-2026",
    "VS Code extensions": "/blog/best-vscode-extensions-2026-web-developers",
    "JavaScript roadmap": "/blog/javascript-roadmap-2026-beginner-job-ready",
    "website speed optimization": "/blog/website-speed-optimization-checklist-2026-core-web-vitals",
  },
  "tailwind-css-4-guide-2026": {
    "React best practices": "/blog/react-19-best-practices-2026-faster-apps",
    "Next.js deployment": "/blog/nextjs-16-deployment-guide-2026-vercel-seo-custom-domain",
    "VS Code extensions for web developers": "/blog/best-vscode-extensions-2026-web-developers",
    "website speed": "/blog/website-speed-optimization-checklist-2026-core-web-vitals",
    "portfolio website": "/blog/build-portfolio-website-2026",
    "CSS Gradient Generator": "/tools/css-gradient-generator",
    "Color Converter": "/tools/color-converter",
    "Box Shadow Generator": "/tools/box-shadow-generator",
  },
  "top-programming-languages-2026": {
    "JavaScript roadmap": "/blog/javascript-roadmap-2026-beginner-job-ready",
    "TypeScript": "/blog/typescript-for-beginners-2026-complete-guide",
    "Python AI agent": "/blog/python-ai-agent-tutorial-2026-langgraph-rag-tools",
    "learn programming": "/blog/how-to-learn-programming-2026-beginner-roadmap",
    "AI coding assistants": "/blog/best-ai-coding-assistants-2026-copilot-cursor-windsurf",
    "remote job boards": "/blog/best-remote-job-boards-developers-2026",
    "best laptops for coding": "/blog/best-laptops-for-coding-2026-developers",
    "freelancing": "/blog/how-to-start-freelancing-developer-2026",
  },
  "typescript-for-beginners-2026-complete-guide": {
    "JavaScript roadmap": "/blog/javascript-roadmap-2026-beginner-job-ready",
    "React best practices": "/blog/react-19-best-practices-2026-faster-apps",
    "Next.js deployment": "/blog/nextjs-16-deployment-guide-2026-vercel-seo-custom-domain",
    "VS Code extensions": "/blog/best-vscode-extensions-2026",
    "AI code editors": "/blog/best-ai-code-editors-2026",
    "learn programming": "/blog/how-to-learn-programming-2026-beginner-roadmap",
  },
  "vibe-coding-guide-2026": {
    "vibe coding tools": "/blog/best-vibe-coding-tools-2026",
    "AI code editors": "/blog/best-ai-code-editors-2026",
    "Cursor AI": "/blog/how-to-use-cursor-ai-2026-guide",
    "GitHub Copilot": "/blog/github-copilot-guide-2026",
    "Claude Code": "/blog/what-is-claude-code-guide-2026",
    "AI coding assistants": "/blog/best-ai-coding-assistants-2026-copilot-cursor-windsurf",
    "Next.js deployment": "/blog/nextjs-16-deployment-guide-2026-vercel-seo-custom-domain",
    "portfolio website": "/blog/build-portfolio-website-2026",
  },

  // ── Tech Guides category ──
  "build-portfolio-website-2026": {
    "free hosting": "/blog/best-free-hosting-platforms-2026",
    "Git and GitHub": "/blog/git-github-beginners-guide-2026",
    "Next.js deployment": "/blog/nextjs-16-deployment-guide-2026-vercel-seo-custom-domain",
    "AI website builders": "/blog/best-ai-website-builders-2026",
    "freelancing": "/blog/how-to-start-freelancing-developer-2026",
    "LinkedIn for developers": "/blog/linkedin-for-developers-2026",
    "Meta Tag Generator": "/tools/meta-tag-generator",
  },
  "docker-for-beginners-2026-guide": {
    "Linux WSL setup": "/blog/linux-wsl-setup-guide-2026-windows-developers",
    "Git and GitHub": "/blog/git-github-beginners-guide-2026",
    "free hosting": "/blog/best-free-hosting-platforms-2026",
    "learn programming": "/blog/how-to-learn-programming-2026-beginner-roadmap",
    "VS Code extensions": "/blog/best-vscode-extensions-2026",
    "Next.js deployment": "/blog/nextjs-16-deployment-guide-2026-vercel-seo-custom-domain",
  },
  "docker-for-beginners-complete-guide": {
    "Docker 2026 guide": "/blog/docker-for-beginners-2026-guide",
    "Linux WSL setup": "/blog/linux-wsl-setup-guide-2026-windows-developers",
    "Git and GitHub": "/blog/git-github-beginners-guide-2026",
    "free hosting": "/blog/best-free-hosting-platforms-2026",
    "VS Code extensions": "/blog/best-vscode-extensions-2026",
    "learn programming": "/blog/how-to-learn-programming-2026-beginner-roadmap",
    "AI code editors": "/blog/best-ai-code-editors-2026",
    "Next.js deployment": "/blog/nextjs-16-deployment-guide-2026-vercel-seo-custom-domain",
  },
  "best-free-hosting-platforms-2026": {
    "portfolio website": "/blog/build-portfolio-website-2026",
    "Next.js deployment": "/blog/nextjs-16-deployment-guide-2026-vercel-seo-custom-domain",
    "Docker": "/blog/docker-for-beginners-2026-guide",
    "Git and GitHub": "/blog/git-github-beginners-guide-2026",
    "AI website builders": "/blog/best-ai-website-builders-2026",
    "website speed": "/blog/website-speed-optimization-checklist-2026-core-web-vitals",
    "tech blog": "/blog/how-to-start-a-tech-blog-2026-seo-checklist",
    "free APIs": "/blog/best-free-apis-for-developers-2026",
  },
  "how-to-learn-programming-2026-beginner-roadmap": {
    "JavaScript roadmap": "/blog/javascript-roadmap-2026-beginner-job-ready",
    "TypeScript": "/blog/typescript-for-beginners-2026-complete-guide",
    "Python": "/blog/python-ai-agent-tutorial-2026-langgraph-rag-tools",
    "VS Code extensions": "/blog/best-vscode-extensions-2026",
    "Git and GitHub": "/blog/git-github-beginners-guide-2026",
    "portfolio website": "/blog/build-portfolio-website-2026",
    "top programming languages": "/blog/top-programming-languages-2026",
    "AI coding assistants": "/blog/best-ai-coding-assistants-2026-copilot-cursor-windsurf",
  },
  "how-to-build-portfolio-website-2026": {
    "build portfolio website": "/blog/build-portfolio-website-2026",
    "free hosting": "/blog/best-free-hosting-platforms-2026",
    "Git and GitHub": "/blog/git-github-beginners-guide-2026",
    "Next.js deployment": "/blog/nextjs-16-deployment-guide-2026-vercel-seo-custom-domain",
    "AI website builders": "/blog/best-ai-website-builders-2026",
    "freelancing": "/blog/how-to-start-freelancing-developer-2026",
    "LinkedIn for developers": "/blog/linkedin-for-developers-2026",
    "Meta Tag Generator": "/tools/meta-tag-generator",
    "Schema Markup Generator": "/tools/schema-markup-generator",
  },
  "linkedin-for-developers-2026": {
    "portfolio website": "/blog/build-portfolio-website-2026",
    "remote job boards": "/blog/best-remote-job-boards-developers-2026",
    "AI resume builders": "/blog/best-ai-resume-builders-2026",
    "freelancing": "/blog/how-to-start-freelancing-developer-2026",
    "ChatGPT prompts": "/blog/best-chatgpt-prompts-for-work-2026",
    "AI writing tools": "/blog/best-ai-writing-tools-2026",
    "AI productivity": "/blog/ai-productivity-workflow-2026-time-blocking-automation",
    "AI CV Builder": "/tools/ai-cv-builder",
  },
  "linux-wsl-setup-guide-2026-windows-developers": {
    "Docker": "/blog/docker-for-beginners-2026-guide",
    "VS Code extensions": "/blog/best-vscode-extensions-2026",
    "Git and GitHub": "/blog/git-github-beginners-guide-2026",
    "best laptops for coding": "/blog/best-laptops-for-coding-2026-developers",
    "learn programming": "/blog/how-to-learn-programming-2026-beginner-roadmap",
    "AI code editors": "/blog/best-ai-code-editors-2026",
    "Python": "/blog/python-ai-agent-tutorial-2026-langgraph-rag-tools",
    "Next.js deployment": "/blog/nextjs-16-deployment-guide-2026-vercel-seo-custom-domain",
  },
  "nextjs-16-deployment-guide-2026-vercel-seo-custom-domain": {
    "React best practices": "/blog/react-19-best-practices-2026-faster-apps",
    "TypeScript": "/blog/typescript-for-beginners-2026-complete-guide",
    "Tailwind CSS 4": "/blog/tailwind-css-4-guide-2026",
    "website speed": "/blog/website-speed-optimization-checklist-2026-core-web-vitals",
    "SEO meta tags": "/blog/seo-meta-tags-generator-guide-2026",
    "free hosting": "/blog/best-free-hosting-platforms-2026",
    "Schema Markup Generator": "/tools/schema-markup-generator",
    "Meta Tag Generator": "/tools/meta-tag-generator",
  },
  "online-security-checklist-2026-passkeys-2fa": {
    "two-factor authentication": "/blog/two-factor-authentication-guide-2026",
    "password managers": "/blog/best-password-managers-2026",
    "strong passwords": "/blog/how-to-create-strong-passwords-2026",
    "email hacked": "/blog/check-if-email-hacked-2026",
    "VPN": "/blog/best-free-vpn-2026",
    "Password Generator": "/tools/password-generator",
  },
  "seo-meta-tags-generator-guide-2026": {
    "AI SEO tools": "/blog/best-ai-seo-tools-2026",
    "website speed": "/blog/website-speed-optimization-checklist-2026-core-web-vitals",
    "tech blog checklist": "/blog/how-to-start-a-tech-blog-2026-seo-checklist",
    "blog traffic": "/blog/how-to-get-traffic-to-a-new-blog-2026",
    "low-competition keywords": "/blog/low-competition-keywords-for-new-blogs-2026",
  },
  "website-speed-optimization-checklist-2026-core-web-vitals": {
    "Next.js deployment": "/blog/nextjs-16-deployment-guide-2026-vercel-seo-custom-domain",
    "AI SEO tools": "/blog/best-ai-seo-tools-2026",
    "SEO meta tags": "/blog/seo-meta-tags-generator-guide-2026",
    "free hosting": "/blog/best-free-hosting-platforms-2026",
    "Image Compressor": "/tools/image-compressor",
    "blog traffic": "/blog/how-to-get-traffic-to-a-new-blog-2026",
    "tech blog checklist": "/blog/how-to-start-a-tech-blog-2026-seo-checklist",
  },

  // ── Cybersecurity category ──
  "best-free-vpn-2026": {
    "online security checklist": "/blog/online-security-checklist-2026-passkeys-2fa",
    "password managers": "/blog/best-password-managers-2026",
    "two-factor authentication": "/blog/two-factor-authentication-guide-2026",
    "email hacked": "/blog/check-if-email-hacked-2026",
    "strong passwords": "/blog/how-to-create-strong-passwords-2026",
    "Chrome extensions": "/blog/best-chrome-extensions-developers-2026",
    "Password Generator": "/tools/password-generator",
  },
  "check-if-email-hacked-2026": {
    "password managers": "/blog/best-password-managers-2026",
    "two-factor authentication": "/blog/two-factor-authentication-guide-2026",
    "strong passwords": "/blog/how-to-create-strong-passwords-2026",
    "online security checklist": "/blog/online-security-checklist-2026-passkeys-2fa",
    "VPN": "/blog/best-free-vpn-2026",
    "Password Generator": "/tools/password-generator",
  },
  "how-to-create-strong-passwords-2026": {
    "password managers": "/blog/best-password-managers-2026",
    "two-factor authentication": "/blog/two-factor-authentication-guide-2026",
    "email hacked": "/blog/check-if-email-hacked-2026",
    "online security checklist": "/blog/online-security-checklist-2026-passkeys-2fa",
    "VPN": "/blog/best-free-vpn-2026",
    "Password Generator": "/tools/password-generator",
  },
  "two-factor-authentication-guide-2026": {
    "password managers": "/blog/best-password-managers-2026",
    "strong passwords": "/blog/how-to-create-strong-passwords-2026",
    "email hacked": "/blog/check-if-email-hacked-2026",
    "online security checklist": "/blog/online-security-checklist-2026-passkeys-2fa",
    "VPN": "/blog/best-free-vpn-2026",
    "Password Generator": "/tools/password-generator",
  },
};

// ── Main logic ──
async function main() {
  const allPosts = await sql`SELECT id, slug, content FROM posts WHERE published = true`;
  let totalUpdated = 0;
  let totalLinksAdded = 0;

  for (const post of allPosts) {
    const linkConfig = LINK_MAP[post.slug];
    if (!linkConfig) continue;

    let content = post.content;
    let linksAdded = 0;

    // Get existing internal link targets to avoid duplicates
    const existingLinks = new Set(
      [...content.matchAll(/\[([^\]]*)\]\((\/[^)]+)\)/g)].map(m => m[2])
    );

    const lines = content.split('\n');

    for (const [phrase, target] of Object.entries(linkConfig)) {
      // Skip if this target is already linked
      if (existingLinks.has(target)) continue;

      // Case-insensitive search for the first unlinked occurrence
      // Must NOT be inside an existing markdown link [...](...)
      // Must NOT be inside a heading (lines starting with #)
      let found = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip headings, images, and lines that are entirely links
        if (/^#{1,6}\s/.test(line)) continue;
        if (/^!\[/.test(line)) continue;

        // Find the phrase (case-insensitive) that is NOT already inside [...](...) 
        const phraseRegex = new RegExp(`(?<![\\[\\(])\\b(${escapeRegex(phrase)})\\b(?![\\]\\)])`, 'i');
        const match = line.match(phraseRegex);

        if (match) {
          // Make sure this occurrence isn't inside an existing markdown link
          const beforeMatch = line.substring(0, match.index);
          const afterMatch = line.substring(match.index + match[0].length);

          // Check if we're inside [...] or (...)
          const openBrackets = (beforeMatch.match(/\[/g) || []).length;
          const closeBrackets = (beforeMatch.match(/\]/g) || []).length;
          if (openBrackets > closeBrackets) continue; // Inside [...]

          // Replace first occurrence on this line
          const replacement = `[${match[1]}](${target})`;
          lines[i] = line.substring(0, match.index) + replacement + afterMatch;
          found = true;
          linksAdded++;
          existingLinks.add(target);
          break;
        }
      }

      if (!found) {
        // Try partial match (just the key words without exact boundary)
        // Skip - the phrase wasn't found in this post
      }
    }

    if (linksAdded > 0) {
      const newContent = lines.join('\n');
      await sql`UPDATE posts SET content = ${newContent}, updated_at = NOW() WHERE id = ${post.id}`;
      console.log(`✅ ${post.slug}: +${linksAdded} links`);
      totalUpdated++;
      totalLinksAdded += linksAdded;
    } else {
      console.log(`⏭️  ${post.slug}: no new links needed`);
    }
  }

  console.log(`\n📊 Updated ${totalUpdated} posts, added ${totalLinksAdded} internal links total`);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main().catch(console.error);
