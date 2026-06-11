"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Unlink,
  ExternalLink,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Search,
  TrendingUp,
  FileWarning,
} from "lucide-react";

interface OrphanPost {
  id: number;
  title: string;
  slug: string;
  views: number;
  inboundLinks: number;
  createdAt: string;
}

interface OrphanData {
  orphans: OrphanPost[];
  total: number;
  orphanCount: number;
}

interface GscQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GscData {
  queries: GscQuery[];
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
  contentGaps: { query: string; impressions: number; position: number }[];
}

export default function AdminSeoPage() {
  const [orphanData, setOrphanData] = useState<OrphanData | null>(null);
  const [orphanLoading, setOrphanLoading] = useState(true);
  const [gscData, setGscData] = useState<GscData | null>(null);
  const [gscLoading, setGscLoading] = useState(true);
  const [gscError, setGscError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"orphans" | "gsc" | "gaps">("orphans");

  useEffect(() => {
    fetch("/api/admin/orphan-pages")
      .then((r) => r.json())
      .then(setOrphanData)
      .catch(() => {})
      .finally(() => setOrphanLoading(false));

    fetch("/api/admin/gsc")
      .then((r) => {
        if (!r.ok) throw new Error("GSC not configured");
        return r.json();
      })
      .then(setGscData)
      .catch((e) => setGscError(e.message))
      .finally(() => setGscLoading(false));
  }, []);

  const tabs = [
    { key: "orphans" as const, label: "Orphan Pages", icon: Unlink, count: orphanData?.orphanCount },
    { key: "gsc" as const, label: "GSC Keywords", icon: Search, count: gscData?.queries?.length },
    { key: "gaps" as const, label: "Content Gaps", icon: FileWarning, count: gscData?.contentGaps?.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">SEO Dashboard</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Orphan page detector, keyword insights &amp; content gap finder
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--border)] pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border border-b-0 transition-colors ${
              activeTab === tab.key
                ? "bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]"
                : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {tab.count != null && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? "bg-[var(--primary)] text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)]"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orphan Pages Tab */}
      {activeTab === "orphans" && (
        <div className="space-y-4">
          {orphanLoading ? (
            <div className="flex items-center justify-center py-12 text-[var(--muted-foreground)]">
              <Loader2 size={20} className="animate-spin mr-2" /> Scanning posts for orphan pages...
            </div>
          ) : orphanData ? (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
                  <p className="text-xs text-[var(--muted-foreground)] mb-1">Total Posts</p>
                  <p className="text-2xl font-bold">{orphanData.total}</p>
                </div>
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
                  <p className="text-xs text-[var(--muted-foreground)] mb-1">Orphan Pages</p>
                  <p className="text-2xl font-bold text-orange-500">{orphanData.orphanCount}</p>
                </div>
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
                  <p className="text-xs text-[var(--muted-foreground)] mb-1">Health Score</p>
                  <p className="text-2xl font-bold text-emerald-500">
                    {orphanData.total > 0 ? Math.round(((orphanData.total - orphanData.orphanCount) / orphanData.total) * 100) : 100}%
                  </p>
                </div>
              </div>

              {orphanData.orphans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-emerald-500">
                  <CheckCircle2 size={40} className="mb-3" />
                  <p className="font-semibold">No orphan pages found!</p>
                  <p className="text-sm text-[var(--muted-foreground)]">All posts have at least one internal link pointing to them.</p>
                </div>
              ) : (
                <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                        <th className="text-left px-4 py-3 font-semibold">Post Title</th>
                        <th className="text-center px-4 py-3 font-semibold">Views</th>
                        <th className="text-center px-4 py-3 font-semibold">Status</th>
                        <th className="text-right px-4 py-3 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orphanData.orphans.map((post) => (
                        <tr key={post.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50">
                          <td className="px-4 py-3">
                            <Link href={`/blog/${post.slug}`} className="font-medium hover:text-[var(--primary)] transition-colors" target="_blank">
                              {post.title}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="flex items-center justify-center gap-1 text-[var(--muted-foreground)]">
                              <Eye size={14} /> {post.views.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400">
                              <AlertTriangle size={12} /> No inbound links
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/admin/posts/${post.id}`}
                              className="text-xs font-medium text-[var(--primary)] hover:underline"
                            >
                              Edit Post →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* GSC Keywords Tab */}
      {activeTab === "gsc" && (
        <div className="space-y-4">
          {gscLoading ? (
            <div className="flex items-center justify-center py-12 text-[var(--muted-foreground)]">
              <Loader2 size={20} className="animate-spin mr-2" /> Loading GSC data...
            </div>
          ) : gscError ? (
            <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--card)] text-center">
              <Search size={40} className="mx-auto mb-3 text-[var(--muted-foreground)]" />
              <h3 className="font-bold mb-2">Google Search Console Not Connected</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-4 max-w-md mx-auto">
                To see real keyword data, connect your Google Search Console API. Add these environment variables:
              </p>
              <div className="text-left max-w-sm mx-auto p-4 rounded-lg bg-[var(--muted)] text-xs font-mono space-y-1">
                <p>GSC_CLIENT_EMAIL=your-service-account@...iam.gserviceaccount.com</p>
                <p>GSC_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...</p>
                <p>GSC_SITE_URL=https://www.byteverse.fyi</p>
              </div>
            </div>
          ) : gscData ? (
            <>
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
                  <p className="text-xs text-[var(--muted-foreground)] mb-1">Total Clicks</p>
                  <p className="text-2xl font-bold text-blue-500">{gscData.totalClicks.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
                  <p className="text-xs text-[var(--muted-foreground)] mb-1">Impressions</p>
                  <p className="text-2xl font-bold">{gscData.totalImpressions.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
                  <p className="text-xs text-[var(--muted-foreground)] mb-1">Avg CTR</p>
                  <p className="text-2xl font-bold text-emerald-500">{(gscData.avgCtr * 100).toFixed(1)}%</p>
                </div>
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
                  <p className="text-xs text-[var(--muted-foreground)] mb-1">Avg Position</p>
                  <p className="text-2xl font-bold text-violet-500">{gscData.avgPosition.toFixed(1)}</p>
                </div>
              </div>

              <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                      <th className="text-left px-4 py-3 font-semibold">Query</th>
                      <th className="text-center px-4 py-3 font-semibold">Clicks</th>
                      <th className="text-center px-4 py-3 font-semibold">Impressions</th>
                      <th className="text-center px-4 py-3 font-semibold">CTR</th>
                      <th className="text-center px-4 py-3 font-semibold">Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gscData.queries.map((q) => (
                      <tr key={q.query} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50">
                        <td className="px-4 py-3 font-medium">{q.query}</td>
                        <td className="px-4 py-3 text-center text-blue-500 font-semibold">{q.clicks}</td>
                        <td className="px-4 py-3 text-center text-[var(--muted-foreground)]">{q.impressions.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">{(q.ctr * 100).toFixed(1)}%</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-medium ${q.position <= 10 ? "text-emerald-500" : q.position <= 20 ? "text-amber-500" : "text-red-500"}`}>
                            {q.position.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Content Gaps Tab */}
      {activeTab === "gaps" && (
        <div className="space-y-4">
          {gscLoading ? (
            <div className="flex items-center justify-center py-12 text-[var(--muted-foreground)]">
              <Loader2 size={20} className="animate-spin mr-2" /> Analyzing content gaps...
            </div>
          ) : gscError ? (
            <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--card)] text-center">
              <TrendingUp size={40} className="mx-auto mb-3 text-[var(--muted-foreground)]" />
              <h3 className="font-bold mb-2">Connect GSC for Content Gaps</h3>
              <p className="text-sm text-[var(--muted-foreground)] max-w-md mx-auto">
                Content gap analysis requires Google Search Console data. Once connected, we&apos;ll show queries with high impressions but low CTR — topics you should write about.
              </p>
            </div>
          ) : gscData && gscData.contentGaps.length > 0 ? (
            <>
              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Content Opportunities Found</p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                      These queries have high impressions but you don&apos;t rank well. Consider writing dedicated posts for them.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                      <th className="text-left px-4 py-3 font-semibold">Query (Write About This)</th>
                      <th className="text-center px-4 py-3 font-semibold">Impressions</th>
                      <th className="text-center px-4 py-3 font-semibold">Avg Position</th>
                      <th className="text-center px-4 py-3 font-semibold">Opportunity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gscData.contentGaps.map((g) => (
                      <tr key={g.query} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50">
                        <td className="px-4 py-3 font-medium">{g.query}</td>
                        <td className="px-4 py-3 text-center">{g.impressions.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center text-red-500 font-medium">{g.position.toFixed(1)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                            <TrendingUp size={12} /> High
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 size={40} className="mb-3 text-emerald-500" />
              <p className="font-semibold">No obvious content gaps detected</p>
              <p className="text-sm text-[var(--muted-foreground)]">You&apos;re covering your search queries well.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
