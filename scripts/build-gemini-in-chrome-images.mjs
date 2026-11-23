import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Original ByteVerse illustrations for the "Gemini in Chrome not showing" guide. Run once; files are committed.
const directory = fileURLToPath(new URL("../public/blog/gemini-in-chrome/", import.meta.url));
const xml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const sans = "Segoe UI, Arial, sans-serif";
const t = (x, y, value, { size = 20, fill = "#0f172a", weight = 400, anchor = "middle" } = {}) =>
  `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="${sans}" text-anchor="${anchor}">${xml(value)}</text>`;
const title = { size: 27, weight: 700 };
const detail = { size: 22, fill: "#334155" };
const colours = [["#e0f2fe", "#0284c7"], ["#e0f2fe", "#0284c7"], ["#e0f2fe", "#0284c7"], ["#e0f2fe", "#0284c7"], ["#fef3c7", "#d97706"], ["#fef3c7", "#d97706"], ["#fef3c7", "#d97706"], ["#dcfce7", "#16a34a"]];
const checks = [
  ["1. Device", ["Windows, Mac or", "Chromebook Plus"]],
  ["2. Language", ["Chrome is shown in", "a supported language"]],
  ["3. Window", ["normal window, not", "Incognito or Guest"]],
  ["4. Sign-in", ["signed in to Chrome", "with a Google Account"]],
  ["5. Age", ["18 or older, or 13+", "in 43 countries"]],
  ["6. Country", ["one of 187 countries", "and territories"]],
  ["7. Admin", ["not blocked at", "work or school"]],
  ["8. Button", ["Gemini is pinned", "to the toolbar"]],
];
const card = (index) => {
  const x = 45 + (index % 4) * 282;
  const y = index < 4 ? 92 : 286;
  const [fill, stroke] = colours[index];
  const [name, lines] = checks[index];
  return `<rect x="${x}" y="${y}" width="264" height="168" rx="14" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`
    + t(x + 132, y + 48, name, title) + lines.map((value, line) => t(x + 132, y + 96 + line * 32, value, detail)).join("");
};

// Large type on purpose: the article column shows this image at about half size, and at under a third on phones.
const diagram = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
<rect width="1200" height="675" fill="#f8fafc"/>
${t(600, 56, "What Chrome checks before it shows Ask Gemini", { size: 36, weight: 700 })}
${checks.map((_, index) => card(index)).join("")}
<rect x="45" y="484" width="546" height="104" rx="14" fill="#ffffff" stroke="#16a34a" stroke-width="2"/>
${t(318, 528, "All eight pass", { size: 26, weight: 700, fill: "#166534" })}
${t(318, 564, "the Ask Gemini button appears", detail)}
<rect x="609" y="484" width="546" height="104" rx="14" fill="#ffffff" stroke="#dc2626" stroke-width="2"/>
${t(882, 528, "One fails", { size: 26, weight: 700, fill: "#b91c1c" })}
${t(882, 564, "no button, and no message says why", detail)}
${t(600, 640, "Based on the Chrome 158 source code and Google's help pages, 23 November 2026", { size: 21, fill: "#475569" })}
</svg>`;

const chip = (x, width, label) => `<rect x="${x}" y="566" width="${width}" height="38" rx="19" fill="#ffffff" fill-opacity="0.08" stroke="#64748b"/>`
  + t(x + width / 2, 591, label, { size: 17, weight: 700, fill: "#e2e8f0" });
const chips = [["Country", 110], ["Language", 120], ["Account", 110], ["Admin", 96], ["Update", 100]];
const chipStart = (1200 - chips.reduce((sum, [, width]) => sum + width, 0) - 14 * (chips.length - 1)) / 2;
const cover = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1220"/><stop offset="1" stop-color="#1e1b4b"/></linearGradient></defs>
<rect width="1200" height="675" fill="url(#bg)"/>
<rect x="150" y="110" width="900" height="230" rx="16" fill="#0f172a" stroke="#334155" stroke-width="2"/>
<rect x="150" y="110" width="900" height="64" rx="16" fill="#1e293b"/><rect x="150" y="150" width="900" height="24" fill="#1e293b"/>
<circle cx="182" cy="142" r="7" fill="#ef4444"/><circle cx="206" cy="142" r="7" fill="#f59e0b"/><circle cx="230" cy="142" r="7" fill="#22c55e"/>
<rect x="262" y="124" width="220" height="50" rx="10" fill="#0f172a"/>
${t(372, 156, "New Tab", { size: 18, fill: "#cbd5e1" })}
<rect x="812" y="126" width="206" height="40" rx="20" fill="none" stroke="#f87171" stroke-width="2" stroke-dasharray="8 6"/>
${t(915, 152, "Ask Gemini ?", { size: 18, weight: 700, fill: "#fca5a5" })}
<rect x="182" y="194" width="836" height="44" rx="22" fill="#1e293b"/>
${t(214, 223, "Search Google or type a URL", { size: 18, fill: "#64748b", anchor: "start" })}
${t(600, 296, "The button is missing, and Chrome does not say why", { size: 20, fill: "#94a3b8" })}
${t(600, 446, "Gemini in Chrome not showing?", { size: 58, weight: 800, fill: "#f8fafc" })}
${t(600, 500, "The 8 checks Chrome runs before the button appears", { size: 25, fill: "#cbd5e1" })}
${chips.map(([label, width], index) => chip(chipStart + chips.slice(0, index).reduce((sum, [, previous]) => sum + previous + 14, 0), width, label)).join("")}
</svg>`;

await mkdir(directory, { recursive: true });
for (const [name, svg] of [["gemini-in-chrome-checks.png", diagram], ["gemini-in-chrome-not-showing-cover.png", cover]]) {
  const buffer = await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toBuffer();
  const info = await sharp(buffer).metadata();
  assert.deepEqual([info.width, info.height, info.format], [1200, 675, "png"]);
  await writeFile(new URL(`file:///${directory.replaceAll("\\", "/")}${name}`), buffer);
  console.log(name, `${Math.round(buffer.length / 1024)} KB`);
}
