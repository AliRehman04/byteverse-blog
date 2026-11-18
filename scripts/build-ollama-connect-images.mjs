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
  const start = y + height / 2 - (lines.length - 1) * 13 + 7;
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="14" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`
    + lines.map(([value, options], index) => t(x + width / 2, start + index * 26, value, options)).join("");
};
const arrow = (x1, y1, x2, y2, color = "#475569") =>
  `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${color}" stroke-width="3" fill="none" marker-end="url(#head)"/>`;
const head = `<defs><marker id="head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#475569"/></marker></defs>`;
const bold = { size: 19, weight: 700 };
const small = { size: 17, fill: "#334155" };
const code = { size: 16, family: mono, fill: "#7f1d1d", weight: 700 };

const flow = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">${head}
<rect width="1200" height="675" fill="#f8fafc"/>
${t(600, 48, "What the ollama command does before it shows a connection error", { size: 27, weight: 700 })}
${box(50, 80, 300, 76, "#e0f2fe", "#0284c7", [["1. You run a command", bold], ["ollama run, list, pull, ps", small]])}
${arrow(350, 118, 428, 118)}
${box(430, 80, 340, 76, "#e0f2fe", "#0284c7", [["2. Heartbeat request", bold], ["HEAD http://127.0.0.1:11434/", { size: 16, family: mono, fill: "#0c4a6e" }]])}
${arrow(770, 118, 848, 118)}
${box(850, 80, 300, 76, "#dcfce7", "#16a34a", [["Server answers", bold], ["The command continues", small]])}
${arrow(520, 156, 520, 208)}
${arrow(690, 156, 930, 208)}
${box(300, 210, 440, 76, "#fef3c7", "#d97706", [["Connection refused", bold], ["3. The CLI tries to start the Ollama app", small]])}
${box(790, 210, 360, 76, "#f1f5f9", "#64748b", [["Any other error", bold], ["Printed as it is, nothing is started", small]])}
${arrow(400, 286, 220, 338)}
${arrow(520, 286, 600, 338)}
${arrow(660, 286, 980, 338)}
${box(50, 340, 340, 104, "#ffffff", "#94a3b8", [["Windows", bold], ["Starts ollama app.exe, then", small], ["checks every 0.5 s for 5 s", small]])}
${box(430, 340, 340, 104, "#ffffff", "#94a3b8", [["macOS", bold], ["Opens Ollama.app when the", small], ["command belongs to the app", small]])}
${box(810, 340, 340, 104, "#ffffff", "#94a3b8", [["Linux", bold], ["Cannot start a server", small], ["for you", small]])}
${arrow(220, 444, 220, 488)}
${arrow(600, 444, 600, 488)}
${arrow(980, 444, 980, 488)}
${box(50, 490, 340, 96, "#fee2e2", "#dc2626", [["timed out waiting for", code], ["server to start", code], ["or: could not locate ollama app", { size: 15, family: mono, fill: "#7f1d1d" }]])}
${box(430, 490, 340, 96, "#fee2e2", "#dc2626", [["timed out waiting for", code], ["server to start", code], ["or the ollama serve message", { size: 15, fill: "#7f1d1d" }]])}
${box(810, 490, 340, 96, "#fee2e2", "#dc2626", [["could not connect to ollama", code], ["server, run 'ollama serve'", code], ["to start it", code]])}
${t(600, 626, "Based on the Ollama 0.40.16 source code. Releases up to 0.7.0 printed one line for every case:", { size: 16, fill: "#334155" })}
${t(600, 652, "could not connect to ollama app, is it running?", { size: 17, family: mono, fill: "#7f1d1d", weight: 700 })}
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
