"use client";

import { useEffect, useState } from "react";
import { Mail, Trash2, UserCheck, UserX, Download, Search } from "lucide-react";

interface Subscriber {
  id: number;
  email: string;
  subscribedAt: string;
  active: boolean;
}

export default function NewsletterAdmin() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [totalActive, setTotalActive] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchSubscribers = async () => {
    try {
      const res = await fetch("/api/admin/newsletter");
      const data = await res.json();
      setSubscribers(data.subscribers || []);
      setTotalActive(data.totalActive || 0);
      setTotal(data.total || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      void fetchSubscribers();
    });
  }, []);

  const toggleActive = async (id: number, active: boolean) => {
    await fetch("/api/admin/newsletter", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !active }),
    });
    fetchSubscribers();
  };

  const deleteSubscriber = async (id: number, email: string) => {
    if (!confirm(`Delete subscriber "${email}"?`)) return;
    await fetch("/api/admin/newsletter", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchSubscribers();
  };

  const exportCSV = () => {
    const activeOnly = subscribers.filter((s) => s.active);
    const csv = [
      "Email,Subscribed At,Status",
      ...activeOnly.map(
        (s) =>
          `${s.email},${new Date(s.subscribedAt).toLocaleDateString()},${s.active ? "Active" : "Inactive"}`
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `byteverse-subscribers-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = subscribers.filter((s) =>
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            Newsletter Subscribers
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            {totalActive} active out of {total} total subscribers
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={subscribers.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--foreground)]">{total}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--foreground)]">{totalActive}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <UserX className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--foreground)]">{total - totalActive}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Inactive</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
        <input
          type="text"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-[var(--card)] border border-[var(--border)] rounded-xl">
          <Mail className="w-12 h-12 mx-auto text-[var(--muted-foreground)] opacity-40 mb-3" />
          <p className="text-[var(--muted-foreground)]">
            {search ? "No subscribers match your search" : "No subscribers yet"}
          </p>
        </div>
      ) : (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    #
                  </th>
                  <th className="text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    Email
                  </th>
                  <th className="text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    Subscribed
                  </th>
                  <th className="text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-right text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sub, i) => (
                  <tr
                    key={sub.id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        {sub.email}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">
                      {new Date(sub.subscribedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          sub.active
                            ? "bg-green-500/10 text-green-600"
                            : "bg-red-500/10 text-red-500"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            sub.active ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                        {sub.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleActive(sub.id, sub.active)}
                          title={sub.active ? "Deactivate" : "Activate"}
                          className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        >
                          {sub.active ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => deleteSubscriber(sub.id, sub.email)}
                          title="Delete"
                          className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-[var(--muted-foreground)] hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
