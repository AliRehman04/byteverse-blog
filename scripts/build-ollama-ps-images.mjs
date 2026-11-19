import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Original ByteVerse illustrations for the "ollama ps explained" guide. Run once; files are committed.
const directory = fileURLToPath(new URL("../public/blog/ollama-ps/", import.meta.url));
const xml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const sans = "Segoe UI, Arial, sans-serif";
const mono = "Consolas, Courier New, monospace";
const t = (x, y, value, { size = 20, fill = "#0f172a", weight = 400, family = sans, anchor = "middle" } = {}) =>
  `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="${family}" text-anchor="${anchor}" xml:space="preserve">${xml(value)}</text>`;
const head = `<defs><marker id="head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#475569"/></marker></defs>`;
const arrow = (path) => `<path d="${path}" stroke="#475569" stroke-width="3" fill="none" marker-end="url(#head)"/>`;
const title = { size: 27, weight: 700 };
const detail = { size: 22, fill: "#334155" };
const step = (x, fill, stroke, name, lines) =>
  `<rect x="${x}" y="92" width="240" height="160" rx="14" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`
  + t(x + 120, 138, name, title) + lines.map((value, index) => t(x + 120, 182 + index * 32, value, detail)).join("");
const label = { size: 22, family: mono, weight: 700, fill: "#0f172a", anchor: "start" };
const meaning = { size: 22, fill: "#334155", anchor: "start" };

// Large type on purpose: the article column shows this image at about half size, and at under a third on phones.
const countdown = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">${head}
<rect width="1200" height="675" fill="#f8fafc"/>
${t(600, 56, "How the UNTIL countdown moves", { size: 36, weight: 700 })}
${step(60, "#e0f2fe", "#0284c7", "1. Request runs", ["timer is stopped,", "model stays loaded"])}
${arrow("M300 172 L338 172")}
${step(340, "#dcfce7", "#16a34a", "2. Request ends", ["countdown restarts", "at the full time"])}
${arrow("M580 172 L618 172")}
${step(620, "#fef3c7", "#d97706", "3. Model is idle", ["UNTIL counts down,", "5 minutes by default"])}
${arrow("M860 172 L898 172")}
${step(900, "#fee2e2", "#dc2626", "4. Time runs out", ["model is unloaded,", "row leaves the table"])}
${arrow("M740 252 L740 300 L180 300 L180 255")}
${t(460, 338, "A new request before the time is up goes back to step 1", { size: 23, fill: "#334155" })}
<rect x="60" y="368" width="530" height="232" rx="14" fill="#ffffff" stroke="#94a3b8" stroke-width="2"/>
${t(325, 412, "What UNTIL shows", title)}
${t(88, 462, "4 minutes from now", label)}${t(352, 462, "new 5 minute timer", meaning)}
${t(88, 512, "Forever", label)}${t(352, 512, "no time limit set", meaning)}
${t(88, 562, "Stopping...", label)}${t(352, 562, "time has passed", meaning)}
<rect x="610" y="368" width="530" height="232" rx="14" fill="#ffffff" stroke="#94a3b8" stroke-width="2"/>
${t(875, 412, "Stopping... has two causes", title)}
${t(875, 462, "1. ollama stop, while a reply is running", detail)}
${t(875, 512, "2. A long reply outlasted the old timer", detail)}
${t(875, 562, "Either way, the reply finishes first.", { size: 22, fill: "#0f172a", weight: 700 })}
${t(600, 645, "Based on the scheduler code in Ollama 0.40.16", { size: 21, fill: "#475569" })}
</svg>`;

const line = (y, value, fill = "#e2e8f0", weight = 400) => t(206, y, value, { size: 19, family: mono, fill, anchor: "start", weight });
const cover = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1220"/><stop offset="1" stop-color="#1e1b4b"/></linearGradient></defs>
<rect width="1200" height="675" fill="url(#bg)"/>
<rect x="176" y="96" width="848" height="270" rx="16" fill="#020617" stroke="#334155" stroke-width="2"/>
<rect x="176" y="96" width="848" height="44" rx="16" fill="#1e293b"/><rect x="176" y="124" width="848" height="16" fill="#1e293b"/>
<circle cx="206" cy="118" r="7" fill="#ef4444"/><circle cx="230" cy="118" r="7" fill="#f59e0b"/><circle cx="254" cy="118" r="7" fill="#22c55e"/>
${t(600, 124, "Terminal", { size: 16, fill: "#94a3b8" })}
${line(188, "> ollama ps")}
${line(236, "NAME             SIZE     PROCESSOR         UNTIL", "#93c5fd", 700)}
${line(272, "gemma4:latest    9.6 GB   100% GPU          4 minutes from now")}
${line(308, "mistral:latest   5.1 GB   38%/62% CPU/GPU   About a minute from now")}
${line(344, "> _", "#64748b")}
${t(600, 462, "ollama ps explained", { size: 60, weight: 800, fill: "#f8fafc" })}
${t(600, 514, "What every column means, and why the list goes empty", { size: 25, fill: "#cbd5e1" })}
${["SIZE", "PROCESSOR", "CONTEXT", "RUNNER", "UNTIL"].map((name, index) => {
    const widths = [92, 150, 128, 116, 100];
    const x = 265 + widths.slice(0, index).reduce((sum, width) => sum + width + 14, 0);
    return `<rect x="${x}" y="566" width="${widths[index]}" height="38" rx="19" fill="#ffffff" fill-opacity="0.08" stroke="#64748b"/>` + t(x + widths[index] / 2, 591, name, { size: 17, weight: 700, fill: "#e2e8f0" });
  }).join("")}
</svg>`;

await mkdir(directory, { recursive: true });
for (const [name, svg] of [["ollama-ps-until-countdown.png", countdown], ["ollama-ps-explained-cover.png", cover]]) {
  const buffer = await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toBuffer();
  const info = await sharp(buffer).metadata();
  assert.deepEqual([info.width, info.height, info.format], [1200, 675, "png"]);
  await writeFile(new URL(`file:///${directory.replaceAll("\\", "/")}${name}`), buffer);
  console.log(name, `${Math.round(buffer.length / 1024)} KB`);
}
