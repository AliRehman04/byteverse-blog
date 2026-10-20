// Loopback production preview only. Newsletter/translation are mocked; all
// other writes, APIs and external requests are blocked. No real subscriptions.
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, expect as playwrightExpect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";

const base = "http://127.0.0.1:3060";
assert(process.argv.length === 2, "This script only tests the isolated homepage preview on port 3060.");
const temp = await mkdtemp(join(tmpdir(), "byteverse-homepage-browser-"));
const browser = await chromium.launch({ channel: "msedge", headless: true });
const expect = playwrightExpect.configure({ timeout: 15000 });
const results = [];
const mockTranslator = `window.google = { translate: { TranslateElement: function () { const select = document.createElement('select'); select.className = 'goog-te-combo'; select.setAttribute('aria-label', 'Mock translation language'); ['en','ur','ar','hi','es','zh-CN'].forEach(code => { const option = document.createElement('option'); option.value = code; select.appendChild(option); }); document.getElementById('google_translate_element').appendChild(select); } } }; window.googleTranslateElementInit();`;

async function run(name, body, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, colorScheme: "light", reducedMotion: "reduce", serviceWorkers: "block", ...options });
  const audit = { unexpected: [], errors: [], translations: 0, posts: [], postStatus: 200, postBody: { message: "Successfully subscribed!" } };
  const page = await context.newPage();
  page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(60000);
  page.on("pageerror", error => audit.errors.push(error.message));
  await context.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.hostname === "translate.google.com" && url.pathname === "/translate_a/element.js") {
      audit.translations++; return route.fulfill({ status: 200, contentType: "application/javascript", body: mockTranslator });
    }
    if (url.origin === base && url.pathname === "/api/newsletter" && request.method() === "POST") {
      audit.posts.push(request.postDataJSON());
      return route.fulfill({ status: audit.postStatus, contentType: "application/json", body: JSON.stringify(audit.postBody) });
    }
    if (url.origin === base && ["GET", "HEAD"].includes(request.method()) && !url.pathname.startsWith("/api/")) return route.continue();
    if (["data:", "blob:"].includes(url.protocol)) return route.continue();
    audit.unexpected.push(`${request.method()} ${url.href}`); return route.abort();
  });
  await context.routeWebSocket("**/*", socket => { audit.unexpected.push(socket.url()); socket.close(); });
  try {
    await body(page, audit, context);
    assert.deepEqual(audit.unexpected, [], "Unexpected external/API/write requests");
    assert.deepEqual(audit.errors, [], "Browser runtime errors");
    results.push({ name, status: "PASS", translationRequestsMocked: audit.translations, newsletterRequestsMocked: audit.posts.length });
    console.log(`PASS ${name}`);
  } catch (error) {
    const message = String(error.stack ?? error).slice(0, 6000);
    results.push({ name, status: "FAIL", message, audit });
    console.error(`FAIL ${name}\n${message}`);
    await page.screenshot({ path: join(temp, `failure-${results.length}.png`), fullPage: false }).catch(() => {});
  } finally { await context.close(); }
}

async function open(page) {
  const response = await page.goto(`${base}/`, { waitUntil: "load" });
  assert.equal(response.status(), 200);
  await expect(page.locator("[data-homepage]")).toBeVisible();
  await expect(page.getByRole("button", { name: /Change language/ })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

async function axe(page, name) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  await writeFile(join(temp, `axe-${name}.json`), JSON.stringify(result, null, 2));
  assert.deepEqual(result.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })), [], "Accessibility violations");
}

async function noOverflow(page) {
  const overflow = await page.locator("[data-homepage]").evaluate(root => {
    const width = document.documentElement.clientWidth;
    return [...root.querySelectorAll("h1,h2,h3,p,a,button,input,pre,table,summary")].filter(element => {
      if (!element.getClientRects().length) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && (rect.left < -1 || rect.right > width + 1);
    }).map(element => ({ tag: element.tagName, text: element.textContent.slice(0, 80) }));
  });
  assert.deepEqual(overflow, [], "Homepage content overflows viewport");
}

async function themeMatchesSite(page) {
  const state = await page.evaluate(() => {
    const root = document.querySelector("[data-homepage]");
    const theme = getComputedStyle(document.documentElement);
    const style = selector => getComputedStyle(document.querySelector(selector));
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const rgb = color => { context.clearRect(0, 0, 1, 1); context.fillStyle = color; context.fillRect(0, 0, 1, 1); return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3); };
    const token = name => rgb(theme.getPropertyValue(name));
    const cta = style('[data-homepage] a[href="/tools"]');
    const formButton = style('form[aria-label="ByteVerse newsletter"] button[type="submit"]');
    return {
      actual: [rgb(getComputedStyle(root).backgroundColor), rgb(getComputedStyle(root).color), rgb(style("[data-homepage] figure").backgroundColor), rgb(style("#questions").backgroundColor)],
      expected: [token("--background"), token("--foreground"), token("--card"), token("--muted")],
      cta: { background: rgb(cta.backgroundColor), text: rgb(cta.color) },
      newsletter: { background: rgb(formButton.backgroundColor), text: rgb(formButton.color) },
      alignment: ["header a[href='/']", "#home-title", "#tools-title", "footer a[href='/']"].map(selector => document.querySelector(selector).getBoundingClientRect().left),
    };
  });
  assert.deepEqual(state.actual, state.expected, "Homepage must use the active shared theme colors");
  assert.deepEqual(state.cta, state.newsletter, "Primary actions must use matching colors");
  assert(state.alignment.every(left => Math.abs(left - state.alignment[0]) < 1), "Header, main content and footer must share alignment");
  const luminance = color => color.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
  const values = [luminance(state.cta.text), luminance(state.cta.background)].sort((a, b) => b - a);
  assert((values[0] + .05) / (values[1] + .05) >= 4.5, "Primary action contrast must meet WCAG AA");
}

try {
  await run("SSR, metadata, lazy images and no initial translation", async (page, audit) => {
    await open(page);
    await expect(page).toHaveTitle("Free Developer Tools & Practical Tech Guides | ByteVerse");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("main")).toHaveCount(1);
    // Next serializes origin-only canonicals without a trailing slash.
    assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute("href")).href, "https://www.byteverse.fyi/");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Free online developer tools/);
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    assert.equal(ld.length, 1);
    const graph = JSON.parse(ld[0])["@graph"];
    assert.deepEqual(graph.map(item => item["@type"]), ["Organization", "WebSite", "WebPage"]);
    assert(!/SearchAction|FAQPage|search_term_string/.test(ld[0]));
    await expect(page.locator('link[rel="preload"][as="image"]')).toHaveCount(0);
    await expect(page.locator("[data-homepage] article")).toHaveCount(6);
    const images = page.locator("[data-homepage] article img");
    for (const image of await images.all()) {
      await expect(image).toHaveAttribute("loading", "lazy");
      await expect(image).toHaveAttribute("sizes", /max-width/);
    }
    await expect(page.locator("[data-homepage] a button, [data-homepage] a a")).toHaveCount(0);
    await page.locator("[data-homepage] article").last().scrollIntoViewIfNeeded();
    await expect.poll(() => images.evaluateAll(nodes => nodes.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
    await axe(page, "initial");
    assert.equal(audit.translations, 0);
    await expect(page.locator("#google-translate-script")).toHaveCount(0);
    await writeFile(join(temp, "homepage.html"), await page.content());
  });

  for (const width of [320, 390, 768, 1280, 1440]) {
    for (const theme of ["light", "dark"]) {
      await run(`responsive ${width}px ${theme}`, async (page, audit) => {
        await open(page);
        await expect(page.locator("html")).toHaveClass(new RegExp(theme));
        await noOverflow(page);
        await themeMatchesSite(page);
        await axe(page, `${width}-${theme}`);
        await page.screenshot({ path: join(temp, `home-${width}-${theme}.png`), fullPage: false });
        if (width === 1440 || width === 390) {
          for (const section of ["featured-tools", "latest-guides", "questions"]) {
            await page.locator(`#${section}`).scrollIntoViewIfNeeded();
            await page.screenshot({ path: join(temp, `${section}-${width}-${theme}.png`), fullPage: false });
          }
          await page.locator('section[aria-labelledby="newsletter-title"]').scrollIntoViewIfNeeded();
          await page.screenshot({ path: join(temp, `newsletter-${width}-${theme}.png`), fullPage: false });
        }
        assert.equal(audit.translations, 0);
      }, { viewport: { width, height: width < 768 ? 844 : 960 }, colorScheme: theme });
    }
  }

  await run("theme toggle updates shared surfaces and persists after reload", async page => {
    await open(page);
    const toggle = page.getByRole("button", { name: "Toggle theme", exact: true });
    await toggle.click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await themeMatchesSite(page);
    await page.reload({ waitUntil: "load" });
    await expect(page.locator("html")).toHaveClass(/dark/);
    await themeMatchesSite(page);
    await toggle.click();
    await expect(page.locator("html")).toHaveClass(/light/);
    await themeMatchesSite(page);
    await page.locator("#questions summary").first().click();
    await axe(page, "theme-toggle-open-faq");
  });

  await run("gradient heading remains readable in forced colors", async page => {
    await open(page);
    const heading = page.locator("#home-title span");
    await expect(heading).toBeVisible();
    const colors = await heading.evaluate(element => ({ color: getComputedStyle(element).color, background: getComputedStyle(element).backgroundImage }));
    assert.equal(colors.background, "none");
    assert.notEqual(colors.color, "rgba(0, 0, 0, 0)");
    await noOverflow(page);
  }, { forcedColors: "active" });

  await run("keyboard bypass, native FAQ, reduced motion and mobile menu", async page => {
    await open(page);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content", exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
    const question = page.locator("#questions summary").first();
    await question.focus(); await page.keyboard.press("Enter");
    await expect(page.locator("#questions details").first()).toHaveAttribute("open", "");
    await page.keyboard.press("Space");
    await expect(page.locator("#questions details").first()).not.toHaveAttribute("open", "");
    assert.equal(await page.locator("html").evaluate(element => getComputedStyle(element).scrollBehavior), "auto");
    const menu = page.getByRole("button", { name: "Toggle menu", exact: true });
    await menu.click(); await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
    await page.keyboard.press("Escape"); await expect(menu).toBeFocused();
    await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toHaveCount(0);
  }, { viewport: { width: 390, height: 844 } });

  await run("newsletter validation, API contract, retry and honeypot (mocked)", async (page, audit) => {
    await open(page);
    const form = page.getByRole("form", { name: "ByteVerse newsletter" });
    const input = form.getByRole("textbox", { name: "Your email address" });
    const submit = form.getByRole("button", { name: "Subscribe", exact: true });
    await submit.click(); assert.equal(audit.posts.length, 0);
    await input.fill("synthetic-reader@example.invalid");
    audit.postStatus = 503;
    await submit.click(); await expect(form.getByRole("status")).toContainText("unavailable");
    audit.postStatus = 429;
    await submit.click(); await expect(form.getByRole("status")).toContainText("Too many attempts");
    audit.postStatus = 200; audit.postBody = { unexpected: true };
    await submit.click(); await expect(form.getByRole("status")).toContainText("Could not subscribe");
    audit.postBody = { message: "Successfully subscribed!" };
    await submit.click(); await expect(form.getByRole("status")).toContainText("Subscription request received");
    await expect(form.getByRole("button", { name: "Request sent" })).toBeDisabled();
    assert.equal(audit.posts.length, 4);
    assert(audit.posts.every(value => JSON.stringify(value) === '{"email":"synthetic-reader@example.invalid"}'));
    await axe(page, "newsletter-success");
    await page.reload({ waitUntil: "load" });
    await input.fill("synthetic-reader@example.invalid");
    await form.locator('[name="website"]').evaluate(element => { element.value = "bot.example.invalid"; });
    await submit.click(); assert.equal(audit.posts.length, 4);
  });

  await run("translation opt-in, RTL persistence and English restore (mocked)", async (page, audit) => {
    await open(page);
    const trigger = page.getByRole("button", { name: /Change language/ });
    await trigger.click(); assert.equal(audit.translations, 0);
    await page.getByRole("group", { name: "Choose a language" }).getByRole("button", { name: /Urdu/ }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ur");
    await expect.poll(() => audit.translations).toBe(1);
    await noOverflow(page);
    await page.reload({ waitUntil: "load" });
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect.poll(() => audit.translations).toBe(2);
    await trigger.click();
    await Promise.all([page.waitForEvent("load"), page.getByRole("group", { name: "Choose a language" }).getByRole("button", { name: /English/ }).click()]);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("#google-translate-script")).toHaveCount(0);
    assert.equal(audit.translations, 2);
  }, { viewport: { width: 390, height: 844 } });

  await run("public/private image-tool boundary uses fresh documents", async (page, audit) => {
    await open(page);
    await page.evaluate(() => { window.__homeDocumentMarker = "before-private"; });
    await Promise.all([page.waitForURL(`${base}/tools/image-compressor`), page.locator('#featured-tools a[href="/tools/image-compressor"]').click()]);
    assert.equal(await page.evaluate(() => window.__homeDocumentMarker), undefined);
    await expect(page.getByRole("button", { name: /Change language/ })).toHaveCount(0);
    await expect(page.locator('script[src*="google"],script[src*="doubleclick"]')).toHaveCount(0);
    await page.evaluate(() => { window.__homeDocumentMarker = "before-public"; });
    await Promise.all([page.waitForURL(`${base}/`), page.getByRole("banner").getByRole("link", { name: "ByteVerse", exact: true }).click()]);
    assert.equal(await page.evaluate(() => window.__homeDocumentMarker), undefined);
    await expect(page.getByRole("button", { name: /Change language/ })).toBeVisible();
    assert.equal(audit.translations, 0);
  });

  await run("native homepage content works without JavaScript", async page => {
    await page.goto(`${base}/`, { waitUntil: "load" });
    await expect(page.locator("h1")).toHaveText("Free developer tools. Practical tech guides.");
    await expect(page.locator('#featured-tools a[href^="/tools/"]')).toHaveCount(8);
    const newsletter = page.getByRole("form", { name: "ByteVerse newsletter" });
    await expect(newsletter).toHaveAttribute("method", "post");
    await expect(newsletter.getByRole("textbox", { name: "Your email address" })).toBeDisabled();
    await expect(newsletter.getByRole("button", { name: "Subscribe", exact: true })).toBeDisabled();
    // Playwright's text engine skips noscript; inspect its rendered child directly.
    const noScriptNote = newsletter.locator("noscript p");
    await expect(noScriptNote).toBeVisible();
    assert.equal(await noScriptNote.textContent(), "Enable JavaScript to subscribe to email updates.");
    const summary = page.locator("#questions summary").first();
    await summary.click(); await expect(page.locator("#questions details").first()).toHaveAttribute("open", "");
  }, { javaScriptEnabled: false });

  await run("social image renders a real 1200 x 630 PNG", async page => {
    const response = await page.goto(`${base}/opengraph-image`, { waitUntil: "load" });
    assert.equal(response.status(), 200);
    assert.match(response.headers()["content-type"], /image\/png/);
    const bytes = await response.body();
    const meta = await sharp(bytes).metadata();
    assert.equal(meta.width, 1200); assert.equal(meta.height, 630);
    await writeFile(join(temp, "opengraph.png"), bytes);
  });
} finally {
  await browser.close();
  await writeFile(join(temp, "results.json"), JSON.stringify({ measuredAt: new Date().toISOString(), base, limitations: "Fictional posts; newsletter and translation mocked; no live provider/DB/field-CWV validation.", results }, null, 2));
  console.log(`ARTIFACTS ${temp}`);
  console.log(`${results.filter(result => result.status === "PASS").length}/${results.length} checks passed`);
  if (results.some(result => result.status !== "PASS")) process.exitCode = 1;
}