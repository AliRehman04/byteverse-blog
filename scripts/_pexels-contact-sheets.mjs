import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

// Research helper: tile Pexels CDN thumbnails for shortlisted photo IDs into labelled contact sheets for visual review.
const groups = {
  cursor: [12899158, 12902862, 4974912, 7988086, 34804007, 5483077, 4458420, 4560087, 12812686, 1181279, 3987066, 5473309],
  claude: [37657434, 37878823, 37755432, 5473892, 1933900, 943096, 34803969, 6424589, 5077052, 5483071, 8037008, 34803985],
  png: [7971616, 7971542, 16313515, 16313513, 16313510, 7014922, 30591529, 19847907, 7315755, 34168280, 7675078, 21342777],
  excel: [8297058, 34639577, 8653648, 8296983, 7735769, 6694560, 7947999, 8296981, 6779570, 8296992, 7693224, 6120209],
  gemini: [8284724, 8284722, 8284726, 3850252, 7439124, 1181352, 12899199, 12662817, 1251828, 6961857, 40185, 67112],
  gpu: [34552801, 34552796, 33693626, 17576302, 8622912, 35569903, 6704937, 6704945, 18338417, 38388050, 15109454, 4573596],
};
const dir = "docs/content-research/photo-review-pexels";
await mkdir(dir, { recursive: true });
const headers = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36", accept: "image/*" };
for (const [group, ids] of Object.entries(groups)) {
  const tiles = [];
  for (const [n, id] of ids.entries()) {
    try {
      const response = await fetch(`https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=480`, { headers, signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      const meta = await sharp(buffer).metadata();
      const image = await sharp(buffer).resize(400, 260, { fit: "cover" }).png().toBuffer();
      const label = Buffer.from(`<svg width="400" height="40"><rect width="400" height="40" fill="#111"/><text x="8" y="26" font-family="Arial" font-size="20" fill="#fff">${n + 1}. ${id} (${meta.width}x${meta.height} thumb)</text></svg>`);
      tiles.push(await sharp({ create: { width: 400, height: 300, channels: 3, background: "#111" } }).composite([{ input: image, top: 0, left: 0 }, { input: label, top: 260, left: 0 }]).png().toBuffer());
    } catch (error) { console.log(`${group}: ${id} failed: ${error.message}`); }
  }
  const cols = 4, rows = Math.ceil(tiles.length / cols);
  await sharp({ create: { width: cols * 410, height: rows * 310, channels: 3, background: "#222" } })
    .composite(tiles.map((input, i) => ({ input, left: (i % cols) * 410, top: Math.floor(i / cols) * 310 }))).png().toFile(join(dir, `${group}.png`));
  console.log(`${group}: ${tiles.length} tiles`);
}
await writeFile(join(dir, "groups.json"), JSON.stringify(groups, null, 1));
