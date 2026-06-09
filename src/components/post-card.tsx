import Link from "next/link";
import Image from "next/image";
import { Clock, ArrowRight, Calendar } from "lucide-react";
import { formatDate, shimmerBlur, getAccessibleBadgeStyle } from "@/lib/utils";
import { getPostDisplayImage } from "@/lib/image-seo";
import type { Post, Category } from "@/lib/db/schema";

interface PostCardProps {
  post: Post;
  category?: Category | null;
  featured?: boolean;
}

/* ── Featured Hero Card (first post on blog page) ── */
export function FeaturedPostCard({ post, category }: PostCardProps) {
  const displayImage = getPostDisplayImage(post);

  return (
    <article className="group relative rounded-2xl overflow-hidden bg-card border border-border card-hover">
      <div className="grid md:grid-cols-2 gap-0">
        {/* Image */}
        <Link href={`/blog/${post.slug}`} className="relative aspect-[16/10] md:aspect-auto md:min-h-[280px] lg:min-h-[340px] overflow-hidden block">
          {displayImage ? (
            <Image
              src={displayImage}
              alt={post.title}
              title={post.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              sizes="(max-width: 768px) 100vw, 50vw"
              placeholder="blur"
              blurDataURL={shimmerBlur}
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
              <span className="text-5xl opacity-40">📝</span>
            </div>
          )}
          {/* Featured badge */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-primary text-white shadow-lg">
              Featured
            </span>
            {category && (
              <span
                className="px-3 py-1 text-xs font-semibold rounded-full shadow-sm"
                style={getAccessibleBadgeStyle(category.color)}
              >
                {category.name}
              </span>
            )}
          </div>
        </Link>

        {/* Content */}
        <div className="p-5 sm:p-6 md:p-8 lg:p-10 flex flex-col justify-center">
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
            <span className="flex items-center gap-1.5">
              <Calendar size={12} />
              <time dateTime={post.createdAt.toISOString()}>
                {formatDate(post.createdAt)}
              </time>
            </span>
            {post.readingTime && (
              <>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                <span className="flex items-center gap-1.5">
                  <Clock size={12} />
                  {post.readingTime}
                </span>
              </>
            )}
          </div>

          <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold leading-tight mb-3 group-hover:text-primary transition-colors duration-200">
            <Link href={`/blog/${post.slug}`}>
              {post.title}
            </Link>
          </h2>

          <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-6 line-clamp-3">
            {post.excerpt}
          </p>

          <Link
            href={`/blog/${post.slug}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all duration-300 w-fit"
          >
            Read the full article <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </article>
  );
}

/* ── Regular Post Card (horizontal on desktop) ── */
export function PostCard({ post, category }: PostCardProps) {
  const displayImage = getPostDisplayImage(post);

  return (
    <article className="group rounded-xl border border-border bg-card overflow-hidden card-hover flex flex-col sm:flex-row">
      {/* Image */}
      <Link href={`/blog/${post.slug}`} className="relative overflow-hidden bg-muted sm:w-[240px] md:w-[280px] lg:w-[320px] shrink-0 aspect-[16/10] sm:aspect-auto sm:min-h-[180px] block">
        {displayImage ? (
          <Image
            src={displayImage}
            alt={post.title}
            title={post.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            sizes="(max-width: 640px) 100vw, 320px"
            placeholder="blur"
            blurDataURL={shimmerBlur}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center">
            <span className="text-3xl opacity-40">📝</span>
          </div>
        )}
        {category && (
          <span
            className="absolute top-3 left-3 px-2.5 py-0.5 text-[11px] font-semibold rounded-full shadow-sm"
            style={getAccessibleBadgeStyle(category.color)}
          >
            {category.name}
          </span>
        )}
      </Link>

      {/* Content */}
      <div className="p-5 sm:p-6 flex flex-col flex-1 justify-center">
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2.5">
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

        <h3 className="text-base lg:text-lg font-bold leading-snug mb-2 group-hover:text-primary transition-colors duration-200">
          <Link href={`/blog/${post.slug}`} className="line-clamp-2">
            {post.title}
          </Link>
        </h3>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {post.excerpt}
        </p>

        <Link
          href={`/blog/${post.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2.5 transition-all duration-300 w-fit mt-auto"
        >
          Read Article <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}

/* ── Grid Post Card (vertical layout for homepage/category grids) ── */
export function GridPostCard({ post, category }: PostCardProps) {
  const displayImage = getPostDisplayImage(post);

  return (
    <article className="group rounded-xl border border-border bg-card overflow-hidden card-hover flex flex-col">
      {/* Image */}
      <Link href={`/blog/${post.slug}`} className="relative overflow-hidden bg-muted aspect-[16/10] block">
        {displayImage ? (
          <Image
            src={displayImage}
            alt={post.title}
            title={post.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            sizes="(max-width: 768px) 100vw, 33vw"
            placeholder="blur"
            blurDataURL={shimmerBlur}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center">
            <span className="text-3xl opacity-40">📝</span>
          </div>
        )}
        {category && (
          <span
            className="absolute top-3 left-3 px-2.5 py-0.5 text-[11px] font-semibold rounded-full shadow-sm"
            style={getAccessibleBadgeStyle(category.color)}
          >
            {category.name}
          </span>
        )}
      </Link>

      {/* Content */}
      <div className="p-4 sm:p-5 flex flex-col flex-1">
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2.5">
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

        <h3 className="text-base font-bold leading-snug mb-2 group-hover:text-primary transition-colors duration-200">
          <Link href={`/blog/${post.slug}`} className="line-clamp-2">
            {post.title}
          </Link>
        </h3>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
          {post.excerpt}
        </p>

        <Link
          href={`/blog/${post.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2.5 transition-all duration-300 w-fit"
        >
          Read Article <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}
