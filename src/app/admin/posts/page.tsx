"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Eye, EyeOff, Star, FileText, ChevronLeft, ChevronRight } from "lucide-react";

const POSTS_PER_PAGE = 30;

interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  categoryName: string | null;
  author: string;
  published: boolean;
  featured: boolean;
  views: number;
  createdAt: string;
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
  const paginatedPosts = posts.slice(
    (page - 1) * POSTS_PER_PAGE,
    page * POSTS_PER_PAGE
  );

  const fetchPosts = async () => {
    const res = await fetch("/api/admin/posts");
    if (res.ok) {
      setPosts(await res.json());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    const res = await fetch(`/api/admin/posts?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchPosts();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Posts</h1>
        <Link
          href="/admin/posts/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New Post
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--muted-foreground)]">
          Loading...
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
          <FileText className="w-12 h-12 mx-auto text-[var(--muted-foreground)] mb-3" />
          <p className="text-[var(--muted-foreground)]">
            No posts yet. Write your first one!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedPosts.map((post) => (
            <div
              key={post.id}
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex items-center gap-4"
            >
              {post.coverImage && (
                <img
                  src={post.coverImage}
                  alt=""
                  className="w-16 h-16 rounded-xl object-cover shrink-0 hidden sm:block"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-[var(--foreground)] truncate">
                    {post.title}
                  </span>
                  {post.featured && (
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />
                  )}
                  {post.published ? (
                    <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full shrink-0">
                      Published
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 bg-yellow-500/10 text-yellow-500 rounded-full shrink-0">
                      Draft
                    </span>
                  )}
                </div>
                <div className="text-sm text-[var(--muted-foreground)] mt-1 flex items-center gap-3 flex-wrap">
                  {post.categoryName && (
                    <span className="text-xs px-2 py-0.5 bg-[var(--muted)] rounded-full">
                      {post.categoryName}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {post.views}
                  </span>
                  <span>
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/admin/posts/${post.id}`}
                  className="p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--muted-foreground)] hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--border)]">
          <p className="text-sm text-[var(--muted-foreground)]">
            Showing {(page - 1) * POSTS_PER_PAGE + 1}-{Math.min(page * POSTS_PER_PAGE, posts.length)} of {posts.length} posts
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                  p === page
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
