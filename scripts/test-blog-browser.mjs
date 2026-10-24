// Loopback preview only (http://127.0.0.1:3060/blog). External requests and API writes are blocked.
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, expect as playwrightExpect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const base = "http://127.0.0.1:3060";
const publishedPreview = process.argv.includes("--published");
const temp = await mkdtemp(join(tmpdir(), "byteverse-blog-browser-"));
const browser = await chromium.launch({ channel: "msedge", headless: true });
const expect = playwrightExpect.configure({ timeout: 15000 });
const results = [];

async function run(name, body, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, colorScheme: "light", reducedMotion: "reduce", serviceWorkers: "block", ...options });
  const audit = { unexpected: [], errors: [] };
  const page = await context.newPage();
  page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(120000);
  page.on("pageerror", error => audit.errors.push(error.message));
  await context.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === base && ["GET", "HEAD"].includes(request.method()) && !url.pathname.startsWith("/api/")) return route.continue();
    // Next dev overlay resolves source maps for its own LCP hint on the shared header logo; not an application write.
    if (url.origin === base && url.pathname === "/__nextjs_original-stack-frames") return route.continue();
    if (["data:", "blob:"].includes(url.protocol)) return route.continue();
    audit.unexpected.push(`${request.method()} ${url.href}`); return route.abort();
  });
  await context.routeWebSocket("**/*", socket => {
    const url = new URL(socket.url());
    if (url.host === new URL(base).host && url.pathname === "/_next/webpack-hmr") socket.connectToServer();
    else { audit.unexpected.push(socket.url()); socket.close(); }
  });
  try {
    await body(page, audit);
    assert.deepEqual(audit.unexpected, [], "Unexpected external/API/write requests");
    assert.deepEqual(audit.errors, [], "Browser runtime errors");
    results.push({ name, status: "PASS" }); console.log(`PASS ${name}`);
  } catch (error) {
    const message = String(error.stack ?? error).slice(0, 6000);
    results.push({ name, status: "FAIL", message, audit }); console.error(`FAIL ${name}\n${message}`);
    await page.screenshot({ path: join(temp, `failure-${results.length}.png`) }).catch(() => {});
  } finally { await context.close(); }
}

async function open(page, path = "/blog") {
  const response = await page.goto(`${base}${path}`, { waitUntil: "load" });
  assert.equal(response.status(), 200);
  await expect(page.locator("[data-blog-index]")).toBeVisible();
  await expect(page.locator('form[aria-label="ByteVerse newsletter"] fieldset')).not.toBeDisabled();
  await page.evaluate(() => document.fonts.ready);
}

async function axe(page, name) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  await writeFile(join(temp, `axe-${name}.json`), JSON.stringify(result, null, 2));
  assert.deepEqual(result.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })), [], "Accessibility violations");
}

async function noOverflow(page) {
  const overflow = await page.locator("[data-blog-index]").evaluate(root => {
    const width = document.documentElement.clientWidth;
    return [...root.querySelectorAll("h1,h2,h3,p,a,button,input,ol,li")].filter(element => {
      if (!element.getClientRects().length) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && (rect.left < -1 || rect.right > width + 1);
    }).map(element => ({ tag: element.tagName, text: element.textContent.slice(0, 80) }));
  });
  assert.deepEqual(overflow, [], "Blog content overflows viewport");
}

async function themeMatchesSite(page) {
  await expect(async () => {
    const state = await page.evaluate(() => {
      const root = document.querySelector("[data-blog-index]");
      const theme = getComputedStyle(document.documentElement);
      const style = selector => getComputedStyle(document.querySelector(selector));
      const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      const rgb = color => { context.clearRect(0, 0, 1, 1); context.fillStyle = color; context.fillRect(0, 0, 1, 1); return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3); };
      const token = name => rgb(theme.getPropertyValue(name));
      return {
        actual: [rgb(getComputedStyle(root).backgroundColor), rgb(getComputedStyle(root).color), rgb(style("#featured-story article > a").backgroundColor)],
        expected: [token("--background"), token("--foreground"), token("--card")],
        alignment: ["header a[href='/']", "#blog-title", "#featured-story article > a", "#articles", "footer a[href='/']"].map(selector => document.querySelector(selector).getBoundingClientRect().left),
      };
    });
    assert.deepEqual(state.actual, state.expected, "Blog must use the active shared theme colors");
    assert(state.alignment.every(left => Math.abs(left - state.alignment[0]) < 1), `Header, blog content and footer must share alignment: ${state.alignment}`);
  }).toPass({ timeout: 5000 });
}

try {
  await run("SSR, metadata, lead image and real archive links", async page => {
    await open(page);
    await expect(page).toHaveTitle("Blog: AI, Coding & Tech Guides | ByteVerse");
    await expect(page.locator("h1")).toHaveCount(1);
    assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute("href")).href, "https://www.byteverse.fyi/blog");
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    assert.equal(ld.length, 1);
    const schema = JSON.parse(ld[0]);
    assert.equal(schema["@type"], "CollectionPage");
    assert.equal(schema.mainEntity.numberOfItems, 9);
    const preloads = page.locator('link[rel="preload"][as="image"]');
    await expect(preloads).toHaveCount(1);
    assert.equal(await preloads.first().getAttribute("imagesrcset"), await page.locator('[data-article-media="lead"] img').getAttribute("srcset"));
    await expect(page.locator("[data-blog-index] article")).toHaveCount(9);
    const images = page.locator("[data-blog-index] article img");
    for (const [index, image] of (await images.all()).entries()) await expect(image).toHaveAttribute("loading", index === 0 ? "eager" : "lazy");
    const links = await page.locator('[data-blog-index] article a[href*="/blog/"]').evaluateAll(nodes => nodes.map(anchor => anchor.getAttribute("href")));
    assert.equal(new Set(links).size, 9);
    if (publishedPreview) {
      assert(links.every(href => href.startsWith("https://www.byteverse.fyi/blog/")));
      assert(!/fictional|synthetic|Preview fixture|homepage-preview/.test(await page.locator("[data-blog-index]").innerText()));
    }
    await expect(page.locator("#trending ol li")).toHaveCount(5);
    await expect(page.locator("[data-blog-index] a button, [data-blog-index] a a")).toHaveCount(0);
    await expect(page.locator('[aria-label="Pagination"]')).toHaveCount(0);
    await expect(page.locator("[data-blog-tool]")).toHaveCount(3);
    await page.locator("[data-blog-index] article").last().scrollIntoViewIfNeeded();
    await expect.poll(() => images.evaluateAll(nodes => nodes.every(img => img.complete && img.naturalWidth > 0)), { timeout: 30000 }).toBe(true);
    await axe(page, "initial");
    await writeFile(join(temp, "blog.html"), await page.content());
  });

  for (const width of [320, 390, 768, 1280, 1440]) {
    for (const colorScheme of ["light", "dark"]) {
      await run(`responsive ${width}px ${colorScheme}`, async page => {
        await open(page);
        await expect(page.locator("html")).toHaveClass(colorScheme === "dark" ? /dark/ : /^(?!.*dark).*$/);
        await noOverflow(page);
        await themeMatchesSite(page);
        const trending = await page.locator("#trending").boundingBox();
        if (width >= 1024) assert(trending.y < 600, "Most-read panel must stay in the hero on desktop");
        await page.screenshot({ path: join(temp, `blog-${width}-${colorScheme}.png`), fullPage: true });
        for (const section of ["featured-story", "articles", "newsletter"]) {
          await page.locator(`#${section}`).scrollIntoViewIfNeeded();
          await page.screenshot({ path: join(temp, `${section}-${width}-${colorScheme}.png`) });
        }
        if (width === 390 || width === 1440) await axe(page, `${width}-${colorScheme}`);
      }, { viewport: { width, height: width < 640 ? 844 : 960 }, colorScheme });
    }
  }

  await run("out-of-range archive page stays honest and navigable", async page => {
    await open(page, "/blog?page=3");
    await expect(page).toHaveTitle("Blog articles, page 3 | ByteVerse");
    await expect(page.locator("[data-blog-index] article")).toHaveCount(0);
    await expect(page.getByText("Nothing on this page.")).toBeVisible();
    await expect(page.locator('[data-blog-index] a[href$="/blog"]').first()).toBeVisible();
    await noOverflow(page);
  });

  await run("keyboard reaches the skip link, trending and category tiles in order", async page => {
    await open(page);
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toHaveAttribute("href", "#main-content");
    await page.locator("#trending a").first().focus();
    await expect(page.locator(":focus")).toHaveAttribute("href", /\/blog\//);
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toHaveAttribute("href", /\/blog\//);
    const tile = page.locator('[aria-label="Browse by category"] a').first();
    await tile.focus();
    await expect(page.locator(":focus")).toHaveAttribute("href", /\/category\//);
  });

  await run("blog renders fully without JavaScript", async page => {
    await page.goto(`${base}/blog`, { waitUntil: "load" });
    await expect(page.locator("[data-blog-index] article")).toHaveCount(9);
    await expect(page.locator("#trending ol li")).toHaveCount(5);
    await expect(page.locator('form[aria-label="ByteVerse newsletter"]')).toHaveAttribute("method", /post/i);
  }, { javaScriptEnabled: false });
} finally {
  await browser.close();
  await writeFile(join(temp, "results.json"), JSON.stringify(results, null, 2));
  console.log(`ARTIFACTS ${temp}`);
  const passed = results.filter(result => result.status === "PASS").length;
  console.log(`${passed}/${results.length} checks passed`);
  process.exitCode = passed === results.length ? 0 : 1;
}
