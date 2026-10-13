import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import sharp from 'sharp';
import { makePngFixtures, inspectPixels, dimensions } from './png-background-fixtures.mjs';

const live = process.argv[2] === '--live-tool';
assert(process.argv.length <= 3 && (!process.argv[2] || live), 'Only --live-tool is supported');
const fixtures = await makePngFixtures();
const hash = value => createHash('sha256').update(value).digest('hex');
const originalHash = hash(fixtures.source);
const source = await inspectPixels(fixtures.source);
assert.deepEqual(source.samples.empty, [0, 0, 0, 0]);
assert.deepEqual(source.samples.partial, [37, 99, 235, 128]);
assert.deepEqual(source.samples.blackDetail, [0, 0, 0, 255]);
const directWhite = await inspectPixels(fixtures.whiteJpg), directBlack = await inspectPixels(fixtures.blackJpg);
assert.deepEqual(directWhite.samples.empty, [255, 255, 255, 255]);
assert.deepEqual(directBlack.samples.empty, [0, 0, 0, 255]);
assert.equal((await inspectPixels(fixtures.bakedPng)).samples.empty[3], 255);
const rebaked = await sharp(fixtures.blackJpg).flatten({ background: 'white' }).png().toBuffer();
assert.deepEqual((await inspectPixels(rebaked)).samples.empty, [0, 0, 0, 255]);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const measurements = { source, directWhite, directBlack };
try {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const denied = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    const allowed = live && url.origin === 'https://www.byteverse.fyi' && route.request().method() === 'GET'
      && (url.pathname === '/tools/image-compressor' || url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/image-studio/')
        || url.pathname === '/logo.png' || url.pathname === '/images/tools/image-compressor/hero-moraine-lake.webp'
        || /^\/(?:image-studio-sw\.js|favicon[^/]*|apple-touch-icon\.png|android-chrome-\d+x\d+\.png|image-studio\.webmanifest)$/.test(url.pathname));
    if (allowed) return route.continue();
    denied.push(`${route.request().method()} ${url.origin}${url.pathname}`);
    return route.abort();
  });
  const page = await context.newPage();
  await page.setContent('<!doctype html><html><head><title>ByteVerse synthetic alpha test</title></head><body></body></html>');
  const canvasResult = await page.evaluate(async base64 => {
    const blob = new Blob([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], { type: 'image/png' });
    const image = await createImageBitmap(blob);
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    canvas.style.background = 'white';
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const samples = { alphaBefore: ctx.getImageData(30, 30, 1, 1).data[3] };
    const encode = async () => {
      const jpeg = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!jpeg) throw new Error('JPEG export failed');
      const decoded = await createImageBitmap(jpeg), inspection = document.createElement('canvas');
      inspection.width = decoded.width; inspection.height = decoded.height;
      const target = inspection.getContext('2d'); target.drawImage(decoded, 0, 0);
      const values = { empty: [...target.getImageData(30, 30, 1, 1).data], partial: [...target.getImageData(340, 160, 1, 1).data] };
      decoded.close(); return values;
    };
    samples.cssBackdropOnly = await encode();
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0);
    samples.realWhiteFill = await encode(); image.close(); return samples;
  }, fixtures.source.toString('base64'));
  assert.equal(canvasResult.alphaBefore, 0);
  assert.deepEqual(canvasResult.cssBackdropOnly.empty, [0, 0, 0, 255]);
  assert.deepEqual(canvasResult.realWhiteFill.empty, [255, 255, 255, 255]);
  measurements.canvas = canvasResult;
  if (live) {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('https://www.byteverse.fyi/tools/image-compressor', { waitUntil: 'load' });
    await expect(page.getByRole('checkbox', { name: 'Live size estimate' })).toBeEnabled();
    await page.getByRole('checkbox', { name: 'Live size estimate' }).uncheck();
    const choose = async format => page.getByRole('group', { name: 'Convert to', exact: true }).getByRole('button', { name: new RegExp(`^${format}`) }).click();
    await page.getByRole('button', { name: 'Quality', exact: true }).click();
    await choose('JPG');
    await page.getByRole('group', { name: 'Quick resize sizes' }).getByRole('button', { name: 'No resize', exact: true }).click();
    await page.getByLabel('Choose image files', { exact: true }).setInputFiles({ name: 'byteverse-synthetic-alpha.png', mimeType: 'image/png', buffer: fixtures.source });
    await expect(page.locator('.studio-queue-badges > .studio-badge:first-child')).toHaveText('Ready', { timeout: 60_000 });
    const consent = page.getByRole('checkbox', { name: 'I allow transparent pixels to be flattened for JPG' });
    await expect(page.getByRole('button', { name: 'Compress images', exact: true })).toBeDisabled();
    await consent.check();
    const output = async format => {
      await page.getByRole('button', { name: 'Compress images', exact: true }).click();
      await expect(page.locator('.studio-queue-badges > .studio-badge:first-child')).toHaveText('Complete', { timeout: 130_000 });
      const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download image', exact: true }).click()]);
      const path = await download.path(); assert(path);
      const bytes = await readFile(path), meta = await sharp(bytes).metadata();
      assert.equal(meta.format, format); assert.equal(meta.width, dimensions.width); assert.equal(meta.height, dimensions.height);
      return { bytes: bytes.length, pixels: await inspectPixels(bytes), codec: await page.locator('.studio-result-facts').innerText() };
    };
    measurements.liveWhite = await output('jpeg');
    assert.deepEqual(measurements.liveWhite.pixels.samples.empty, [255, 255, 255, 255]);
    assert(measurements.liveWhite.pixels.samples.blackDetail.slice(0, 3).every(value => value < 8));
    assert.match(measurements.liveWhite.codec, /WASM/);
    await page.locator('.studio-color-field input[type="color"]').fill('#000000');
    measurements.liveBlack = await output('jpeg');
    assert.deepEqual(measurements.liveBlack.pixels.samples.empty, [0, 0, 0, 255]);
    await choose('PNG');
    measurements.livePng = await output('png');
    assert.equal(measurements.livePng.pixels.samples.empty[3], 0);
    assert.equal(measurements.livePng.pixels.samples.partial[3], 128);
    assert.deepEqual(errors, []);
  }
  assert.deepEqual(denied, [], 'Unexpected network request');
  assert.equal(hash(fixtures.source), originalHash, 'Original synthetic file changed');
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), status: 'passed', liveTool: live, browser: await browser.version(),
    originalSha256: originalHash, measurements, noImageUploadRequests: true, originalUnchanged: true,
    limits: 'Synthetic flat-colour fixtures in desktop Edge only; not GIMP, Photoshop, clipboard transfer or physical-phone tests. Sample pixels are not universal JPEG colour guarantees.' }, null, 2));
} finally { await browser.close(); }