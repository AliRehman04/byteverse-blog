import type { Metadata } from "next";
import { db } from "@/lib/db";
import { posts, categories } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { PostCard } from "@/components/post-card";
import { Newsletter } from "@/components/newsletter";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Blog — Latest Articles on AI, Tech & Productivity",
  description:
    "Read the latest articles, tutorials, and guides on AI tools, tech trends, productivity hacks, coding tips, and honest software reviews at ByteVerse.",
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
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent" />
        <div className="absolute inset-0 dot-grid opacity-30" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="animate-fade-in-up">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Our Blog</p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Latest <span className="gradient-text">Articles</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Explore our collection of in-depth articles, tutorials, and guides on
              AI tools, tech, and productivity.
            </p>
          </div>
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
