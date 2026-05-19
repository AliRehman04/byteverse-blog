"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, X, Upload } from "lucide-react";

interface Author {
  id: number;
  name: string;
  slug: string;
  role: string;
  bio: string | null;
  email: string | null;
  avatar: string | null;
  twitter: string | null;
  linkedin: string | null;
  github: string | null;
  youtube: string | null;
}

const emptyForm = {
  name: "",
  slug: "",
  role: "Author",
  bio: "",
  email: "",
  avatar: "",
  twitter: "",
  linkedin: "",
  github: "",
  youtube: "",
};

export default function AuthorsPage() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Author | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadAuthors = useCallback(() => {
    fetch("/api/admin/authors")
      .then((res) => res.json())
      .then(setAuthors)
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadAuthors();
  }, [loadAuthors]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (author: Author) => {
    setEditing(author);
    setForm({
      name: author.name,
      slug: author.slug,
      role: author.role,
      bio: author.bio || "",
      email: author.email || "",
      avatar: author.avatar || "",
      twitter: author.twitter || "",
      linkedin: author.linkedin || "",
      github: author.github || "",
      youtube: author.youtube || "",
    });
    setShowModal(true);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      if (res.ok) {
        const { url } = await res.json();
        setForm({ ...form, avatar: url });
      }
    } catch {}
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);

    const method = editing ? "PUT" : "POST";
    const payload = editing ? { ...form, id: editing.id } : form;

    try {
      const res = await fetch("/api/admin/authors", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowModal(false);
        loadAuthors();
      }
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this author?")) return;
    await fetch(`/api/admin/authors?id=${id}`, { method: "DELETE" });
    loadAuthors();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Authors</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add Author
        </button>
      </div>

      {/* Authors List */}
      {authors.length === 0 ? (
        <div className="text-center py-20 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
          <p className="text-[var(--muted-foreground)]">No authors yet. Add your first author.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {authors.map((author) => (
            <div
              key={author.id}
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5"
            >
              <div className="flex items-start gap-3 mb-3">
                {author.avatar ? (
                  <img
                    src={author.avatar}
                    alt={author.name}
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] font-bold text-lg">
                    {author.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[var(--foreground)] truncate">{author.name}</h3>
                  <p className="text-xs text-[var(--muted-foreground)]">{author.role}</p>
                </div>
              </div>
              {author.bio && (
                <p className="text-sm text-[var(--muted-foreground)] line-clamp-2 mb-3">
                  {author.bio}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] mb-4">
                <span>/author/{author.slug}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(author)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(author.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-red-200 dark:border-red-500/20 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[var(--foreground)]">
                {editing ? "Edit Author" : "Add Author"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Avatar */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Avatar
                </label>
                {form.avatar ? (
                  <div className="relative w-20 h-20">
                    <img src={form.avatar} alt="Avatar" className="w-20 h-20 rounded-xl object-cover" />
                    <button
                      onClick={() => setForm({ ...form, avatar: "" })}
                      className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full text-xs"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-[var(--border)] rounded-xl cursor-pointer hover:border-[var(--primary)] transition-colors w-fit">
                    {uploading ? (
                      <div className="animate-spin w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
                    ) : (
                      <Upload className="w-4 h-4 text-[var(--muted-foreground)]" />
                    )}
                    <span className="text-sm text-[var(--muted-foreground)]">Upload photo</span>
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                )}
              </div>

              {/* Name & Slug */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
                      setForm({ ...form, name, slug });
                    }}
                    placeholder="Ali Rehman"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    Slug
                  </label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="ali-rehman"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Role
                </label>
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  placeholder="Founder & Editor"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Bio
                </label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Short bio about the author..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
                />
              </div>

              {/* Social Links */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Social Links
                </label>
                <div className="space-y-2">
                  {(["twitter", "linkedin", "github", "youtube"] as const).map((platform) => (
                    <div key={platform} className="flex items-center gap-2">
                      <span className="text-xs text-[var(--muted-foreground)] w-16 capitalize">{platform}</span>
                      <input
                        type="url"
                        value={form[platform]}
                        onChange={(e) => setForm({ ...form, [platform]: e.target.value })}
                        placeholder={`https://${platform}.com/...`}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={saving || !form.name}
                className="w-full px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? "Saving..." : editing ? "Update Author" : "Create Author"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
