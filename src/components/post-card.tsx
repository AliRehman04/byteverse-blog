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
      className={`group rounded-2xl border border-border bg-card overflow-hidden card-hover ${
        featured ? "md:col-span-2 md:grid md:grid-cols-2" : "flex flex-col"
      }`}
    >
      {/* Image */}
      <div
        className={`relative overflow-hidden bg-muted ${
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
          <div className="w-full h-full bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center">
            <span className="text-4xl opacity-40">📝</span>
          </div>
        )}
        {category && (
          <span
            className="absolute top-3 left-3 px-3 py-1 text-xs font-semibold rounded-full text-white shadow-sm"
            style={{ backgroundColor: category.color }}
          >
            {category.name}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <time dateTime={post.createdAt.toISOString()}>
            {formatDate(post.createdAt)}
          </time>
          {post.readingTime && (
            <>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {post.readingTime}
              </span>
            </>
          )}
        </div>

        <h2
          className={`font-bold leading-snug mb-2 group-hover:text-primary transition-colors duration-200 ${
            featured ? "text-xl md:text-2xl" : "text-base"
          }`}
        >
          <Link href={`/blog/${post.slug}`} className="line-clamp-2">
            {post.title}
          </Link>
        </h2>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-5 flex-1">
          {post.excerpt}
        </p>

        <Link
          href={`/blog/${post.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2.5 transition-all duration-300"
        >
          Read More <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}
