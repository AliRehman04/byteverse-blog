import type { Metadata } from "next";
import { db } from "@/lib/db";
import { posts, categories } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { PostCard } from "@/components/post-card";
import { Newsletter } from "@/components/newsletter";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Blog | Latest Articles on AI, Tech & Productivity",
  description:
    "Read the latest articles, tutorials, and guides on AI tools, tech trends, productivity hacks, coding tips, and honest software reviews at ByteVerse.",
  openGraph: {
    title: "Blog | Latest Articles on AI, Tech & Productivity | ByteVerse",
    description:
      "Read the latest articles, tutorials, and guides on AI tools, tech trends, productivity hacks, coding tips, and honest software reviews.",
    type: "website",
  },
  alternates: {
    canonical: `${siteConfig.url}/blog`,
  },
};

export const revalidate = 60;

export default async function BlogPage() {
  let allPosts: (typeof import("@/lib/db/schema").posts.$inferSelect)[] = [];
  let allCategories: (typeof import("@/lib/db/schema").categories.$inferSelect)[] = [];

  if (db) {
    allPosts = await db
      .select()
      .from(posts)
      .where(eq(posts.published, true))
      .orderBy(desc(posts.createdAt));

    allCategories = await db.select().from(categories);
  }

  const categoryMap = new Map(allCategories.map((c) => [c.id, c]));

  return (
    <>
      {/* Page Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] dark:from-[#0c1631] dark:via-[#162d52] dark:to-[#0c1631] text-white">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl animate-float-slow" />
          <div className="absolute bottom-0 -left-20 w-60 h-60 bg-violet-500/10 rounded-full blur-3xl animate-float-reverse" />
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm text-blue-300 text-xs font-semibold mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              Our Blog
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
              Latest Articles
            </h1>
            <p className="text-slate-300 max-w-xl text-sm sm:text-base leading-relaxed">
              Explore our collection of in-depth articles, tutorials, and guides on
              AI tools, tech, and productivity.
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg className="relative block w-full h-10 md:h-16" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,40 C150,100 350,0 600,50 C850,100 1050,10 1200,40 L1200,120 L0,120 Z" className="fill-background" />
          </svg>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {allPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
            {allPosts.map((post, i) => (
              <PostCard
                key={post.id}
                post={post}
                category={categoryMap.get(post.categoryId ?? 0)}
                featured={i === 0}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 mb-20">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mx-auto mb-5">
              <span className="text-3xl">📝</span>
            </div>
            <h2 className="text-xl font-bold mb-2">No articles yet</h2>
            <p className="text-sm text-muted-foreground">
              We&apos;re working on amazing content. Check back soon!
            </p>
          </div>
        )}

        <Newsletter />
      </div>
    </>
  );
}
