"use client";

import { useEffect, useState } from "react";
import {
  MessageSquare,
  CheckCircle2,
  Circle,
  Trash2,
  TrendingUp,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface Gap {
  id: number;
  query: string;
  intent: string;
  language: string;
  count: number;
  resolved: boolean;
  created_at: string;
  updated_at: string;
}

interface Stats {
  total: number;
  unresolved: number;
  totalQueries: number;
}

export default function ContentGapsPage() {
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, unresolved: 0, totalQueries: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unresolved" | "resolved">("unresolved");

  const fetchGaps = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/content-gaps");
      const data = await res.json();
      setGaps(data.gaps || []);
      setStats(data.stats || { total: 0, unresolved: 0, totalQueries: 0 });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGaps(); }, []);

  const toggleResolved = async (id: number, resolved: boolean) => {
    await fetch("/api/admin/content-gaps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, resolved }),
    });
    setGaps((prev) =>
      prev.map((g) => (g.id === id ? { ...g, resolved } : g))
    );
  };

  const deleteGap = async (id: number) => {
    if (!confirm("Delete this content gap?")) return;
    await fetch("/api/admin/content-gaps", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setGaps((prev) => prev.filter((g) => g.id !== id));
  };

  const filtered = gaps.filter((g) => {
    if (filter === "unresolved") return !g.resolved;
    if (filter === "resolved") return g.resolved;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Content Gaps</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Queries from chatbot that had no matching content — use these to plan new articles
          </p>
        </div>
        <button
          onClick={fetchGaps}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm hover:opacity-90 transition-opacity"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <MessageSquare size={18} className="text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--foreground)]">{stats.total}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Unique Gaps</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <AlertCircle size={18} className="text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--foreground)]">{stats.unresolved}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Unresolved</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <TrendingUp size={18} className="text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--foreground)]">{stats.totalQueries}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Total Requests</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(["unresolved", "all", "resolved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-[var(--primary)] text-white"
                : "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)]"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Gaps Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[var(--muted-foreground)]">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-40" />
          <p>No content gaps found</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">Query</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)] hidden sm:table-cell">Intent</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)] hidden sm:table-cell">Lang</th>
                <th className="text-center px-4 py-3 font-medium text-[var(--muted-foreground)]">Count</th>
                <th className="text-center px-4 py-3 font-medium text-[var(--muted-foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((gap) => (
                <tr key={gap.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50">
                  <td className="px-4 py-3 text-[var(--foreground)]">
                    <span className={gap.resolved ? "line-through opacity-50" : ""}>
                      {gap.query}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-violet-500/10 text-violet-600">
                      {gap.intent}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-[var(--muted-foreground)]">
                    {gap.language}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600">
                      {gap.count}×
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => toggleResolved(gap.id, !gap.resolved)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          gap.resolved
                            ? "text-green-500 hover:bg-green-500/10"
                            : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                        }`}
                        title={gap.resolved ? "Mark unresolved" : "Mark resolved"}
                      >
                        {gap.resolved ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                      </button>
                      <button
                        onClick={() => deleteGap(gap.id)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
