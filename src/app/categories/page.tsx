import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Browse All Categories — AI Tools, Tech Guides & More",
  description:
    "Explore all ByteVerse content categories including AI tools, step-by-step tech guides, productivity tips, coding tutorials, and honest software reviews.",
  alternates: {
    canonical: `${siteConfig.url}/categories`,
  },
};

export default async function CategoriesPage() {
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

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <div className="mb-10 animate-fade-in">
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Browse Categories
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Find articles organized by topic. Click any category to explore.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cats.map((cat) => (
          <Link
            key={cat.slug}
            href={`/category/${cat.slug}`}
            className="group p-6 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              <h2 className="font-semibold group-hover:text-primary transition-colors">
                {cat.name}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {cat.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
