import type { Metadata } from "next";
import { db } from "@/lib/db";
import { posts, categories } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { PostCard } from "@/components/post-card";
import { Newsletter } from "@/components/newsletter";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Read the latest articles on AI tools, tech guides, productivity tips, and coding tutorials.",
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
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      {/* Header */}
      <div className="mb-12 animate-fade-in">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">
          Latest <span className="gradient-text">Articles</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Explore our collection of in-depth articles, tutorials, and guides on
          AI tools, tech, and productivity.
        </p>
      </div>

      {/* Posts Grid */}
      {allPosts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
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
        <div className="text-center py-20 mb-16">
          <p className="text-6xl mb-4">📝</p>
          <h2 className="text-2xl font-bold mb-2">No articles yet</h2>
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
