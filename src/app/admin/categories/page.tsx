"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, FolderOpen } from "lucide-react";

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  color: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    color: "#6366f1",
  });

  const fetchCategories = async () => {
    const res = await fetch("/api/admin/categories");
    if (res.ok) {
      setCategories(await res.json());
    }
    setLoading(false);
  };

  useEffect(() => {
    queueMicrotask(() => {
      void fetchCategories();
    });
  }, []);

  const resetForm = () => {
    setForm({ name: "", description: "", color: "#6366f1" });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editing ? "PUT" : "POST";
    const body = editing ? { ...form, id: editing.id } : form;

    const res = await fetch("/api/admin/categories", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      fetchCategories();
      resetForm();
    }
  };

  const handleEdit = (category: Category) => {
    setForm({
      name: category.name,
      description: category.description || "",
      color: category.color,
    });
    setEditing(category);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    const res = await fetch(`/api/admin/categories?id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      fetchCategories();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          Categories
        </h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[var(--foreground)]">
                {editing ? "Edit Category" : "New Category"}
              </h2>
              <button
                onClick={resetForm}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) =>
                      setForm({ ...form, color: e.target.value })
                    }
                    className="w-10 h-10 rounded-lg border border-[var(--border)] cursor-pointer"
                  />
                  <input
                    type="text"
                    value={form.color}
                    onChange={(e) =>
                      setForm({ ...form, color: e.target.value })
                    }
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-opacity"
                >
                  {editing ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Categories List */}
      {loading ? (
        <div className="text-center py-12 text-[var(--muted-foreground)]">
          Loading...
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
          <FolderOpen className="w-12 h-12 mx-auto text-[var(--muted-foreground)] mb-3" />
          <p className="text-[var(--muted-foreground)]">
            No categories yet. Create your first one!
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex items-center gap-4"
            >
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: category.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[var(--foreground)]">
                  {category.name}
                </div>
                {category.description && (
                  <div className="text-sm text-[var(--muted-foreground)] truncate">
                    {category.description}
                  </div>
                )}
                <div className="text-xs text-[var(--muted-foreground)] mt-1">
                  /{category.slug}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleEdit(category)}
                  className="p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(category.id)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--muted-foreground)] hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
