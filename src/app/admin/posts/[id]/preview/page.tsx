"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Post {
  title: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  author: string;
  readingTime: string | null;
  published: boolean;
  createdAt: string;
}

export default function PreviewPage() {
  const params = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/posts/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setPost)
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-20">
        <p className="text-lg font-bold">Post not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Preview Banner */}
      <div className="mb-6 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
            Preview Mode
          </span>
          {!post.published && (
            <span className="text-xs bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full font-medium">
              Draft
            </span>
          )}
        </div>
        <Link
          href={`/admin/posts/${params.id}`}
          className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
        >
          <ArrowLeft size={14} /> Back to Editor
        </Link>
      </div>

      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 leading-tight">
        {post.title}
      </h1>

      {/* Meta */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-8">
        <span>{post.author}</span>
        {post.readingTime && (
          <>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <span>{post.readingTime}</span>
          </>
        )}
      </div>

      {/* Cover Image */}
      {post.coverImage && (
        <div className="relative aspect-video rounded-2xl overflow-hidden mb-10 ring-1 ring-border">
          <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Content */}
      <MarkdownRenderer content={post.content} />
    </div>
  );
}
