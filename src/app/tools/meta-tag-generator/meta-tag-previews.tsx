"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Globe2, ImageIcon, Monitor, Search, Smartphone, Upload, X } from "lucide-react";
import { META_IMAGE_LIMIT, type buildMetaOutput, type MetaDraft } from "@/lib/meta-tags";

type PreviewChannel = "Search" | "Facebook" | "LinkedIn" | "X";
interface LocalImage { url: string; name: string; width: number; height: number; forUrl: string }

export function MetaTagPreviews({ draft, output }: { draft: MetaDraft; output: ReturnType<typeof buildMetaOutput> }) {
  const [channel, setChannel] = useState<PreviewChannel>("Search");
  const [mobile, setMobile] = useState(false);
  const [asset, setAsset] = useState<LocalImage | null>(null);
  const [imageMessage, setImageMessage] = useState("");
  const token = useRef(0);
  const objectUrl = useRef("");
  const inputRef = useRef<HTMLInputElement>(null);
  const host = output.canonical ? new URL(output.canonical).host : "example.com";
  const path = output.canonical ? new URL(output.canonical).pathname : "/your-page";
  const name = output.clean.siteName || host;
  const social = channel === "X" ? output.twitter : output.og;
  const active = channel === "Search" || (channel === "X" ? draft.includeTwitter : draft.includeOpenGraph);
  const useLocalImage = Boolean(asset && asset.forUrl === draft.image && (channel !== "X" || !draft.twitterImage || draft.twitterImage.trim() === draft.image.trim()));
  const square = channel === "X" && draft.twitterCard === "summary";
  const noSnippet = draft.noSnippet || draft.maxSnippet.trim() === "0";

  useEffect(() => () => { token.current++; if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); }, []);

  async function chooseImage(file?: File) {
    if (!file) return;
    const current = ++token.current;
    setImageMessage("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > META_IMAGE_LIMIT) {
      setImageMessage("Choose a JPG, PNG or WebP file up to 8 MB. The previous preview was kept.");
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.src = url;
    try {
      await image.decode();
      if (current !== token.current) { URL.revokeObjectURL(url); return; }
      if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 40_000_000) throw new Error("Image dimensions exceed the preview limit");
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = url;
      setAsset({ url, name: file.name, width: image.naturalWidth, height: image.naturalHeight, forUrl: draft.image });
      setImageMessage("Local preview loaded. No upload took place; the image URL and exported dimensions have not changed.");
      setChannel("Facebook");
    } catch {
      URL.revokeObjectURL(url);
      if (current === token.current) setImageMessage("This file could not be previewed. Use a valid image up to 40 megapixels.");
    }
  }

  return (
    <section aria-labelledby="meta-preview-heading" className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div><p className="text-[10px] font-semibold uppercase tracking-widest text-primary">See the first impression</p><h2 id="meta-preview-heading" className="mt-1 font-bold">Search &amp; social previews</h2></div>
        <div role="group" aria-label="Preview width" className="flex rounded-lg border border-border bg-muted p-1">
          {[false, true].map(value => <button key={String(value)} type="button" aria-pressed={mobile === value} aria-label={value ? "Mobile preview" : "Desktop preview"} onClick={() => setMobile(value)} className={`rounded-md p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${mobile === value ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>{value ? <Smartphone size={16} aria-hidden="true" /> : <Monitor size={16} aria-hidden="true" />}</button>)}
        </div>
      </div>
      <div className="p-4 sm:p-5">
        <div role="group" aria-label="Preview platform" className="mb-5 grid grid-cols-4 gap-1 rounded-xl bg-muted p-1">
          {(["Search", "Facebook", "LinkedIn", "X"] as const).map(value => <button key={value} type="button" aria-pressed={channel === value} onClick={() => setChannel(value)} className={`min-h-10 rounded-lg px-1.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${channel === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{value}</button>)}
        </div>
        <div className="min-h-52 rounded-xl bg-muted/60 p-3 sm:p-4">
          <div className="mx-auto w-full" style={{ maxWidth: mobile ? 360 : 560 }} data-testid="meta-preview">
            {!active ? <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-border p-5 text-center"><ImageIcon size={24} className="text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-semibold">{channel === "X" ? "X cards" : "Open Graph tags"} are switched off</p><p className="mt-2 text-xs text-muted-foreground">Enable this group in the editor to see its mockup. Platforms may use their own fallbacks.</p></div> : channel === "Search" ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-slate-900 sm:p-5">
                <div className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500"><Search size={12} aria-hidden="true" />Illustrative organic result</div>
                <div className="mb-3 flex items-center gap-2.5"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100"><Globe2 size={16} className="text-slate-500" aria-hidden="true" /></span><div className="min-w-0"><p className="truncate text-sm font-medium">{name}</p><p className="truncate text-xs text-slate-500">{host} › {path.replace(/^\//, "").replace(/\//g, " › ")}</p></div></div>
                <p dir="auto" className={`wrap-anywhere text-xl leading-snug text-[#1a0dab] ${mobile ? "line-clamp-2" : "line-clamp-1"}`} style={{ fontFamily: "Arial, sans-serif" }}>{output.clean.title || "Your page title goes here"}</p>
                {noSnippet ? <p className="mt-2 text-xs italic text-slate-500">Your selected robots rules disable text snippets.</p> : <p dir="auto" className="mt-2 line-clamp-3 wrap-anywhere text-sm leading-relaxed text-slate-600">{output.clean.description || "Describe what is on the page and why it is useful. Google may choose different text from the page."}</p>}
              </div>
            ) : (
              <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 ${square ? "flex" : ""}`}>
                <div className={`relative overflow-hidden bg-linear-to-br from-indigo-100 via-violet-50 to-blue-100 ${square ? "w-28 shrink-0 self-stretch" : "w-full"}`} style={square ? {} : { aspectRatio: channel === "X" ? "2 / 1" : "1.91 / 1" }}>
                  {useLocalImage && asset ? <Image unoptimized src={asset.url} alt={social.alt || "Locally selected preview image"} width={asset.width} height={asset.height} className="absolute inset-0 size-full object-cover" /> : <div className="flex h-full min-h-28 flex-col items-center justify-center gap-2 p-4 text-center text-indigo-500"><ImageIcon size={square ? 24 : 32} aria-hidden="true" /><span className="text-xs font-medium">{social.image ? "Image URL set" : "Your social image"}</span>{!square && <span className="text-[10px] text-indigo-700/80">Choose a local image below to try the crop</span>}</div>}
                  {useLocalImage && !square && <span className="absolute bottom-2 right-2 rounded bg-black/65 px-2 py-1 text-[10px] text-white">Local mockup</span>}
                </div>
                <div className={`min-w-0 p-3.5 ${channel === "Facebook" ? "bg-slate-50" : ""}`}>
                  <p className="truncate text-[11px] uppercase tracking-wide text-slate-500">{host}</p>
                  <p dir="auto" className="mt-1 line-clamp-2 wrap-anywhere text-sm font-semibold leading-snug">{social.title || "Your social headline"}</p>
                  {channel !== "X" && <p dir="auto" className="mt-1.5 line-clamp-2 wrap-anywhere text-xs leading-relaxed text-slate-500">{social.description || "A helpful summary for someone seeing this link for the first time."}</p>}
                  {channel === "X" && <p className="mt-2 text-[10px] text-slate-500">{draft.twitterCard === "summary" ? "Summary card mockup" : "Large-image card mockup"}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
        {draft.robots.includes("noindex") && channel === "Search" && <p className="mt-3 rounded-lg bg-amber-500/10 p-3 text-xs font-medium text-amber-800 dark:text-amber-300">Noindex is selected. This visual mockup does not mean the page can appear in search.</p>}
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Mockups, not live Google or platform results. Layouts, image crops, caching and rewritten text vary. The URL is never fetched; descriptions are omitted from our X mockup, not from your tags.</p>
        <details className="mt-4 border-t border-border pt-4">
          <summary className="cursor-pointer text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Try your social image <span className="font-normal text-muted-foreground">· local file only</span></summary>
          <div className="mt-3 space-y-3">
            <p className="text-xs leading-relaxed text-muted-foreground">Choose a JPG, PNG or WebP to try the crop. Nothing is uploaded. You still need a publicly hosted image URL for the exported tags.</p>
            <input ref={inputRef} id="meta-local-image" type="file" aria-label="Local social image preview file" tabIndex={-1} accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={event => { void chooseImage(event.target.files?.[0]); event.target.value = ""; }} />
            <div className="flex flex-wrap gap-2"><button type="button" onClick={() => inputRef.current?.click()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"><Upload size={14} aria-hidden="true" />Choose preview image</button>{asset && <button type="button" onClick={() => { token.current++; URL.revokeObjectURL(asset.url); objectUrl.current = ""; setAsset(null); setImageMessage("Local image removed."); }} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"><X size={14} aria-hidden="true" />Remove</button>}</div>
            {asset && <p className="wrap-anywhere text-xs text-muted-foreground">{asset.name} · {asset.width} × {asset.height}px{!useLocalImage ? " · not used in this card (the image URL differs)" : ""}</p>}
            <p role="status" className="text-xs leading-relaxed text-muted-foreground">{imageMessage}</p>
          </div>
        </details>
      </div>
    </section>
  );
}