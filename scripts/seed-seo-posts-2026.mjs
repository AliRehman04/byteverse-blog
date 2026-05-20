import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const sql = neon(process.env.DATABASE_URL);
const author = "Ali Rehman";

const imageUrl = (id, width = 1400) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;

const existingPosts = [
  {
    slug: "10-best-free-ai-tools-in-2026-that-will-blow-your-mind",
    title: "10 Best Free AI Tools in 2026 That Will Blow Your Mind",
  },
  {
    slug: "nextjs-16-deployment-guide-2026-vercel-seo-custom-domain",
    title: "Next.js 16 Deployment Guide 2026: Vercel SEO Setup",
  },
  {
    slug: "ai-productivity-workflow-2026-time-blocking-automation",
    title: "AI Productivity Workflow 2026: Work Smarter",
  },
  {
    slug: "python-ai-agent-tutorial-2026-langgraph-rag-tools",
    title: "Python AI Agent Tutorial 2026: Build a LangGraph Agent",
  },
  {
    slug: "best-ai-coding-assistants-2026-copilot-cursor-windsurf",
    title: "Best AI Coding Assistants 2026: Copilot vs Cursor vs Windsurf",
  },
];

const newPosts = [
  {
    category: "ai-tools",
    title: "Best AI Tools for Students 2026: Free Study Apps",
    slug: "best-ai-tools-for-students-2026-free-study-apps",
    excerpt: "A practical guide to the best AI tools for students in 2026, including study planning, research, summaries, writing help, and exam prep.",
    metaTitle: "Best AI Tools for Students 2026: Free Study Apps",
    metaDescription: "Discover the best AI tools for students in 2026 for research, summaries, study planning, writing help, and exam preparation.",
    keywords: "best AI tools for students 2026, free AI study tools, AI homework helper, AI exam prep apps",
    primaryKeyword: "best AI tools for students 2026",
    audience: "students who want better notes, faster research, and a calmer study routine",
    cover: "1434030216411-0b793f4b4173",
    images: [
      ["1522202176988-66273c2fd55f", "Students using laptops for AI-assisted study planning", "AI study workflow for students"],
      ["1516321318423-f06f85e504b3", "Laptop with research and writing tools open", "AI research and note-taking setup"],
      ["1484480974693-6ca0a78fb36b", "Planner and laptop for exam preparation", "AI exam preparation planner"],
    ],
    quickTake: ["Use AI for summaries, not blind copying", "Keep one clean study dashboard", "Ask tools for practice questions", "Verify facts before submitting work", "Protect privacy by removing personal data"],
    workflow: ["Capture lecture notes in one place", "Turn long readings into bullet summaries", "Generate active recall questions", "Schedule review blocks before exams", "Use AI feedback to rewrite weak answers"],
    mistakes: ["Submitting AI text without checking it", "Using five tools when one workflow is enough", "Letting AI replace active recall", "Uploading private school documents without reviewing settings"],
    faqs: [
      ["What is the best free AI tool for students in 2026?", "The best free option depends on the task. ChatGPT and Gemini are strong for explanations, Perplexity is useful for cited research, and Notion-style tools are helpful for organizing notes."],
      ["Can students use AI tools safely?", "Yes, if they verify facts, follow school rules, avoid plagiarism, and do not upload private personal information."],
    ],
    related: ["10-best-free-ai-tools-in-2026-that-will-blow-your-mind", "time-blocking-for-students-2026-ai-study-planner", "perplexity-vs-google-gemini-2026-research"],
  },
  {
    category: "ai-tools",
    title: "Best AI Tools for Small Business 2026",
    slug: "best-ai-tools-for-small-business-2026",
    excerpt: "A small business guide to AI tools for marketing, customer support, bookkeeping, content, research, and daily operations in 2026.",
    metaTitle: "Best AI Tools for Small Business 2026",
    metaDescription: "Find the best AI tools for small business in 2026 for marketing, customer support, content, research, and operations.",
    keywords: "best AI tools for small business 2026, AI tools for entrepreneurs, AI marketing tools, small business automation",
    primaryKeyword: "best AI tools for small business 2026",
    audience: "founders, freelancers, and small teams who need practical automation without enterprise complexity",
    cover: "1556761175-b413da4baf72",
    images: [
      ["1542744173-8e7e53415bb0", "Small business team reviewing marketing ideas", "AI marketing planning for small business"],
      ["1460925895917-afdab827c52f", "Analytics dashboard for business performance", "Small business analytics dashboard"],
      ["1552664730-d307ca884978", "Team planning business operations with laptops", "AI operations workflow for small teams"],
    ],
    quickTake: ["Start with one painful workflow", "Automate drafts before decisions", "Keep customer data controlled", "Measure time saved every week", "Choose tools your team will actually use"],
    workflow: ["List repetitive tasks by department", "Pick one marketing or support use case", "Create templates for prompts and outputs", "Review every customer-facing response", "Track saved hours and conversion impact"],
    mistakes: ["Buying too many subscriptions", "Automating customer support without review", "Ignoring privacy policies", "Using AI content without brand editing"],
    faqs: [
      ["Which AI tool should a small business start with?", "Start with the tool that fixes the most repeated task, usually writing, customer replies, meeting summaries, or social content."],
      ["Are AI tools worth it for small businesses?", "They are worth it when they save time on repeatable work and improve consistency without lowering quality."],
    ],
    related: ["10-best-free-ai-tools-in-2026-that-will-blow-your-mind", "best-ai-productivity-apps-for-freelancers-2026", "canva-ai-vs-adobe-express-2026"],
  },
  {
    category: "ai-tools",
    title: "Best ChatGPT Alternatives 2026: Free and Paid",
    slug: "best-chatgpt-alternatives-2026-free-paid",
    excerpt: "Compare the best ChatGPT alternatives in 2026 for research, coding, writing, productivity, search, and business workflows.",
    metaTitle: "Best ChatGPT Alternatives 2026: Free and Paid",
    metaDescription: "Compare the best ChatGPT alternatives in 2026 for research, writing, coding, productivity, search, and business use.",
    keywords: "best ChatGPT alternatives 2026, free ChatGPT alternatives, Claude vs Gemini, AI chatbot comparison",
    primaryKeyword: "best ChatGPT alternatives 2026",
    audience: "users who want the right AI assistant for research, writing, coding, or business work",
    cover: "1516321318423-f06f85e504b3",
    images: [
      ["1504384308090-c894fdcc538d", "AI assistant dashboard comparison", "AI chatbot comparison dashboard"],
      ["1498050108023-c5249f4df085", "Developer testing AI assistants on a laptop", "AI assistant testing workflow"],
      ["1551288049-bebda4e38f71", "Analytics screen for comparing AI tools", "AI tool comparison analytics"],
    ],
    quickTake: ["ChatGPT is not the only strong assistant", "Claude is excellent for long writing", "Gemini is useful inside Google workflows", "Perplexity is strong for research", "Coding tools can beat general chatbots for code"],
    workflow: ["Define the job before choosing a model", "Test the same prompt across tools", "Compare accuracy, speed, and source quality", "Check privacy and export options", "Keep a primary and backup assistant"],
    mistakes: ["Choosing only by hype", "Ignoring citation quality", "Using one assistant for every job", "Forgetting team policy and data rules"],
    faqs: [
      ["What is the best ChatGPT alternative in 2026?", "Claude, Gemini, Perplexity, and coding-specific tools are all strong depending on the task. The best choice depends on whether you need writing, research, search, or coding help."],
      ["Are free ChatGPT alternatives good enough?", "Free plans are good for light use, but paid plans usually provide better limits, stronger models, and better workflow features."],
    ],
    related: ["perplexity-vs-google-gemini-2026-research", "copilot-vs-chatgpt-for-coding-2026", "10-best-free-ai-tools-in-2026-that-will-blow-your-mind"],
  },
  {
    category: "tech-guides",
    title: "How to Start a Tech Blog in 2026: SEO Checklist",
    slug: "how-to-start-a-tech-blog-2026-seo-checklist",
    excerpt: "A practical 2026 checklist for starting a tech blog with niche planning, SEO structure, internal links, images, sitemap, and Search Console.",
    metaTitle: "How to Start a Tech Blog in 2026: SEO Checklist",
    metaDescription: "Learn how to start a tech blog in 2026 with niche planning, SEO pages, internal links, images, sitemap, and Search Console setup.",
    keywords: "how to start a tech blog 2026, tech blog SEO checklist, blogging for beginners, Next.js blog SEO",
    primaryKeyword: "how to start a tech blog in 2026",
    audience: "beginners who want a tech blog that can be crawled, trusted, and grown over time",
    cover: "1497366754035-f200968a6e72",
    images: [
      ["1517245386807-bb43f82c33c4", "Planning a tech blog content calendar", "Tech blog content planning"],
      ["1498050108023-c5249f4df085", "Laptop with code for a blog website", "Building a tech blog with code"],
      ["1460925895917-afdab827c52f", "SEO analytics dashboard for blog growth", "Tech blog SEO analytics"],
    ],
    quickTake: ["Pick one clear niche first", "Publish clusters, not random posts", "Use internal links from day one", "Make sitemap and robots clean", "Track indexing before chasing traffic"],
    workflow: ["Choose a narrow topic cluster", "Create five starter posts", "Add About, Privacy, Terms, and Disclaimer pages", "Submit sitemap in Search Console", "Refresh internal links whenever new posts go live"],
    mistakes: ["Writing broad news posts with no topical focus", "Skipping author and trust pages", "Using images without alt text", "Publishing posts with no internal links"],
    faqs: [
      ["Can a new tech blog rank in 2026?", "Yes, but it needs focused topics, helpful content, clean technical SEO, internal links, and patience while Google learns the site."],
      ["How many posts should a new tech blog publish first?", "A good first target is 20 focused posts across a small number of categories, then update and interlink them regularly."],
    ],
    related: ["nextjs-16-deployment-guide-2026-vercel-seo-custom-domain", "website-speed-optimization-checklist-2026-core-web-vitals", "best-ai-tools-for-small-business-2026"],
  },
  {
    category: "tech-guides",
    title: "Website Speed Optimization Checklist 2026",
    slug: "website-speed-optimization-checklist-2026-core-web-vitals",
    excerpt: "Use this 2026 website speed checklist to improve Core Web Vitals, image loading, JavaScript weight, caching, and mobile performance.",
    metaTitle: "Website Speed Optimization Checklist 2026",
    metaDescription: "Improve Core Web Vitals in 2026 with this website speed checklist for images, JavaScript, caching, hosting, and mobile UX.",
    keywords: "website speed optimization checklist 2026, Core Web Vitals checklist, improve LCP INP CLS, website performance SEO",
    primaryKeyword: "website speed optimization checklist 2026",
    audience: "site owners and developers who want faster pages and better technical SEO",
    cover: "1460925895917-afdab827c52f",
    images: [
      ["1551288049-bebda4e38f71", "Performance analytics dashboard for Core Web Vitals", "Core Web Vitals dashboard"],
      ["1555949963-aa79dcee981c", "Server and infrastructure hardware for fast websites", "Fast hosting and caching infrastructure"],
      ["1517694712202-14dd9538aa97", "Developer optimizing website code", "Website performance code optimization"],
    ],
    quickTake: ["Optimize the largest visible image", "Reduce unused JavaScript", "Cache static assets aggressively", "Test mobile first", "Watch real user data, not only lab scores"],
    workflow: ["Measure the page before editing", "Fix LCP image size and format", "Remove render-blocking scripts", "Use lazy loading below the fold", "Retest with field data after deployment"],
    mistakes: ["Optimizing desktop while mobile is slow", "Using oversized hero images", "Adding too many third-party scripts", "Ignoring layout shift caused by missing dimensions"],
    faqs: [
      ["Does website speed affect SEO in 2026?", "Speed is one part of search quality. Faster sites can improve user experience, crawling efficiency, and Core Web Vitals signals."],
      ["What should I optimize first for Core Web Vitals?", "Start with LCP images, JavaScript weight, font loading, and layout stability because these often create the biggest user-facing issues."],
    ],
    related: ["nextjs-16-deployment-guide-2026-vercel-seo-custom-domain", "how-to-start-a-tech-blog-2026-seo-checklist", "react-19-best-practices-2026-faster-apps"],
  },
  {
    category: "tech-guides",
    title: "Online Security Checklist 2026: Passkeys and 2FA",
    slug: "online-security-checklist-2026-passkeys-2fa",
    excerpt: "A simple online security checklist for 2026 covering passkeys, password managers, two-factor authentication, backups, VPNs, and phishing.",
    metaTitle: "Online Security Checklist 2026: Passkeys and 2FA",
    metaDescription: "Protect your accounts in 2026 with passkeys, password managers, 2FA, backups, phishing checks, and practical security habits.",
    keywords: "online security checklist 2026, passkeys 2FA password manager, protect online accounts, cybersecurity basics",
    primaryKeyword: "online security checklist 2026",
    audience: "everyday users, freelancers, and small teams who want stronger account security without confusion",
    cover: "1518770660439-4636190af475",
    images: [
      ["1556157382-97eda2d62296", "Security dashboard on a laptop", "Online account security dashboard"],
      ["1555949963-aa79dcee981c", "Secure data infrastructure", "Data protection infrastructure"],
      ["1498050108023-c5249f4df085", "User checking security settings on a laptop", "Security settings review"],
    ],
    quickTake: ["Use a password manager", "Turn on passkeys where available", "Keep 2FA on important accounts", "Back up recovery codes", "Treat urgent messages as suspicious"],
    workflow: ["List your most important accounts", "Change weak reused passwords", "Enable passkeys or app-based 2FA", "Save backup codes safely", "Review connected apps every month"],
    mistakes: ["Using SMS as the only security layer", "Storing recovery codes in the same inbox", "Clicking login links from urgent emails", "Ignoring old unused accounts"],
    faqs: [
      ["Are passkeys better than passwords?", "Passkeys can be safer and easier because they reduce phishing risk and remove the need to remember long passwords."],
      ["Do I still need 2FA if I use a password manager?", "Yes. A password manager helps with unique passwords, while 2FA adds another layer if a password is exposed."],
    ],
    related: ["how-to-start-a-tech-blog-2026-seo-checklist", "nextjs-16-deployment-guide-2026-vercel-seo-custom-domain", "best-ai-tools-for-small-business-2026"],
  },
  {
    category: "productivity",
    title: "Best AI Productivity Apps for Freelancers 2026",
    slug: "best-ai-productivity-apps-for-freelancers-2026",
    excerpt: "A freelancer-focused guide to AI productivity apps for proposals, client emails, task planning, content, meetings, and weekly reviews.",
    metaTitle: "Best AI Productivity Apps for Freelancers 2026",
    metaDescription: "Find the best AI productivity apps for freelancers in 2026 for proposals, client emails, task planning, content, and admin work.",
    keywords: "best AI productivity apps for freelancers 2026, freelancer AI tools, AI task planner, AI proposal tools",
    primaryKeyword: "best AI productivity apps for freelancers 2026",
    audience: "freelancers who need to protect billable time and reduce admin work",
    cover: "1484480974693-6ca0a78fb36b",
    images: [
      ["1517245386807-bb43f82c33c4", "Freelancer planning client work with AI tools", "Freelancer AI productivity planning"],
      ["1556761175-b413da4baf72", "Client project planning on a laptop", "Client workflow automation"],
      ["1460925895917-afdab827c52f", "Freelance business analytics dashboard", "Freelancer productivity metrics"],
    ],
    quickTake: ["Use AI to draft, not decide", "Automate proposals and follow-ups", "Keep one client dashboard", "Batch admin work", "Review revenue and focus weekly"],
    workflow: ["Create reusable proposal prompts", "Summarize client calls into action items", "Time block deep client work", "Generate first drafts for emails", "Review open invoices and next steps every Friday"],
    mistakes: ["Letting tools scatter tasks", "Sending AI drafts without tone edits", "Tracking too many metrics", "Forgetting to document client decisions"],
    faqs: [
      ["What AI app helps freelancers the most?", "The most useful app is usually the one that reduces proposals, emails, summaries, or task planning because those directly protect billable hours."],
      ["Can AI help freelancers get more clients?", "AI can improve outreach drafts, case studies, and follow-ups, but positioning, proof, and consistent outreach still matter most."],
    ],
    related: ["ai-productivity-workflow-2026-time-blocking-automation", "best-ai-tools-for-small-business-2026", "canva-ai-vs-adobe-express-2026"],
  },
  {
    category: "productivity",
    title: "Time Blocking for Students 2026: AI Study Planner",
    slug: "time-blocking-for-students-2026-ai-study-planner",
    excerpt: "Learn how students can use time blocking and AI planning in 2026 to organize study sessions, homework, revision, and exam prep.",
    metaTitle: "Time Blocking for Students 2026: AI Study Planner",
    metaDescription: "Use time blocking and AI study planning in 2026 to organize homework, revision, exams, breaks, and focused study sessions.",
    keywords: "time blocking for students 2026, AI study planner, student productivity system, exam revision schedule",
    primaryKeyword: "time blocking for students 2026",
    audience: "students who feel busy but want a clearer weekly study plan",
    cover: "1434030216411-0b793f4b4173",
    images: [
      ["1484480974693-6ca0a78fb36b", "Notebook and calendar for student time blocking", "Student time blocking calendar"],
      ["1522202176988-66273c2fd55f", "Students working together with laptops", "Collaborative study planning"],
      ["1517245386807-bb43f82c33c4", "Study notes and laptop planning desk", "AI study planner workspace"],
    ],
    quickTake: ["Plan energy, not only tasks", "Block review before deadlines", "Use AI to break big assignments into steps", "Keep breaks visible", "Review the plan every Sunday"],
    workflow: ["List every class and deadline", "Ask AI to split large tasks", "Block hard subjects during peak focus", "Add short review sessions after lectures", "Adjust the plan based on real progress"],
    mistakes: ["Filling every hour with work", "Ignoring sleep and commute time", "Studying only before exams", "Making a plan and never reviewing it"],
    faqs: [
      ["Is time blocking good for students?", "Yes, because it connects homework and revision to real available time instead of leaving everything on a vague to-do list."],
      ["Can AI create a study schedule?", "AI can draft a schedule, but students should adjust it for energy, deadlines, class timing, and realistic breaks."],
    ],
    related: ["best-ai-tools-for-students-2026-free-study-apps", "ai-productivity-workflow-2026-time-blocking-automation", "notion-vs-obsidian-vs-apple-notes-2026"],
  },
  {
    category: "productivity",
    title: "Notion vs Obsidian vs Apple Notes 2026",
    slug: "notion-vs-obsidian-vs-apple-notes-2026",
    excerpt: "Compare Notion, Obsidian, and Apple Notes in 2026 for students, creators, freelancers, personal knowledge management, and daily planning.",
    metaTitle: "Notion vs Obsidian vs Apple Notes 2026",
    metaDescription: "Compare Notion, Obsidian, and Apple Notes in 2026 for planning, knowledge management, writing, students, and freelancers.",
    keywords: "Notion vs Obsidian vs Apple Notes 2026, best notes app 2026, productivity notes app comparison",
    primaryKeyword: "Notion vs Obsidian vs Apple Notes 2026",
    audience: "people choosing one notes system for planning, research, and everyday capture",
    cover: "1517245386807-bb43f82c33c4",
    images: [
      ["1484480974693-6ca0a78fb36b", "Notebook and laptop for personal knowledge management", "Personal knowledge management setup"],
      ["1516321318423-f06f85e504b3", "Digital notes and research workflow", "Digital note-taking workflow"],
      ["1522202176988-66273c2fd55f", "Team sharing notes on laptops", "Collaborative notes workflow"],
    ],
    quickTake: ["Notion is best for structured workspaces", "Obsidian is best for local linked notes", "Apple Notes is best for simple capture", "Choose by workflow, not feature count", "Avoid moving notes every month"],
    workflow: ["Pick one capture inbox", "Decide whether you need collaboration", "Choose local-first or cloud-first", "Build three templates only", "Archive notes weekly so search stays useful"],
    mistakes: ["Switching apps instead of improving habits", "Building huge dashboards before writing notes", "Using tags with no review system", "Mixing personal and client notes without boundaries"],
    faqs: [
      ["Is Obsidian better than Notion in 2026?", "Obsidian is better for local linked notes and long-term knowledge. Notion is better for databases, teams, and visual project dashboards."],
      ["Is Apple Notes enough for productivity?", "Apple Notes is enough for simple capture, quick lists, scans, and personal notes. It is less powerful for databases and complex workflows."],
    ],
    related: ["ai-productivity-workflow-2026-time-blocking-automation", "time-blocking-for-students-2026-ai-study-planner", "best-ai-productivity-apps-for-freelancers-2026"],
  },
  {
    category: "coding",
    title: "JavaScript Roadmap 2026: Beginner to Job Ready",
    slug: "javascript-roadmap-2026-beginner-job-ready",
    excerpt: "A practical JavaScript roadmap for 2026 covering fundamentals, DOM, async code, TypeScript, React, APIs, testing, and portfolio projects.",
    metaTitle: "JavaScript Roadmap 2026: Beginner to Job Ready",
    metaDescription: "Follow this JavaScript roadmap for 2026 to learn fundamentals, async code, TypeScript, React, APIs, testing, and job-ready projects.",
    keywords: "JavaScript roadmap 2026, learn JavaScript for beginners, frontend developer roadmap, JavaScript projects",
    primaryKeyword: "JavaScript roadmap 2026",
    audience: "beginners who want a focused path from basics to portfolio-ready JavaScript projects",
    cover: "1517694712202-14dd9538aa97",
    images: [
      ["1542831371-29b0f74f9713", "JavaScript code on a development screen", "JavaScript code practice"],
      ["1498050108023-c5249f4df085", "Developer building a web app", "Frontend developer workflow"],
      ["1555066931-4365d14bab8c", "Code editor for web application development", "Web app development project"],
    ],
    quickTake: ["Learn fundamentals before frameworks", "Practice DOM and async code", "Add TypeScript after JavaScript basics", "Build small projects weekly", "Use AI as a tutor, not a crutch"],
    workflow: ["Study syntax and data structures", "Build DOM projects", "Learn fetch, promises, and APIs", "Move into TypeScript and React", "Create portfolio projects with tests"],
    mistakes: ["Jumping into React too early", "Watching tutorials without building", "Ignoring browser fundamentals", "Depending on AI without understanding the output"],
    faqs: [
      ["Can I learn JavaScript in 2026 as a beginner?", "Yes. JavaScript is still one of the best first languages for web development because it runs in the browser and powers full-stack apps."],
      ["Should I learn TypeScript before JavaScript?", "Learn JavaScript basics first, then add TypeScript once functions, arrays, objects, async code, and modules feel comfortable."],
    ],
    related: ["react-19-best-practices-2026-faster-apps", "best-ai-coding-assistants-2026-copilot-cursor-windsurf", "copilot-vs-chatgpt-for-coding-2026"],
  },
  {
    category: "coding",
    title: "React 19 Best Practices 2026: Faster Apps",
    slug: "react-19-best-practices-2026-faster-apps",
    excerpt: "Build faster React 19 apps in 2026 with better component structure, server rendering, forms, state, performance, accessibility, and testing.",
    metaTitle: "React 19 Best Practices 2026: Faster Apps",
    metaDescription: "Use these React 19 best practices in 2026 for faster apps, cleaner components, forms, state, accessibility, testing, and performance.",
    keywords: "React 19 best practices 2026, React performance tips, React app architecture, frontend best practices",
    primaryKeyword: "React 19 best practices 2026",
    audience: "frontend developers who want cleaner React apps that load quickly and stay maintainable",
    cover: "1498050108023-c5249f4df085",
    images: [
      ["1555066931-4365d14bab8c", "React app code on a developer laptop", "React component development"],
      ["1460925895917-afdab827c52f", "Performance dashboard for a web app", "React performance monitoring"],
      ["1517694712202-14dd9538aa97", "Developer writing frontend code", "Frontend coding workflow"],
    ],
    quickTake: ["Keep components small and purposeful", "Prefer server rendering for content pages", "Measure before optimizing", "Use accessible primitives", "Test critical user flows"],
    workflow: ["Design route-level data boundaries", "Split interactive islands carefully", "Use forms with clear validation", "Memoize only after measuring", "Run accessibility and performance checks before release"],
    mistakes: ["Turning every component into client-side code", "Adding state too high in the tree", "Ignoring keyboard navigation", "Optimizing with no measurement"],
    faqs: [
      ["Is React still worth learning in 2026?", "Yes. React remains widely used, especially with Next.js, component libraries, and modern full-stack web apps."],
      ["What makes a React app fast?", "Fast React apps use good rendering strategy, optimized images, restrained JavaScript, stable layout, and measured performance improvements."],
    ],
    related: ["nextjs-16-deployment-guide-2026-vercel-seo-custom-domain", "website-speed-optimization-checklist-2026-core-web-vitals", "javascript-roadmap-2026-beginner-job-ready"],
  },
  {
    category: "coding",
    title: "Build a RAG Chatbot with Next.js in 2026",
    slug: "build-rag-chatbot-nextjs-2026",
    excerpt: "Learn the architecture of a RAG chatbot in Next.js with documents, embeddings, retrieval, prompts, API routes, evaluation, and deployment.",
    metaTitle: "Build a RAG Chatbot with Next.js in 2026",
    metaDescription: "Build a RAG chatbot with Next.js in 2026 using documents, embeddings, retrieval, prompts, API routes, evaluation, and deployment.",
    keywords: "build RAG chatbot Next.js 2026, RAG app tutorial, Next.js AI chatbot, vector database chatbot",
    primaryKeyword: "build RAG chatbot Next.js 2026",
    audience: "developers who want a practical AI app that answers from their own documents",
    cover: "1551288049-bebda4e38f71",
    images: [
      ["1515879218367-8466d910aaa4", "Developer coding an AI chatbot workflow", "RAG chatbot development workflow"],
      ["1504384308090-c894fdcc538d", "Data and search dashboard for retrieval", "RAG retrieval dashboard"],
      ["1555949963-aa79dcee981c", "Server infrastructure for AI app deployment", "RAG chatbot deployment infrastructure"],
    ],
    quickTake: ["RAG starts with clean documents", "Chunking quality affects answer quality", "Retrieval needs source metadata", "Prompts should cite context", "Evaluation is required before launch"],
    workflow: ["Collect trusted documents", "Chunk and embed the content", "Store vectors with metadata", "Retrieve the best context per question", "Generate answers with citations and test failures"],
    mistakes: ["Embedding messy documents", "Ignoring source titles and URLs", "Letting the model answer without context", "Skipping evaluation on real questions"],
    faqs: [
      ["What is a RAG chatbot?", "A RAG chatbot retrieves relevant content from a knowledge base before generating an answer, which helps it stay grounded in your documents."],
      ["Can Next.js run a RAG chatbot?", "Yes. Next.js can handle the UI and API routes, while embeddings, vector search, and model calls can run through server-side services."],
    ],
    related: ["python-ai-agent-tutorial-2026-langgraph-rag-tools", "nextjs-16-deployment-guide-2026-vercel-seo-custom-domain", "react-19-best-practices-2026-faster-apps"],
  },
  {
    category: "software-reviews",
    title: "Copilot vs ChatGPT for Coding 2026",
    slug: "copilot-vs-chatgpt-for-coding-2026",
    excerpt: "A practical comparison of GitHub Copilot and ChatGPT for coding in 2026, including autocomplete, debugging, architecture, tests, and learning.",
    metaTitle: "Copilot vs ChatGPT for Coding 2026",
    metaDescription: "Compare Copilot vs ChatGPT for coding in 2026 across autocomplete, debugging, architecture, tests, learning, and team workflows.",
    keywords: "Copilot vs ChatGPT for coding 2026, GitHub Copilot comparison, ChatGPT coding review, AI coding tools",
    primaryKeyword: "Copilot vs ChatGPT for coding 2026",
    audience: "developers deciding which AI assistant fits daily coding work",
    cover: "1555066931-4365d14bab8c",
    images: [
      ["1517694712202-14dd9538aa97", "Code editor with AI autocomplete workflow", "AI coding assistant autocomplete"],
      ["1526379095098-d400fd0bf935", "Developer debugging code with an AI assistant", "AI debugging workflow"],
      ["1551288049-bebda4e38f71", "Software productivity comparison dashboard", "AI coding productivity comparison"],
    ],
    quickTake: ["Copilot is better inside the editor", "ChatGPT is stronger for explanations", "Use both for different stages", "Teams need governance", "Tests still decide quality"],
    workflow: ["Use Copilot for autocomplete and small edits", "Use ChatGPT for planning and explanation", "Ask for test cases before refactors", "Review every generated change", "Measure bugs and time saved"],
    mistakes: ["Accepting code without tests", "Using chat for secrets or private data", "Expecting one tool to do every job", "Skipping code review because AI wrote it"],
    faqs: [
      ["Is Copilot better than ChatGPT for coding?", "Copilot is usually better for in-editor completion. ChatGPT is often better for explanations, architecture discussion, and learning."],
      ["Should beginners use AI coding tools?", "Beginners can use them as tutors, but they should still write code manually and understand each change before shipping it."],
    ],
    related: ["best-ai-coding-assistants-2026-copilot-cursor-windsurf", "javascript-roadmap-2026-beginner-job-ready", "python-ai-agent-tutorial-2026-langgraph-rag-tools"],
  },
  {
    category: "software-reviews",
    title: "Canva AI vs Adobe Express 2026",
    slug: "canva-ai-vs-adobe-express-2026",
    excerpt: "Compare Canva AI and Adobe Express in 2026 for social graphics, brand kits, presentations, AI writing, templates, and creator workflows.",
    metaTitle: "Canva AI vs Adobe Express 2026",
    metaDescription: "Compare Canva AI vs Adobe Express in 2026 for social graphics, brand kits, templates, presentations, AI writing, and creators.",
    keywords: "Canva AI vs Adobe Express 2026, AI design tools comparison, Canva Magic Studio review, Adobe Express review",
    primaryKeyword: "Canva AI vs Adobe Express 2026",
    audience: "creators, small businesses, and marketers choosing a fast visual design tool",
    cover: "1557804506-669a67965ba0",
    images: [
      ["1556761175-b413da4baf72", "Designer planning social media graphics", "AI design workflow for creators"],
      ["1542744173-8e7e53415bb0", "Marketing team reviewing brand visuals", "Brand design review workflow"],
      ["1521737604893-d14cc237f11d", "Creative team collaborating on a laptop", "Creative design collaboration"],
    ],
    quickTake: ["Canva is easier for fast templates", "Adobe Express fits Adobe users", "Brand kits matter for teams", "AI writing helps but needs editing", "Choose by workflow and asset library"],
    workflow: ["List the content formats you publish weekly", "Test brand kit setup", "Create one social post and one presentation", "Compare export quality and speed", "Pick the tool your team finishes work in faster"],
    mistakes: ["Choosing by template count only", "Ignoring brand consistency", "Using AI text without editing", "Forgetting licensing and export needs"],
    faqs: [
      ["Is Canva AI better than Adobe Express?", "Canva AI is often easier for quick content and templates. Adobe Express is attractive for people already using Adobe assets and workflows."],
      ["Which tool is better for small business marketing?", "Canva is usually the simpler starting point, while Adobe Express can fit teams already invested in Adobe tools."],
    ],
    related: ["best-ai-tools-for-small-business-2026", "best-ai-productivity-apps-for-freelancers-2026", "10-best-free-ai-tools-in-2026-that-will-blow-your-mind"],
  },
  {
    category: "software-reviews",
    title: "Perplexity vs Google Gemini 2026",
    slug: "perplexity-vs-google-gemini-2026-research",
    excerpt: "Compare Perplexity and Google Gemini in 2026 for research, citations, summaries, search workflows, student use, and business analysis.",
    metaTitle: "Perplexity vs Google Gemini 2026",
    metaDescription: "Compare Perplexity vs Google Gemini in 2026 for research, citations, summaries, search workflows, students, and business analysis.",
    keywords: "Perplexity vs Google Gemini 2026, AI research tools comparison, best AI search engine, Gemini vs Perplexity",
    primaryKeyword: "Perplexity vs Google Gemini 2026",
    audience: "students, researchers, and professionals choosing an AI research assistant",
    cover: "1504384308090-c894fdcc538d",
    images: [
      ["1516321318423-f06f85e504b3", "Research assistant open on a laptop", "AI research assistant workflow"],
      ["1460925895917-afdab827c52f", "Research analytics and source dashboard", "AI research comparison dashboard"],
      ["1434030216411-0b793f4b4173", "Student researching with AI tools", "Student AI research workflow"],
    ],
    quickTake: ["Perplexity is strong for cited answers", "Gemini fits Google workspace users", "Research quality depends on sources", "Use follow-up questions carefully", "Never cite AI without checking the source"],
    workflow: ["Start with a narrow research question", "Ask for sources and compare them", "Open original pages before citing", "Use Gemini for workspace context when helpful", "Save final notes in your own words"],
    mistakes: ["Trusting summaries without opening sources", "Using broad vague prompts", "Mixing opinions with facts", "Forgetting date-sensitive information"],
    faqs: [
      ["Is Perplexity better than Gemini for research?", "Perplexity is often stronger for source-led answers. Gemini can be better when you work inside Google tools and need broader assistant features."],
      ["Can AI research tools replace Google Search?", "They can speed up research, but you should still open and verify original sources for important decisions."],
    ],
    related: ["best-chatgpt-alternatives-2026-free-paid", "best-ai-tools-for-students-2026-free-study-apps", "10-best-free-ai-tools-in-2026-that-will-blow-your-mind"],
  },
];

const allPostTitles = new Map([...existingPosts, ...newPosts].map((post) => [post.slug, post.title]));

const refreshedRelated = {
  "10-best-free-ai-tools-in-2026-that-will-blow-your-mind": ["best-ai-tools-for-students-2026-free-study-apps", "best-chatgpt-alternatives-2026-free-paid", "best-ai-productivity-apps-for-freelancers-2026", "best-ai-coding-assistants-2026-copilot-cursor-windsurf"],
  "nextjs-16-deployment-guide-2026-vercel-seo-custom-domain": ["how-to-start-a-tech-blog-2026-seo-checklist", "website-speed-optimization-checklist-2026-core-web-vitals", "build-rag-chatbot-nextjs-2026", "react-19-best-practices-2026-faster-apps"],
  "ai-productivity-workflow-2026-time-blocking-automation": ["best-ai-productivity-apps-for-freelancers-2026", "time-blocking-for-students-2026-ai-study-planner", "notion-vs-obsidian-vs-apple-notes-2026", "best-ai-tools-for-students-2026-free-study-apps"],
  "python-ai-agent-tutorial-2026-langgraph-rag-tools": ["build-rag-chatbot-nextjs-2026", "javascript-roadmap-2026-beginner-job-ready", "react-19-best-practices-2026-faster-apps", "copilot-vs-chatgpt-for-coding-2026"],
  "best-ai-coding-assistants-2026-copilot-cursor-windsurf": ["copilot-vs-chatgpt-for-coding-2026", "javascript-roadmap-2026-beginner-job-ready", "python-ai-agent-tutorial-2026-langgraph-rag-tools", "react-19-best-practices-2026-faster-apps"],
};

function buildRelatedSection(slug, relatedSlugs) {
  const links = relatedSlugs
    .filter((relatedSlug) => relatedSlug !== slug)
    .map((relatedSlug) => {
      const title = allPostTitles.get(relatedSlug);
      if (!title) throw new Error(`Missing related post title for ${relatedSlug}`);
      return `[${title}](/blog/${relatedSlug})`;
    });

  return `## Related ByteVerse guides\n\nNext, read ${links.slice(0, -1).join(", ")}, and ${links.at(-1)} to build a stronger workflow around this topic.\n`;
}

function buildContent(post) {
  const imageOne = post.images[0];
  const imageTwo = post.images[1];
  const imageThree = post.images[2];

  return [
    `If you are searching for **${post.primaryKeyword}**, the real goal is not to collect another list of apps. The goal is to choose a setup that saves time, reduces confusion, and gives you results you can repeat every week.`,
    `This guide is written for ${post.audience}. It focuses on practical choices, clear trade-offs, and steps you can actually use instead of chasing every shiny new feature.`,
    `![${imageOne[1]}](${imageUrl(imageOne[0])} "${imageOne[2]}")`,
    `## Quick answer`,
    `The best choice in this category is the one that fits your daily workflow, has a clear free or affordable plan, protects your data, and produces outputs you can verify. A tool that looks impressive in a demo is less useful than a tool that quietly removes friction from real work.`,
    post.quickTake.map((item) => `- ${item}`).join("\n"),
    `## How to choose the right option`,
    `Start with the outcome before choosing the tool. If the outcome is research, source quality matters. If the outcome is content, editing control matters. If the outcome is coding or automation, accuracy, testing, and privacy matter more than speed alone.`,
    `A simple rule works well: test the same real task in two or three options, then compare time saved, quality, ease of use, and how much cleanup the output needs.`,
    `![${imageTwo[1]}](${imageUrl(imageTwo[0])} "${imageTwo[2]}")`,
    `## Practical workflow for 2026`,
    `Use this workflow as a starting point. It keeps the process simple enough to repeat while still giving you room to customize it for your own work.`,
    post.workflow.map((item, index) => `${index + 1}. ${item}`).join("\n"),
    `## What to look for before you commit`,
    `A good tool should be easy to start, but it should also hold up after the first week. Look for export options, privacy controls, clear pricing, stable performance, and support for the platforms you already use.`,
    `For SEO, productivity, and business use, the strongest workflows usually combine one main tool with one supporting tool. Too many apps create context switching, duplicated notes, and extra decisions.`,
    `![${imageThree[1]}](${imageUrl(imageThree[0])} "${imageThree[2]}")`,
    `## Common mistakes to avoid`,
    post.mistakes.map((item) => `- ${item}`).join("\n"),
    buildRelatedSection(post.slug, post.related),
    `## Frequently Asked Questions`,
    ...post.faqs.flatMap(([question, answer]) => [`### ${question}`, answer]),
    `## Final recommendation`,
    `The smartest approach is to start small, measure the result, and only add complexity when it clearly improves the workflow. ${post.primaryKeyword} is a useful search topic, but rankings and real results come from helpful execution, not tool collecting.`,
    `Pick one primary workflow, test it for seven days, and keep the pieces that save time without reducing quality. That is the kind of system people return to, share, and trust.`,
  ].join("\n\n");
}

function replaceRelatedSection(content, slug, relatedSlugs) {
  const section = buildRelatedSection(slug, relatedSlugs).trimEnd();
  const normalized = content.replace(/\r\n/g, "\n");
  const heading = "## Related ByteVerse guides";
  const start = normalized.indexOf(heading);

  if (start === -1) {
    return `${normalized.trimEnd()}\n\n${section}\n`;
  }

  const afterHeading = normalized.slice(start + heading.length);
  const nextHeading = afterHeading.match(/\n##\s+(?!Related ByteVerse guides)/);
  const end = nextHeading ? start + heading.length + nextHeading.index : normalized.length;

  return `${normalized.slice(0, start).trimEnd()}\n\n${section}\n\n${normalized.slice(end).trimStart()}`;
}

function readingTime(content) {
  return `${Math.max(1, Math.ceil(content.split(/\s+/).length / 200))} min read`;
}

function assertPost(post, content) {
  if (post.metaTitle.length > 70) throw new Error(`Meta title too long: ${post.slug}`);
  if (post.metaDescription.length > 160) throw new Error(`Meta description too long: ${post.slug}`);
  if (content.includes("\u2014")) throw new Error(`Em dash found in content: ${post.slug}`);
  if (content.includes(",auto=format")) throw new Error(`Malformed image URL found: ${post.slug}`);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing");

  const categories = await sql`select id, slug from categories`;
  const categoryIds = new Map(categories.map((category) => [category.slug, category.id]));
  const inserted = [];

  for (const post of newPosts) {
    const categoryId = categoryIds.get(post.category);
    if (!categoryId) throw new Error(`Missing category: ${post.category}`);

    const content = buildContent(post);
    assertPost(post, content);

    const [saved] = await sql`
      insert into posts (
        title, slug, excerpt, content, cover_image, category_id, author, published, featured,
        meta_title, meta_description, keywords, reading_time, updated_at
      ) values (
        ${post.title}, ${post.slug}, ${post.excerpt}, ${content}, ${imageUrl(post.cover, 1600)}, ${categoryId}, ${author}, true, false,
        ${post.metaTitle}, ${post.metaDescription}, ${post.keywords}, ${readingTime(content)}, now()
      )
      on conflict (slug) do update set
        title = excluded.title,
        excerpt = excluded.excerpt,
        content = excluded.content,
        cover_image = excluded.cover_image,
        category_id = excluded.category_id,
        author = excluded.author,
        published = excluded.published,
        featured = excluded.featured,
        meta_title = excluded.meta_title,
        meta_description = excluded.meta_description,
        keywords = excluded.keywords,
        reading_time = excluded.reading_time,
        updated_at = now()
      returning id, slug
    `;

    inserted.push(saved);
  }

  for (const post of newPosts) {
    refreshedRelated[post.slug] = post.related;
  }

  const allSlugs = Object.keys(refreshedRelated);
  const refreshed = [];

  for (const slug of allSlugs) {
    const [row] = await sql`select id, content from posts where slug = ${slug} limit 1`;
    if (!row) throw new Error(`Missing post while refreshing links: ${slug}`);
    const content = replaceRelatedSection(row.content, slug, refreshedRelated[slug]);
    assertPost({ slug, metaTitle: "ok", metaDescription: "ok" }, content);
    await sql`update posts set content = ${content}, reading_time = ${readingTime(content)}, updated_at = now() where id = ${row.id}`;
    refreshed.push(slug);
  }

  console.log(JSON.stringify({ insertedOrUpdated: inserted, refreshedRelatedSections: refreshed.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});