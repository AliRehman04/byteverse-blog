"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Plus, Pencil, Trash2, X, Upload, ZoomIn, ZoomOut, Move } from "lucide-react";

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

/* ── Avatar Cropper ── */
function AvatarCropper({
  file,
  onCrop,
  onCancel,
}: {
  file: File;
  onCrop: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgSrc, setImgSrc] = useState("");
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const PREVIEW = 256; // crop output px

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    const img = new window.Image();
    img.onload = () => {
      imgRef.current = img;
      // fit image so shorter side fills the preview
      const minDim = Math.min(img.width, img.height);
      const fitScale = PREVIEW / minDim;
      setScale(fitScale);
      setPos({
        x: (PREVIEW - img.width * fitScale) / 2,
        y: (PREVIEW - img.height * fitScale) / 2,
      });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setPos({
      x: dragStart.current.px + (e.clientX - dragStart.current.x),
      y: dragStart.current.py + (e.clientY - dragStart.current.y),
    });
  };
  const onPointerUp = () => setDragging(false);

  const adjustScale = (delta: number) => {
    setScale((s) => Math.max(0.1, Math.min(5, s + delta)));
  };

  const doCrop = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    canvas.width = PREVIEW;
    canvas.height = PREVIEW;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, PREVIEW, PREVIEW);
    ctx.drawImage(img, pos.x, pos.y, img.width * scale, img.height * scale);
    canvas.toBlob(
      (blob) => {
        if (blob) onCrop(blob);
      },
      "image/webp",
      0.9,
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 w-full max-w-sm">
        <h3 className="text-sm font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
          <Move className="w-4 h-4" /> Crop Avatar
        </h3>

        {/* preview */}
        <div
          className="relative mx-auto overflow-hidden rounded-xl border border-[var(--border)] cursor-grab active:cursor-grabbing select-none"
          style={{ width: PREVIEW, height: PREVIEW }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {imgSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgSrc}
              alt="Crop preview"
              draggable={false}
              style={{
                position: "absolute",
                left: pos.x,
                top: pos.y,
                width: imgRef.current ? imgRef.current.width * scale : "auto",
                height: imgRef.current ? imgRef.current.height * scale : "auto",
                pointerEvents: "none",
              }}
            />
          )}
          {/* crosshair overlay */}
          <div className="absolute inset-0 pointer-events-none border-2 border-white/30 rounded-xl" />
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-px h-full bg-white/15" />
          </div>
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="h-px w-full bg-white/15" />
          </div>
        </div>

        {/* zoom controls */}
        <div className="flex items-center gap-3 mt-3">
          <button
            type="button"
            onClick={() => adjustScale(-0.1)}
            className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] text-[var(--foreground)]"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.05"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="flex-1 accent-[var(--primary)]"
          />
          <button
            type="button"
            onClick={() => adjustScale(0.1)}
            className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] text-[var(--foreground)]"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[var(--muted-foreground)] text-center mt-2">
          Drag to reposition &middot; Scroll or buttons to zoom
        </p>

        {/* actions */}
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-3 py-2 text-sm border border-[var(--border)] rounded-xl hover:bg-[var(--muted)] text-[var(--foreground)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={doCrop}
            className="flex-1 px-3 py-2 text-sm bg-[var(--primary)] text-white rounded-xl hover:opacity-90 font-medium"
          >
            Crop &amp; Save
          </button>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
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
  const [cropFile, setCropFile] = useState<File | null>(null);

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
    setCropFile(file);
    // reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleCroppedUpload = async (blob: Blob) => {
    setCropFile(null);
    setUploading(true);
    const file = new File([blob], "avatar.webp", { type: "image/webp" });
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.avatar}
                      alt={form.name || "Author avatar"}
                      className="w-20 h-20 rounded-xl object-cover"
                    />
                    <button
                      onClick={() => setForm({ ...form, avatar: "" })}
                      className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full text-xs"
                    >
                      ×
                    </button>
                    {/* re-crop / replace button */}
                    <label className="absolute -bottom-1 -right-1 p-1 bg-[var(--primary)] text-white rounded-full cursor-pointer hover:opacity-90">
                      <Pencil className="w-3 h-3" />
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    </label>
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

              {/* Avatar Cropper Modal */}
              {cropFile && (
                <AvatarCropper
                  file={cropFile}
                  onCrop={handleCroppedUpload}
                  onCancel={() => setCropFile(null)}
                />
              )}

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
