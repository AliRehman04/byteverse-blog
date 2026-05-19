import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Browse All Categories — AI Tools, Tech Guides & More | ByteVerse",
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
      <div className="mb-12 animate-fade-in">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">
          Browse <span className="gradient-text">Categories</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Find articles organized by topic. Click any category to explore.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cats.map((cat) => (
          <Link
            key={cat.slug}
            href={`/category/${cat.slug}`}
            className="group relative p-8 rounded-2xl border border-border bg-card overflow-hidden hover:shadow-xl transition-all duration-300"
          >
            {/* Colored accent */}
            <div
              className="absolute top-0 left-0 w-full h-1 group-hover:h-2 transition-all"
              style={{ backgroundColor: cat.color }}
            />

            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: cat.color + "20" }}
            >
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
            </div>

            <h2 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
              {cat.name}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {cat.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
