import Link from "next/link";
import { ArrowRight, Sparkles, BookOpen, Cpu, TrendingUp } from "lucide-react";
import { Newsletter } from "@/components/newsletter";
import { siteConfig } from "@/lib/config";
import { db } from "@/lib/db";
import { categories, posts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { PostCard } from "@/components/post-card";

const features = [
  {
    icon: Sparkles,
    title: "AI Tool Reviews",
    description: "In-depth reviews of the latest AI tools to supercharge your workflow.",
  },
  {
    icon: BookOpen,
    title: "Step-by-Step Guides",
    description: "Easy-to-follow tutorials on trending tech topics and frameworks.",
  },
  {
    icon: Cpu,
    title: "Coding Tutorials",
    description: "Learn modern programming with practical, real-world examples.",
  },
  {
    icon: TrendingUp,
    title: "Productivity Hacks",
    description: "Tips and strategies to 10x your productivity with the right tools.",
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
      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center max-w-3xl mx-auto animate-fade-in">
            <p className="text-sm font-medium text-primary mb-4">Your Tech Knowledge Hub</p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
              Explore the Future of Tech
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Discover AI tools, master new technologies, and boost your
              productivity with expert guides, tutorials, and honest reviews.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/blog"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Start Reading <ArrowRight size={16} />
              </Link>
              <Link
                href="/categories"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
              >
                Browse Categories
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold mb-3">What You&apos;ll Find Here</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            We cover everything tech — from cutting-edge AI tools to practical coding tutorials.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-5 rounded-xl border border-border bg-card hover:shadow-sm transition-shadow group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
                <feature.icon size={20} className="text-primary" />
              </div>
              <h3 className="font-semibold text-sm mb-1.5">{feature.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Latest Posts */}
      {latestPosts.length > 0 && (
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">Latest Articles</h2>
              <Link
                href="/blog"
                className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View All <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {latestPosts.map((post, i) => (
                <PostCard
                  key={post.id}
                  post={post}
                  category={categoryMap.get(post.categoryId ?? 0)}
                  featured={i === 0}
                />
              ))}
            </div>

            <div className="sm:hidden mt-6 text-center">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                View All Articles <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-3">Explore Categories</h2>
            <p className="text-sm text-muted-foreground">Find exactly what you&apos;re looking for</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cats.map((cat) => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className="group p-5 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                    {cat.name}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {cat.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
          <Newsletter />
        </div>
      </section>
    </>
  );
}
