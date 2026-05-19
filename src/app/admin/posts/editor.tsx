"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Upload, ArrowLeft, Save, Eye, Image as ImageIcon, X, Sparkles } from "lucide-react";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface Category {
  id: number;
  name: string;
}

interface ImageInsert {
  url: string;
  altText: string;
  title: string;
  caption: string;
  width: string;
  loading: "lazy" | "eager";
}

interface PostForm {
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  categoryId: string;
  author: string;
  published: boolean;
  featured: boolean;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
}

const defaultForm: PostForm = {
  title: "",
  excerpt: "",
  content: "",
  coverImage: "",
  categoryId: "",
  author: "ByteVerse",
  published: false,
  featured: false,
  metaTitle: "",
  metaDescription: "",
  keywords: "",
};

export default function PostEditor({
  postId,
}: {
  postId?: string;
}) {
  const [form, setForm] = useState<PostForm>(defaultForm);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageInsert, setImageInsert] = useState<ImageInsert>({
    url: "",
    altText: "",
    title: "",
    caption: "",
    width: "",
    loading: "lazy",
  });
  const [uploadingInline, setUploadingInline] = useState(false);
  const router = useRouter();
  const isEditing = !!postId;

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((res) => res.json())
      .then(setCategories)
      .catch(() => {});

    if (postId) {
      fetch(`/api/admin/posts/${postId}`)
        .then((res) => res.json())
        .then((post) => {
          setForm({
            title: post.title || "",
            excerpt: post.excerpt || "",
            content: post.content || "",
            coverImage: post.coverImage || "",
            categoryId: post.categoryId?.toString() || "",
            author: post.author || "ByteVerse",
            published: post.published || false,
            featured: post.featured || false,
            metaTitle: post.metaTitle || "",
            metaDescription: post.metaDescription || "",
            keywords: post.keywords || "",
          });
        })
        .catch(() => {});
    }
  }, [postId]);

  const handleImageUpload = useCallback(async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const { url } = await res.json();
        return url;
      }
      return null;
    } catch {
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await handleImageUpload(file);
    if (url) {
      setForm({ ...form, coverImage: url });
    }
  };

  const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingInline(true);
    const url = await handleImageUpload(file);
    if (url) {
      setImageInsert({ ...imageInsert, url });
    }
    setUploadingInline(false);
  };

  const insertImageToContent = () => {
    if (!imageInsert.url) return;

    const attrs: string[] = [];
    if (imageInsert.width) attrs.push(`width="${imageInsert.width}"`);
    if (imageInsert.loading) attrs.push(`loading="${imageInsert.loading}"`);
    if (imageInsert.title) attrs.push(`title="${imageInsert.title}"`);

    let imgTag: string;
    if (attrs.length > 0) {
      // Use HTML img tag for extra attributes
      imgTag = `<img src="${imageInsert.url}" alt="${imageInsert.altText || ""}" ${attrs.join(" ")} />`;
    } else {
      // Simple markdown
      imgTag = `![${imageInsert.altText || ""}](${imageInsert.url})`;
    }

    if (imageInsert.caption) {
      imgTag = `<figure>\n${imgTag}\n<figcaption>${imageInsert.caption}</figcaption>\n</figure>`;
    }

    const newContent = form.content ? form.content + "\n\n" + imgTag : imgTag;
    setForm({ ...form, content: newContent });
    setShowImageModal(false);
    setImageInsert({ url: "", altText: "", title: "", caption: "", width: "", loading: "lazy" });
  };

  const handleAIGenerate = async () => {
    if (!form.title || !form.content) {
      setMessage({ type: "error", text: "Title and content are required for AI generation" });
      return;
    }
    setGeneratingAI(true);
    setMessage(null);

    const categoryName = categories.find((c) => c.id.toString() === form.categoryId)?.name || "";

    try {
      const res = await fetch("/api/admin/ai-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          category: categoryName,
        }),
      });

      if (res.ok) {
        const seoData = await res.json();
        setForm({
          ...form,
          metaTitle: seoData.metaTitle || form.metaTitle,
          metaDescription: seoData.metaDescription || form.metaDescription,
          keywords: seoData.keywords || form.keywords,
          excerpt: seoData.excerpt || form.excerpt,
        });
        setMessage({ type: "success", text: "AI generated SEO data successfully!" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "AI generation failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error during AI generation" });
    }

    setGeneratingAI(false);
  };

  const handleSubmit = async (publish?: boolean) => {
    setSaving(true);
    setMessage(null);

    const payload = {
      ...form,
      published: publish !== undefined ? publish : form.published,
    };

    const url = isEditing ? `/api/admin/posts/${postId}` : "/api/admin/posts";
    const method = isEditing ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMessage({ type: "success", text: isEditing ? "Post updated!" : "Post created!" });
        if (!isEditing) {
          const post = await res.json();
          setTimeout(() => router.push(`/admin/posts/${post.id}`), 1000);
        }
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Something went wrong" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    }

    setSaving(false);
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <button
          onClick={() => router.push("/admin/posts")}
          className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Posts
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSubmit(false)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm font-medium hover:bg-[var(--muted)] transition-colors text-[var(--foreground)]"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </button>
          <button
            onClick={() => handleSubmit(true)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <Eye className="w-4 h-4" />
            Publish
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl text-sm ${
            message.type === "success"
              ? "bg-green-500/10 text-green-500"
              : "bg-red-500/10 text-red-500"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Title */}
          <input
            type="text"
            placeholder="Post title..."
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-4 py-3 text-xl font-bold rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />

          {/* Excerpt */}
          <textarea
            placeholder="Write a short excerpt..."
            value={form.excerpt}
            onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            rows={2}
            className="w-full px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
          />

          {/* Markdown Editor */}
          <div className="flex items-center gap-2 mb-1">
            <button
              type="button"
              onClick={() => setShowImageModal(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              <ImageIcon className="w-4 h-4" />
              Insert Image
            </button>
          </div>
          <div data-color-mode="auto">
            <MDEditor
              value={form.content}
              onChange={(val) => setForm({ ...form, content: val || "" })}
              height={500}
              preview="edit"
            />
          </div>
        </div>

        {/* Image Insert Modal */}
        {showImageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--foreground)]">Insert Image</h3>
                <button
                  onClick={() => setShowImageModal(false)}
                  className="p-1 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Upload */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    Upload Image *
                  </label>
                  {imageInsert.url ? (
                    <div className="relative">
                      <img src={imageInsert.url} alt="Preview" className="w-full h-32 object-cover rounded-xl" />
                      <button
                        onClick={() => setImageInsert({ ...imageInsert, url: "" })}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-lg hover:bg-red-600 text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-[var(--border)] rounded-xl cursor-pointer hover:border-[var(--primary)] transition-colors">
                      {uploadingInline ? (
                        <div className="animate-spin w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-[var(--muted-foreground)] mb-1" />
                          <span className="text-sm text-[var(--muted-foreground)]">Click to upload</span>
                        </>
                      )}
                      <input type="file" accept="image/*" onChange={handleInlineImageUpload} className="hidden" />
                    </label>
                  )}
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">Or paste a URL below</p>
                  <input
                    type="text"
                    value={imageInsert.url}
                    onChange={(e) => setImageInsert({ ...imageInsert, url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                {/* Alt Text */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    Alt Text *
                    <span className="text-xs font-normal text-[var(--muted-foreground)] ml-1">(SEO & Accessibility)</span>
                  </label>
                  <input
                    type="text"
                    value={imageInsert.altText}
                    onChange={(e) => setImageInsert({ ...imageInsert, altText: e.target.value })}
                    placeholder="Describe the image for search engines & screen readers"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    {imageInsert.altText.length > 0
                      ? `${imageInsert.altText.length}/125 chars`
                      : "Include keywords naturally. Be descriptive."}
                  </p>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    Title Attribute
                    <span className="text-xs font-normal text-[var(--muted-foreground)] ml-1">(Tooltip on hover)</span>
                  </label>
                  <input
                    type="text"
                    value={imageInsert.title}
                    onChange={(e) => setImageInsert({ ...imageInsert, title: e.target.value })}
                    placeholder="Additional context shown on hover"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                {/* Caption */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    Caption
                    <span className="text-xs font-normal text-[var(--muted-foreground)] ml-1">(Visible below image)</span>
                  </label>
                  <input
                    type="text"
                    value={imageInsert.caption}
                    onChange={(e) => setImageInsert({ ...imageInsert, caption: e.target.value })}
                    placeholder="Image source or description"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                {/* Width & Loading */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                      Width
                    </label>
                    <input
                      type="text"
                      value={imageInsert.width}
                      onChange={(e) => setImageInsert({ ...imageInsert, width: e.target.value })}
                      placeholder="e.g. 800 or 100%"
                      className="w-full px-3 py-2 rounded-lg bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                      Loading
                    </label>
                    <select
                      value={imageInsert.loading}
                      onChange={(e) => setImageInsert({ ...imageInsert, loading: e.target.value as "lazy" | "eager" })}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    >
                      <option value="lazy">Lazy (recommended)</option>
                      <option value="eager">Eager</option>
                    </select>
                  </div>
                </div>

                {/* Insert Button */}
                <button
                  onClick={insertImageToContent}
                  disabled={!imageInsert.url}
                  className="w-full mt-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Insert Image
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Cover Image */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Cover Image
            </label>
            {form.coverImage ? (
              <div className="relative">
                <img
                  src={form.coverImage}
                  alt="Cover"
                  className="w-full h-40 object-cover rounded-xl"
                />
                <button
                  onClick={() => setForm({ ...form, coverImage: "" })}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-[var(--border)] rounded-xl cursor-pointer hover:border-[var(--primary)] transition-colors">
                {uploading ? (
                  <div className="animate-spin w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 text-[var(--muted-foreground)] mb-2" />
                    <span className="text-sm text-[var(--muted-foreground)]">
                      Click to upload
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Category */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Category
            </label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="">No category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Options */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-3">
            <label className="block text-sm font-medium text-[var(--foreground)]">
              Options
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) =>
                  setForm({ ...form, featured: e.target.checked })
                }
                className="w-4 h-4 rounded accent-[var(--primary)]"
              />
              <span className="text-sm text-[var(--foreground)]">
                Featured post
              </span>
            </label>
            <div>
              <label className="block text-sm text-[var(--muted-foreground)] mb-1">
                Author
              </label>
              <input
                type="text"
                value={form.author}
                onChange={(e) =>
                  setForm({ ...form, author: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
          </div>

          {/* SEO */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-[var(--foreground)]">
                SEO Settings
              </label>
              <button
                type="button"
                onClick={handleAIGenerate}
                disabled={generatingAI || !form.title || !form.content}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingAI ? (
                  <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                {generatingAI ? "Generating..." : "AI Generate"}
              </button>
            </div>
            <div>
              <label className="block text-sm text-[var(--muted-foreground)] mb-1">
                Meta Title
              </label>
              <input
                type="text"
                value={form.metaTitle}
                onChange={(e) =>
                  setForm({ ...form, metaTitle: e.target.value })
                }
                placeholder={form.title || "Post title"}
                maxLength={70}
                className="w-full px-3 py-2 rounded-lg bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
              <span className="text-xs text-[var(--muted-foreground)]">
                {(form.metaTitle || form.title).length}/70
              </span>
            </div>
            <div>
              <label className="block text-sm text-[var(--muted-foreground)] mb-1">
                Meta Description
              </label>
              <textarea
                value={form.metaDescription}
                onChange={(e) =>
                  setForm({ ...form, metaDescription: e.target.value })
                }
                placeholder={form.excerpt || "Post excerpt"}
                maxLength={160}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
              />
              <span className="text-xs text-[var(--muted-foreground)]">
                {(form.metaDescription || form.excerpt).length}/160
              </span>
            </div>
            <div>
              <label className="block text-sm text-[var(--muted-foreground)] mb-1">
                Keywords (comma separated)
              </label>
              <input
                type="text"
                value={form.keywords}
                onChange={(e) =>
                  setForm({ ...form, keywords: e.target.value })
                }
                placeholder="ai tools, tech, productivity"
                className="w-full px-3 py-2 rounded-lg bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
