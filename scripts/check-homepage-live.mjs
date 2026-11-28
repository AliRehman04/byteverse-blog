import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, expect } from "@playwright/test";

const origin = "https://www.byteverse.fyi";
assert.equal(process.argv.length, 2);
const directory = await mkdtemp(join(tmpdir(), "byteverse-live-theme-"));
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = [];
try {
  for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width, height: 960 }, colorScheme: theme, reducedMotion: "reduce", serviceWorkers: "block" });
    const errors = [];
    await context.route("**/*", route => {
      const request = route.request(), url = new URL(request.url());
      return url.origin === origin && ["GET", "HEAD"].includes(request.method()) && !url.pathname.startsWith("/api/") ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    const response = await page.goto(`${origin}/`, { waitUntil: "load", timeout: 60000 });
    assert.equal(response.status(), 200);
    await expect(page.locator("html")).toHaveClass(new RegExp(theme));
    await expect(page.locator("h1")).toHaveText("Free online developer tools and practical tech guides");
    assert.equal(await page.title(), "Free Online Developer Tools & Tech Guides | ByteVerse");
    await expect(page.locator("[data-homepage]")).toHaveAttribute("data-homepage-design", "directory");
    await expect(page.getByRole("searchbox", { name: "Find a tool" })).toBeVisible();
    assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute("href")).href, `${origin}/`);
    const state = await page.evaluate(() => {
      const root = document.querySelector("[data-homepage]"), style = getComputedStyle(root);
      const shared = getComputedStyle(document.documentElement);
      const rgb = color => {
        const canvas = document.createElement("canvas"), context = canvas.getContext("2d");
        canvas.width = canvas.height = 1; context.fillStyle = color; context.fillRect(0, 0, 1, 1);
        return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
      };
      return {
        foreground: rgb(style.color), expectedForeground: rgb(shared.getPropertyValue("--foreground")),
        card: rgb(getComputedStyle(root.querySelector("#featured-stories article")).backgroundColor), expectedCard: rgb(shared.getPropertyValue("--card")),
        violet: shared.getPropertyValue("--brand-violet").trim(),
        alignment: ["header a[href='/']", "#tools-title", "#featured-stories article", "footer a[href='/']"].map(selector => document.querySelector(selector).getBoundingClientRect().left),
        articleLinks: [...root.querySelectorAll("article a[href*='/blog/']")].map(anchor => new URL(anchor.href).pathname),
        sections: ["featured-tools", "tool-categories", "why-byteverse", "featured-stories", "topics", "latest-guides", "newsletter", "about-byteverse", "questions"].filter(id => !document.getElementById(id)),
        featuredTools: root.querySelectorAll("#featured-tools a[href^='/tools/']").length,
        categoryLinks: [...root.querySelectorAll("#tool-categories a[href^='/tools#']")].map(anchor => anchor.getAttribute("href")),
        schemaTypes: [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(script => { const data = JSON.parse(script.textContent); return (data["@graph"] ?? [data]).map(item => item["@type"]); }),
        description: document.querySelector('meta[name="description"]').content.length,
        robots: document.querySelector('meta[name="robots"]')?.content ?? "",
        overflowing: [...root.querySelectorAll("h1,h2,h3,a,button,p,summary")].filter(element => {
          if (!element.getClientRects().length) return false;
          const rect = element.getBoundingClientRect(); return rect.left < -1 || rect.right > document.documentElement.clientWidth + 1;
        }).map(element => element.tagName),
        translationLoaded: Boolean(document.getElementById("google-translate-script")),
      };
    });
    assert.deepEqual(state.foreground, state.expectedForeground);
    assert.deepEqual(state.card, state.expectedCard);
    assert.equal(state.violet, "#8b5cf6");
    assert(state.alignment.every(left => Math.abs(left - state.alignment[0]) < 1), `Page edges are not aligned: ${state.alignment}`);
    assert.equal(state.articleLinks.length, 12);
    assert.equal(new Set(state.articleLinks).size, 12);
    assert(state.articleLinks.every(path => !/homepage-preview/.test(path)));
    assert.deepEqual(state.sections, [], "Missing homepage sections");
    assert.equal(state.featuredTools, 8);
    assert.equal(state.categoryLinks.length, 6);
    for (const type of ["Organization", "WebSite", "WebPage"]) assert(state.schemaTypes.includes(type), `Missing ${type} schema`);
    assert(!state.schemaTypes.includes("FAQPage"));
    assert(state.description >= 120 && state.description <= 160, `Meta description length ${state.description}`);
    assert(!/noindex/i.test(state.robots));
    assert.deepEqual(state.overflowing, []);
    assert.equal(state.translationLoaded, false);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: join(directory, `live-${width}-${theme}.png`) });
    results.push({ width, theme, status: response.status(), ...state });
    await context.close();
  }
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), origin, checks: results, artifacts: directory, note: "Read-only homepage checks; third-party telemetry and API writes blocked." }, null, 2));
} finally {
  await browser.close();
  await writeFile(join(directory, "results.json"), JSON.stringify(results, null, 2));
}