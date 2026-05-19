"use client";

import { useEffect, useState } from "react";
import { FileText, FolderOpen, Eye, Users } from "lucide-react";

interface Stats {
  totalPosts: number;
  publishedPosts: number;
  totalCategories: number;
  totalViews: number;
  totalSubscribers: number;
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
      color: "bg-blue-500",
    },
    {
      title: "Published",
      value: stats?.publishedPosts ?? 0,
      icon: FileText,
      color: "bg-green-500",
    },
    {
      title: "Categories",
      value: stats?.totalCategories ?? 0,
      icon: FolderOpen,
      color: "bg-purple-500",
    },
    {
      title: "Total Views",
      value: stats?.totalViews ?? 0,
      icon: Eye,
      color: "bg-orange-500",
    },
    {
      title: "Subscribers",
      value: stats?.totalSubscribers ?? 0,
      icon: Users,
      color: "bg-pink-500",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--foreground)] mb-6">
        Dashboard
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-[var(--muted-foreground)]">
                {card.title}
              </span>
              <div
                className={`w-9 h-9 rounded-xl ${card.color} flex items-center justify-center`}
              >
                <card.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[var(--foreground)]">
              {stats === null ? "—" : card.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
