import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

// Hands-on record for the "Gemini in Chrome not showing" guide. Starts the installed Chrome twice with empty temporary
// profiles and writes what it observed. The real Chrome profile is never opened. The country code itself is not stored.
assert.equal(process.argv.length, 2, "No arguments; run once");
const output = fileURLToPath(new URL("../docs/content-research/2026-11-23-chrome-hands-on.json", import.meta.url));
const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
assert(existsSync(chrome), "Google Chrome is not installed at the default path");
const remove = async (folder) => { await new Promise((done) => setTimeout(done, 3000)); try { rmSync(folder, { recursive: true, force: true }); return true; } catch { return false; } };

// Part 1: what a fresh profile writes to the Local State file once Chrome has contacted Google's variations server.
const first = mkdtempSync(join(tmpdir(), "bv-chrome-check-"));
const started = Date.now();
const child = spawn(chrome, [`--user-data-dir=${first}`, "--headless=new", "--no-first-run", "--no-default-browser-check", "about:blank"], { stdio: "ignore" });
const read = () => { try { return JSON.parse(readFileSync(join(first, "Local State"), "utf8")); } catch { return null; } };
let state = null;
let secondsUntilCountry = null;
for (let second = 5; second <= 90; second += 5) {
  await new Promise((done) => setTimeout(done, 5000));
  state = read();
  if (state?.variations_country) { secondsUntilCountry = Math.round((Date.now() - started) / 1000); break; }
}
child.kill();
await new Promise((done) => setTimeout(done, 2000));
state = read() ?? state;
const pair = state?.variations_permanent_consistency_country;
const localState = {
  variationsCountryIsTwoLetterCode: /^[a-z]{2}$/.test(state?.variations_country ?? ""),
  secondsUntilCountryAppeared: secondsUntilCountry,
  permanentCountryIsPair: Array.isArray(pair) && pair.length === 2,
  permanentCountryStoredVersion: Array.isArray(pair) ? pair[0] : null,
  permanentCountryEqualsLatestCountry: Array.isArray(pair) ? pair[1] === state?.variations_country : null,
  profileInfoCacheIsGlicEligible: state?.profile?.info_cache?.Default?.is_glic_eligible ?? null,
};
const firstRemoved = await remove(first);

// Part 2: what the pages named in the article show in a signed-out profile.
const second = mkdtempSync(join(tmpdir(), "bv-chrome-check-"));
const context = await chromium.launchPersistentContext(second, { channel: "chrome", headless: true });
const pages = {};
try {
  const page = context.pages()[0] ?? await context.newPage();
  const deepText = () => page.evaluate(() => {
    const collect = (root) => { let out = ""; for (const node of root.querySelectorAll("*")) { if (node.shadowRoot) out += " " + collect(node.shadowRoot); } return (root.innerText ?? root.textContent ?? "") + out; };
    return collect(document.body).replace(/\s+/g, " ").trim();
  });
  const visit = async (url) => { await page.goto(url); await page.waitForTimeout(4000); return { finalUrl: page.url(), text: await deepText() }; };
  const version = await visit("chrome://version");
  pages.version = /\d+\.\d+\.\d+\.\d+/.exec(version.text)?.[0] ?? null;
  const local = await visit("chrome://local-state");
  pages.localStatePage = local.text.slice(0, 300);
  const management = await visit("chrome://management");
  pages.managementPage = management.text.slice(0, 120);
  const gemini = await visit("chrome://settings/ai/gemini");
  pages.geminiSettingsFinalUrl = gemini.finalUrl;
  pages.settingsMenuHasAiInnovations = gemini.text.includes("AI innovations");
  pages.uiLanguage = await page.evaluate(() => navigator.language);
} finally { await context.close(); }
const secondRemoved = await remove(second);

const record = {
  checkedAt: new Date().toISOString(),
  machine: "Windows 11 Pro, Google Chrome from the default install path, two empty temporary profiles, not signed in",
  note: "The two-letter country code Chrome recorded is not stored here. It was a country on Google's supported list.",
  localState, pages, temporaryProfilesRemoved: firstRemoved && secondRemoved,
};
writeFileSync(output, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(record, null, 1));
