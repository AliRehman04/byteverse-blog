import { chromium } from "@playwright/test";

// Browser parity check for client-side integrations the HTML comparison cannot see: Google Analytics, AdSense and
// giscus comments are injected after load from lazy chunks, using NEXT_PUBLIC_ values inlined at build time.
// Every request to those services is recorded and aborted, so this check sends no analytics hits, requests no ads
// and loads no comment widget; view-counter calls are blocked too. Usage:
//   node scripts/test-cloudflare-client-parity.mjs [--a https://www.byteverse.fyi] [--b https://byteverse.<account>.workers.dev]
const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => (value.startsWith("--") ? [...pairs, [value.slice(2), all[index + 1]]] : pairs), []));
const A = (args.a || "https://www.byteverse.fyi").replace(/\/$/, "");
const B = (args.b || "https://byteverse.alirehmanvu786.workers.dev").replace(/\/$/, "");
const PAGES = ["/", "/blog/gemini-in-chrome-not-showing", "/tools/seo-title-analyzer", "/contact"];
const THIRD_PARTY = /(^|\.)(googletagmanager\.com|google-analytics\.com|analytics\.google\.com|googlesyndication\.com|doubleclick\.net|adservice\.google\.com|adtrafficquality\.google|fundingchoicesmessages\.google\.com|giscus\.app)$/;

async function observe(browser, base) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "light" });
  const blocked = [];
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (THIRD_PARTY.test(url.hostname) || url.pathname.startsWith("/api/views/")) { blocked.push(url.href); return route.abort(); }
    return route.continue();
  });
  const result = {};
  try {
    for (const path of PAGES) {
      const page = await context.newPage();
      const start = blocked.length;
      await page.goto(base + path, { waitUntil: "load", timeout: 60000 });
      await page.waitForTimeout(6000);
      for (let step = 0; step < 30; step++) { await page.mouse.wheel(0, 1200); await page.waitForTimeout(150); }
      await page.waitForTimeout(4000);
      const dom = await page.evaluate(() => ({
        adUnits: [...document.querySelectorAll("ins.adsbygoogle")].map((el) => `${el.getAttribute("data-ad-client")}/${el.getAttribute("data-ad-slot")}`).sort(),
        giscus: [...document.querySelectorAll('script[src*="giscus.app"]')].map((el) => [...el.attributes].filter((a) => a.name.startsWith("data-")).map((a) => `${a.name}=${a.value}`).sort().join(" ")),
        commentsSection: [...document.querySelectorAll("h3")].some((h) => h.textContent.trim() === "Comments"),
      }));
      const requests = blocked.slice(start);
      const params = (needle, key) => [...new Set(requests.filter((u) => u.includes(needle)).map((u) => new URL(u).searchParams.get(key)))].sort();
      result[path] = { analytics: params("googletagmanager.com/gtag/js", "id"), adsense: params("adsbygoogle.js", "client"), ...dom };
      await page.close();
    }
  } finally {
    await context.close();
  }
  return result;
}

const browser = await chromium.launch({ channel: "msedge", headless: true });
let a, b;
try {
  [a, b] = [await observe(browser, A), await observe(browser, B)];
} finally {
  await browser.close();
}
const failures = [];
for (const path of PAGES) {
  for (const key of Object.keys(a[path])) {
    const left = JSON.stringify(a[path][key]), right = JSON.stringify(b[path][key]);
    if (left !== right) failures.push(`${path} ${key}: ${left} vs ${right}`);
  }
  const s = a[path];
  console.log(`${path}: analytics=${s.analytics.join(",") || "none"} adsense=${s.adsense.join(",") || "none"} adUnits=${s.adUnits.length} comments=${s.commentsSection ? "yes" : "no"} giscus=${s.giscus.length ? "configured" : "none"}`);
}
for (const failure of failures) console.log(`FAIL ${failure}`);
console.log(failures.length ? `FAILED: ${failures.length} difference(s) between ${A} and ${B}.` : `PASS: ${A} and ${B} load the same client-side integrations on ${PAGES.length} pages.`);
process.exitCode = failures.length ? 1 : 0;
