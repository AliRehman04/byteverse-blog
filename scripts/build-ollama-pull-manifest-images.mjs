import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Original ByteVerse illustrations for the "pull model manifest" guide. Run once; files are committed.
const directory = fileURLToPath(new URL("../public/blog/ollama-pull-manifest/", import.meta.url));
const xml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const sans = "Segoe UI, Arial, sans-serif";
const mono = "Consolas, Courier New, monospace";
const t = (x, y, value, { size = 20, fill = "#0f172a", weight = 400, family = sans, anchor = "middle" } = {}) =>
  `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="${family}" text-anchor="${anchor}" xml:space="preserve">${xml(value)}</text>`;
const head = `<defs><marker id="head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#475569"/></marker></defs>`;
const arrow = (path) => `<path d="${path}" stroke="#475569" stroke-width="3" fill="none" marker-end="url(#head)"/>`;
const title = { size: 27, weight: 700 };
const detail = { size: 22, fill: "#334155" };
const code = { size: 21, family: mono, weight: 700, fill: "#b91c1c" };
const step = (x, fill, stroke, name, lines) =>
  `<rect x="${x}" y="84" width="340" height="140" rx="14" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`
  + t(x + 170, 128, name, title) + lines.map(([value, options], index) => t(x + 170, 168 + index * 32, value, options ?? detail)).join("");
const answer = (x, fill, stroke, name, lines) =>
  `<rect x="${x}" y="312" width="255" height="170" rx="14" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`
  + t(x + 127.5, 356, name, title) + lines.map(([value, options], index) => t(x + 127.5, 402 + index * 32, value, options ?? detail)).join("");

// Large type on purpose: the article column shows this image at about half size, and at under a third on phones.
const flow = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">${head}
<rect width="1200" height="675" fill="#f8fafc"/>
${t(600, 54, "Where a pull model manifest error comes from", { size: 36, weight: 700 })}
${step(60, "#e0f2fe", "#0284c7", "1. You type", [["ollama pull llama3.2", { size: 22, family: mono, weight: 700 }]])}
${arrow("M400 154 L428 154")}
${step(430, "#e0f2fe", "#0284c7", "2. Server asks registry", [["for library/llama3.2,"], ["tag latest"]])}
${arrow("M770 154 L798 154")}
${step(800, "#e0f2fe", "#0284c7", "3. Token check", [["server signs with"], ["its key file"]])}
${arrow("M970 224 L970 262")}
${t(600, 290, "4. What comes back decides the text after the colon", { size: 25, weight: 700 })}
${answer(60, "#dcfce7", "#16a34a", "Manifest", [["download starts"]])}
${answer(335, "#fef3c7", "#d97706", "Not found, 404", [["file does not", code], ["exist", code]])}
${answer(610, "#fef3c7", "#d97706", "Too old, 412", [["requires a newer", code], ["version of Ollama", code]])}
${answer(885, "#fee2e2", "#dc2626", "No reply", [["no such host,", code], ["i/o timeout, x509", code]])}
<rect x="60" y="506" width="1080" height="84" rx="14" fill="#ffffff" stroke="#94a3b8" stroke-width="2"/>
${t(90, 557, "Key file empty or damaged at step 3:", { size: 24, anchor: "start", fill: "#334155" })}
${t(540, 557, "ssh: no key found", { size: 24, family: mono, weight: 700, fill: "#b91c1c", anchor: "start" })}
${t(600, 640, "Based on the Ollama 0.40.17 source code and registry answers on 22 November 2026", { size: 21, fill: "#475569" })}
</svg>`;

const line = (y, value, fill = "#e2e8f0", weight = 400) => t(250, y, value, { size: 22, family: mono, fill, anchor: "start", weight });
const chips = [["file does not exist", 220], ["412", 76], ["ssh: no key found", 208], ["no such host", 160]];
const chipStart = (1200 - chips.reduce((sum, [, width]) => sum + width, 0) - 14 * (chips.length - 1)) / 2;
const cover = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1220"/><stop offset="1" stop-color="#1e1b4b"/></linearGradient></defs>
<rect width="1200" height="675" fill="url(#bg)"/>
<rect x="220" y="104" width="760" height="262" rx="16" fill="#020617" stroke="#334155" stroke-width="2"/>
<rect x="220" y="104" width="760" height="44" rx="16" fill="#1e293b"/><rect x="220" y="132" width="760" height="16" fill="#1e293b"/>
<circle cx="250" cy="126" r="7" fill="#ef4444"/><circle cx="274" cy="126" r="7" fill="#f59e0b"/><circle cx="298" cy="126" r="7" fill="#22c55e"/>
${t(600, 132, "Terminal", { size: 16, fill: "#94a3b8" })}
${line(196, "> ollama pull llama3.3x")}
${line(236, "pulling manifest", "#94a3b8")}
${line(280, "Error: pull model manifest:", "#fca5a5", 700)}
${line(312, "file does not exist", "#fca5a5", 700)}
${line(350, "> _", "#64748b")}
${t(600, 456, "pull model manifest error", { size: 58, weight: 800, fill: "#f8fafc" })}
${t(600, 508, "What each message after the colon means", { size: 25, fill: "#cbd5e1" })}
${chips.map(([name, width], index) => {
    const x = chipStart + chips.slice(0, index).reduce((sum, [, previous]) => sum + previous + 14, 0);
    return `<rect x="${x}" y="562" width="${width}" height="38" rx="19" fill="#ffffff" fill-opacity="0.08" stroke="#64748b"/>` + t(x + width / 2, 587, name, { size: 17, weight: 700, fill: "#e2e8f0" });
  }).join("")}
</svg>`;

await mkdir(directory, { recursive: true });
for (const [name, svg] of [["ollama-pull-manifest-flow.png", flow], ["ollama-pull-manifest-cover.png", cover]]) {
  const buffer = await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toBuffer();
  const info = await sharp(buffer).metadata();
  assert.deepEqual([info.width, info.height, info.format], [1200, 675, "png"]);
  await writeFile(new URL(`file:///${directory.replaceAll("\\", "/")}${name}`), buffer);
  console.log(name, `${Math.round(buffer.length / 1024)} KB`);
}
