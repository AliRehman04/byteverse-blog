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

// Chromium source files and Google help pages are saved outside the repository and read as text.
const sourceDir = new URL("../../.byteverse-gemini-chrome-check/", import.meta.url);
const saved = (file) => readFileSync(new URL(file, sourceDir), "utf8");
const VERSION = "158.0.8127.37";
const source = (file) => saved(`chromium-${VERSION}/${file}`);
const doc = (name) => saved(`docs/${name}.txt`);
const mode = process.argv[2];
assert(process.argv.length <= 3 && (!mode || ["--metrics", "--preview", "--live"].includes(mode)));
const content = readFileSync(new URL("content/gemini-in-chrome-not-showing.md", import.meta.url), "utf8").replace(/\r\n?/g, "\n").trim();
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
const ledger = JSON.parse(readFileSync(new URL("../docs/gemini-in-chrome-keywords-2026-11-23.json", import.meta.url), "utf8"));
const research = (name) => JSON.parse(readFileSync(new URL(`../docs/content-research/2026-11-23-${name}.json`, import.meta.url), "utf8"));
const sha = (file) => createHash("sha256").update(readFileSync(new URL(file, sourceDir))).digest("hex");
if (mode === "--metrics") console.log(JSON.stringify({ ...metrics, sourceSha256: Object.fromEntries(Object.keys(ledger.validation.sourceSha256).map((file) => [file, sha(file)])) }, null, 2));

const header = source("chrome__browser__glic__public__glic_enabling.h");
const enabling = source("chrome__browser__glic__public__glic_enabling.cc");
const chromeFeatures = source("chrome__common__chrome_features.cc");
const lookupTable = content.split("\n").filter((line) => line.startsWith("|")).slice(2).map((line) => line.slice(1, -1).split(" | ").map((cell) => cell.trim()));

test("draft structure matches the blog convention", () => {
  assert(!/^# /m.test(content));
  assert(content.match(/^## .+$/gm).every((heading) => !heading.endsWith("?")));
  assert.equal((content.split("\n## Frequently Asked Questions")[0].match(/^### /gm) ?? []).length, 0, "H3 headings are reserved for FAQ questions");
  const faqSection = content.split("\n## Frequently Asked Questions")[1].split("\n## ")[0];
  assert.equal(faqSection.match(/^### /gm)?.length, ledger.faq.length);
  for (const answer of faqSection.split(/^### .+$/m).slice(1)) assert(!/[#*_`>-]/.test(answer), "FAQ answers must survive the schema character filter");
  assert.equal(blocks.length, 0, "This guide has no terminal commands");
  assert(!/\u2014/.test(content), "No em dashes in published content");
  for (const paragraph of content.split("\n## Sources and Further Reading")[0].split("\n\n")) {
    if (/^[|`#\-!\d]/.test(paragraph.trim())) continue;
    assert(paragraph.trim().split(/\s+/).length <= 75, `Paragraph too long: ${paragraph.slice(0, 60)}`);
  }
  assert.equal(metrics.tables, 1);
  assert.equal(lookupTable.length, 9);
  assert.deepEqual([...new Set(lookupTable.map((row) => row[2]))], ["1", "2", "3", "4", "5", "6", "7", "8"]);
  assert.deepEqual(content.match(/^## \d\. /gm), ["## 1. ", "## 2. ", "## 3. ", "## 4. ", "## 5. ", "## 6. ", "## 7. ", "## 8. "]);
});

test("saved sources are the files recorded in the ledger", () => {
  assert(Object.keys(ledger.validation.sourceSha256).length >= 20);
  for (const [file, hash] of Object.entries(ledger.validation.sourceSha256)) assert.equal(sha(file), hash, file);
  assert.equal(source("chrome__VERSION"), "MAJOR=158\nMINOR=0\nBUILD=8127\nPATCH=37\n");
  const history = research("chrome-version-history");
  for (const platform of ["win", "mac"]) {
    const live = history[platform].filter((release) => release.fraction === 1);
    assert.deepEqual(live.map((release) => release.version), [VERSION], platform);
  }
  assert(content.includes(`the stable version for Windows and Mac was ${VERSION}`));
});

const joined = (text) => [...text.matchAll(/"([^"]*)"/g)].map((match) => match[1]).join("").split(",").filter(Boolean);
const adult = joined(/#else\ninline constexpr char kDefaultEnabledCountries\[\] =([\s\S]*?);/.exec(header)[1]);
const minor = joined(/inline constexpr char kDefaultEnabledCountriesMinor\[\] =\n([\s\S]*?);/.exec(header)[1]);
const localeBlock = /constexpr char kDefaultEnabledLocales\[\] =([\s\S]*?)\n    ;/.exec(enabling)[1];
const androidLocales = joined(localeBlock.split("#else")[0]);
const desktopLocales = joined(localeBlock.split("#else")[1].split("#if BUILDFLAG(IS_CHROMEOS)")[0]);
const chromeosLocales = joined(localeBlock.split("#if BUILDFLAG(IS_CHROMEOS)")[1]);
const help = doc("gemini-help-17140089-regions-languages").split("\n").map((line) => line.trim());
const section = (start, end) => help.slice(help.findIndex((line) => line.startsWith(start)) + 1, help.findIndex((line) => line.startsWith(end)));
const helpAdult = section("For users 18 or older", "For users under 18");
const helpMinor = section("For users under 18", "Check that your device is set to a supported language");
const helpLanguages = section("Gemini in Chrome is not available in all languages", "Related resources");
const regionName = new Intl.DisplayNames(["en"], { type: "region" });
const languageName = new Intl.DisplayNames(["en"], { type: "language" });
const norm = (name) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, "and").replace(/[^a-z]/g, "");
// Google's page uses a few names that differ from the CLDR English names.
const alias = { st: "São Tomé and Príncipe", hk: "Hong Kong", mo: "Macau", mm: "Myanmar", ps: "Palestine", cd: "Democratic Republic of the Congo", cg: "Republic of the Congo", fk: "Falkland Islands (Islas Malvinas)", bs: "The Bahamas", gm: "The Gambia", sh: "Saint Helena, Ascension and Tristan da Cunha", um: "United States Minor Outlying Islands", tc: "Turks and Caicos", ci: "Côte d'Ivoire", cv: "Cabo Verde", fm: "Micronesia", bn: "Brunei", la: "Laos", md: "Moldova", tz: "Tanzania", vn: "Vietnam", kr: "South Korea", tw: "Taiwan", vi: "U.S. Virgin Islands", vg: "British Virgin Islands", hm: "Heard Island and McDonald Islands", gs: "South Georgia and the South Sandwich Islands", sz: "Eswatini", tl: "Timor-Leste", mk: "North Macedonia", pn: "Pitcairn Islands", cc: "Cocos (Keeling) Islands", wf: "Wallis and Futuna", bo: "Bolivia", ve: "Venezuela", ag: "Antigua and Barbuda", kn: "Saint Kitts and Nevis", vc: "Saint Vincent and the Grenadines", lc: "Saint Lucia", tt: "Trinidad and Tobago", ba: "Bosnia and Herzegovina", io: "British Indian Ocean Territory" };
const country = (code) => alias[code] ?? regionName.of(code.toUpperCase());

test("the country lists in the code and on the help page are the same 187 and 43", () => {
  for (const [codes, names, size] of [[adult, helpAdult, 187], [minor, helpMinor, 43]]) {
    assert.equal(codes.length, size);
    assert.equal(new Set(codes).size, size);
    assert.equal(names.length, size);
    assert.deepEqual(codes.map((code) => norm(country(code))).sort(), names.map(norm).sort());
  }
  assert(minor.every((code) => adult.includes(code)), "Every under-18 country is also an adult country");
  assert(content.includes("They match exactly: 187 and 43.") && content.includes("in 187 countries and territories") && content.includes("in only 43 of them"));
  const eu = "at,be,bg,hr,cy,cz,dk,ee,fi,fr,de,gr,hu,ie,it,lv,lt,lu,mt,nl,pl,pt,ro,sk,si,es,se".split(",");
  assert.equal(eu.length, 27);
  assert(eu.every((code) => !adult.includes(code)), "No EU member state is on the list");
  assert(content.includes("None of the 27 member states of the European Union is on it."));
  for (const code of ["ch", "no", "is", "tr", "ru", "cn"]) assert(!adult.includes(code), code);
  assert(content.includes("Switzerland, Norway, Iceland, Turkey, Russia and China are missing too."));
  for (const code of ["us", "ca", "gb", "in", "pk", "jp", "au", "br", "eg", "sa", "ae", "il", "ua", "rs", "mx", "kr"]) assert(adult.includes(code), code);
  for (const code of ["us", "ca", "au", "in", "jp", "pk"]) assert(minor.includes(code), code);
  for (const code of ["gb", "br", "mx", "kr"]) assert(!minor.includes(code), code);
  assert(content.includes("The under-18 list includes the United States, Canada, Australia, India, Japan and Pakistan.") && content.includes("It does not include the United Kingdom, Brazil, Mexico or South Korea."));
  const region = (codes) => codes.filter((code) => adult.includes(code)).length / codes.length;
  assert(region("dz,ao,bj,bw,bf,bi,cv,cm,cf,td,km,cd,cg,ci,dj,eg,gq,er,sz,et,ga,gm,gh,gn,gw,ke,ls,lr,ly,mg,mw,ml,mr,mu,ma,mz,na,ne,ng,rw,st,sn,sc,sl,so,za,ss,sd,tz,tg,tn,ug,zm,zw".split(",")) === 1, "Africa");
  assert(region("ar,bo,br,cl,co,cr,cu,do,ec,sv,gt,hn,mx,ni,pa,py,pe,uy,ve".split(",")) > 0.9, "Latin America");
  assert(region("bn,kh,id,la,my,mm,ph,sg,th,tl,vn".split(",")) === 1, "Southeast Asia");
  assert(header.includes('#if BUILDFLAG(IS_ANDROID)\ninline constexpr char kDefaultEnabledCountries[] = "us,in";'));
});

test("the language list and the way it is checked match the code", () => {
  assert.equal(helpLanguages.length, 51);
  const fromCode = [...new Set([...desktopLocales, ...chromeosLocales].map((locale) => languageName.of(locale.split("-")[0]).replace("Bangla", "Bengali")))].sort();
  assert.deepEqual(fromCode, helpLanguages.map((entry) => entry.replace(/ \(.*\)/, "")).sort());
  assert.deepEqual(chromeosLocales.map((locale) => languageName.of(locale)), ["Basque", "Galician", "Icelandic", "Zulu"]);
  assert.deepEqual(helpLanguages.filter((entry) => entry.includes("(")), ["Zulu (Chrome OS only)"]);
  for (const locale of ["ar", "he", "fa", "ur"]) assert(!desktopLocales.includes(locale) && !chromeosLocales.includes(locale), locale);
  assert(content.includes("The help page lists 51 supported languages, and the code contains the same 51.") && content.includes("Arabic, Hebrew, Persian and Urdu"));
  assert.deepEqual(androidLocales, ["en-GB", "en-US"]);
  assert(enabling.includes("startup_data->chrome_feature_list_creator()->actual_locale()"));
  assert(header.includes("// Returns the locale applied to the Chrome app."));
  assert(header.includes("// Returns whether the global Glic feature is enabled for Chrome. This status\n  // will not change at runtime."));
  assert(enabling.includes("bool is_enabled = base::FeatureList::IsEnabled(features::kGlic) &&\n                    locale_enablement_.value_or(true);"));
  const languages = doc("chrome-help-languages-173424");
  assert(languages.includes("Select Display Google Chrome in this language .") && languages.includes("Chrome will automatically display in the default system language for your Mac or Linux."));
});

test("each of the eight checks is in the Chrome 158 source", () => {
  // 1. Device.
  assert(chromeFeatures.includes("BASE_FEATURE(kGlic,\n#if BUILDFLAG(IS_MAC) || BUILDFLAG(IS_WIN) || BUILDFLAG(IS_CHROMEOS) || \\\n    BUILDFLAG(IS_ANDROID)\n             base::FEATURE_ENABLED_BY_DEFAULT\n#else\n             base::FEATURE_DISABLED_BY_DEFAULT"));
  const policy = source("components__policy__resources__templates__policy_definitions__GenerativeAI__GeminiSettings.yaml");
  assert(policy.includes("future_on:\n- chrome.linux") && policy.includes("- chrome.win:137-") && policy.includes("- chrome.mac:137-"));
  assert(enabling.includes("chromeos::features::kFeatureManagementGlic"));
  // 3 and 4. Regular profile, signed in.
  assert(enabling.includes("// Glic is supported only in regular profiles (i.e. disabled in incognito,\n  // guest, system profile, etc.)."));
  assert(enabling.includes("if (primary_account.IsEmpty()) {") && enabling.includes("result.primary_account_is_capable = false;"));
  assert(source("chrome__browser__glic__public__features.cc").includes("BASE_FEATURE(kGlicShowForSignedOut,\n#if BUILDFLAG(IS_ANDROID)\n             base::FEATURE_ENABLED_BY_DEFAULT\n#else\n             base::FEATURE_DISABLED_BY_DEFAULT"));
  assert(enabling.includes("HasAccountWithRefreshTokenInPersistentErrorState") && enabling.includes("return mojom::ProfileReadyState::kSignInRequired;"));
  // 5. Account capability must be a definite yes.
  assert(enabling.includes(".can_use_gemini_in_chrome() == signin::Tribool::kTrue;") && enabling.includes("return capabilities.can_use_model_execution_features() ==\n         signin::Tribool::kTrue;"));
  // 6. Country: either the stored or the latest code may match.
  assert(chromeFeatures.includes("BASE_FEATURE(kGlicCountryFiltering, base::FEATURE_ENABLED_BY_DEFAULT);") && chromeFeatures.includes("BASE_FEATURE(kGlicUseSessionCountryForFiltering,\n             base::FEATURE_ENABLED_BY_DEFAULT);"));
  assert(enabling.includes("if (std::ranges::any_of(enabled_countries, permanent_country_matches) ||\n      (use_session_country &&\n       std::ranges::any_of(enabled_countries, session_country_matches))) {"));
  const variations = source("components__variations__service__variations_field_trial_creator.cc");
  assert(variations.includes("// Use the stored country if one is available and was fetched since the last\n  // time Chrome was updated.\n  if (does_version_match) {\n    return stored_country;"));
  assert(variations.includes("// Otherwise, update the pref with the current Chrome version and country.\n  StorePermanentCountry(version, latest_country);"));
  const prefs = source("components__variations__pref_names.h");
  assert(prefs.includes("// The latest country code received by the VariationsService for evaluating\n// studies.\ninline constexpr char kVariationsCountry[] = \"variations_country\";"));
  assert(prefs.includes("// Pair of <Chrome version string, country code string> representing the country\n// used for filtering permanent consistency studies until the next time Chrome\n// is updated."));
  assert(source("components__variations__service__variations_service.cc").includes('GetHeaderValue(headers.get(), "X-Country")'));
  // 7. Administrator.
  assert(policy.includes("- caption: Do not allow Gemini integrations.\n  name: Disabled\n  value: 1") && policy.includes("- caption: Allow Gemini integrations.\n  name: Allowed\n  value: 0") && policy.includes("per_profile: true"));
  assert(enabling.includes("case UserStatusCode::DISABLED_BY_ADMIN:\n          result.allowed_by_remote_admin = false;"));
  assert(enabling.includes("bool GlicEnabling::ProfileEnablement::DisallowedByAdmin() const {\n  return !allowed_by_chrome_policy || !allowed_by_remote_admin;"));
  // 8. Pinned button and the settings page.
  assert(source("chrome__browser__glic__glic_pref_names.cc").includes("registry->RegisterBooleanPref(kGlicPinnedToTabstrip, true);"));
  assert(/ShouldShowSettingsPage\(\) const \{[\s\S]{0,900}allowed_by_remote_other && fre_is_consented\);/.test(enabling));
  assert(source("chrome__browser__ui__webui__settings__settings_ui.cc").includes("// The visibility of the Glic page can change based on the user accepting the\n  // FRE."));
  // The button is shown only when everything passes, with the anchored exception.
  assert(enabling.includes("bool base_checks = IsProfileEligible() && is_rolled_out &&\n                     primary_account_is_capable && !DisallowedByAdmin() &&\n                     allowed_by_remote_other;"));
  assert(enabling.includes("return allowed_by_country_filter && allowed_by_locale_filter;"));
  assert(enabling.includes("if (anchor_entrypoint_override_active) {\n    return !DisallowedByAdmin() && is_rolled_out;") && header.includes("Glic partially enabled to show error states instead of hiding the button."));
  assert(chromeFeatures.includes("BASE_FEATURE(kGlicRollout, base::FEATURE_ENABLED_BY_DEFAULT);") && content.includes("In Chrome 158 it is switched on by default"));
});

test("statements about flags and the Local State file match the source and the hands-on record", () => {
  const flags = JSON.parse(source("chrome__browser__flag-metadata.json").replace(/^\s*\/\/.*$/gm, "")).map((flag) => flag.name);
  assert(flags.includes("glic") && !flags.includes("glic-side-panel") && !flags.includes("glic-rollout"));
  assert(source("chrome__browser__profiles__profile_attributes_entry.cc").includes('const char ProfileAttributesEntry::kIsGlicEligible[] = "is_glic_eligible";'));
  assert(enabling.includes("entry->SetIsGlicEligible(IsAllowed());"));
  const hands = research("chrome-hands-on");
  assert.equal(hands.localState.variationsCountryIsTwoLetterCode, true);
  assert.equal(hands.localState.secondsUntilCountryAppeared, 15);
  assert(content.includes("Within 15 seconds, Chrome's settings file held a two-letter country code."));
  assert.equal(hands.localState.permanentCountryIsPair && hands.localState.permanentCountryEqualsLatestCountry, true);
  assert.match(hands.localState.permanentCountryStoredVersion, /^\d+\.\d+\.\d+\.\d+$/);
  assert.equal(hands.localState.profileInfoCacheIsGlicEligible, false);
  assert(hands.pages.managementPage.startsWith("Your browser is not managed") && content.includes('chrome://management answered "Your browser is not managed"'));
  assert.equal(hands.pages.geminiSettingsFinalUrl, "chrome://settings/");
  assert(content.includes("the address chrome://settings/ai/gemini simply led back to the main Settings page"));
  assert(hands.pages.version.startsWith("157.") && hands.versionNote.includes("new_chrome.exe 158.0.8127.37"));
  assert(content.includes("it was still running version 157 while the update to 158 sat downloaded and waiting"));
  assert(!/\b[Pp]akistan\b.{0,40}\bmy\b|\bmy country\b/.test(content), "The author's location is not stated");
});

test("quotations and steps come from Google's help pages", () => {
  const chromeHelp = doc("chrome-help-use-gemini-desktop");
  for (const needle of ["Use a Chromebook Plus, Mac, or Windows computer.", "This feature isn’t available in Incognito mode.", "Be 13 or older (or the applicable age in your country ) and in a supported region .", "your location may not have updated from your previous location.", "Turn off your VPN.",
    "update to the next version of Chrome when it is available", "Show Gemini at the top of the browser", "click Unpin Gemini or Pin Gemini", "In the Settings menu, click AI innovations Gemini in Chrome .", "verify your age", "can turn off their child’s access to Gemini in Chrome using Family Link", "chrome://settings/ai/gemini", "(Advanced) Try resetting your Chrome flags"]) assert(chromeHelp.includes(needle), needle);
  for (const quote of ['"a Chromebook Plus, Mac, or Windows computer"', '"isn\'t available in Incognito mode"', '"your location may not have updated from your previous location"', '"Show Gemini at the top of the browser"']) assert(content.includes(quote), quote);
  const admin = doc("chrome-enterprise-p-gemini");
  assert(admin.includes("Gemini in Chrome is configured via the Gemini app setting and Chrome’s GeminiSettings policy. Access to this feature requires both to be enabled .") && admin.includes("Aged 18 or over and:") && admin.includes("Using an Android device in the U.S., or"));
  assert(content.includes('"requires both to be enabled"') && content.includes('"an Android device in the U.S."'));
  const managed = doc("chrome-help-managed-9281740");
  assert(managed.includes("If you see “Managed by your organization,” your browser is managed.") && managed.includes("chrome://management") && managed.includes("chrome://policy"));
  const flagsHelp = doc("chrome-help-flags-16552482");
  assert(flagsHelp.includes("Chrome flags aren’t settings") && flagsHelp.includes("At the top, select Reset all .") && flagsHelp.includes("Relaunch Chrome."));
  assert(content.includes('flags "aren\'t settings"'));
  const android = doc("chrome-help-use-gemini-android");
  assert(android.includes("Be 18 or over and in a supported region .") && android.includes("Use an Android phone with at least 4GB of RAM and running Android 12 or higher."));
  const ios = doc("chrome-help-use-gemini-ios");
  assert(ios.includes("To use Gemini in Chrome on your iPhone or iPad, you need to:\n Be 13 or older"));
  const update = doc("chrome-help-update-95414");
  assert(update.includes("Normally updates happen in the background when you close and reopen your computer's browser.") && update.includes("Click Help About Google Chrome ."));
  assert(doc("gemini-help-14620100-work-school").includes("To use Gemini Apps with a work account, you must be 18 or over."));
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
  assert.equal(ledger.slug, "gemini-in-chrome-not-showing");
  assert.match(ledger.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
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
  assert(content.startsWith("**When Gemini in Chrome is not showing"), "The primary keyword opens the article");
  assert(ledger.targeting.title.toLowerCase().startsWith("gemini in chrome not showing"));
});

test("the real renderer preserves the table and the intended links", () => {
  assert.equal(all(document, (node) => node.name === "pre").length, 0);
  assert.equal(all(document, (node) => node.name === "table").length, metrics.tables);
  assert.equal(all(document, (node) => ["h1", "script", "iframe"].includes(node.name)).length, 0);
  const ids = all(document, (node) => /^h[23]$/.test(node.name)).map((node) => node.attribs.id);
  assert.equal(new Set(ids).size, ids.length);
  const links = all(document, (node) => node.name === "a");
  const internal = [...new Set(links.filter((node) => node.attribs.href?.startsWith("/")).map((node) => node.attribs.href))].sort();
  assert.deepEqual(internal, [...ledger.internalLinks].sort());
  const external = links.filter((node) => node.attribs.href?.startsWith("https://"));
  assert.deepEqual([...new Set(external.map((node) => node.attribs.href))].sort(), ledger.sources.map((item) => item.url).sort());
  assert(external.every((node) => node.attribs.rel.includes("noopener")));
  assert(external.filter((node) => node.attribs.href.includes("chromium.googlesource.com")).every((node) => node.attribs.href.includes(`/refs/tags/${VERSION}/`)));
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
  assert.match(DomUtils.textContent(one(document, (node) => node.name === "figcaption")), /based on the Chrome 158 source code and Google's help pages on 23 November 2026\. Diagram by ByteVerse\./);
  for (const path of [ledger.images.coverFile, ledger.images.inlineFile]) {
    const file = readFileSync(new URL(`../${path}`, import.meta.url));
    const info = await sharp(file).metadata();
    assert.deepEqual([info.width, info.height, info.format], [1200, 675, "png"]);
    assert(file.length < 200 * 1024, "Illustrations stay small");
    assert.match(path, /^public\/blog\/gemini-in-chrome\/gemini-in-chrome-[a-z-]+\.png$/);
  }
  assert(content.includes("and there are no screenshots"));
  assert(content.includes("I did not test a signed-in account"));
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
          element("p", { className: "text-sm text-muted-foreground mb-8" }, `${ledger.targeting.author} | November 23, 2026 | ${ledger.targeting.readingTime}`),
          element("figure", { className: "mb-10" },
            element("img", { src: ledger.images.cover, alt: "Browser toolbar mock-up with a dashed outline where the Ask Gemini button should be", width: 1200, height: 675, className: "preview-cover rounded-lg" }),
            element("figcaption", { className: "text-sm text-muted-foreground mt-3" }, "Illustration: ByteVerse"),
          ),
          element("div", { dangerouslySetInnerHTML: { __html: rendered } }),
        ),
      ),
    ),
  );
  const directory = new URL("../../.byteverse-gemini-chrome-preview/", import.meta.url);
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
          const bounds = ["main", "article", "h1", ".blog-content"].map((selector) => {
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
    for (const sentence of ["They match exactly: 187 and 43.", "None of the 27 member states of the European Union is on it."]) assert(body.includes(sentence), sentence);
  });
}
