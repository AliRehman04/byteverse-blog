"use client";

import { useState, useMemo } from "react";
import { Copy, Check, Globe, Image as ImageIcon, Search, Share2 } from "lucide-react";

function escapeHtml(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function OpenGraphPreviewTool() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [siteName, setSiteName] = useState("");
  const [type, setType] = useState("website");
  const [twitterCard, setTwitterCard] = useState("summary_large_image");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [copied, setCopied] = useState(false);

  const displayTitle = title || "Your Page Title";
  const displayDesc = description || "Your page description will appear here...";
  const displayUrl = url || "https://example.com";
  const displaySite = siteName || "Your Site";

  const metaTags = useMemo(() => {
    const tags: string[] = [];
    if (title) {
      tags.push(`<meta property="og:title" content="${escapeHtml(title)}" />`);
      tags.push(`<meta name="twitter:title" content="${escapeHtml(title)}" />`);
    }
    if (description) {
      tags.push(`<meta property="og:description" content="${escapeHtml(description)}" />`);
      tags.push(`<meta name="twitter:description" content="${escapeHtml(description)}" />`);
    }
    if (url) tags.push(`<meta property="og:url" content="${escapeHtml(url)}" />`);
    if (imageUrl) {
      tags.push(`<meta property="og:image" content="${escapeHtml(imageUrl)}" />`);
      tags.push(`<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`);
    }
    if (siteName) tags.push(`<meta property="og:site_name" content="${escapeHtml(siteName)}" />`);
    tags.push(`<meta property="og:type" content="${type}" />`);
    tags.push(`<meta name="twitter:card" content="${twitterCard}" />`);
    if (twitterHandle) tags.push(`<meta name="twitter:site" content="${escapeHtml(twitterHandle)}" />`);
    return tags.join("\n");
  }, [title, description, url, imageUrl, siteName, type, twitterCard, twitterHandle]);

  const copyTags = async () => {
    await navigator.clipboard.writeText(metaTags);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Inputs */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="og-title" className="text-sm font-medium mb-1 block">Title <span className="text-xs text-muted-foreground">({title.length}/70)</span></label>
            <input id="og-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={70} placeholder="My Awesome Page" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label htmlFor="og-desc" className="text-sm font-medium mb-1 block">Description <span className="text-xs text-muted-foreground">({description.length}/200)</span></label>
            <textarea id="og-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} rows={3} placeholder="A brief description of your page..." className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label htmlFor="og-url" className="text-sm font-medium mb-1 block">Page URL</label>
            <input id="og-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/page" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label htmlFor="og-image" className="text-sm font-medium mb-1 block">Image URL</label>
            <input id="og-image" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://example.com/og-image.jpg" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="og-sitename" className="text-sm font-medium mb-1 block">Site Name</label>
            <input id="og-sitename" value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="My Website" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="og-type" className="text-sm font-medium mb-1 block">OG Type</label>
              <select id="og-type" value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                <option value="website">website</option>
                <option value="article">article</option>
                <option value="profile">profile</option>
                <option value="product">product</option>
              </select>
            </div>
            <div>
              <label htmlFor="tw-card" className="text-sm font-medium mb-1 block">Twitter Card</label>
              <select id="tw-card" value={twitterCard} onChange={(e) => setTwitterCard(e.target.value)} className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                <option value="summary_large_image">summary_large_image</option>
                <option value="summary">summary</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="tw-handle" className="text-sm font-medium mb-1 block">Twitter Handle</label>
            <input id="tw-handle" value={twitterHandle} onChange={(e) => setTwitterHandle(e.target.value)} placeholder="@yourhandle" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
        </div>
      </div>

      {/* Previews */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold flex items-center gap-2"><Globe size={18} /> Social Previews</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Google Preview */}
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5"><Globe size={12} /> Google</p>
            <div className="space-y-1">
              <p className="text-xs text-green-600 dark:text-green-400 truncate">{displayUrl}</p>
              <p className="text-blue-600 dark:text-blue-400 text-base font-medium leading-snug line-clamp-1 hover:underline cursor-pointer">{displayTitle}</p>
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{displayDesc}</p>
            </div>
          </div>

          {/* Facebook/LinkedIn Preview */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <p className="px-5 pt-4 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Globe size={12} /> Facebook / LinkedIn</p>
            <div className="mx-4 mb-4 border border-border rounded-lg overflow-hidden bg-muted/30">
              {imageUrl ? (
                <div className="aspect-[1.91/1] bg-muted flex items-center justify-center overflow-hidden">
                  <img src={imageUrl} alt="OG Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
              ) : (
                <div className="aspect-[1.91/1] bg-muted/60 flex items-center justify-center">
                  <ImageIcon size={32} className="text-muted-foreground/40" />
                </div>
              )}
              <div className="p-3 space-y-0.5">
                <p className="text-[11px] text-muted-foreground uppercase">{displaySite}</p>
                <p className="text-sm font-semibold line-clamp-1">{displayTitle}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{displayDesc}</p>
              </div>
            </div>
          </div>

          {/* Twitter Preview */}
          <div className="bg-card border border-border rounded-xl overflow-hidden md:col-span-2">
            <p className="px-5 pt-4 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Search size={12} /> Twitter / X</p>
            <div className="mx-4 mb-4 border border-border rounded-2xl overflow-hidden bg-muted/30">
              {twitterCard === "summary_large_image" ? (
                <>
                  {imageUrl ? (
                    <div className="aspect-[2/1] bg-muted overflow-hidden">
                      <img src={imageUrl} alt="Twitter Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </div>
                  ) : (
                    <div className="aspect-[2/1] bg-muted/60 flex items-center justify-center">
                      <ImageIcon size={32} className="text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="p-3 space-y-0.5">
                    <p className="text-sm font-semibold line-clamp-1">{displayTitle}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{displayDesc}</p>
                    <p className="text-xs text-muted-foreground">{displayUrl.replace(/^https?:\/\//, "").split("/")[0]}</p>
                  </div>
                </>
              ) : (
                <div className="flex overflow-hidden">
                  {imageUrl ? (
                    <div className="w-32 h-32 bg-muted shrink-0 overflow-hidden">
                      <img src={imageUrl} alt="Twitter Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </div>
                  ) : (
                    <div className="w-32 h-32 bg-muted/60 flex items-center justify-center shrink-0">
                      <ImageIcon size={24} className="text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="p-3 space-y-0.5 min-w-0">
                    <p className="text-xs text-muted-foreground">{displayUrl.replace(/^https?:\/\//, "").split("/")[0]}</p>
                    <p className="text-sm font-semibold line-clamp-2">{displayTitle}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{displayDesc}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Generated Meta Tags */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <p className="text-sm font-medium">Generated Meta Tags</p>
          <button onClick={copyTags} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap text-muted-foreground leading-relaxed">{metaTags}</pre>
      </div>
    </div>
  );
}
