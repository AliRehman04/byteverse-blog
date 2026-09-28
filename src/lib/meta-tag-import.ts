import { parseDocument } from "htmlparser2";
import { EMPTY_META_DRAFT, META_IMPORT_LIMIT, metaFieldLimit, type MetaDraft, type MetaTextField } from "./meta-tags";

export interface MetaImportResult {
  draft: MetaDraft;
  fields: MetaTextField[];
  notices: string[];
}

const fieldMap = new Map<string, MetaTextField>([
  ["description", "description"], ["author", "author"], ["keywords", "keywords"],
  ["og:title", "ogTitle"], ["og:description", "ogDescription"], ["og:site_name", "siteName"],
  ["og:image", "image"], ["og:image:alt", "imageAlt"], ["og:image:width", "imageWidth"],
  ["og:image:height", "imageHeight"], ["og:locale", "locale"],
  ["article:published_time", "publishedTime"], ["article:modified_time", "modifiedTime"],
  ["twitter:title", "twitterTitle"], ["twitter:description", "twitterDescription"],
  ["twitter:image", "twitterImage"], ["twitter:image:alt", "twitterImageAlt"],
  ["twitter:site", "twitterSite"], ["twitter:creator", "twitterCreator"],
]);

export function importMetaHtml(html: string): MetaImportResult {
  if (!html.trim()) throw new Error("Paste a head fragment or page source first.");
  if (html.length > META_IMPORT_LIMIT) throw new Error("Paste just the head section, up to 100,000 characters.");
  // This parser creates plain objects, not browser nodes, so resources and scripts never run.
  const document = parseDocument(html, { decodeEntities: true, lowerCaseTags: true, lowerCaseAttributeNames: true });
  const root = document.children.flatMap(node => node.type === "tag" && node.name === "html" ? node.children : [node]);
  const head = root.find(node => node.type === "tag" && node.name === "head");
  const nodes = head && "children" in head ? head.children : root;
  const draft: MetaDraft = { ...EMPTY_META_DRAFT, includeOpenGraph: false, includeTwitter: false };
  const fields = new Set<MetaTextField>();
  const notices = new Set<string>();
  const values = new Map<string, string>();
  const robots: string[] = [];
  let imageRoots = 0;

  function setFirst(key: string, value: string) {
    if (values.has(key)) {
      notices.add(`Multiple ${key} tags found. Only the first is used (except combined robots rules).`);
      return;
    }
    values.set(key, value.trim());
  }
  for (const node of nodes) {
    if (node.type !== "tag") continue;
    if (node.name === "title") {
      setFirst("title", node.children.filter(child => child.type === "text").map(child => "data" in child ? child.data : "").join(""));
      continue;
    }
    const attrs = node.attribs;
    if (node.name === "link" && (attrs.rel || "").toLowerCase().split(/\s+/).includes("canonical") && attrs.href !== undefined) {
      setFirst("canonical", attrs.href);
      continue;
    }
    if (node.name === "base") { notices.add("Base URLs are ignored. Convert relative URLs to their intended absolute URLs before exporting."); continue; }
    if (node.name !== "meta") continue;
    if (attrs.charset || attrs["http-equiv"]) { notices.add("Charset and HTTP-equivalent tags are not imported. Keep required document/security settings in your original head."); continue; }
    const key = (attrs.property || attrs.name || "").toLowerCase();
    if (!key || attrs.content === undefined) continue;
    if (key === "robots") { robots.push(attrs.content); continue; }
    if (key === "googlebot" || key === "googlebot-news") { notices.add("Crawler-specific robots tags were not imported. Retain them in the original page; the general robots field does not replace them."); continue; }
    if (key === "og:image" || key === "og:image:url") {
      imageRoots++;
      setFirst("og:image", attrs.content);
      continue;
    }
    if (key.startsWith("og:image:") && imageRoots > 1) continue;
    if (fieldMap.has(key) || ["og:type", "og:url", "twitter:card"].includes(key)) setFirst(key, attrs.content);
    else notices.add("Unsupported metadata was left out. This imports supported fields, not a lossless copy of the entire head.");
  }

  for (const [key, value] of values) {
    const field = key === "title" || key === "canonical" ? key : fieldMap.get(key);
    if (!field) continue;
    if (value.length > metaFieldLimit(field)) throw new Error(`${key} exceeds this editor's ${metaFieldLimit(field)}-character input limit. Shorten it before importing.`);
    Object.assign(draft, { [field]: value });
    fields.add(field);
  }
  draft.includeOpenGraph = [...values.keys()].some(key => key.startsWith("og:") || key.startsWith("article:"));
  draft.includeTwitter = [...values.keys()].some(key => key.startsWith("twitter:"));
  const type = values.get("og:type");
  if (type === "article" || type === "website") { draft.ogType = type; fields.add("ogType"); }
  else if (type) notices.add(`Unsupported og:type was replaced with website. Only website and article are supported here.`);
  const card = values.get("twitter:card");
  if (card === "summary" || card === "summary_large_image") { draft.twitterCard = card; fields.add("twitterCard"); }
  else if (card) notices.add("Unsupported X card type was replaced with a large-image summary. App and player cards need a different implementation.");
  if (!draft.canonical && values.get("og:url")) {
    draft.canonical = values.get("og:url")!;
    fields.add("canonical");
    notices.add("No canonical was found. og:url was used as a suggested canonical; confirm it before exporting.");
  } else if (values.get("og:url") && values.get("og:url") !== draft.canonical) {
    notices.add("Canonical and og:url differ. Output will use the canonical for both; confirm the preferred URL.");
  }
  if (robots.length) {
    const tokens = robots.flatMap(value => value.toLowerCase().split(/[,;]/).map(token => token.trim()).filter(Boolean));
    const noindex = tokens.includes("noindex") || tokens.includes("none");
    const nofollow = tokens.includes("nofollow") || tokens.includes("none");
    const explicitDefaults = tokens.some(token => ["index", "follow", "all"].includes(token));
    draft.robots = noindex ? (nofollow ? "noindex, nofollow" : "noindex, follow") : nofollow ? "index, nofollow" : explicitDefaults ? "index, follow" : "default";
    draft.noSnippet = tokens.includes("nosnippet");
    fields.add("robots");
    const snippets: number[] = [];
    const previews: ("none" | "standard" | "large")[] = [];
    for (const token of tokens) {
      if (["index", "follow", "noindex", "nofollow", "all", "none", "nosnippet"].includes(token)) continue;
      const snippet = /^max-snippet\s*:\s*(-1|\d+)$/.exec(token);
      const preview = /^max-image-preview\s*:\s*(none|standard|large)$/.exec(token);
      if (snippet) snippets.push(+snippet[1]);
      else if (preview) previews.push(preview[1] as "none" | "standard" | "large");
      else notices.add(`Unmapped robots rule: ${token}. Retain it separately in the original head; this editor will not export it.`);
    }
    if (snippets.length) { const finite = snippets.filter(n => n >= 0); draft.maxSnippet = String(finite.length ? Math.min(...finite) : -1); fields.add("maxSnippet"); }
    if (previews.length) { draft.maxImagePreview = ["none", "standard", "large"].find(value => previews.includes(value as typeof previews[number])) as MetaDraft["maxImagePreview"]; fields.add("maxImagePreview"); }
    if (noindex || nofollow || draft.noSnippet || draft.maxSnippet === "0" || draft.maxImagePreview === "none") notices.add("Restrictive robots rules were imported. Review them before publishing.");
    if (robots.length > 1 || (tokens.includes("index") && noindex) || (tokens.includes("follow") && nofollow)) notices.add("Robots tags were combined using the stricter supported rules.");
  }
  if (!fields.size) throw new Error("No supported metadata found. Paste a title, meta tags or a canonical link from the head section.");
  return { draft, fields: [...fields], notices: [...notices].slice(0, 20) };
}