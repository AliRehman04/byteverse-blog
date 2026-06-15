import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Sparkles, BookOpen, Cpu, TrendingUp, Code2, Braces, Layers, Bot, Monitor, Star, Package, Lightbulb, Wrench, Zap, Shield, FlaskConical, Target, MousePointerClick, ShieldCheck, Flame } from "lucide-react";
import { LazyNewsletter } from "@/components/lazy-newsletter";
import { siteConfig } from "@/lib/config";
import { getSiteLogoImageSchema } from "@/lib/image-seo";
import { db } from "@/lib/db";
import { categories, posts } from "@/lib/db/schema";
import { eq, desc, sql, count, and } from "drizzle-orm";
import { GridPostCard } from "@/components/post-card";
import { LazyHeroCodeBlock } from "@/components/lazy-hero";

export const metadata: Metadata = {
  title: `${siteConfig.name} | AI Tools, Tech Guides & Productivity`,
  description: siteConfig.description,
  publisher: siteConfig.name,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} | AI Tools, Tech Guides & Productivity`,
    description: siteConfig.description,
    images: [{ url: `${siteConfig.url}/opengraph-image`, width: 1200, height: 630, alt: siteConfig.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} | AI Tools, Tech Guides & Productivity`,
    description: siteConfig.description,
    images: [`${siteConfig.url}/opengraph-image`],
  },
  alternates: {
    canonical: siteConfig.url,
  },
};

const features = [
  {
    icon: Sparkles,
    title: "AI Tool Reviews",
    description: "We test AI tools hands-on and tell you what's worth your time — from writing assistants and image generators to code editors and chatbots.",
    color: "from-violet-500/10 to-purple-500/10",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  {
    icon: BookOpen,
    title: "Step-by-Step Guides",
    description: "Clear tutorials you can follow along with real screenshots and code examples. No walls of jargon or filler content.",
    color: "from-blue-500/10 to-cyan-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    icon: Cpu,
    title: "Coding Tutorials",
    description: "Build real projects with JavaScript, Python, React, Next.js, and TypeScript. Every tutorial includes working code you can copy and run.",
    color: "from-amber-500/10 to-orange-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    icon: TrendingUp,
    title: "Productivity Hacks",
    description: "Discover tools, workflows, and automation setups that actually save you hours every week — Notion, Obsidian, VS Code, and more.",
    color: "from-emerald-500/10 to-teal-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
];

export default async function HomePage() {
  const dbCategories = db
    ? await db.select().from(categories).orderBy(categories.name)
    : null;

  const cats = dbCategories && dbCategories.length > 0
    ? dbCategories.map((c) => ({
        name: c.name,
        slug: c.slug,
        description: c.description || "",
        color: c.color,
      }))
    : siteConfig.categories;

  let latestPosts: (typeof posts.$inferSelect)[] = [];
  let allCategories: (typeof categories.$inferSelect)[] = [];
  let popularPosts: (typeof posts.$inferSelect)[] = [];
  let totalPostCount = 0;
  if (db) {
    const [allCats, countResult, topViewed] = await Promise.all([
      db.select().from(categories).orderBy(categories.id),
      db.select({ value: count() }).from(posts).where(eq(posts.published, true)),
      db.select().from(posts).where(eq(posts.published, true)).orderBy(desc(posts.views)).limit(6),
    ]);
    allCategories = allCats;
    totalPostCount = countResult[0]?.value ?? 0;
    popularPosts = topViewed;

    // Get latest post per category using a single query with DISTINCT ON
    if (allCategories.length > 0) {
      // Fetch latest post per category: one query per category in parallel
      const dbRef = db;
      const perCategoryResults = await Promise.all(
        allCategories.map((cat) =>
          dbRef
            .select()
            .from(posts)
            .where(and(eq(posts.published, true), eq(posts.categoryId, cat.id)))
            .orderBy(desc(posts.createdAt))
            .limit(1)
        )
      );

      latestPosts = perCategoryResults
        .map((rows) => rows[0])
        .filter((post): post is typeof posts.$inferSelect => Boolean(post));
    }
  }
  const categoryMap = new Map(allCategories.map((c) => [c.id, c]));

  const categoryIcons: Record<string, React.ElementType> = {
    "ai-tools": Bot,
    "tech-guides": Monitor,
    "productivity": Lightbulb,
    "coding": Code2,
    "software-reviews": Star,
    "cybersecurity": ShieldCheck,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: siteConfig.name,
            url: siteConfig.url,
            logo: `${siteConfig.url}/logo.png`,
            description: siteConfig.description,
            contactPoint: { "@type": "ContactPoint", email: siteConfig.email, contactType: "customer support" },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: siteConfig.name,
            url: siteConfig.url,
            description: siteConfig.description,
            potentialAction: {
              "@type": "SearchAction",
              target: { "@type": "EntryPoint", urlTemplate: `${siteConfig.url}/blog?q={search_term_string}` },
              "query-input": "required name=search_term_string",
            },
            publisher: { "@type": "Organization", name: siteConfig.name, logo: getSiteLogoImageSchema() },
          }),
        }}
      />
      {/* ===== HERO BANNER ===== */}
      <section className="hero-bg-home relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] dark:from-[#0c1631] dark:via-[#162d52] dark:to-[#0c1631] text-white">

        {/* Content */}
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-20 pb-28 md:pt-28 md:pb-36">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left - Text */}
            <div>
              {/* Badge */}
              <div className="animate-fade-in-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm text-blue-300 text-xs font-semibold mb-8">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                QA-ready tech guides and tools
              </div>

              {/* Headline */}
              <h1 className="animate-fade-in-up stagger-1 text-4xl sm:text-5xl md:text-6xl lg:text-[3.5rem] xl:text-6xl font-extrabold tracking-tight leading-[1.08] mb-6">
                ByteVerse
                <br />
                <span className="text-blue-200">Built for sharper tech decisions</span>
              </h1>

              <p className="animate-fade-in-up stagger-2 text-base sm:text-lg text-slate-300 mb-10 max-w-xl leading-relaxed">
                Hands-on AI tool reviews, coding tutorials, and browser-based utilities.
                Every guide is written to help you choose faster, build cleaner, and avoid filler.
                We cover the best AI writing tools, code editors, SEO utilities, image generators,
                and developer productivity apps — all tested before we recommend them.
              </p>

              {/* CTA Buttons */}
              <div className="animate-fade-in-up stagger-3 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/blog"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-slate-900 rounded-xl text-sm font-bold hover:bg-slate-100 transition-all duration-200 btn-shimmer"
                >
                  Start Reading <ArrowRight size={16} />
                </Link>
                <Link
                  href="/categories"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-white/20 bg-white/5 backdrop-blur-sm rounded-xl text-sm font-semibold hover:bg-white/10 hover:border-white/30 transition-all duration-200"
                >
                  Explore Topics
                </Link>
              </div>

              {/* Quality signals */}
              <div className="animate-fade-in-up stagger-4 mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
                {[
                  { value: "38+", label: "Free Tools", icon: Wrench, color: "text-cyan-300", bg: "bg-cyan-400/10" },
                  { value: `${totalPostCount || "55"}+`, label: "Tested Guides", icon: FlaskConical, color: "text-violet-300", bg: "bg-violet-400/10" },
                  { value: `${cats.length}`, label: "Topic Hubs", icon: Layers, color: "text-blue-300", bg: "bg-blue-400/10" },
                  { value: "100%", label: "Client-Side Tools", icon: ShieldCheck, color: "text-emerald-300", bg: "bg-emerald-400/10" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.055] px-3.5 py-3.5 backdrop-blur-sm shadow-lg shadow-black/10">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${stat.bg}`}>
                        <stat.icon size={14} className={stat.color} />
                      </span>
                      <div className="text-xl sm:text-2xl font-extrabold text-white leading-none">{stat.value}</div>
                    </div>
                    <div className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold leading-tight">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Code Block Visual */}
            <div className="hidden lg:block animate-fade-in-up stagger-3">
              <LazyHeroCodeBlock />
            </div>
          </div>
        </div>

        {/* Wave separator */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg className="relative block w-full h-16 md:h-24" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path
              d="M0,40 C150,100 350,0 600,50 C850,100 1050,10 1200,40 L1200,120 L0,120 Z"
              className="fill-[#f1f5f9] dark:fill-[#141416]"
            />
          </svg>
        </div>
      </section>

      {/* Features */}
      <section className="section-alt border-b border-border -mt-px">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20 md:py-24">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">What We Offer</p>
            <h2 className="text-3xl font-bold tracking-tight mb-3">
              Everything You Need, <span className="gradient-text">One Place</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From cutting-edge AI tools to practical coding tutorials. Content you can actually use.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className={`animate-fade-in-up stagger-${i + 1} group p-6 rounded-2xl border border-border bg-card card-hover`}
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon size={20} className={feature.iconColor} />
                </div>
                <h3 className="font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Tools */}
      <section className="cv-auto mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20 md:py-24">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Developer Toolkit</p>
            <h2 className="text-3xl font-bold tracking-tight">
              Popular Free <span className="gradient-text">Tools</span>
            </h2>
          </div>
          <Link
            href="/tools"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5 transition-all duration-300"
          >
            View All 28+ Tools <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { title: "JSON Formatter", desc: "Format, validate & minify JSON instantly", href: "/tools/json-formatter", icon: Braces, color: "text-blue-500", bg: "from-blue-500/10 to-cyan-500/10" },
            { title: "AI Content Detector", desc: "Check if text is AI-generated or human-written", href: "/tools/ai-content-detector", icon: Bot, color: "text-pink-500", bg: "from-pink-500/10 to-rose-500/10" },
            { title: "Password Generator", desc: "Create strong, random passwords instantly", href: "/tools/password-generator", icon: Shield, color: "text-green-500", bg: "from-green-500/10 to-emerald-500/10" },
            { title: "Code Formatter", desc: "Beautify & format code in 10+ languages", href: "/tools/code-formatter", icon: Code2, color: "text-violet-500", bg: "from-violet-500/10 to-purple-500/10" },
            { title: "Plagiarism Checker", desc: "Verify text originality and uniqueness", href: "/tools/plagiarism-checker", icon: Target, color: "text-amber-500", bg: "from-amber-500/10 to-orange-500/10" },
            { title: "Meta Tag Generator", desc: "Generate SEO-optimized meta tags with preview", href: "/tools/meta-tag-generator", icon: Wrench, color: "text-purple-500", bg: "from-purple-500/10 to-fuchsia-500/10" },
          ].map((tool, i) => (
            <Link
              key={tool.href}
              href={tool.href}
              className={`animate-fade-in-up stagger-${(i % 6) + 1} group p-5 rounded-2xl border border-border bg-card card-hover flex items-start gap-4`}
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tool.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                <tool.icon size={20} className={tool.color} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm group-hover:text-primary transition-colors duration-200">{tool.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{tool.desc}</p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground group-hover:text-primary mt-2 transition-colors duration-300">
                  Try Now <ArrowRight size={12} />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="sm:hidden mt-8 text-center">
          <Link
            href="/tools"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            View All Tools <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Latest Posts */}
      {latestPosts.length > 0 && (
        <section className="cv-auto mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20 md:py-24">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Fresh Content</p>
              <h2 className="text-3xl font-bold tracking-tight">
                Latest <span className="gradient-text">Articles</span>
              </h2>
            </div>
            <Link
              href="/blog"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5 transition-all duration-300"
            >
              View All <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {latestPosts.map((post, i) => (
              <GridPostCard
                key={post.id}
                post={post}
                category={categoryMap.get(post.categoryId ?? 0)}
                priority={i < 3}
              />
            ))}
          </div>

          <div className="sm:hidden mt-8 text-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
            >
              View All Articles <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      )}

      {/* Popular Posts (data-driven by views) */}
      {popularPosts.length > 0 && (
        <section className="cv-auto section-alt border-y border-border">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20 md:py-24">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Most Read</p>
                <h2 className="text-3xl font-bold tracking-tight">
                  Popular <span className="gradient-text">Articles</span>
                </h2>
              </div>
              <Link
                href="/blog"
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5 transition-all duration-300"
              >
                View All <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid gap-4">
              {popularPosts.map((p, i) => {
                const cat = categoryMap.get(p.categoryId ?? 0);
                return (
                  <Link
                    key={p.id}
                    href={`/blog/${p.slug}`}
                    className="group flex items-center gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl border border-border bg-card card-hover"
                  >
                    <span className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-xl font-extrabold text-sm ${i < 3 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm sm:text-base group-hover:text-primary transition-colors truncate">
                        {p.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        {cat && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: cat.color + "18", color: cat.color }}>
                            {cat.name}
                          </span>
                        )}
                        {p.readingTime && (
                          <span>{p.readingTime}</span>
                        )}
                      </div>
                    </div>
                    {i < 3 && (
                      <Flame size={18} className="shrink-0 text-orange-400 hidden sm:block" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="cv-auto section-alt border-y border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20 md:py-24">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Topics</p>
            <h2 className="text-3xl font-bold tracking-tight mb-3">
              Explore <span className="gradient-text">Categories</span>
            </h2>
            <p className="text-muted-foreground">Find exactly what you&apos;re looking for. Six curated topic areas covering AI tools, coding, productivity, cybersecurity, tech guides, and software reviews.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {cats.map((cat, i) => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className={`animate-fade-in-up stagger-${(i % 6) + 1} group p-6 rounded-2xl border border-border bg-card card-hover`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: cat.color + "15" }}
                  >
                    {(() => {
                      const IconComp = categoryIcons[cat.slug] || Package;
                      return <IconComp size={20} style={{ color: cat.color }} className="group-hover:scale-110 transition-transform duration-300" />;
                    })()}
                  </div>
                  <h3 className="font-bold group-hover:text-primary transition-colors duration-200">
                    {cat.name}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  {cat.description}
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors duration-300">
                  Explore <ArrowRight size={12} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* About ByteVerse */}
      <section className="cv-auto mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Our Promise</p>
          <h2 className="text-3xl font-bold tracking-tight mb-3">
            Why <span className="gradient-text">ByteVerse</span>?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Most tech blogs rehash the same press releases. We don&apos;t. ByteVerse is built by developers who test every tool, write every code snippet, and verify every recommendation before publishing. Our 38+ free browser-based tools and {totalPostCount || "55"}+ in-depth guides help you choose smarter, build faster, and stay ahead in a rapidly evolving tech landscape.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: FlaskConical,
              title: "Tested, Not Guessed",
              desc: "Every AI tool gets installed, tested, and compared before we write a word. Every tutorial runs on a real machine.",
              color: "text-blue-500",
              bg: "from-blue-500/10 to-cyan-500/10",
            },
            {
              icon: Zap,
              title: "No Fluff, No Filler",
              desc: "If it doesn't solve a real problem, we skip it. ChatGPT alternatives, React projects, Python automation — topics we actually use.",
              color: "text-amber-500",
              bg: "from-amber-500/10 to-orange-500/10",
            },
            {
              icon: MousePointerClick,
              title: "Actionable Takeaways",
              desc: "Whether you're a student picking your first framework or a dev evaluating a new tool — walk away knowing exactly what to do next.",
              color: "text-emerald-500",
              bg: "from-emerald-500/10 to-teal-500/10",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="group p-6 rounded-2xl border border-border bg-card card-hover text-center"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.bg} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <item.icon size={22} className={item.color} />
              </div>
              <h3 className="font-bold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20">
        <LazyNewsletter />
      </section>
    </>
  );
}
