import Link from "next/link";
import { ArrowRight, Sparkles, BookOpen, Cpu, TrendingUp, Zap, Code2, Braces, Terminal, Layers } from "lucide-react";
import { Newsletter } from "@/components/newsletter";
import { siteConfig } from "@/lib/config";
import { db } from "@/lib/db";
import { categories, posts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { PostCard } from "@/components/post-card";
import { TextRotator } from "@/components/text-rotator";
import { HeroCodeBlock } from "@/components/hero-code-block";

const features = [
  {
    icon: Sparkles,
    title: "AI Tool Reviews",
    description: "In-depth reviews of the latest AI tools to supercharge your workflow.",
    color: "from-violet-500/10 to-purple-500/10",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  {
    icon: BookOpen,
    title: "Step-by-Step Guides",
    description: "Easy-to-follow tutorials on trending tech topics and frameworks.",
    color: "from-blue-500/10 to-cyan-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    icon: Cpu,
    title: "Coding Tutorials",
    description: "Learn modern programming with practical, real-world examples.",
    color: "from-amber-500/10 to-orange-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    icon: TrendingUp,
    title: "Productivity Hacks",
    description: "Tips and strategies to 10x your productivity with the right tools.",
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
  if (db) {
    latestPosts = await db
      .select()
      .from(posts)
      .where(eq(posts.published, true))
      .orderBy(desc(posts.createdAt))
      .limit(6);
    allCategories = await db.select().from(categories);
  }
  const categoryMap = new Map(allCategories.map((c) => [c.id, c]));

  return (
    <>
      {/* ===== HERO BANNER ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Gradient orbs */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-float-slow" />
          <div className="absolute top-1/2 -left-32 w-80 h-80 bg-violet-500/15 rounded-full blur-3xl animate-float-reverse" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-float" />

          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />

          {/* Floating tech icons */}
          <div className="hidden md:block">
            <div className="absolute top-20 right-[15%] animate-float opacity-20">
              <div className="w-12 h-12 rounded-xl bg-blue-400/20 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                <Code2 size={20} />
              </div>
            </div>
            <div className="absolute top-40 left-[12%] animate-float-reverse opacity-15" style={{ animationDelay: "1s" }}>
              <div className="w-14 h-14 rounded-xl bg-violet-400/20 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                <Braces size={22} />
              </div>
            </div>
            <div className="absolute bottom-32 right-[10%] animate-float-slow opacity-15" style={{ animationDelay: "2s" }}>
              <div className="w-10 h-10 rounded-lg bg-cyan-400/20 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                <Terminal size={16} />
              </div>
            </div>
            <div className="absolute top-1/2 right-[25%] animate-float opacity-10" style={{ animationDelay: "3s" }}>
              <div className="w-8 h-8 rounded-lg bg-pink-400/20 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                <Layers size={14} />
              </div>
            </div>
          </div>

          {/* Glowing dots */}
          <div className="absolute top-32 left-[20%] w-2 h-2 bg-blue-400 rounded-full animate-pulse-ring" />
          <div className="absolute bottom-40 left-[40%] w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse-ring" style={{ animationDelay: "1.5s" }} />
          <div className="absolute top-1/2 right-[18%] w-2 h-2 bg-cyan-400 rounded-full animate-pulse-ring" style={{ animationDelay: "2.5s" }} />
        </div>

        {/* Content */}
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-20 pb-28 md:pt-28 md:pb-36">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left - Text */}
            <div>
              {/* Badge */}
              <div className="animate-fade-in-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm text-blue-300 text-xs font-semibold mb-8">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Your Tech Knowledge Hub
              </div>

              {/* Headline */}
              <h1 className="animate-fade-in-up stagger-1 text-4xl sm:text-5xl md:text-6xl lg:text-[3.5rem] xl:text-6xl font-extrabold tracking-tight leading-[1.08] mb-6">
                Master the World
                <br />
                of <TextRotator />
              </h1>

              <p className="animate-fade-in-up stagger-2 text-base sm:text-lg text-slate-300 mb-10 max-w-xl leading-relaxed">
                Discover AI tools, master new technologies, and boost your
                productivity with expert guides, tutorials, and honest reviews.
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
                  Browse Categories
                </Link>
              </div>

              {/* Stats bar */}
              <div className="animate-fade-in-up stagger-4 mt-12 flex flex-wrap gap-8">
                {[
                  { value: "50+", label: "Articles" },
                  { value: `${cats.length}`, label: "Categories" },
                  { value: "10K+", label: "Readers" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div className="text-2xl font-extrabold text-white">{stat.value}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-medium">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Code Block Visual */}
            <div className="hidden lg:block animate-fade-in-up stagger-3">
              <HeroCodeBlock />
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
      <section className="section-alt border-b border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20 md:py-24">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">What We Offer</p>
            <h2 className="text-3xl font-bold tracking-tight mb-3">
              Everything You Need, <span className="gradient-text">One Place</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From cutting-edge AI tools to practical coding tutorials.
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

      {/* Latest Posts */}
      {latestPosts.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20 md:py-24">
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
              <PostCard
                key={post.id}
                post={post}
                category={categoryMap.get(post.categoryId ?? 0)}
                featured={i === 0}
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

      {/* Categories */}
      <section className="section-alt border-y border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20 md:py-24">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Topics</p>
            <h2 className="text-3xl font-bold tracking-tight mb-3">
              Explore <span className="gradient-text">Categories</span>
            </h2>
            <p className="text-muted-foreground">Find exactly what you&apos;re looking for</p>
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
                    <div
                      className="w-4 h-4 rounded-md group-hover:scale-110 transition-transform duration-300"
                      style={{ backgroundColor: cat.color }}
                    />
                  </div>
                  <h3 className="font-bold group-hover:text-primary transition-colors duration-200">
                    {cat.name}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  {cat.description}
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Explore <ArrowRight size={12} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20">
        <Newsletter />
      </section>
    </>
  );
}
