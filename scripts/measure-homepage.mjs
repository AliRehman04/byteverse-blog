import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';

const [urlText, label = 'audit'] = process.argv.slice(2);
const url = new URL(urlText);
assert((url.origin === 'https://www.byteverse.fyi' || /^http:\/\/127\.0\.0\.1:3060$/.test(url.origin)) && url.pathname === '/');
assert(/^[a-z-]{1,50}$/.test(label));
const chromePath = [join(process.env['ProgramFiles(x86)'] ?? '', 'Microsoft/Edge/Application/msedge.exe'),
  join(process.env.ProgramFiles ?? '', 'Microsoft/Edge/Application/msedge.exe')].find(existsSync);
assert(chromePath, 'Installed Edge not found');
const chrome = await launch({ chromePath, chromeFlags: ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check'] });
try {
  const result = await lighthouse(url.href, { port: chrome.port, logLevel: 'error', output: 'json',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'], formFactor: 'mobile' });
  assert(result?.lhr, 'No Lighthouse report');
  const { lhr } = result;
  const directory = await mkdtemp(join(tmpdir(), `byteverse-home-${label}-`));
  await writeFile(join(directory, 'lighthouse.json'), JSON.stringify(lhr));
  const metrics = Object.fromEntries(['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index'].map(id => [id, { value: lhr.audits[id]?.numericValue, display: lhr.audits[id]?.displayValue }]));
  const failed = Object.values(lhr.audits).filter(audit => audit.score !== null && audit.score < 0.9 && audit.scoreDisplayMode !== 'informative')
    .map(audit => ({ id: audit.id, title: audit.title, score: audit.score, display: audit.displayValue,
      savingsMs: audit.details?.overallSavingsMs, nodes: Array.isArray(audit.details?.items)
        ? audit.details.items.slice(0, 5).map(item => item.node?.snippet ?? item.url ?? item.reason) : [] }));
  console.log(JSON.stringify({ label, url: lhr.finalDisplayedUrl, checkedAt: lhr.fetchTime,
    lighthouse: lhr.lighthouseVersion, runtimeError: lhr.runtimeError ?? null, warnings: lhr.runWarnings,
    scores: Object.fromEntries(Object.entries(lhr.categories).map(([name, data]) => [name, data.score])),
    metrics, failed, report: join(directory, 'lighthouse.json'),
    limits: 'Single mobile lab run in local Edge; not CrUX field data, real-user INP, ranking prediction or directly comparable across different hosts/content.' }, null, 2));
} finally { await chrome.kill(); }