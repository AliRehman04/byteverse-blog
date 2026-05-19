import Link from "next/link";
import Image from "next/image";
import { Clock, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Post, Category } from "@/lib/db/schema";

interface PostCardProps {
  post: Post;
  category?: Category | null;
  featured?: boolean;
}

export function PostCard({ post, category, featured }: PostCardProps) {
  return (
    <article
      className={`group rounded-3xl glass hover-lift overflow-hidden ${
        featured ? "md:col-span-2 md:grid md:grid-cols-2" : "flex flex-col"
      }`}
    >
      {/* Image */}
      <div
        className={`relative overflow-hidden ${
          featured ? "aspect-[16/10] md:aspect-auto" : "aspect-[16/10]"
        }`}
      >
        {post.coverImage ? (
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            sizes={featured ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 100vw, 33vw"}
          />
        ) : (
          <div className="w-full h-full bg-linear-to-br from-primary/20 via-accent/15 to-primary/10 flex items-center justify-center">
            <span className="text-5xl opacity-60">✦</span>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        {category && (
          <span
            className="absolute top-4 left-4 tag text-white shadow-lg"
            style={{ backgroundColor: category.color }}
          >
            {category.name}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
          <time dateTime={post.createdAt.toISOString()} className="font-medium">
            {formatDate(post.createdAt)}
          </time>
          {post.readingTime && (
            <>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {post.readingTime}
              </span>
            </>
          )}
        </div>

        <h2
          className={`font-extrabold leading-tight mb-3 group-hover:gradient-text transition-all duration-300 ${
            featured ? "text-2xl md:text-3xl" : "text-lg"
          }`}
        >
          <Link href={`/blog/${post.slug}`} className="line-clamp-2">
            {post.title}
          </Link>
        </h2>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-5 flex-1 leading-relaxed">
          {post.excerpt}
        </p>

        <Link
          href={`/blog/${post.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-primary group-hover:gap-2.5 transition-all duration-300"
        >
          Read Article <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}
