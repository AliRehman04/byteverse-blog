import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Original ByteVerse illustrations for the "Copilot not showing in Outlook" guide. Run once; files are committed.
const directory = fileURLToPath(new URL("../public/blog/copilot-outlook/", import.meta.url));
const xml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const sans = "Segoe UI, Arial, sans-serif";
const t = (x, y, value, { size = 20, fill = "#0f172a", weight = 400, anchor = "middle" } = {}) =>
  `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="${sans}" text-anchor="${anchor}">${xml(value)}</text>`;
const list = (x, top, items, colour) => items.map((item, index) => {
  const y = top + index * 37;
  return `<circle cx="${x}" cy="${y - 7}" r="5" fill="${colour}"/>` + t(x + 18, y, item, { size: 23, fill: "#1e293b", anchor: "start" });
}).join("");

// Large type on purpose: the article column shows this image at about half size, and smaller on phones.
const diagram = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
<rect width="1200" height="675" fill="#f8fafc"/>
${t(600, 54, "The one-minute web test", { size: 36, weight: 700 })}
<rect x="270" y="80" width="660" height="66" rx="14" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>
${t(600, 122, "Open Outlook on the web with the same account", { size: 25, weight: 600 })}
<path d="M600 146 V176" stroke="#475569" stroke-width="3"/><path d="M592 168 L600 180 L608 168" fill="none" stroke="#475569" stroke-width="3"/>
<rect x="455" y="182" width="290" height="56" rx="28" fill="#ffffff" stroke="#475569" stroke-width="2"/>
${t(600, 219, "Is Copilot there?", { size: 26, weight: 700 })}
<path d="M455 210 H300 V258" fill="none" stroke="#16a34a" stroke-width="3"/><path d="M292 250 L300 262 L308 250" fill="none" stroke="#16a34a" stroke-width="3"/>
<path d="M745 210 H900 V258" fill="none" stroke="#d97706" stroke-width="3"/><path d="M892 250 L900 262 L908 250" fill="none" stroke="#d97706" stroke-width="3"/>
${t(378, 200, "Yes", { size: 24, weight: 700, fill: "#166534" })}
${t(822, 200, "No", { size: 24, weight: 700, fill: "#b45309" })}
<rect x="45" y="266" width="510" height="338" rx="16" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/>
${t(300, 308, "Your account works", { size: 27, weight: 700, fill: "#166534" })}
${t(300, 342, "Fix the Outlook app on this computer", { size: 22, fill: "#334155" })}
${list(88, 390, ["Look next to the ribbon (classic)", "Update Outlook, check the build", "Show Apps in Outlook", "Pin Copilot from More apps", "New Outlook profile", "Mac: leave legacy Outlook"], "#16a34a")}
<rect x="645" y="266" width="510" height="338" rx="16" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
${t(900, 308, "The app is not the cause", { size: 27, weight: 700, fill: "#b45309" })}
${t(900, 342, "Check the account and the tenant", { size: 22, fill: "#334155" })}
${list(688, 390, ["License label at Microsoft365.com", "Mailbox in Exchange Online", "Copilot app blocked or unpinned", "Personal: owner, Classic plan, age", "Turn on Copilot switch (personal)"], "#d97706")}
${t(600, 646, "Based on Microsoft Support and Microsoft Learn pages checked on 25 November 2026", { size: 20, fill: "#475569" })}
</svg>`;

const chip = (x, width, label) => `<rect x="${x}" y="572" width="${width}" height="38" rx="19" fill="#ffffff" fill-opacity="0.08" stroke="#64748b"/>`
  + t(x + width / 2, 597, label, { size: 17, weight: 700, fill: "#e2e8f0" });
const chips = [["Ribbon", 100], ["License", 104], ["Mailbox", 108], ["Settings", 112], ["Admin", 92]];
const chipStart = (1200 - chips.reduce((sum, [, width]) => sum + width, 0) - 14 * (chips.length - 1)) / 2;
const tab = (x, label) => t(x, 196, label, { size: 17, fill: "#94a3b8", anchor: "start" });
const cover = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1220"/><stop offset="1" stop-color="#0c2a4a"/></linearGradient></defs>
<rect width="1200" height="675" fill="url(#bg)"/>
<rect x="150" y="96" width="900" height="270" rx="16" fill="#0f172a" stroke="#334155" stroke-width="2"/>
<rect x="150" y="96" width="900" height="56" rx="16" fill="#1e293b"/><rect x="150" y="136" width="900" height="16" fill="#1e293b"/>
<circle cx="182" cy="124" r="7" fill="#ef4444"/><circle cx="206" cy="124" r="7" fill="#f59e0b"/><circle cx="230" cy="124" r="7" fill="#22c55e"/>
${t(600, 130, "Inbox - Mail", { size: 18, fill: "#cbd5e1" })}
${tab(262, "File")}${tab(312, "Home")}${tab(375, "Send / Receive")}${tab(505, "View")}${tab(560, "Help")}
<rect x="150" y="210" width="900" height="2" fill="#334155"/>
<rect x="836" y="168" width="188" height="38" rx="19" fill="none" stroke="#f87171" stroke-width="2" stroke-dasharray="8 6"/>
${t(930, 193, "Copilot ?", { size: 18, weight: 700, fill: "#fca5a5" })}
<rect x="166" y="228" width="44" height="40" rx="8" fill="#1e293b"/><rect x="166" y="278" width="44" height="40" rx="8" fill="#1e293b"/>
<rect x="166" y="328" width="44" height="28" rx="8" fill="none" stroke="#f87171" stroke-width="2" stroke-dasharray="6 5"/>
<rect x="232" y="232" width="380" height="18" rx="9" fill="#1e293b"/><rect x="232" y="266" width="320" height="18" rx="9" fill="#1e293b"/><rect x="232" y="300" width="350" height="18" rx="9" fill="#1e293b"/>
${t(820, 300, "The button is gone, or it stays grey", { size: 20, fill: "#94a3b8" })}
${t(600, 456, "Copilot not showing in Outlook?", { size: 58, weight: 800, fill: "#f8fafc" })}
${t(600, 510, "Classic, new, web and Mac: find the real cause", { size: 25, fill: "#cbd5e1" })}
${chips.map(([label, width], index) => chip(chipStart + chips.slice(0, index).reduce((sum, [, previous]) => sum + previous + 14, 0), width, label)).join("")}
</svg>`;

await mkdir(directory, { recursive: true });
for (const [name, svg] of [["copilot-outlook-web-test.png", diagram], ["copilot-not-showing-in-outlook-cover.png", cover]]) {
  const buffer = await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toBuffer();
  const info = await sharp(buffer).metadata();
  assert.deepEqual([info.width, info.height, info.format], [1200, 675, "png"]);
  await writeFile(new URL(`file:///${directory.replaceAll("\\", "/")}${name}`), buffer);
  console.log(name, `${Math.round(buffer.length / 1024)} KB`);
}
