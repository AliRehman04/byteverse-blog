import type { Metadata } from "next";
import { db } from "@/lib/db";
import { posts, categories } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { PostCard } from "@/components/post-card";
import { Newsletter } from "@/components/newsletter";
import { siteConfig } from "@/lib/config";
import { BookOpen, Sparkles } from "lucide-react";

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
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      {/* Header */}
      <div className="mb-16 animate-fade-in relative">
        <div className="orb w-80 h-80 bg-violet-500/10 -top-40 -left-40" />
        <div className="tag glass text-primary mb-4 w-fit">
          <Sparkles size={12} />
          Our Blog
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          Latest <span className="gradient-text">Articles</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
          Explore our collection of in-depth articles, tutorials, and guides on
          AI tools, tech, and productivity.
        </p>
      </div>

      {/* Posts Grid */}
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
          <div className="w-20 h-20 rounded-3xl glass flex items-center justify-center mx-auto mb-6">
            <BookOpen size={32} className="text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-3">No articles yet</h2>
          <p className="text-muted-foreground">
            We&apos;re working on amazing content. Check back soon!
          </p>
        </div>
      )}

      {/* Newsletter */}
      <Newsletter />
    </div>
  );
}
