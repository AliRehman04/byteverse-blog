import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Original ByteVerse illustrations for the "could not connect to ollama" guide. Run once; files are committed.
const directory = fileURLToPath(new URL("../public/blog/ollama-could-not-connect/", import.meta.url));
const xml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const sans = "Segoe UI, Arial, sans-serif";
const mono = "Consolas, Courier New, monospace";
const t = (x, y, value, { size = 20, fill = "#0f172a", weight = 400, family = sans, anchor = "middle" } = {}) =>
  `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="${family}" text-anchor="${anchor}">${xml(value)}</text>`;
const box = (x, y, width, height, fill, stroke, lines) => {
  const start = y + height / 2 - (lines.length - 1) * 16 + 9;
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="14" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`
    + lines.map(([value, options], index) => t(x + width / 2, start + index * 34, value, options)).join("");
};
const arrow = (x1, y1, x2, y2, color = "#475569") =>
  `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${color}" stroke-width="3" fill="none" marker-end="url(#head)"/>`;
const head = `<defs><marker id="head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#475569"/></marker></defs>`;

const title = { size: 28, weight: 700 };
const detail = { size: 23, fill: "#334155" };
const message = { size: 20, family: mono, fill: "#b91c1c", weight: 700 };
const osBox = (x, name, lines, messages) => {
  const cx = x + 170;
  const first = messages.length === 3 ? 148 : 160;
  return `<rect x="${x}" y="364" width="340" height="230" rx="14" fill="#ffffff" stroke="#94a3b8" stroke-width="2"/>`
    + t(cx, 404, name, title)
    + lines.map((value, index) => t(cx, 440 + index * 30, value, detail)).join("")
    + messages.map((value, index) => t(cx, 364 + first + index * 28, value, message)).join("");
};

// Large type on purpose: the article column shows this image at about half size, and at under a third on phones.
const flow = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">${head}
<rect width="1200" height="675" fill="#f8fafc"/>
${t(600, 54, "What ollama checks before a connection error", { size: 36, weight: 700 })}
${box(60, 84, 480, 100, "#e0f2fe", "#0284c7", [["1. ollama run, pull, list", title], ["asks port 11434 for a reply", detail]])}
${arrow(540, 134, 658, 134)}
${box(660, 84, 480, 100, "#dcfce7", "#16a34a", [["Reply received", title], ["the command continues", detail]])}
${arrow(300, 184, 300, 222)}
${box(60, 224, 1080, 100, "#fef3c7", "#d97706", [["2. Connection refused", title], ["the command tries to start the Ollama app", detail]])}
${arrow(230, 324, 230, 362)}
${arrow(600, 324, 600, 362)}
${arrow(970, 324, 970, 362)}
${osBox(60, "Windows", ["starts the app, then", "waits up to 5 seconds"], ["timed out waiting", "for server to start"])}
${osBox(430, "macOS", ["opens Ollama.app, then", "waits up to 5 seconds"], ["timed out waiting", "for server to start"])}
${osBox(800, "Linux", ["has no app to start"], ["could not connect to", "ollama server, run", "'ollama serve' to start it"])}
${t(600, 630, "Based on the Ollama 0.40.16 source code. Version 0.7.0 and older printed one line for every case:", { size: 21, fill: "#334155" })}
${t(600, 660, "could not connect to ollama app, is it running?", { size: 22, family: mono, fill: "#b91c1c", weight: 700 })}
</svg>`;

const chip = (x, width, label) => `<rect x="${x}" y="596" width="${width}" height="38" rx="19" fill="#ffffff" fill-opacity="0.08" stroke="#64748b"/>`
  + t(x + width / 2, 621, label, { size: 17, weight: 700, fill: "#e2e8f0" });
const cover = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1220"/><stop offset="1" stop-color="#1e1b4b"/></linearGradient></defs>
<rect width="1200" height="675" fill="url(#bg)"/>
<rect x="220" y="130" width="760" height="270" rx="16" fill="#020617" stroke="#334155" stroke-width="2"/>
<rect x="220" y="130" width="760" height="44" rx="16" fill="#1e293b"/><rect x="220" y="158" width="760" height="16" fill="#1e293b"/>
<circle cx="250" cy="152" r="7" fill="#ef4444"/><circle cx="274" cy="152" r="7" fill="#f59e0b"/><circle cx="298" cy="152" r="7" fill="#22c55e"/>
${t(600, 158, "Terminal", { size: 16, fill: "#94a3b8" })}
${t(250, 222, "> ollama run llama3.2", { size: 22, family: mono, fill: "#e2e8f0", anchor: "start" })}
${t(250, 270, "Error: could not connect to ollama app,", { size: 22, family: mono, fill: "#fca5a5", anchor: "start", weight: 700 })}
${t(250, 302, "is it running?", { size: 22, family: mono, fill: "#fca5a5", anchor: "start", weight: 700 })}
${t(250, 356, "> _", { size: 22, family: mono, fill: "#64748b", anchor: "start" })}
${t(600, 478, "Could not connect to Ollama", { size: 56, weight: 800, fill: "#f8fafc" })}
${t(600, 530, "What each message means, and the fix for your system", { size: 25, fill: "#cbd5e1" })}
${chip(331, 130, "Windows")}${chip(473, 104, "Linux")}${chip(589, 116, "macOS")}${chip(717, 152, "Docker, WSL")}
</svg>`;

await mkdir(directory, { recursive: true });
for (const [name, svg] of [["ollama-cli-connection-check-flow.png", flow], ["ollama-could-not-connect-cover.png", cover]]) {
  const buffer = await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toBuffer();
  const info = await sharp(buffer).metadata();
  assert.deepEqual([info.width, info.height, info.format], [1200, 675, "png"]);
  await writeFile(new URL(`file:///${directory.replaceAll("\\", "/")}${name}`), buffer);
  console.log(name, `${Math.round(buffer.length / 1024)} KB`);
}
