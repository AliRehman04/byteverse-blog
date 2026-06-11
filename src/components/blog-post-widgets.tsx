"use client";

import dynamic from "next/dynamic";

const BackToTop = dynamic(() => import("@/components/back-to-top").then((m) => m.BackToTop), { ssr: false });
const ReadingProgress = dynamic(() => import("@/components/reading-progress").then((m) => m.ReadingProgress), { ssr: false });
const NewsletterPopup = dynamic(() => import("@/components/newsletter-popup").then((m) => m.NewsletterPopup), { ssr: false });
const FloatingShareBar = dynamic(() => import("@/components/floating-share").then((m) => m.FloatingShareBar), { ssr: false });
const ViewTracker = dynamic(() => import("@/components/view-tracker").then((m) => m.ViewTracker), { ssr: false });
const Comments = dynamic(() => import("@/components/comments").then((m) => m.Comments), { ssr: false });
const TableOfContents = dynamic(() => import("@/components/table-of-contents").then((m) => m.TableOfContents), { ssr: false });
const ShareButtons = dynamic(() => import("@/components/share-buttons").then((m) => m.ShareButtons), { ssr: false });
const BookmarkButton = dynamic(() => import("@/components/bookmark").then((m) => m.BookmarkButton), { ssr: false });
const CardBookmarkBtn = dynamic(() => import("@/components/bookmark").then((m) => m.CardBookmarkButton), { ssr: false });
const Reactions = dynamic(() => import("@/components/reactions").then((m) => m.Reactions), { ssr: false });

interface Props {
  slug: string;
  url: string;
  title: string;
  readingMinutes?: number;
}

export function BlogPostWidgets({ slug, url, title, readingMinutes }: Props) {
  return (
    <>
      <ReadingProgress readingTime={readingMinutes} />
      <BackToTop />
      <NewsletterPopup />
      <FloatingShareBar url={url} title={title} />
      <ViewTracker slug={slug} />
    </>
  );
}

export function BlogPostToc() {
  return <TableOfContents />;
}

export function BlogPostComments() {
  return <Comments />;
}

export function BlogPostShare({ url, title }: { url: string; title: string }) {
  return <ShareButtons url={url} title={title} />;
}

export function BlogPostBookmark({ slug, title }: { slug: string; title: string }) {
  return <BookmarkButton slug={slug} title={title} />;
}

export function CardBookmarkButton({ slug, title }: { slug: string; title: string }) {
  return <CardBookmarkBtn slug={slug} title={title} />;
}

export function BlogPostReactions({ slug }: { slug: string }) {
  return <Reactions slug={slug} />;
}
