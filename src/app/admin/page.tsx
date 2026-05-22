"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  FileText,
  FolderOpen,
  Eye,
  Users,
  TrendingUp,
  Clock,
  Plus,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";

interface PostItem {
  id: number;
  title: string;
  slug: string;
  views: number;
  published?: boolean;
  createdAt?: string;
}

interface Stats {
  totalPosts: number;
  publishedPosts: number;
  totalCategories: number;
  totalViews: number;
  totalSubscribers: number;
  recentPosts: PostItem[];
  topPosts: PostItem[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const cards = [
    {
      title: "Total Posts",
      value: stats?.totalPosts ?? 0,
      icon: FileText,
      gradient: "from-blue-500 to-blue-600",
      bg: "bg-blue-50 dark:bg-blue-500/10",
      text: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Published",
      value: stats?.publishedPosts ?? 0,
      icon: CheckCircle2,
      gradient: "from-emerald-500 to-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      text: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Categories",
      value: stats?.totalCategories ?? 0,
      icon: FolderOpen,
      gradient: "from-violet-500 to-violet-600",
      bg: "bg-violet-50 dark:bg-violet-500/10",
      text: "text-violet-600 dark:text-violet-400",
    },
    {
      title: "Total Views",
      value: stats?.totalViews ?? 0,
      icon: Eye,
      gradient: "from-amber-500 to-orange-500",
      bg: "bg-amber-50 dark:bg-amber-500/10",
      text: "text-amber-600 dark:text-amber-400",
    },
    {
      title: "Subscribers",
      value: stats?.totalSubscribers ?? 0,
      icon: Users,
      gradient: "from-pink-500 to-rose-500",
      bg: "bg-pink-50 dark:bg-pink-500/10",
      text: "text-pink-600 dark:text-pink-400",
    },
  ];

  const loading = stats === null;

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--muted-foreground)]">
            Welcome back! Here is your blog overview.
          </p>
        </div>
        <Link
          href="/admin/posts?new=1"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New Post
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((card) => (
          <div
            key={card.title}
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                {card.title}
              </span>
              <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${card.text}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-[var(--foreground)]">
              {loading ? (
                <div className="h-8 w-16 bg-[var(--muted)] rounded animate-pulse" />
              ) : (
                card.value.toLocaleString()
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Two-column layout: Recent + Top Posts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Posts */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-[var(--muted-foreground)]" />
            <h2 className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider">
              Recent Posts
            </h2>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-[var(--muted)] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {stats?.recentPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/admin/posts?edit=${post.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--muted)] transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate group-hover:text-[var(--primary)] transition-colors">
                      {post.title}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {post.createdAt ? format(new Date(post.createdAt), "MMM d, yyyy") : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {post.views.toLocaleString()} views
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Top Posts by Views */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[var(--muted-foreground)]" />
            <h2 className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider">
              Top Posts by Views
            </h2>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-[var(--muted)] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {stats?.topPosts.map((post, i) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  target="_blank"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--muted)] transition-colors group"
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    i === 0
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                      : i === 1
                      ? "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400"
                      : i === 2
                      ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400"
                      : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                  }`}>
                    {i + 1}
                  </span>
                  <p className="text-sm font-medium text-[var(--foreground)] truncate flex-1 group-hover:text-[var(--primary)] transition-colors">
                    {post.title}
                  </p>
                  <span className="text-xs font-semibold text-[var(--muted-foreground)] shrink-0">
                    {post.views.toLocaleString()}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
