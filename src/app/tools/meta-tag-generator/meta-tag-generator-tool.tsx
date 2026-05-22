"use client";

import { useState, useCallback, useMemo } from "react";
import { Copy, Check, Eye } from "lucide-react";

export function MetaTagGeneratorTool() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [image, setImage] = useState("");
  const [siteName, setSiteName] = useState("");
  const [author, setAuthor] = useState("");
  const [keywords, setKeywords] = useState("");
  const [robots, setRobots] = useState("index, follow");
  const [twitterCard, setTwitterCard] = useState("summary_large_image");
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const output = useMemo(() => {
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    const lines: string[] = [
      '<!-- Primary Meta Tags -->',
      '<meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    ];

    if (title) lines.push(`<title>${esc(title)}</title>`);
    if (description) lines.push(`<meta name="description" content="${esc(description)}">`);
    if (keywords) lines.push(`<meta name="keywords" content="${esc(keywords)}">`);
    if (author) lines.push(`<meta name="author" content="${esc(author)}">`);
    if (robots) lines.push(`<meta name="robots" content="${esc(robots)}">`);
    if (url) lines.push(`<link rel="canonical" href="${esc(url)}">`);

    lines.push('');
    lines.push('<!-- Open Graph / Facebook -->');
    lines.push('<meta property="og:type" content="website">');
    if (title) lines.push(`<meta property="og:title" content="${esc(title)}">`);
    if (description) lines.push(`<meta property="og:description" content="${esc(description)}">`);
    if (url) lines.push(`<meta property="og:url" content="${esc(url)}">`);
    if (image) lines.push(`<meta property="og:image" content="${esc(image)}">`);
    if (siteName) lines.push(`<meta property="og:site_name" content="${esc(siteName)}">`);

    lines.push('');
    lines.push('<!-- Twitter -->');
    lines.push(`<meta name="twitter:card" content="${esc(twitterCard)}">`);
    if (title) lines.push(`<meta name="twitter:title" content="${esc(title)}">`);
    if (description) lines.push(`<meta name="twitter:description" content="${esc(description)}">`);
    if (image) lines.push(`<meta name="twitter:image" content="${esc(image)}">`);

    return lines.join('\n');
  }, [title, description, url, image, siteName, author, keywords, robots, twitterCard]);

  const copyCode = useCallback(async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const titleLen = title.length;
  const descLen = description.length;

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input form */}
        <div className="space-y-4 p-6 bg-card border border-border rounded-lg">
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-sm font-medium">Page Title</label>
              <span className={`text-xs ${titleLen > 60 ? "text-red-500" : "text-muted-foreground"}`}>
                {titleLen}/60
              </span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Awesome Page - Brand Name"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="text-sm font-medium">Meta Description</label>
              <span className={`text-xs ${descLen > 160 ? "text-red-500" : "text-muted-foreground"}`}>
                {descLen}/160
              </span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of your page content..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Page URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/page"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Image URL</label>
            <input
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://example.com/og-image.jpg"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Site Name</label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="ByteVerse"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Author</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Keywords</label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="keyword1, keyword2, keyword3"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="robots-select" className="text-sm font-medium block mb-1">Robots</label>
              <select
                id="robots-select"
                value={robots}
                onChange={(e) => setRobots(e.target.value)}
                title="Robots directive"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
              >
                <option value="index, follow">Index, Follow</option>
                <option value="noindex, follow">No Index, Follow</option>
                <option value="index, nofollow">Index, No Follow</option>
                <option value="noindex, nofollow">No Index, No Follow</option>
              </select>
            </div>
            <div>
              <label htmlFor="twitter-card-select" className="text-sm font-medium block mb-1">Twitter Card</label>
              <select
                id="twitter-card-select"
                value={twitterCard}
                onChange={(e) => setTwitterCard(e.target.value)}
                title="Twitter card type"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
              >
                <option value="summary_large_image">Large Image</option>
                <option value="summary">Summary</option>
              </select>
            </div>
          </div>
        </div>

        {/* Output + Preview */}
        <div className="space-y-4">
          {/* Google Preview */}
          {showPreview && (title || description) && (
            <div className="p-4 bg-card border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Eye size={16} className="text-muted-foreground" />
                <span className="text-sm font-medium">Google Preview</span>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-green-700 dark:text-green-400 truncate">
                  {url || "https://example.com"}
                </div>
                <div className="text-lg text-blue-600 dark:text-blue-400 font-medium line-clamp-1">
                  {title || "Page Title"}
                </div>
                <div className="text-sm text-muted-foreground line-clamp-2">
                  {description || "Meta description will appear here..."}
                </div>
              </div>
            </div>
          )}

          {/* Code output */}
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Generated Code</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs text-primary hover:underline"
                >
                  {showPreview ? "Hide preview" : "Show preview"}
                </button>
                <button
                  onClick={copyCode}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied!" : "Copy Code"}
                </button>
              </div>
            </div>
            <pre className="p-4 bg-muted/50 border border-border rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-96">
              {output}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
