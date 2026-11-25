import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseDocument, DomUtils } from "htmlparser2";
import sharp from "sharp";
import ts from "typescript";

// Microsoft pages and competitor pages are saved outside the repository and read as text.
const sourceDir = new URL("../../.byteverse-copilot-outlook-check/", import.meta.url);
const straight = (text) => text.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, " ");
const doc = (name) => straight(readFileSync(new URL(`docs/${name}.txt`, sourceDir), "utf8"));
const mode = process.argv[2];
assert(process.argv.length <= 3 && (!mode || ["--metrics", "--preview", "--live"].includes(mode)));
const content = readFileSync(new URL("content/copilot-not-showing-in-outlook.md", import.meta.url), "utf8").replace(/\r\n?/g, "\n").trim();
const flat = content.replace(/\s+/g, " ");
const blocks = [...content.matchAll(/^```([^\n]+)\n([\s\S]*?)\n```/gm)].map((match) => ({ language: match[1], code: match[2] }));
const prose = content.split("\n## Sources and Further Reading")[0].replace(/\[([^\]]+)\]\([^\n)]+\)/g, (_, label) => label);
const wordCount = (prose.match(/[\p{L}\p{N}]+(?:['.-][\p{L}\p{N}]+)*/gu) ?? []).length;
const metrics = {
  proseWords: wordCount,
  contentSha256: createHash("sha256").update(content).digest("hex"),
  readingTime: `${Math.ceil(wordCount / 220)} min read`,
  codeBlocks: blocks.length,
  tables: (content.match(/^\|---/gm) ?? []).length,
};
const ledger = JSON.parse(readFileSync(new URL("../docs/copilot-outlook-keywords-2026-11-25.json", import.meta.url), "utf8"));
const sha = (file) => createHash("sha256").update(readFileSync(new URL(file, sourceDir))).digest("hex");
if (mode === "--metrics") console.log(JSON.stringify({ ...metrics, sourceSha256: Object.fromEntries(Object.keys(ledger.validation.sourceSha256).map((file) => [file, sha(file)])) }, null, 2));

const rows = (table) => table.split("\n").filter((line) => line.startsWith("|")).slice(2).map((line) => line.slice(1, -1).split(" | ").map((cell) => cell.trim()));
const tables = content.split(/\n\n/).filter((part) => part.startsWith("|"));

test("draft structure matches the blog convention", () => {
  assert(!/^# /m.test(content));
  assert(content.match(/^## .+$/gm).every((heading) => !heading.endsWith("?")));
  assert.equal((content.split("\n## Frequently Asked Questions")[0].match(/^### /gm) ?? []).length, 0, "H3 headings are reserved for FAQ questions");
  const faqSection = content.split("\n## Frequently Asked Questions")[1].split("\n## ")[0];
  assert.equal(faqSection.match(/^### /gm)?.length, ledger.faq.length);
  for (const answer of faqSection.split(/^### .+$/m).slice(1)) assert(!/[#*_`>-]/.test(answer), "FAQ answers must survive the schema character filter");
  assert.deepEqual(blocks.map((block) => block.language), ["txt"], "One plain text ticket template and no runnable code");
  assert(!/[\u2012-\u2015\u2212\u2018\u2019\u201c\u201d]/.test(content), "No dashes or curly quotes that look like typing tricks");
  assert(!/[^\x00-\x7f]/.test(content), "Plain ASCII only");
  for (const paragraph of content.split("\n## Sources and Further Reading")[0].split("\n\n")) {
    if (/^[|`#\-!\d]/.test(paragraph.trim())) continue;
    assert(paragraph.trim().split(/\s+/).length <= 75, `Paragraph too long: ${paragraph.slice(0, 60)}`);
  }
  assert.equal(metrics.tables, 2);
  assert.equal(tables.length, 2);
  const lookup = rows(tables[0]);
  assert.equal(lookup.length, 9);
  const sections = new Set(lookup.flatMap((row) => row[2].split(" and ")));
  assert.deepEqual([...sections].sort(), ["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
  assert.deepEqual(content.match(/^## \d\. /gm), ["## 1. ", "## 2. ", "## 3. ", "## 4. ", "## 5. ", "## 6. ", "## 7. ", "## 8. ", "## 9. "]);
  assert.equal(rows(tables[1]).length, 3);
});

test("saved sources are the files recorded in the ledger", () => {
  assert(Object.keys(ledger.validation.sourceSha256).length >= 30);
  for (const [file, hash] of Object.entries(ledger.validation.sourceSha256)) assert.equal(sha(file), hash, file);
});

test("classic Outlook statements match the known issue page and MC1441784", () => {
  const known = doc("d02-known-issue");
  for (const needle of ["After classic Outlook for Windows updates to build 20026.20182 and higher, you no longer have Copilot Chat or Copilot entry points in Outlook.", "Copilot Chat (Basic) license or a paid M365 Copilot (Premium) account", "In Add Apps, Copilot may appear as an available app, but selecting Open does nothing.", "STATUS: FIXED", "required account information could not be retrieved from the user's Outlook profile", "use new Outlook or Outlook Web Access (OWA), or you can create a new Outlook profile", "If this setting is disabled, Copilot may not appear in the Outlook app bar.", "then under Outlook panes , check the box for Show Apps in Outlook."]) assert(known.includes(needle), needle);
  assert(flat.includes('its known issue page now says "STATUS: FIXED"') && flat.includes("build 20026.20182 and later") && flat.includes("under Outlook panes, tick Show Apps in Outlook"));
  const mc = doc("d19-mc1441784");
  for (const needle of ["MC1441784", "located next to the Outlook ribbon", "Beginning mid-November 2026", "expected to complete by late November 2026", "GCC and GCC High: Beginning early December 2026", "Users will continue to have access to the Copilot side pane.", "Roadmap ID 567007", "Last Updated Oct 26, 2026"]) assert(mc.includes(needle), needle);
  assert(flat.includes('will be "located next to the Outlook ribbon"') && flat.includes("start in mid-November 2026 and finish by late November") && flat.includes("roadmap ID 567007"));
  const navbar = doc("d20-navbar");
  assert(navbar.includes("Selecting More apps lets you choose additional options. You can then right-click to pin them and choose to select Add apps to find other available apps."));
  const profile = doc("d24-create-profile");
  assert(profile.includes("Hold Shift while starting Outlook.") && profile.includes("On the profile picker dialog box, select Options .") && profile.includes("Select New."));
  const missing = doc("d01-missing-button");
  for (const needle of ["Last updated: July 2026", "When using Semi-Annual Enterprise Channel of Microsoft 365, you'll find that Microsoft Copilot features are not available in your apps.", "Current Channel or the Monthly Enterprise Channel", "Select Update License .", "Experiences that analyze your content", "All connected experiences", "Select Refresh License .", "Select Word > Preferences > Privacy ."]) assert(missing.includes(needle), needle);
});

test("mailbox, license and personal account rules come from Microsoft's pages", () => {
  const faq = doc("d03-outlook-faq");
  for (const needle of ["Copilot scenarios are not available on group mailboxes or mailboxes that are not hosted on Exchange Online.", "These features are not supported on signed or encrypted emails, on emails with IRM, or on some MIP labeled emails.", "Copilot in Outlook can't access S/MIME or Double Key Encryption encrypted emails.", "Just type /, select Draft with Copilot"]) assert(faq.includes(needle), needle);
  assert(flat.includes('isn\'t available on "mailboxes that are not hosted on Exchange Online"'));
  const hybrid = doc("d10-hybrid");
  for (const needle of ["Microsoft Copilot is cloud-based and has no access to on-premises mailboxes.", "Copilot icon exists but is dimmed / grayed-out and no UX can be called", "Outlook (on-premises version) Y Y Cloud Copilot nonexistent", "Outlook (on-premises version) with both Microsoft 365 and Copilot licenses assigned, Cloud mailbox : Expected Copilot Behavior in Outlook : Copilot nonexistent", "Copilot icon exists and Copilot Chat is available in Outlook"]) assert(hybrid.includes(needle), needle);
  assert(flat.includes('Copilot "has no access to on-premises mailboxes"'));
  assert(doc("d28-ltsc-2024").includes("as a disconnected product, Office LTSC does not qualify.") && flat.includes('LTSC "does not qualify" for Copilot'));
  const office2024 = doc("d30-m365-vs-office-2024");
  assert(office2024.includes("Copilot in Word, Excel, PowerPoint, Outlook, and OneNote") && office2024.includes("Security updates are included, but you won't get any new features."));
  const license = doc("d04-license");
  for (const needle of ["All subscribers have access to Copilot in Outlook.", "Copilot Chat (Basic)", "M365 Copilot (Basic)", "M365 Copilot (Premium)", "scroll to the bottom to view your account", "only the subscription owner can use Copilot in the desktop apps"]) assert(license.includes(needle), needle);
  assert(flat.includes('"All subscribers have access to Copilot in Outlook."'));
  const chat = doc("d06-chat");
  assert(chat.includes("select the Copilot button located in the upper region of your Outlook app") && chat.includes("inbox, calendar, meetings, chats, and enterprise data"));
  const requirements = doc("d09-requirements");
  for (const needle of ["Microsoft 365 Copilot is now named Microsoft Copilot, and Microsoft 365 Copilot Chat is now named Microsoft Copilot Chat.", "Microsoft Copilot isn't available with device-based licensing for Microsoft 365 Apps for enterprise.", "Microsoft Copilot works with supported versions of classic Outlook and new Outlook for Windows and Mac.", "Microsoft Copilot isn't available in group mailboxes.", "connectivity test for the Copilot app", "Verify full WebSocket Secure (WSS) connectivity", "These controls can affect the availability of Copilot features."]) assert(requirements.includes(needle), needle);
  assert(doc("d12-ai-credits").includes("AI benefits are only available to the subscription owner and cannot be shared with others.") && flat.includes('"cannot be shared with others"'));
  assert(doc("d13-consumer-faq").includes("are disabled for users under the ages listed"));
  assert(doc("d29-consumer-blog-2025").includes("plans without Copilot or AI credits like our Basic plan , or, for a limited time, to new Personal Classic or Family Classic plans . These plans will continue to be maintained as they exist today"));
  const turnOff = doc("d14-turn-off");
  for (const needle of ["Mac: Quick Settings > Copilot", "Web: Settings > Copilot", "Windows (new Outlook): Settings > Copilot", "your selection will apply to Outlook on all your devices when you're signed in with the same account", "There is currently no estimated date for when turning Copilot on or off will be available in classic Outlook on Windows.", "update to at least Version 16.95.3"]) assert(turnOff.includes(needle), needle);
  assert(flat.includes('applies to Outlook "on all your devices"') && flat.includes("version 16.95.3 or later"));
  const sharing = doc("d11-sharing");
  for (const needle of ["as long as Connected Experiences is not turned off in Outlook privacy settings", "This feature is not available in classic Outlook for Windows.", "third-party email providers such as Gmail, Yahoo, and iCloud, as long as they are logged into Outlook on the same device"]) assert(sharing.includes(needle), needle);
  assert(flat.includes('"as long as Connected Experiences is not turned off"'));
  assert(doc("d27-owa-sign-in").includes("(Or sign in directly at outlook.office365.com .)"));
});

test("new Outlook, Mac, feature limits and admin statements come from Microsoft's pages", () => {
  const draft = doc("d07-draft");
  for (const needle of ["Draft with Copilot doesn't support messages composed in plain text format.", "go to Settings > Mail > Compose and reply. Select HTML from the dropdown.", "If you don't see the icon in the toolbar, select the Copilot icon or the Draft with Copilot text in the email message area.", "click on \"Help me write\" or \"Help me reply\"", "Copilot in Outlook is only available in the latest version of Outlook for Mac. Legacy Outlook isn't supported."]) assert(draft.includes(needle), needle);
  assert(flat.includes('Draft with Copilot "doesn\'t support messages composed in plain text format"') && flat.includes('"Legacy Outlook isn\'t supported."'));
  assert(doc("d08-summarize").includes("Select Summary by Copilot (or it might say Summarize ) at the top of the email thread."));
  assert(doc("d25-outlook-for-mac").includes("Open Outlook, then turn off the Legacy Outlook switch."));
  assert(doc("d26-legacy-mac-end").includes("Starting October 2026, the legacy Outlook for Mac client will stop working against Exchange Online mailboxes."));
  const comparison = doc("d23-feature-comparison");
  assert(comparison.includes("Last updated: September 23, 2026") || comparison.includes("MODIFIED: September 23, 2026"));
  for (const feature of ["Schedule a meeting with Copilot from an email thread", "Prepare for your meeting with Copilot", "Themes"]) assert(new RegExp(`${feature} Not [Aa]vailable Available`).test(comparison), feature);
  for (const feature of ["Chat with Copilot", "Coaching by Copilot", "Draft with Copilot", "Summarize an email thread"]) assert(comparison.includes(`${feature} Available Available`), feature);
  const shared = doc("d17-shared-outlook");
  assert(shared.includes("Summarize and Draft work for all shared and delegated mailboxes.") && shared.includes("Sending emails on your behalf Not supported Coming soon") && shared.includes("Scheduling or updating meetings Not supported Coming soon"));
  const sharedApp = doc("d18-shared-app");
  assert(sharedApp.includes("You must have a Microsoft Copilot license to read or take action in shared mailbox or delegate mailbox items.") && sharedApp.includes("You need full delegate access"));
  const agentic = doc("d22-agentic-blog-2026");
  assert(agentic.includes("Apr 27, 2026") && agentic.includes("Available via the Frontier program"));
  const manage = doc("d15-manage-chat");
  assert(manage.includes("This setting blocks Copilot in the Microsoft Copilot app, Teams, Outlook, and Copilot Chat on the web for all users.") && manage.includes("including for users assigned a Microsoft 365 Copilot license") && manage.includes("Specific users/group in the organization can install"));
  const pinning = doc("d16-pinning");
  for (const needle of ["Do not pin Copilot Chat in Microsoft 365 apps : If you choose this option, Copilot Chat won't be available by default for users in Teams and Outlook. Users can still visit their app store and add Copilot themselves.", "Changes take up to 48 hours to go into effect."]) assert(pinning.includes(needle), needle);
  const troubleshooters = doc("d05-troubleshooters");
  assert(troubleshooters.includes("Use the Copilot license troubleshooter if you believe you have a Copilot license but cannot see the Copilot icon") && troubleshooters.includes("Copilot connectivity troubleshooter"));
});

const require = createRequire(import.meta.url);
function loadLocal(path, overrides = {}) {
  const text = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(text, {
    fileName: path, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  assert.equal(compiled.diagnostics?.length ?? 0, 0);
  const record = { exports: {} };
  const allowed = new Set(["react", "react/jsx-runtime", "lucide-react", "react-markdown", "remark-gfm", "rehype-raw", "rehype-sanitize", "rehype-slug"]);
  new Function("require", "module", "exports", compiled.outputText)((name) => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    assert(allowed.has(name), `Unexpected renderer dependency ${name}`);
    return require(name);
  }, record, record.exports);
  return record.exports;
}
const siteConfig = { url: ledger.website, name: "ByteVerse" };
const imageSeo = loadLocal("src/lib/image-seo.ts", { "@/lib/config": { siteConfig } });
const { MarkdownRenderer } = loadLocal("src/components/markdown-renderer.tsx", {
  "@/lib/image-seo": imageSeo,
  "@/lib/config": { siteConfig },
  "@/components/copy-button": loadLocal("src/components/copy-button.tsx"),
  "@/components/code-playground": { CodePlayground() { throw new Error("This guide must not show a browser Run button"); } },
});
const rendered = renderToStaticMarkup(createElement(MarkdownRenderer, { content, currentSlug: ledger.slug }));
const document = parseDocument(rendered);
const all = (root, predicate) => DomUtils.findAll(predicate, root.children ?? []);
const one = (root, predicate) => { const matches = all(root, predicate); assert.equal(matches.length, 1); return matches[0]; };

test("metadata, slug and measured article figures are consistent without invented SEO metrics", () => {
  assert.equal(ledger.slug, "copilot-not-showing-in-outlook");
  assert.match(ledger.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert(!/20\d\d/.test(ledger.slug), "Fix guides use a slug without a year");
  assert.equal(ledger.targeting.author, "Ali Rehman");
  assert(ledger.targeting.title.length <= 60);
  assert(`${ledger.targeting.metaTitle} | ByteVerse`.length <= 60);
  assert(ledger.targeting.metaDescription.length >= 120 && ledger.targeting.metaDescription.length <= 160);
  assert(ledger.targeting.excerpt.length <= 300);
  assert.equal(ledger.targeting.summary.split("|").length, 3);
  for (const [key, value] of Object.entries(metrics)) assert.equal(ledger.validation[key], value, key);
  assert.equal(ledger.targeting.readingTime, metrics.readingTime);
  for (const value of Object.values(ledger.metrics)) assert.equal(value, null);
  assert(!/\ufffd|\0|\bTODO\b|\bTBD\b/.test(content));
  assert(content.startsWith("**When Copilot is not showing in Outlook"), "The primary keyword opens the article");
  assert(ledger.targeting.title.toLowerCase().startsWith("copilot not showing in outlook"));
  assert(ledger.targeting.metaTitle.toLowerCase().startsWith("copilot not showing in outlook"));
  assert(ledger.targeting.keywords.startsWith(ledger.research.keywordMap.primary));
});

test("the real renderer preserves the tables, the ticket template and the intended links", () => {
  assert.equal(all(document, (node) => node.name === "pre").length, 1);
  assert.equal(all(document, (node) => node.name === "table").length, metrics.tables);
  assert.equal(all(document, (node) => ["h1", "script", "iframe"].includes(node.name)).length, 0);
  const ids = all(document, (node) => /^h[23]$/.test(node.name)).map((node) => node.attribs.id);
  assert.equal(new Set(ids).size, ids.length);
  const links = all(document, (node) => node.name === "a");
  const internal = [...new Set(links.filter((node) => node.attribs.href?.startsWith("/")).map((node) => node.attribs.href))].sort();
  assert.deepEqual(internal, [...ledger.internalLinks].sort());
  const external = links.filter((node) => node.attribs.href?.startsWith("https://"));
  assert.deepEqual([...new Set(external.map((node) => node.attribs.href))].sort(), ledger.sources.map((item) => item.url).sort());
  assert(external.every((node) => node.attribs.rel.includes("noopener") && node.attribs.target === "_blank"));
  const code = DomUtils.textContent(one(document, (node) => node.name === "pre"));
  assert(code.includes("Copilot in Outlook on the web with the same account: yes / no"));
});

const pageSource = readFileSync(new URL("../src/app/blog/[slug]/page.tsx", import.meta.url), "utf8");
// The site-wide FAQPage schema only carries the first few visible questions.
const faqSchemaLimit = Number(pageSource.match(/mainEntity: faqs\.slice\(0, (\d+)\)/)?.[1]);

test("every visible FAQ matches the existing schema extractor exactly", () => {
  const start = pageSource.indexOf("  const faqRegex =");
  const end = pageSource.indexOf("  // Auto-extract HowTo", start);
  assert(start > 0 && end > start);
  assert.equal(faqSchemaLimit, ledger.validation.faqSchemaLimit, "FAQPage schema cap changed in page.tsx");
  const compiled = ts.transpileModule(pageSource.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const faqs = new Function("post", `${compiled}; return faqs;`)({ content });
  const details = all(document, (node) => node.name === "details");
  const collapse = (text) => text.replace(/\s+/g, " ").trim();
  assert.equal(details.length, ledger.faq.length);
  assert.deepEqual(faqs.map((faq) => faq.question), ledger.faq);
  assert.deepEqual(details.map((node) => DomUtils.textContent(one(node, (child) => child.name === "summary"))), ledger.faq);
  assert.deepEqual(faqs.map((faq) => collapse(faq.answer)), details.map((node) => collapse(DomUtils.textContent(one(node, (child) => child.name === "p")))));
});

test("illustrations are original 1200x675 PNG files with an honest caption", async () => {
  const image = one(document, (node) => node.name === "img");
  assert.equal(image.attribs.src, ledger.images.inline);
  assert.equal(image.attribs.width, "1200");
  assert.equal(image.attribs.height, "675");
  assert(image.attribs.alt.length > 60 && !/screenshot/i.test(image.attribs.alt));
  assert.match(DomUtils.textContent(one(document, (node) => node.name === "figcaption")), /based on Microsoft's support and Learn pages checked on 25 November 2026\. Diagram by ByteVerse\./);
  for (const path of [ledger.images.coverFile, ledger.images.inlineFile]) {
    const file = readFileSync(new URL(`../${path}`, import.meta.url));
    const info = await sharp(file).metadata();
    assert.deepEqual([info.width, info.height, info.format], [1200, 675, "png"]);
    assert(file.length < 200 * 1024, "Illustrations stay small");
    assert.match(path, /^public\/blog\/copilot-outlook\/copilot-[a-z-]+\.png$/);
  }
  assert(content.includes("so there are no screenshots here") && content.includes("and there are no screenshots."));
  assert(content.includes("I don't have a work tenant with a Copilot license to test on"));
});

if (mode === "--preview") {
  const response = await fetch(`${ledger.website}/blog/n8n-merge-node-guide`, { signal: AbortSignal.timeout(60000) });
  assert.equal(response.status, 200);
  const liveDocument = parseDocument(await response.text());
  const styles = all(liveDocument, (node) => node.name === "link" && node.attribs.rel === "stylesheet")
    .map((node) => new URL(node.attribs.href, ledger.website).href);
  assert(styles.length > 0);
  const bodyClass = one(liveDocument, (node) => node.name === "body").attribs.class ?? "";
  const element = createElement;
  const page = element("html", { lang: "en" },
    element("head", null,
      element("meta", { charSet: "utf-8" }),
      element("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
      element("meta", { name: "robots", content: "noindex,nofollow" }),
      element("meta", { name: "description", content: ledger.targeting.metaDescription }),
      element("base", { href: `${ledger.website}/` }),
      element("title", null, `${ledger.targeting.metaTitle} | ByteVerse Draft`),
      ...styles.map((href) => element("link", { key: href, rel: "stylesheet", href })),
      element("style", null, "html{scroll-behavior:auto}main{width:100%;min-width:0}h1{overflow-wrap:anywhere;letter-spacing:0}.preview-cover{width:100%;height:auto;aspect-ratio:16/9;object-fit:contain}"),
    ),
    element("body", { className: bodyClass },
      element("header", { className: "border-b border-border" },
        element("nav", { className: "mx-auto max-w-4xl px-4 py-4 flex items-center justify-between gap-4", "aria-label": "Preview navigation" },
          element("a", { href: ledger.website, className: "font-bold text-xl" }, "ByteVerse"),
          element("span", { className: "text-sm text-muted-foreground" }, "Local draft"),
        ),
      ),
      element("main", { className: "mx-auto max-w-3xl px-4 sm:px-6 py-8" },
        element("article", null,
          element("p", { className: "text-sm text-primary mb-4" }, "Tech Guides"),
          element("h1", { className: "text-3xl sm:text-4xl font-extrabold leading-tight mb-6" }, ledger.targeting.title),
          element("p", { className: "text-lg text-muted-foreground leading-relaxed mb-6" }, ledger.targeting.excerpt),
          element("p", { className: "text-sm text-muted-foreground mb-8" }, `${ledger.targeting.author} | November 25, 2026 | ${ledger.targeting.readingTime}`),
          element("figure", { className: "mb-10" },
            element("img", { src: ledger.images.cover, alt: "Mail app mock-up with a dashed outline where the Copilot button should be next to the ribbon", width: 1200, height: 675, className: "preview-cover rounded-lg" }),
            element("figcaption", { className: "text-sm text-muted-foreground mt-3" }, "Illustration: ByteVerse"),
          ),
          element("div", { dangerouslySetInnerHTML: { __html: rendered } }),
        ),
      ),
    ),
  );
  const directory = new URL("../../.byteverse-copilot-outlook-preview/", import.meta.url);
  mkdirSync(directory, { recursive: true });
  const output = new URL("index.html", directory);
  writeFileSync(output, `<!DOCTYPE html>${renderToStaticMarkup(page)}`, "utf8");
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ channel: "msedge", headless: true, ignoreDefaultArgs: ["--hide-scrollbars"] });
  const results = [];
  try {
    for (const [width, theme] of [[320, "light"], [375, "light"], [375, "dark"], [768, "light"], [1440, "light"]]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: "reduce", serviceWorkers: "block" });
      try {
        await context.route("**/*", (route) => {
          const requestUrl = new URL(route.request().url());
          const local = requestUrl.protocol === "file:";
          const asset = requestUrl.origin === ledger.website && /\.(css|woff2?|jpg|png|webp)$/.test(requestUrl.pathname);
          return local || asset ? route.continue() : route.abort("blockedbyclient");
        });
        const preview = await context.newPage();
        const pageErrors = [];
        preview.on("pageerror", (error) => pageErrors.push(error.message));
        await preview.goto(output.href, { waitUntil: "load" });
        await preview.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), theme === "dark");
        const geometry = await preview.evaluate(async () => {
          await document.fonts.ready;
          const images = [...document.querySelectorAll("img")];
          await Promise.all(images.map((image) => image.decode()));
          const bounds = ["main", "article", "h1", ".blog-content", ".blog-content pre"].map((selector) => {
            const rect = document.querySelector(selector).getBoundingClientRect();
            return { selector, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
          });
          const scrollers = [...document.querySelectorAll("table")].map((table) => {
            const parent = table.parentElement;
            parent.scrollLeft = parent.scrollWidth;
            const result = { width: parent.clientWidth, content: parent.scrollWidth, scroll: parent.scrollLeft };
            parent.scrollLeft = 0;
            return result;
          });
          return { overflow: document.documentElement.scrollWidth - innerWidth, bounds, images: images.length, scrollers };
        });
        assert(geometry.overflow <= 1, `${width}: horizontal page overflow`);
        assert.equal(geometry.images, 2);
        for (const bound of geometry.bounds) assert(bound.width > 0 && bound.height > 0 && bound.left >= -1 && bound.right <= width + 1, `${width}: ${bound.selector} is hidden or overflows`);
        assert.equal(geometry.scrollers.length, metrics.tables);
        for (const scroll of geometry.scrollers) if (scroll.content > scroll.width + 1) assert(scroll.scroll > 0, "An overflowing table must scroll");
        const question = preview.locator("details").first().locator("summary");
        await question.focus();
        await preview.keyboard.press("Enter");
        assert.equal(await preview.locator("details").first().evaluate((node) => node.open), true);
        await preview.evaluate(() => window.scrollTo(0, 0));
        await preview.screenshot({ path: fileURLToPath(new URL(`preview-${width}-${theme}.png`, directory)) });
        if (width === 375 && theme === "light") {
          await preview.locator(".blog-content table").first().scrollIntoViewIfNeeded();
          await preview.screenshot({ path: fileURLToPath(new URL("preview-375-table.png", directory)) });
          await preview.locator(".blog-content img").scrollIntoViewIfNeeded();
          await preview.screenshot({ path: fileURLToPath(new URL("preview-375-diagram.png", directory)) });
          await preview.locator(".blog-content pre").scrollIntoViewIfNeeded();
          await preview.screenshot({ path: fileURLToPath(new URL("preview-375-ticket.png", directory)) });
        }
        assert.deepEqual(pageErrors, []);
        results.push({ width, theme, overflow: geometry.overflow, images: geometry.images, tables: geometry.scrollers.length, faqKeyboard: "pass" });
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ preview: output.href, results, scope: "Static noindex article preview using existing renderer and public CSS. No production scripts or database writes." }));
}

if (mode === "--live") {
  assert(ledger.publication.publishedAt, "Record an approved publication before live verification");
  const articleUrl = `${ledger.website}/blog/${ledger.slug}`;
  test("live article metadata, schema and body match the approved draft", async () => {
    const response = await fetch(articleUrl, { signal: AbortSignal.timeout(60000) });
    assert.equal(response.status, 200);
    const live = parseDocument(await response.text());
    const meta = (attribute, value) => all(live, (node) => node.name === "meta" && node.attribs[attribute] === value)[0]?.attribs.content;
    assert.equal(DomUtils.textContent(one(live, (node) => node.name === "h1")), ledger.targeting.title);
    assert.equal(DomUtils.textContent(one(live, (node) => node.name === "title")), `${ledger.targeting.metaTitle} | ByteVerse`);
    assert.equal(meta("name", "description"), ledger.targeting.metaDescription);
    assert.equal(all(live, (node) => node.name === "link" && node.attribs.rel === "canonical")[0]?.attribs.href, articleUrl);
    assert.equal(meta("property", "article:published_time"), ledger.publication.publishedAt);
    assert.equal(meta("name", "robots")?.includes("noindex") ?? false, false);
    assert.equal(meta("property", "og:image"), ledger.images.cover);
    const schemas = all(live, (node) => node.name === "script" && node.attribs.type === "application/ld+json").flatMap((node) => {
      const schema = JSON.parse(DomUtils.textContent(node));
      return schema["@graph"] ?? [schema];
    });
    assert.deepEqual(schemas.find((schema) => schema["@type"] === "FAQPage")?.mainEntity.map((entity) => entity.name), ledger.faq.slice(0, faqSchemaLimit));
    const article = schemas.find((schema) => schema["@type"] === "BlogPosting");
    assert.equal(article?.author?.name, ledger.targeting.author);
    assert.equal(article?.datePublished, ledger.publication.publishedAt);
    assert.equal(all(live, (node) => node.name === "table").length, metrics.tables);
    assert.equal(all(live, (node) => node.name === "details").length, ledger.faq.length);
    for (const href of ledger.internalLinks) assert(all(live, (node) => node.name === "a" && node.attribs.href === href).length > 0);
    const body = DomUtils.textContent(all(live, (node) => node.attribs?.class?.split(" ").includes("blog-content"))[0]);
    for (const sentence of ['its known issue page now says "STATUS: FIXED".', "Copilot in Outlook reads your mail from Exchange Online, Microsoft's cloud email service."]) assert(body.includes(sentence), sentence);
  });
}
