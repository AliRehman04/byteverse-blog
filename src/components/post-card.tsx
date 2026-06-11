import Link from "next/link";
import Image from "next/image";
import { Clock, ArrowRight, Calendar, Sparkles, RefreshCw } from "lucide-react";
import { formatDate, shimmerBlur, getAccessibleBadgeStyle } from "@/lib/utils";
import { getPostDisplayImage } from "@/lib/image-seo";
import type { Post, Category } from "@/lib/db/schema";

/** Returns a freshness badge config or null */
function getFreshnessBadge(post: Post): { label: string; icon: "new" | "updated"; color: string } | null {
  const now = Date.now();
  const created = new Date(post.createdAt).getTime();
  const updated = new Date(post.updatedAt).getTime();
  const daysSinceCreated = (now - created) / 86400000;
  const wasUpdated = updated - created > 86400000; // updated > 1 day after creation

  if (daysSinceCreated < 7) {
    return { label: "New", icon: "new", color: "#8b5cf6" };
  }
  if (wasUpdated) {
    const month = new Date(post.updatedAt).toLocaleString("en-US", { month: "short", year: "numeric" });
    return { label: `Updated ${month}`, icon: "updated", color: "#16a34a" };
  }
  return null;
}

interface PostCardProps {
  post: Post;
  category?: Category | null;
  featured?: boolean;
  priority?: boolean;
}

/* ── Featured Hero Card (first post on blog page) ── */
export function FeaturedPostCard({ post, category }: PostCardProps) {
  const displayImage = getPostDisplayImage(post);
  const freshness = getFreshnessBadge(post);

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
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4 flex-wrap">
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
            {freshness && (
              <span
                className="px-2 py-0.5 text-[10px] font-bold rounded-full flex items-center gap-1"
                style={{ backgroundColor: freshness.color + "18", color: freshness.color }}
              >
                {freshness.icon === "new" ? <Sparkles size={10} /> : <RefreshCw size={10} />}
                {freshness.label}
              </span>
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
export function PostCard({ post, category, priority }: PostCardProps) {
  const displayImage = getPostDisplayImage(post);
  const freshness = getFreshnessBadge(post);

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
            {...(priority ? { priority: true } : { loading: "lazy" })}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center">
            <span className="text-3xl opacity-40">📝</span>
          </div>
        )}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          {category && (
            <span
              className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full shadow-sm"
              style={getAccessibleBadgeStyle(category.color)}
            >
              {category.name}
            </span>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-5 sm:p-6 flex flex-col flex-1 justify-center">
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2.5 flex-wrap">
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
          {freshness && (
            <span
              className="px-2 py-0.5 text-[10px] font-bold rounded-full flex items-center gap-1"
              style={{ backgroundColor: freshness.color + "18", color: freshness.color }}
            >
              {freshness.icon === "new" ? <Sparkles size={9} /> : <RefreshCw size={9} />}
              {freshness.label}
            </span>
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
export function GridPostCard({ post, category, priority }: PostCardProps) {
  const displayImage = getPostDisplayImage(post);
  const freshness = getFreshnessBadge(post);

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
            {...(priority ? { priority: true } : { loading: "lazy" })}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center">
            <span className="text-3xl opacity-40">📝</span>
          </div>
        )}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          {category && (
            <span
              className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full shadow-sm"
              style={getAccessibleBadgeStyle(category.color)}
            >
              {category.name}
            </span>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4 sm:p-5 flex flex-col flex-1">
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2.5 flex-wrap">
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
          {freshness && (
            <span
              className="px-2 py-0.5 text-[10px] font-bold rounded-full flex items-center gap-1"
              style={{ backgroundColor: freshness.color + "18", color: freshness.color }}
            >
              {freshness.icon === "new" ? <Sparkles size={9} /> : <RefreshCw size={9} />}
              {freshness.label}
            </span>
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
