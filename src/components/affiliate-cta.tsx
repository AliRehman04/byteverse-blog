"use client";

import { ExternalLink, Star, Shield, Zap, Globe, PenTool, Search, Laptop, Lock, Server } from "lucide-react";

/* ── Affiliate Product Definitions ────────────────────── */
interface AffiliateProduct {
  name: string;
  tagline: string;
  description: string;
  url: string; // placeholder — replace with real affiliate links
  cta: string;
  icon: React.ElementType;
  color: string; // tailwind bg class
  badge?: string;
  sponsored?: boolean;
}

const PRODUCTS: Record<string, AffiliateProduct> = {
  nordvpn: {
    name: "NordVPN",
    tagline: "Stay Safe Online",
    description: "Military-grade encryption, 6,400+ servers in 111 countries. Get up to 77% off with our exclusive deal.",
    url: "https://go.nordvpn.net/aff_c?offer_id=15&aff_id=REPLACE_YOUR_ID",
    cta: "Get NordVPN Deal →",
    icon: Shield,
    color: "from-blue-600 to-blue-800",
    badge: "77% OFF",
  },
  hostinger: {
    name: "Hostinger",
    tagline: "Premium Hosting from $2.99/mo",
    description: "Lightning-fast web hosting with free domain, SSL, and WordPress setup. Perfect for developers and bloggers.",
    url: "https://hostinger.com?REFERRALCODE=REPLACE_YOUR_ID",
    cta: "Start with Hostinger →",
    icon: Globe,
    color: "from-violet-600 to-purple-800",
    badge: "60% OFF",
  },
  grammarly: {
    name: "Grammarly",
    tagline: "Write Better, Instantly",
    description: "AI-powered writing assistant that checks grammar, tone, and clarity. Free plan available, Premium unlocks advanced features.",
    url: "https://grammarly.go2cloud.org/aff_c?offer_id=1&aff_id=REPLACE_YOUR_ID",
    cta: "Try Grammarly Free →",
    icon: PenTool,
    color: "from-green-600 to-emerald-800",
    badge: "FREE PLAN",
  },
  jasper: {
    name: "Jasper AI",
    tagline: "AI Content Creation Platform",
    description: "Create blog posts, social media content, and marketing copy 10x faster with AI. 30% recurring commissions.",
    url: "https://jasper.ai?ref=REPLACE_YOUR_ID",
    cta: "Try Jasper AI Free →",
    icon: Zap,
    color: "from-orange-500 to-red-700",
  },
  semrush: {
    name: "Semrush",
    tagline: "All-in-One SEO Toolkit",
    description: "Keyword research, site audit, rank tracking, and competitor analysis. The #1 tool for SEO professionals.",
    url: "https://www.semrush.com/lp/affiliate/?ref=REPLACE_YOUR_ID",
    cta: "Try Semrush Free →",
    icon: Search,
    color: "from-orange-600 to-amber-800",
    badge: "FREE TRIAL",
  },
  bitwarden: {
    name: "Bitwarden",
    tagline: "Open-Source Password Manager",
    description: "Secure, open-source password manager for all your devices. Premium starts at $1/month.",
    url: "https://bitwarden.com/?ref=REPLACE_YOUR_ID",
    cta: "Get Bitwarden Free →",
    icon: Lock,
    color: "from-sky-600 to-blue-800",
    badge: "FREE PLAN",
  },
  cloudways: {
    name: "Cloudways",
    tagline: "Managed Cloud Hosting",
    description: "Deploy lightning-fast cloud servers on AWS, Google Cloud, or DigitalOcean with zero hassle.",
    url: "https://www.cloudways.com/en/?id=REPLACE_YOUR_ID",
    cta: "Start Free Trial →",
    icon: Server,
    color: "from-teal-600 to-cyan-800",
    badge: "3-DAY FREE",
  },
  laptops: {
    name: "Best Coding Laptops",
    tagline: "Top Picks on Amazon",
    description: "Our hand-picked developer laptops tested for performance, battery, and coding comfort. All budgets covered.",
    url: "https://www.amazon.com/s?k=laptop+for+programming&tag=REPLACE_YOUR_TAG",
    cta: "View on Amazon →",
    icon: Laptop,
    color: "from-slate-700 to-slate-900",
  },
  copilot: {
    name: "GitHub Copilot",
    tagline: "AI Pair Programmer",
    description: "Write code faster with AI suggestions. Supports all major languages and editors. Free for students & open source.",
    url: "https://github.com/features/copilot",
    cta: "Try GitHub Copilot →",
    icon: Zap,
    color: "from-gray-700 to-gray-900",
    badge: "FREE TIER",
    sponsored: false,
  },
  canva: {
    name: "Canva Pro",
    tagline: "Design Anything with AI",
    description: "Create stunning graphics, presentations, and videos with AI-powered tools. Free plan available.",
    url: "https://partner.canva.com/c/REPLACE_YOUR_ID",
    cta: "Try Canva Pro Free →",
    icon: Star,
    color: "from-purple-600 to-indigo-800",
    badge: "FREE PLAN",
  },
};

/* ── Slug → Products mapping ────────────────────── */
const SLUG_PRODUCTS: Record<string, string[]> = {
  // Cybersecurity (cat 6)
  "best-free-vpn-2026": ["nordvpn", "bitwarden"],
  "best-password-managers-2026": ["bitwarden", "nordvpn"],
  "check-if-email-hacked-2026": ["nordvpn", "bitwarden"],
  "two-factor-authentication-guide-2026": ["bitwarden", "nordvpn"],
  "how-to-create-strong-passwords-2026": ["bitwarden", "nordvpn"],
  "online-security-checklist-2026-passkeys-2fa": ["nordvpn", "bitwarden"],

  // Hosting/Portfolio (cat 2)
  "how-to-start-a-tech-blog-2026-seo-checklist": ["hostinger", "semrush"],
  "build-portfolio-website-2026": ["hostinger", "cloudways"],
  "how-to-build-portfolio-website-2026": ["hostinger", "cloudways"],
  "best-free-hosting-platforms-2026": ["hostinger", "cloudways"],
  "nextjs-16-deployment-guide-2026-vercel-seo-custom-domain": ["hostinger", "cloudways"],
  "best-ai-website-builders-2026": ["hostinger", "cloudways"],
  "docker-for-beginners-2026-guide": ["cloudways", "hostinger"],
  "docker-for-beginners-complete-guide": ["cloudways", "hostinger"],
  "linux-wsl-setup-guide-2026-windows-developers": ["hostinger"],
  "website-speed-optimization-checklist-2026-core-web-vitals": ["hostinger", "semrush"],

  // AI Writing/Tools (cat 1)
  "best-ai-writing-tools-2026": ["grammarly", "jasper"],
  "10-best-free-ai-tools-in-2026-that-will-blow-your-mind": ["jasper", "grammarly"],
  "best-ai-tools-for-small-business-2026": ["jasper", "grammarly", "semrush"],
  "how-to-make-money-with-ai-2026": ["jasper", "hostinger"],
  "best-ai-tools-for-students-2026-free-study-apps": ["grammarly", "canva"],
  "best-chatgpt-alternatives-2026-free-paid": ["jasper", "grammarly"],
  "best-ai-apps-for-iphone-2026": ["grammarly", "nordvpn"],
  "best-ai-video-generators-2026": ["canva", "jasper"],
  "github-copilot-guide-2026": ["copilot", "grammarly"],
  "what-is-claude-code-guide-2026": ["copilot", "jasper"],

  // Productivity (cat 3)
  "ai-productivity-workflow-2026-time-blocking-automation": ["grammarly", "jasper"],
  "best-ai-productivity-apps-for-freelancers-2026": ["grammarly", "jasper", "semrush"],
  "best-chatgpt-prompts-for-work-2026": ["grammarly", "jasper"],
  "time-blocking-for-students-2026-ai-study-planner": ["grammarly"],
  "notion-vs-obsidian-vs-apple-notes-2026": ["grammarly"],
  "how-to-start-freelancing-developer-2026": ["hostinger", "grammarly"],
  "best-chrome-extensions-developers-2026": ["grammarly", "nordvpn"],

  // Coding (cat 4)
  "best-ai-coding-assistants-2026-copilot-cursor-windsurf": ["copilot"],
  "copilot-vs-chatgpt-for-coding-2026": ["copilot"],
  "how-to-use-cursor-ai-2026-guide": ["copilot"],
  "python-ai-agent-tutorial-2026-langgraph-rag-tools": ["copilot", "cloudways"],
  "javascript-roadmap-2026-beginner-job-ready": ["copilot", "hostinger"],
  "react-19-best-practices-2026-faster-apps": ["copilot", "hostinger"],
  "build-rag-chatbot-nextjs-2026": ["copilot", "cloudways"],
  "best-vscode-extensions-2026-web-developers": ["copilot"],
  "how-to-learn-programming-2026-beginner-roadmap": ["copilot", "hostinger"],
  "best-vscode-extensions-2026": ["copilot"],
  "git-github-beginners-guide-2026": ["copilot"],
  "tailwind-css-4-guide-2026": ["copilot", "hostinger"],
  "best-free-apis-for-developers-2026": ["copilot", "cloudways"],
  "top-programming-languages-2026": ["copilot"],
  "typescript-for-beginners-2026-complete-guide": ["copilot"],
  "vibe-coding-guide-2026": ["copilot", "jasper"],

  // Software Reviews (cat 5)
  "best-ai-image-generators-2026-free-paid": ["canva", "jasper"],
  "canva-ai-vs-adobe-express-2026": ["canva"],
  "perplexity-vs-google-gemini-2026-research": ["grammarly"],
  "claude-vs-chatgpt-2026-comparison": ["copilot", "jasper"],
  "best-ai-code-editors-2026": ["copilot"],
  "apify-review-web-scraping-ai-platform-2026": ["cloudways", "copilot"],

  // Hardware
  "best-laptops-for-coding-2026-developers": ["laptops"],

  // SEO
  "best-seo-tools-2026": ["semrush", "grammarly"],
};

/* ── Component ────────────────────── */
export function AffiliateCTA({ slug }: { slug: string }) {
  const productKeys = SLUG_PRODUCTS[slug];
  if (!productKeys || productKeys.length === 0) return null;

  const products = productKeys
    .map((key) => PRODUCTS[key])
    .filter((p) => p && !p.url.includes("REPLACE_YOUR"))
    .slice(0, 2); // max 2 CTAs per post

  if (products.length === 0) return null;

  return (
    <section className="my-10" aria-label="Recommended products">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
        <Star size={14} className="text-amber-500" />
        Recommended Products
      </p>
      <div className={`grid gap-4 ${products.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {products.map((product) => {
          const Icon = product.icon;
          return (
            <a
              key={product.name}
              href={product.url}
              target="_blank"
              rel={product.sponsored === false ? "noopener noreferrer" : "noopener noreferrer nofollow sponsored"}
              className="group relative overflow-hidden rounded-2xl p-5 sm:p-6 text-white transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
            >
              {/* Gradient background */}
              <div className={`absolute inset-0 bg-linear-to-br ${product.color} transition-opacity`} />
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Badge */}
              {product.badge && (
                <span className="relative inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm mb-3">
                  {product.badge}
                </span>
              )}

              <div className="relative">
                <div className="flex items-start gap-3 mb-2">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm shrink-0">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{product.name}</h3>
                    <p className="text-white/70 text-sm">{product.tagline}</p>
                  </div>
                </div>

                <p className="text-sm text-white/80 leading-relaxed mt-3 mb-4">
                  {product.description}
                </p>

                <span className="inline-flex items-center gap-2 text-sm font-semibold bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg transition-colors">
                  {product.cta}
                  <ExternalLink size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>

              {/* Decorative circle */}
              <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-white/5" />
            </a>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground mt-3 italic">
        Disclosure: Some links above are affiliate links. We may earn a small commission at no extra cost to you.
      </p>
    </section>
  );
}
