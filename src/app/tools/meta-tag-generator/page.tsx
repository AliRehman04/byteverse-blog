import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Braces, Check, ChevronRight, Code2, FileCode2, Layers, ShieldCheck } from "lucide-react";
import { MetaTagGeneratorTool } from "./meta-tag-generator-tool";
import { generateToolMetadata, ToolJsonLd } from "@/lib/tool-seo";
import { buildMetaOutput, META_EXAMPLES } from "@/lib/meta-tags";

const toolConfig = {
  name: "Meta Tag Generator",
  title: "Meta Tag Generator: SEO, Open Graph & X Cards",
  description: "Free meta tag generator with search and social previews. Import HTML, check canonical and robots settings, then copy HTML tags or Next.js Metadata. No sign-up.",
  slug: "meta-tag-generator",
  keywords: [
    "meta tag generator", "free meta tag generator", "html meta tag generator",
    "open graph meta tag generator", "twitter card generator", "canonical tag generator",
    "robots meta tag generator", "nextjs metadata generator",
  ],
  applicationCategory: "DeveloperApplication",
  audience: "Website owners, editors and web developers",
  featureList: [
    "Escaped HTML tags and typed Next.js App Router Metadata export",
    "Local pasted-HTML import with duplicate and robots-rule review",
    "Search, Facebook, LinkedIn and X illustrative preview cards",
    "Canonical URL and optional article, image-alt, locale and robots fields",
    "Independent Open Graph and X overrides with shared defaults",
    "Local image crop preview, example presets, undo and copy/download",
  ],
  faqs: [
    {
      question: "How do I generate SEO meta tags for my website?",
      answer: "Enter your title, description and canonical page URL, then add a public social image URL. Choose the tag groups you need, review the checks and previews, and copy HTML or Next.js Metadata. Replace existing values rather than adding duplicate tags. The generator formats your text; it does not write or publish content for you.",
    },
    {
      question: "Can I generate meta tags from a URL or with AI?",
      answer: "This version does not crawl a URL or call an AI service. Use Import HTML to read supported tags from pasted page source locally, review what was found, then replace the editor fields. Relative URLs need to be made absolute. Unsupported tags are not retained, so keep other required settings in your original head.",
    },
    {
      question: "Will these tags improve my Google ranking?",
      answer: "Correct metadata helps describe a page and communicates indexing preferences, but it does not guarantee ranking, indexing or clicks. Google may rewrite titles and snippets and choose a different canonical. Google ignores meta keywords for web ranking. Evaluate real page and query results in Search Console after publishing.",
    },
    {
      question: "What is the difference between Open Graph and Twitter Card tags?",
      answer: "Open Graph describes a share object using properties such as og:title, og:type, og:image and og:url. X cards use the twitter: prefix, including twitter:card. This tool can reuse the same text and image or provide X-specific overrides. Actual card layouts, image crops and cache refreshes are controlled by the receiving platform.",
    },
    {
      question: "Is this tool free, and are my inputs or images uploaded?",
      answer: "The generator is free without an account. Its form text, pasted HTML and optional local image preview are processed in your tab; no URL is fetched or file uploaded by the generator. Reloading clears the editor. Site-wide analytics and other services follow ByteVerse's privacy policy. Avoid pasting confidential material into public tools.",
    },
  ],
};

export const metadata: Metadata = generateToolMetadata(toolConfig);

const exampleCode = buildMetaOutput(META_EXAMPLES[1].draft).html;

export default function MetaTagGeneratorPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <ToolJsonLd config={toolConfig} />
      <nav aria-label="Breadcrumb" className="mb-7 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Link href="/" className="hover:text-primary">Home</Link><ChevronRight size={12} aria-hidden="true" /><Link href="/tools" className="hover:text-primary">Tools</Link><ChevronRight size={12} aria-hidden="true" /><span aria-current="page">Meta Tag Generator</span></nav>
      <header className="relative mb-8 overflow-hidden rounded-3xl border border-indigo-500/15 bg-linear-to-br from-indigo-50 via-background to-blue-50 p-6 dark:from-indigo-950/30 dark:via-background dark:to-blue-950/20 sm:p-9">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full border-50 border-violet-500/5" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)]">
          <div><p className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/75 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary"><Code2 size={13} aria-hidden="true" />Small tags. A clearer first impression.</p><h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">Meta tag generator</h1><p className="mt-3 text-lg font-medium text-muted-foreground sm:text-2xl">One workspace for search &amp; social.</p><p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">Build SEO, Open Graph and X tags from your page details. Preview the result, catch missing information, then copy clean HTML or a Next.js Metadata object—without an account.</p><div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium"><span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-primary" aria-hidden="true" />Free · Local processing</span><span className="inline-flex items-center gap-1.5"><FileCode2 size={14} className="text-primary" aria-hidden="true" />Paste HTML to import</span><span className="inline-flex items-center gap-1.5"><Layers size={14} className="text-primary" aria-hidden="true" />Search + 3 social mockups</span></div></div>
          <div aria-hidden="true" className="hidden rotate-2 rounded-2xl border border-white/15 bg-slate-950 p-5 text-slate-300 shadow-xl shadow-indigo-950/10 lg:block"><div className="mb-5 flex items-center gap-1.5"><span className="size-2 rounded-full bg-rose-400/80" /><span className="size-2 rounded-full bg-amber-400/80" /><span className="size-2 rounded-full bg-emerald-400/80" /><span className="ml-auto text-[10px] text-slate-500">YOUR PAGE, DEFINED</span></div><div className="space-y-3 font-mono text-[11px]"><p className="text-violet-300">&lt;title&gt;<span className="text-slate-100">A useful page</span>&lt;/title&gt;</p><p>&lt;meta <span className="text-sky-300">name</span>=<span className="text-emerald-300">&quot;description&quot;</span></p><p className="pl-4"><span className="text-sky-300">content</span>=<span className="text-emerald-300">&quot;A clear promise.&quot;</span>&gt;</p><div className="border-t border-slate-800 pt-4 text-[10px] text-slate-500">SEO · OPEN GRAPH · X CARDS</div></div></div>
        </div>
      </header>
      <MetaTagGeneratorTool />
      <nav aria-label="Meta tags guide" className="mt-12 flex flex-wrap justify-center gap-x-6 gap-y-3 border-y border-border py-4 text-sm text-muted-foreground"><a href="#meta-how" className="hover:text-primary">How to use</a><a href="#meta-tags-explained" className="hover:text-primary">Tags explained</a><a href="#meta-example" className="hover:text-primary">HTML example</a><a href="#meta-install" className="hover:text-primary">Install your tags</a><a href="#meta-faq" className="hover:text-primary">FAQs</a></nav>

      <section id="meta-how" className="mt-14 scroll-mt-24">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">From page details to usable code</p><h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Generate meta tags in three steps</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">{[
          { title: "Describe one page", text: "Enter a page-specific title and summary, then its preferred URL. Or import a pasted HTML head and review the detected fields. Examples are fictional starting points; replace their URLs and copy." },
          { title: "Review search and sharing", text: "Reuse the title and description for social cards or override them. Add the public image URL, alt text and actual dimensions. Use a local image to explore the crop without uploading it." },
          { title: "Copy, install and verify", text: "Fix format errors, review warnings, then choose HTML or Next.js output. Merge the fields into your current setup. Finally check the served page, not just this mockup." },
        ].map((step, i) => <li key={step.title} className="rounded-2xl border border-border bg-card p-5"><span className="text-sm font-bold text-primary">0{i + 1}</span><h3 className="mt-3 font-semibold">{step.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p></li>)}</ol>
      </section>

      <section id="meta-tags-explained" className="mt-14 scroll-mt-24">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">What each tag actually does</h2><p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">“Meta tags” is often shorthand for several kinds of head markup. The title is a title element, and a canonical is a link element. Neither is technically a meta element, but they belong in the same workflow.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[
          { name: "Page title & description", tag: "<title> · name=description", text: "Describe the specific page. Google creates title links and snippets automatically and may use different page text; supplying these fields is not control over every result." },
          { name: "Canonical URL", tag: "rel=canonical", text: "Express a preferred URL for duplicate or very similar pages. Use the intended absolute URL without a fragment. It is a signal, not a redirect or a command Google must accept." },
          { name: "Robots rules", tag: "name=robots", text: "Communicate page-level indexing and snippet restrictions. Index/follow are defaults and can be omitted. A crawler must access the page to discover its noindex directive." },
          { name: "Open Graph", tag: "property=og:*", text: "Describe a share object with a title, type, image and canonical URL. Optional description, site name, locale and image details add context. Receiving apps decide how to render it." },
          { name: "X / Twitter Cards", tag: "name=twitter:*", text: "Select a summary or large-image card and provide its text, image and optional account usernames. The tag prefix remains twitter:, even though the service is called X." },
          { name: "Document defaults", tag: "charset · name=viewport", text: "UTF-8 describes the character encoding; viewport supports mobile layout. Include them once. Most CMSs and Next.js already supply these tags, so the HTML option starts off." },
        ].map(item => <article key={item.name} className="rounded-2xl border border-border bg-card p-5"><p className="font-mono text-[11px] text-primary">{item.tag}</p><h3 className="mt-3 font-semibold">{item.name}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p></article>)}</div>
      </section>

      <div className="mt-14 grid gap-8 lg:grid-cols-2">
        <section className="space-y-4 text-sm leading-relaxed text-muted-foreground"><h2 className="text-2xl font-bold tracking-tight text-foreground">Good copy is more than a character target</h2><p><a href="https://developers.google.com/search/docs/appearance/title-link" className="text-primary underline underline-offset-4">Google&apos;s title-link guidance</a> and <a href="https://developers.google.com/search/docs/appearance/snippet" className="text-primary underline underline-offset-4">snippet documentation</a> do not set fixed 60- or 160-character limits. Displayed text is shortened to fit the result layout, and the snippet can change with the query.</p><p>Counts help you edit, not rank. Modern browsers count visible character clusters here; older browsers fall back to Unicode code points. Extra text whitespace is collapsed in the output. Input caps keep the editor responsive and are not search-engine limits. For approximate pixel measurements and comparing drafts, use the <Link href="/tools/seo-title-analyzer" className="text-primary underline underline-offset-4">SEO Title Checker</Link>.</p><p>State the useful task or distinction naturally. Do not add “best,” “free” or a fresh year unless the page supports it. Our <Link href="/blog/how-to-write-seo-titles-2026" className="text-primary underline underline-offset-4">title-writing guide</Link> offers examples; confirm your final wording against the page itself.</p></section>
        <section className="space-y-4 text-sm leading-relaxed text-muted-foreground"><h2 className="text-2xl font-bold tracking-tight text-foreground">An image URL is not an uploaded image</h2><p>The <a href="https://ogp.me/" className="text-primary underline underline-offset-4">Open Graph protocol</a> lists og:title, og:type, og:image and og:url as its core properties. Image alt text should describe what is shown. Width and height should match the actual hosted file; entering 1200 × 630 does not resize anything.</p><p>A 1200 × 630 canvas is a common starting point for a wide share image, not a universal platform requirement. This generator models wide Facebook/LinkedIn cards, a 2:1 large-image X card and a compact square X card. Actual crops, text and layouts can differ. Our <Link href="/tools/og-preview" className="text-primary underline underline-offset-4">Open Graph Preview</Link> is another manual mockup, not proof that a social crawler can access your file.</p><p>Local image selection is only a crop test. Host the image yourself, use its public HTTPS URL, and verify that the image is accessible without login. This tool does not test image-server responses, file size on the server or platform caches.</p></section>
      </div>

      <section id="meta-example" className="mt-14 grid scroll-mt-24 items-start gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground"><p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary"><Braces size={15} aria-hidden="true" />A worked example</p><h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Meta tags for an article page</h2><p>This fictional accessibility guide uses a page-specific title, a canonical URL and one share image. The same wording feeds the Open Graph and X tags until you choose an override. Select the Article example above to edit it.</p><p>The code is generated by the same engine as the editor. Special characters such as ampersands and quotes are escaped in HTML attributes. No publication date, review rating or author profile URL is invented. Replace all example values before publishing.</p><p>For the wider head-markup context, see our <Link href="/blog/seo-meta-tags-generator-guide-2026" className="text-primary underline underline-offset-4">meta tags guide with examples</Link>. A product-page example uses website metadata here; it is not product structured data.</p></div>
        <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950"><div className="border-b border-slate-800 px-5 py-3 text-xs font-medium text-slate-400">Illustrative HTML · not your current editor values</div><pre tabIndex={0} aria-label="Example article meta tags" className="max-h-105 overflow-auto whitespace-pre-wrap wrap-anywhere p-5 text-xs leading-6 text-slate-300 outline-none focus-visible:ring-2 focus-visible:ring-primary"><code>{exampleCode}</code></pre></div>
      </section>

      <section id="meta-install" className="mt-14 scroll-mt-24"><h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Where to put the generated meta tags</h2><div className="mt-6 grid gap-4 md:grid-cols-2">{[
        { title: "Plain HTML", text: "Merge the HTML fragment inside the page's head. Replace existing title, description, canonical and social values rather than pasting a second block. Keep styles, scripts, verification tags and security settings that this tool does not generate." },
        { title: "WordPress or Blogger", text: "Prefer the theme or SEO plugin's per-page title, description and social fields where available. Paste plain text into those fields, not escaped HTML. Avoid running two metadata providers that both output conflicting tags. Do not paste head markup into the visible post body." },
        { title: "Next.js App Router", text: "Merge the Metadata output into your existing server page or layout export. Do not add a second export or combine it with generateMetadata. Next.js handles charset and viewport. Preserve language alternates and review parent settings, null overrides, file-based images and framework fallbacks in the final HTML." },
        { title: "Other React apps and website builders", text: "Use the framework's supported head/metadata mechanism or your builder's SEO settings. HTML and Next.js output are different formats; a Next.js export is not generic React code. Confirm what your deployed server returns to crawlers after you save." },
      ].map(item => <article key={item.title} className="rounded-2xl border border-border bg-card p-5"><h3 className="flex items-center gap-2 font-semibold"><Code2 size={16} className="text-primary" aria-hidden="true" />{item.title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.text}</p></article>)}</div></section>

      <section className="mt-14 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-8"><h2 className="text-2xl font-bold tracking-tight">Generate locally. Verify the published result.</h2><div className="mt-5 grid gap-6 text-sm leading-relaxed text-muted-foreground md:grid-cols-2"><div><p className="flex items-start gap-2 font-semibold text-foreground"><Check size={17} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />Check syntax and configuration</p><p className="mt-3">Use page source and your platform&apos;s inspection tools to confirm one intended title, description and canonical. Compare HTML robots tags with HTTP X-Robots-Tag headers; this generator cannot see either on your live site. Blocking a URL in robots.txt can prevent a crawler from discovering a noindex tag. Noindex is not a substitute for canonicalization or access control.</p></div><div><p className="flex items-start gap-2 font-semibold text-foreground"><Check size={17} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />Measure real outcomes</p><p className="mt-3">Work through the <Link href="/blog/blog-seo-checklist-before-publishing-in-2026" className="text-primary underline underline-offset-4">pre-publish SEO checklist</Link>, then compare relevant page/query impressions, clicks and position using our <Link href="/blog/google-search-console-for-new-blogs-2026-beginner-guide" className="text-primary underline underline-offset-4">Search Console guide</Link>. Account for device and query changes. Correct markup is a useful foundation, not evidence that a ranking or traffic increase has happened.</p></div></div></section>

      <section id="meta-faq" className="mx-auto mt-14 max-w-4xl scroll-mt-24"><h2 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">Meta tag generator FAQs</h2><div className="divide-y divide-border rounded-2xl border border-border bg-card">{toolConfig.faqs.map(faq => <div key={faq.question} className="p-5 sm:p-6"><h3 className="font-semibold">{faq.question}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p></div>)}</div></section>

      <footer className="mt-12 flex flex-col gap-4 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-start sm:justify-between"><div className="max-w-3xl"><p className="flex items-center gap-2 font-semibold text-foreground"><BookOpen size={14} aria-hidden="true" />Method reviewed 28 September 2026</p><p className="mt-2 leading-relaxed">Based on Google Search Central&apos;s <a href="https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls" className="text-primary underline">canonical</a> and <a href="https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag" className="text-primary underline">robots guidance</a>, the <a href="https://ogp.me/" className="text-primary underline">Open Graph protocol</a> and the <a href="https://nextjs.org/docs/app/api-reference/functions/generate-metadata" className="text-primary underline">Next.js Metadata API</a>. Google&apos;s <a href="https://developers.google.com/search/blog/2009/09/google-does-not-use-keywords-meta-tag" className="text-primary underline">meta keywords policy</a> explains why the legacy field is optional. No SEO score or platform-rendering guarantee is assigned.</p></div><a href="#meta-workspace" className="inline-flex min-h-10 shrink-0 items-center gap-2 font-semibold text-primary">Back to the generator <ArrowRight size={14} aria-hidden="true" /></a></footer>
    </div>
  );
}
