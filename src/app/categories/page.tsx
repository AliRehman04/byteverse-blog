import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { siteConfig } from "@/lib/config";
import { ArrowRight, Grid3X3, Sparkles } from "lucide-react";

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
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <div className="mb-16 animate-fade-in relative">
        <div className="orb w-80 h-80 bg-pink-500/10 -top-40 -right-40" />
        <div className="tag glass text-primary mb-4 w-fit">
          <Grid3X3 size={12} />
          Topics
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          Browse <span className="gradient-text">Categories</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
          Find articles organized by topic. Click any category to explore.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cats.map((cat, i) => (
          <Link
            key={cat.slug}
            href={`/category/${cat.slug}`}
            className={`group relative p-8 rounded-3xl glass hover-lift overflow-hidden animate-fade-in-up stagger-${(i % 5) + 1}`}
          >
            {/* Top gradient accent */}
            <div
              className="absolute top-0 left-0 w-full h-1 opacity-60 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: cat.color }}
            />

            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300"
              style={{ backgroundColor: cat.color + "20" }}
            >
              <div
                className="w-6 h-6 rounded-lg"
                style={{ backgroundColor: cat.color }}
              />
            </div>

            <h2 className="text-xl font-extrabold mb-2 group-hover:text-primary transition-colors">
              {cat.name}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              {cat.description}
            </p>
            <div className="flex items-center gap-1 text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              Explore Articles <ArrowRight size={12} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
