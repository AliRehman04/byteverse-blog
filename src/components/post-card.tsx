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
      className={`group rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow duration-200 ${
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
            className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
            sizes={featured ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 100vw, 33vw"}
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-4xl opacity-40">📝</span>
          </div>
        )}
        {category && (
          <span
            className="absolute top-3 left-3 px-2.5 py-0.5 text-xs font-medium rounded-md text-white"
            style={{ backgroundColor: category.color }}
          >
            {category.name}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <time dateTime={post.createdAt.toISOString()}>
            {formatDate(post.createdAt)}
          </time>
          {post.readingTime && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {post.readingTime}
              </span>
            </>
          )}
        </div>

        <h2
          className={`font-bold leading-snug mb-2 group-hover:text-primary transition-colors ${
            featured ? "text-xl md:text-2xl" : "text-base"
          }`}
        >
          <Link href={`/blog/${post.slug}`} className="line-clamp-2">
            {post.title}
          </Link>
        </h2>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
          {post.excerpt}
        </p>

        <Link
          href={`/blog/${post.slug}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:gap-2 transition-all"
        >
          Read More <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}
