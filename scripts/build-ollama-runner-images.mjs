import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Original ByteVerse illustrations for the "llama runner process has terminated" guide. Run once; files are committed.
const directory = fileURLToPath(new URL("../public/blog/ollama-runner/", import.meta.url));
const xml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const sans = "Segoe UI, Arial, sans-serif";
const mono = "Consolas, Courier New, monospace";
const t = (x, y, value, { size = 20, fill = "#0f172a", weight = 400, anchor = "middle", font = sans } = {}) =>
  `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="${font}" text-anchor="${anchor}">${xml(value)}</text>`;

// One row per part of the message, in the order Ollama prints them.
const rows = [
  { code: ["Error: 500 Internal Server Error:"], name: "HTTP status", note: "Printed by the ollama command; apps get a 500", fill: "#f1f5f9", stroke: "#64748b", ink: "#334155" },
  { code: ["llama-server process has terminated:"], name: "The program that stopped", note: "Version 0.24 and older: llama runner", fill: "#dbeafe", stroke: "#2563eb", ink: "#1e3a8a" },
  { code: ["exit status 0xc0000409:"], name: "How it ended", note: "Exit code, or a signal on Linux and macOS", fill: "#fef3c7", stroke: "#d97706", ink: "#92400e" },
  { code: ["The system detected an overrun of a stack-based", "buffer in this application. This overrun ...:"], name: "Windows' description", note: "0.30 and later, on Windows only", fill: "#ede9fe", stroke: "#7c3aed", ink: "#4c1d95" },
  { code: ["CUDA error: shared object initialization failed"], name: "Captured error text", note: "The cause. Act on this part.", fill: "#dcfce7", stroke: "#16a34a", ink: "#14532d", strong: true },
];
const row = ({ code, name, note, fill, stroke, ink, strong }, index) => {
  const top = 84 + index * 100;
  const lines = code.length === 1
    ? t(64, top + 53, code[0], { size: 22, fill: ink, anchor: "start", font: mono, weight: strong ? 700 : 400 })
    : code.map((line, i) => t(64, top + 38 + i * 30, line, { size: 20, fill: ink, anchor: "start", font: mono })).join("");
  return `<rect x="40" y="${top}" width="640" height="88" rx="12" fill="${fill}" stroke="${stroke}" stroke-width="${strong ? 4 : 2}"/>${lines}`
    + `<path d="M680 ${top + 44} H714" stroke="${stroke}" stroke-width="3"/>`
    + `<circle cx="740" cy="${top + 44}" r="20" fill="${stroke}"/>${t(740, top + 52, index + 1, { size: 22, weight: 700, fill: "#ffffff" })}`
    + t(774, top + 38, name, { size: 25, weight: 700, fill: ink, anchor: "start" })
    + t(774, top + 68, note, { size: 19, fill: "#334155", anchor: "start" });
};

// Large type on purpose: the article column shows this image at about half size, and smaller on phones.
const diagram = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
<rect width="1200" height="675" fill="#f8fafc"/>
${t(600, 54, "Read an Ollama runner error from left to right", { size: 34, weight: 700 })}
${rows.map(row).join("\n")}
${t(600, 612, "On Linux and macOS there is no Windows description, and part 3 can read signal: killed.", { size: 19, fill: "#334155" })}
${t(600, 648, "Format from the Ollama 0.40.19 source code; example from GitHub issue #17627. Checked 28 November 2026.", { size: 17, fill: "#475569" })}
</svg>`;

const chip = (x, width, label) => `<rect x="${x}" y="584" width="${width}" height="38" rx="19" fill="#ffffff" fill-opacity="0.08" stroke="#64748b"/>`
  + t(x + width / 2, 609, label, { size: 17, weight: 700, fill: "#e2e8f0" });
const chips = [["Memory", 104], ["Model file", 124], ["Crash code", 128], ["GPU driver", 126], ["Timeout", 106]];
const chipStart = (1200 - chips.reduce((sum, [, width]) => sum + width, 0) - 14 * (chips.length - 1)) / 2;
const line = (y, value, fill, weight = 400) => t(186, y, value, { size: 22, fill, anchor: "start", font: mono, weight });
const cover = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1220"/><stop offset="1" stop-color="#1a1530"/></linearGradient></defs>
<rect width="1200" height="675" fill="url(#bg)"/>
<rect x="150" y="70" width="900" height="300" rx="16" fill="#0f172a" stroke="#334155" stroke-width="2"/>
<rect x="150" y="70" width="900" height="50" rx="16" fill="#1e293b"/><rect x="150" y="104" width="900" height="16" fill="#1e293b"/>
<circle cx="182" cy="95" r="7" fill="#ef4444"/><circle cx="206" cy="95" r="7" fill="#f59e0b"/><circle cx="230" cy="95" r="7" fill="#22c55e"/>
${t(600, 101, "Terminal", { size: 18, fill: "#cbd5e1" })}
${line(166, "> ollama run <model>", "#94a3b8")}
${line(206, "Error: 500 Internal Server Error: llama-server process", "#fca5a5")}
${line(240, "has terminated: exit status 0xc0000409: The system", "#fca5a5")}
${line(274, "detected an overrun of a stack-based buffer ...:", "#fca5a5")}
<rect x="174" y="292" width="610" height="44" rx="10" fill="#052e16" stroke="#4ade80" stroke-width="2" stroke-dasharray="8 6"/>
${line(321, "CUDA error: shared object initialization failed", "#86efac", 700)}
${t(800, 321, "the part to act on", { size: 19, fill: "#86efac", anchor: "start" })}
${t(600, 462, "llama runner process has terminated?", { size: 52, weight: 800, fill: "#f8fafc" })}
${t(600, 516, "Read the exit status and the line after it, then fix the cause", { size: 25, fill: "#cbd5e1" })}
${chips.map(([label, width], index) => chip(chipStart + chips.slice(0, index).reduce((sum, [, previous]) => sum + previous + 14, 0), width, label)).join("")}
</svg>`;

await mkdir(directory, { recursive: true });
for (const [name, svg] of [["ollama-runner-error-anatomy.png", diagram], ["ollama-llama-runner-process-has-terminated-cover.png", cover]]) {
  const buffer = await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toBuffer();
  const info = await sharp(buffer).metadata();
  assert.deepEqual([info.width, info.height, info.format], [1200, 675, "png"]);
  await writeFile(new URL(`file:///${directory.replaceAll("\\", "/")}${name}`), buffer);
  console.log(name, `${Math.round(buffer.length / 1024)} KB`);
}
