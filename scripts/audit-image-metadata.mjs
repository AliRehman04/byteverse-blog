import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());

const sql = neon(process.env.DATABASE_URL);
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.byteverse.fyi";
const REQUIRED_IMAGE_FIELDS = ["creator", "acquireLicensePage", "creditText", "copyrightNotice"];
const FETCH_TIMEOUT_MS = 12000;
const CONCURRENCY = 6;

function findJsonLdBlocks(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => match[1]);
}

function collectImageObjects(node, results = []) {
  if (!node || typeof node !== "object") return results;

  if (Array.isArray(node)) {
    for (const item of node) collectImageObjects(item, results);
    return results;
  }

  if (node["@type"] === "ImageObject") {
    results.push(node);
  }

  for (const value of Object.values(node)) {
    collectImageObjects(value, results);
  }

  return results;
}

function auditJsonLd(html) {
  const issues = [];

  for (const block of findJsonLdBlocks(html)) {
    try {
      const parsed = JSON.parse(block);
      const imageObjects = collectImageObjects(parsed);
      for (const image of imageObjects) {
        for (const field of REQUIRED_IMAGE_FIELDS) {
          if (!image[field]) {
            issues.push({ type: "jsonld", field, target: image.url || image.contentUrl || image.caption || "unknown" });
          }
        }
      }
    } catch {
      issues.push({ type: "jsonld", field: "parseError", target: "ld+json" });
    }
  }

  return issues;
}

function auditMicrodata(html) {
  const issues = [];
  const figures = [...html.matchAll(/<figure[^>]*itemtype="https:\/\/schema\.org\/ImageObject"[\s\S]*?<\/figure>/g)].map((match) => match[0]);

  for (const figure of figures) {
    const target = figure.match(/itemprop="contentUrl"[^>]*src="([^"]+)"/)?.[1]
      || figure.match(/<img[^>]*src="([^"]+)"/)?.[1]
      || "unknown";

    for (const field of REQUIRED_IMAGE_FIELDS) {
      if (!figure.includes(`itemProp="${field}"`) && !figure.includes(`itemprop="${field}"`)) {
        issues.push({ type: "microdata", field, target });
      }
    }

    if (figure.includes('href="/terms"')) {
      issues.push({ type: "microdata", field: "relativeTermsUrl", target });
    }
  }

  return issues;
}

async function fetchPage(pathname) {
  const url = `${siteUrl}${pathname}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "ByteVerse image metadata audit",
      },
    });

    return {
      url,
      status: response.status,
      html: await response.text(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

async function getAuditPaths() {
  const corePaths = [
    "/",
    "/about",
    "/author/ali-rehman",
    "/privacy",
    "/terms",
    "/tools",
    "/tools/ai-cv-builder",
    "/blog",
    "/site-map",
  ];
  const posts = await sql`SELECT slug FROM posts WHERE published = true ORDER BY id`;
  const postPaths = posts.map((post) => `/blog/${post.slug}`);
  return [...corePaths, ...postPaths];
}

async function main() {
  const paths = await getAuditPaths();
  const pageIssues = [];
  let okPages = 0;

  const auditResults = await mapWithConcurrency(paths, CONCURRENCY, async (pathname) => {
    try {
      const page = await fetchPage(pathname);
      if (page.status !== 200) {
        return { url: page.url, issues: [{ type: "http", field: "status", target: String(page.status) }] };
      }

      return { url: page.url, issues: [...auditJsonLd(page.html), ...auditMicrodata(page.html)] };
    } catch (error) {
      return {
        url: `${siteUrl}${pathname}`,
        issues: [{ type: "http", field: error.name === "AbortError" ? "timeout" : "fetchError", target: error.message || String(error) }],
      };
    }
  });

  for (const result of auditResults) {
    if (result.issues.length === 0) okPages += 1;
    else pageIssues.push(result);
  }

  const summary = pageIssues.reduce((acc, page) => {
    for (const issue of page.issues) {
      const key = `${issue.type}:${issue.field}`;
      acc[key] = (acc[key] || 0) + 1;
    }
    return acc;
  }, {});

  console.log(JSON.stringify({
    siteUrl,
    auditedPages: paths.length,
    okPages,
    failingPages: pageIssues.length,
    summary,
    pageIssues,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});