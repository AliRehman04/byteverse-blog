"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Download, Copy, Check, QrCode, Palette, RefreshCw } from "lucide-react";

/* ── Tiny QR encoder (client-side, no dependencies) ── */
// We use a canvas-based approach with the browser's built-in capabilities
// For robustness, we generate QR via a well-known algorithm

interface QROptions {
  text: string;
  size: number;
  fgColor: string;
  bgColor: string;
  errorCorrection: "L" | "M" | "Q" | "H";
}

// QR Code generation using qr-code-generator algorithm (Nayuki's approach adapted)
// This is a minimal but complete QR code encoder

const MODE_BYTE = 4;

function getNumRawDataModules(ver: number): number {
  let result = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (ver >= 7) result -= 36;
  }
  return result;
}

function getNumDataCodewords(ver: number, ecl: number): number {
  const ECC_CODEWORDS_PER_BLOCK = [
    [-1,7,10,15,20,26,18,20,24,30,18,20,24,26,30,22,24,28,30,28,28,28,28,30,30,26,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
    [-1,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28],
    [-1,13,22,18,26,18,24,18,22,20,24,28,26,24,20,30,24,28,28,26,30,28,30,30,30,30,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
    [-1,17,28,22,16,22,28,26,26,24,28,24,28,22,24,24,30,28,28,26,28,30,24,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
  ];
  const NUM_ERROR_CORRECTION_BLOCKS = [
    [-1,1,1,1,1,1,2,2,2,2,4,4,4,4,4,6,6,6,6,7,8,8,9,9,10,12,12,12,13,14,15,16,17,18,19,19,20,21,22,24,25],
    [-1,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49],
    [-1,1,1,2,2,4,4,6,6,8,8,8,10,12,16,12,17,16,18,21,20,23,23,25,27,29,34,34,35,38,40,43,45,48,51,53,56,59,62,65,68],
    [-1,1,1,2,4,4,4,5,6,8,8,11,11,16,16,18,16,19,21,25,25,25,34,30,32,35,37,40,42,45,48,51,54,57,60,63,66,70,74,77,81],
  ];
  return Math.floor(getNumRawDataModules(ver) / 8) -
    ECC_CODEWORDS_PER_BLOCK[ecl][ver] * NUM_ERROR_CORRECTION_BLOCKS[ecl][ver];
}

function getMinVersion(dataLen: number, ecl: number): number {
  for (let ver = 1; ver <= 40; ver++) {
    const cap = getNumDataCodewords(ver, ecl);
    const headerBits = 4 + (ver <= 9 ? 8 : 16);
    if (dataLen <= Math.floor((cap * 8 - headerBits) / 8)) return ver;
  }
  return 40;
}

// Reed-Solomon helpers
function reedSolomonComputeDivisor(degree: number): Uint8Array {
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = reedSolomonMultiply(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = reedSolomonMultiply(root, 2);
  }
  return result;
}

function reedSolomonComputeRemainder(data: Uint8Array, divisor: Uint8Array): Uint8Array {
  const result = new Uint8Array(divisor.length);
  for (const b of data) {
    const factor = b ^ result[0];
    result.copyWithin(0, 1);
    result[result.length - 1] = 0;
    for (let i = 0; i < result.length; i++)
      result[i] ^= reedSolomonMultiply(divisor[i], factor);
  }
  return result;
}

function reedSolomonMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11D);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function generateQRMatrix(text: string, eclLevel: number): boolean[][] {
  const data = new TextEncoder().encode(text);
  const version = getMinVersion(data.length, eclLevel);
  const size = version * 4 + 17;

  // Build data codewords
  const numDataCodewords = getNumDataCodewords(version, eclLevel);
  const bits: number[] = [];

  function appendBits(val: number, len: number) {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  }

  appendBits(MODE_BYTE, 4);
  appendBits(data.length, version <= 9 ? 8 : 16);
  for (const b of data) appendBits(b, 8);

  const totalBits = numDataCodewords * 8;
  appendBits(0, Math.min(4, totalBits - bits.length));
  if (bits.length % 8 !== 0) appendBits(0, 8 - (bits.length % 8));
  while (bits.length < totalBits) {
    appendBits(0xEC, 8);
    if (bits.length < totalBits) appendBits(0x11, 8);
  }

  const dataCodewords = new Uint8Array(numDataCodewords);
  for (let i = 0; i < numDataCodewords; i++) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i * 8 + j];
    dataCodewords[i] = byte;
  }

  // Error correction
  const ECC_CODEWORDS_PER_BLOCK = [
    [-1,7,10,15,20,26,18,20,24,30,18,20,24,26,30,22,24,28,30,28,28,28,28,30,30,26,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
    [-1,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28],
    [-1,13,22,18,26,18,24,18,22,20,24,28,26,24,20,30,24,28,28,26,30,28,30,30,30,30,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
    [-1,17,28,22,16,22,28,26,26,24,28,24,28,22,24,24,30,28,28,26,28,30,24,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
  ];
  const NUM_ERROR_CORRECTION_BLOCKS = [
    [-1,1,1,1,1,1,2,2,2,2,4,4,4,4,4,6,6,6,6,7,8,8,9,9,10,12,12,12,13,14,15,16,17,18,19,19,20,21,22,24,25],
    [-1,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49],
    [-1,1,1,2,2,4,4,6,6,8,8,8,10,12,16,12,17,16,18,21,20,23,23,25,27,29,34,34,35,38,40,43,45,48,51,53,56,59,62,65,68],
    [-1,1,1,2,4,4,4,5,6,8,8,11,11,16,16,18,16,19,21,25,25,25,34,30,32,35,37,40,42,45,48,51,54,57,60,63,66,70,74,77,81],
  ];

  const eccPerBlock = ECC_CODEWORDS_PER_BLOCK[eclLevel][version];
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[eclLevel][version];
  const totalEcc = eccPerBlock * numBlocks;
  const shortBlockLen = Math.floor(numDataCodewords / numBlocks);
  const numShortBlocks = numBlocks - (numDataCodewords % numBlocks);

  const divisor = reedSolomonComputeDivisor(eccPerBlock);
  const blocks: Uint8Array[] = [];
  const eccBlocks: Uint8Array[] = [];
  let offset = 0;

  for (let i = 0; i < numBlocks; i++) {
    const blockLen = shortBlockLen + (i >= numShortBlocks ? 1 : 0);
    const block = dataCodewords.slice(offset, offset + blockLen);
    offset += blockLen;
    blocks.push(block);
    eccBlocks.push(reedSolomonComputeRemainder(block, divisor));
  }

  // Interleave
  const allCodewords: number[] = [];
  for (let i = 0; i <= shortBlockLen; i++) {
    for (let j = 0; j < numBlocks; j++) {
      if (i === shortBlockLen && j < numShortBlocks) continue;
      allCodewords.push(blocks[j][i]);
    }
  }
  for (let i = 0; i < eccPerBlock; i++) {
    for (let j = 0; j < numBlocks; j++) {
      allCodewords.push(eccBlocks[j][i]);
    }
  }

  // Create matrix
  const modules: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  function setModule(x: number, y: number, val: boolean) {
    modules[y][x] = val;
    isFunction[y][x] = true;
  }

  // Finder patterns
  function drawFinderPattern(cx: number, cy: number) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || x >= size || y < 0 || y >= size) continue;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        setModule(x, y, dist !== 2 && dist !== 4);
      }
    }
  }
  drawFinderPattern(3, 3);
  drawFinderPattern(size - 4, 3);
  drawFinderPattern(3, size - 4);

  // Alignment patterns
  if (version >= 2) {
    const positions: number[] = [];
    const numAlign = Math.floor(version / 7) + 2;
    const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
    positions.push(6);
    for (let pos = size - 7; positions.length < numAlign; pos -= step)
      positions.splice(1, 0, pos);
    for (const cy of positions) {
      for (const cx of positions) {
        if ((cx === 6 && cy === 6) || (cx === 6 && cy === size - 7) || (cx === size - 7 && cy === 6)) continue;
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++)
            setModule(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setModule(i, 6, i % 2 === 0);
    setModule(6, i, i % 2 === 0);
  }

  // Dark module
  setModule(8, size - 8, true);

  // Reserve format & version areas
  for (let i = 0; i < 9; i++) {
    if (!isFunction[8][i]) { isFunction[8][i] = true; }
    if (!isFunction[i][8]) { isFunction[i][8] = true; }
  }
  for (let i = 0; i < 8; i++) {
    if (!isFunction[8][size - 1 - i]) { isFunction[8][size - 1 - i] = true; }
    if (!isFunction[size - 1 - i][8]) { isFunction[size - 1 - i][8] = true; }
  }

  if (version >= 7) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        isFunction[i][size - 11 + j] = true;
        isFunction[size - 11 + j][i] = true;
      }
    }
  }

  // Place data bits
  const allBits: number[] = [];
  for (const cw of allCodewords)
    for (let i = 7; i >= 0; i--) allBits.push((cw >> i) & 1);

  let bitIdx = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFunction[y][x] && bitIdx < allBits.length) {
          modules[y][x] = allBits[bitIdx] === 1;
          bitIdx++;
        }
      }
    }
  }

  // Apply mask (mask 0 for simplicity, then choose best)
  function applyMask(mask: number) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (isFunction[y][x]) continue;
        let invert = false;
        switch (mask) {
          case 0: invert = (x + y) % 2 === 0; break;
          case 1: invert = y % 2 === 0; break;
          case 2: invert = x % 3 === 0; break;
          case 3: invert = (x + y) % 3 === 0; break;
          case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: invert = (x * y) % 2 + (x * y) % 3 === 0; break;
          case 6: invert = ((x * y) % 2 + (x * y) % 3) % 2 === 0; break;
          case 7: invert = ((x + y) % 2 + (x * y) % 3) % 2 === 0; break;
        }
        if (invert) modules[y][x] = !modules[y][x];
      }
    }
  }

  // Draw format bits
  function drawFormatBits(mask: number) {
    const FORMAT_BITS = [
      [0x77C4,0x72F3,0x7DAA,0x789D,0x662F,0x6318,0x6C41,0x6976],
      [0x5412,0x5125,0x5E7C,0x5B4B,0x45F9,0x40CE,0x4F97,0x4AA0],
      [0x355F,0x3068,0x3F31,0x3A06,0x24B4,0x2183,0x2EDA,0x2BED],
      [0x1689,0x13BE,0x1CE7,0x19D0,0x0762,0x0255,0x0D0C,0x083B],
    ];
    const bits = FORMAT_BITS[eclLevel][mask];
    for (let i = 0; i <= 5; i++) modules[8][i] = ((bits >> (14 - i)) & 1) === 1;
    modules[8][7] = ((bits >> 8) & 1) === 1;
    modules[8][8] = ((bits >> 7) & 1) === 1;
    modules[7][8] = ((bits >> 6) & 1) === 1;
    for (let i = 0; i <= 5; i++) modules[5 - i][8] = ((bits >> (i)) & 1) === 1;

    for (let i = 0; i <= 7; i++) modules[size - 1 - i][8] = ((bits >> (14 - i)) & 1) === 1;
    for (let i = 0; i <= 7; i++) modules[8][size - 8 + i] = ((bits >> (7 - i)) & 1) === 1;
  }

  // Version info
  if (version >= 7) {
    const VERSION_INFOS = [
      -1,-1,-1,-1,-1,-1,-1,0x07C94,0x085BC,0x09A99,0x0A4D3,0x0BBF6,0x0C762,0x0D847,0x0E60D,0x0F928,
      0x10B78,0x1145D,0x12A17,0x13532,0x149A6,0x15683,0x168C9,0x177EC,0x18EC4,0x191E1,0x1AFAB,0x1B08E,
      0x1CC1A,0x1D33F,0x1ED75,0x1F250,0x209D5,0x216F0,0x228BA,0x2379F,0x24B0B,0x2542E,0x26A64,0x27541,0x28C69,
    ];
    const info = VERSION_INFOS[version];
    for (let i = 0; i < 18; i++) {
      const bit = ((info >> i) & 1) === 1;
      const x = Math.floor(i / 3), y = size - 11 + (i % 3);
      modules[x][y] = bit;
      modules[y][x] = bit;
    }
  }

  // Try all 8 masks, pick the one with lowest penalty
  let bestMask = 0;
  let bestPenalty = Infinity;

  // Save original modules
  const origModules = modules.map(row => [...row]);

  for (let mask = 0; mask < 8; mask++) {
    // Reset
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++)
        modules[y][x] = origModules[y][x];

    applyMask(mask);
    drawFormatBits(mask);

    // Calculate penalty
    let penalty = 0;
    // Rule 1: Adjacent same-color modules in row/col
    for (let y = 0; y < size; y++) {
      let run = 1;
      for (let x = 1; x < size; x++) {
        if (modules[y][x] === modules[y][x - 1]) { run++; }
        else { if (run >= 5) penalty += run - 2; run = 1; }
      }
      if (run >= 5) penalty += run - 2;
    }
    for (let x = 0; x < size; x++) {
      let run = 1;
      for (let y = 1; y < size; y++) {
        if (modules[y][x] === modules[y - 1][x]) { run++; }
        else { if (run >= 5) penalty += run - 2; run = 1; }
      }
      if (run >= 5) penalty += run - 2;
    }
    // Rule 2: 2x2 blocks
    for (let y = 0; y < size - 1; y++)
      for (let x = 0; x < size - 1; x++)
        if (modules[y][x] === modules[y][x+1] && modules[y][x] === modules[y+1][x] && modules[y][x] === modules[y+1][x+1])
          penalty += 3;

    if (penalty < bestPenalty) { bestPenalty = penalty; bestMask = mask; }
  }

  // Apply best mask
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      modules[y][x] = origModules[y][x];

  applyMask(bestMask);
  drawFormatBits(bestMask);

  return modules;
}

/* ── Component ── */

const presets = [
  { label: "URL", placeholder: "https://example.com" },
  { label: "Text", placeholder: "Hello, World!" },
  { label: "Email", placeholder: "mailto:name@example.com" },
  { label: "WiFi", placeholder: "WIFI:T:WPA;S:NetworkName;P:password;;" },
  { label: "Phone", placeholder: "tel:+1234567890" },
];

const colorPresets = [
  { fg: "#000000", bg: "#ffffff", label: "Classic" },
  { fg: "#1e3a5f", bg: "#ffffff", label: "Navy" },
  { fg: "#2563eb", bg: "#ffffff", label: "Blue" },
  { fg: "#7c3aed", bg: "#ffffff", label: "Purple" },
  { fg: "#059669", bg: "#ffffff", label: "Green" },
  { fg: "#dc2626", bg: "#ffffff", label: "Red" },
  { fg: "#000000", bg: "#fef3c7", label: "Warm" },
  { fg: "#ffffff", bg: "#1e293b", label: "Dark" },
];

export function QrCodeGeneratorTool() {
  const [text, setText] = useState("https://www.byteverse.fyi");
  const [size, setSize] = useState(300);
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [errorCorrection, setErrorCorrection] = useState<"L" | "M" | "Q" | "H">("M");
  const [activePreset, setActivePreset] = useState(0);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const eclMap: Record<string, number> = { L: 0, M: 1, Q: 2, H: 3 };

  const drawQR = useCallback(() => {
    if (!text.trim() || !canvasRef.current) return;

    try {
      const matrix = generateQRMatrix(text, eclMap[errorCorrection]);
      const canvas = canvasRef.current;
      const moduleCount = matrix.length;
      const quietZone = 4;
      const totalModules = moduleCount + quietZone * 2;
      const scale = Math.max(1, Math.floor(size / totalModules));
      const actualSize = totalModules * scale;

      canvas.width = actualSize;
      canvas.height = actualSize;
      const ctx = canvas.getContext("2d")!;

      // Background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, actualSize, actualSize);

      // Modules
      ctx.fillStyle = fgColor;
      for (let y = 0; y < moduleCount; y++) {
        for (let x = 0; x < moduleCount; x++) {
          if (matrix[y][x]) {
            ctx.fillRect((x + quietZone) * scale, (y + quietZone) * scale, scale, scale);
          }
        }
      }
    } catch {
      // Input too long or invalid
    }
  }, [text, size, fgColor, bgColor, errorCorrection]);

  useEffect(() => {
    drawQR();
  }, [drawQR]);

  const downloadQR = (format: "png" | "svg") => {
    if (!canvasRef.current || !text.trim()) return;

    if (format === "png") {
      const link = document.createElement("a");
      link.download = "qr-code.png";
      link.href = canvasRef.current.toDataURL("image/png");
      link.click();
    } else {
      // SVG export
      try {
        const matrix = generateQRMatrix(text, eclMap[errorCorrection]);
        const moduleCount = matrix.length;
        const quietZone = 4;
        const scale = 10;
        const svgSize = (moduleCount + quietZone * 2) * scale;

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgSize} ${svgSize}" width="${size}" height="${size}">`;
        svg += `<rect width="${svgSize}" height="${svgSize}" fill="${bgColor}"/>`;
        for (let y = 0; y < moduleCount; y++) {
          for (let x = 0; x < moduleCount; x++) {
            if (matrix[y][x]) {
              svg += `<rect x="${(x + quietZone) * scale}" y="${(y + quietZone) * scale}" width="${scale}" height="${scale}" fill="${fgColor}"/>`;
            }
          }
        }
        svg += `</svg>`;

        const blob = new Blob([svg], { type: "image/svg+xml" });
        const link = document.createElement("a");
        link.download = "qr-code.svg";
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
      } catch {
        // Error generating SVG
      }
    }
  };

  const copyToClipboard = async () => {
    if (!canvasRef.current || !text.trim()) return;
    try {
      const blob = await new Promise<Blob>((resolve) =>
        canvasRef.current!.toBlob((b) => resolve(b!), "image/png")
      );
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not supported
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left: Controls */}
      <div className="space-y-6">
        {/* Content Type */}
        <div>
          <label className="block text-sm font-semibold mb-2">Content Type</label>
          <div className="flex flex-wrap gap-2">
            {presets.map((p, i) => (
              <button
                key={p.label}
                onClick={() => { setActivePreset(i); setText(p.placeholder); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  activePreset === i
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Text Input */}
        <div>
          <label className="block text-sm font-semibold mb-2">Content</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={presets[activePreset].placeholder}
            className="w-full h-28 px-4 py-3 rounded-xl border border-border bg-muted/50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            maxLength={2953}
          />
          <p className="text-xs text-muted-foreground mt-1">{text.length} / 2,953 characters</p>
        </div>

        {/* Error Correction */}
        <div>
          <label className="block text-sm font-semibold mb-2">Error Correction</label>
          <div className="grid grid-cols-4 gap-2">
            {(["L", "M", "Q", "H"] as const).map((level) => (
              <button
                key={level}
                onClick={() => setErrorCorrection(level)}
                className={`py-2 text-xs font-medium rounded-lg border transition-colors ${
                  errorCorrection === level
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {level} — {level === "L" ? "7%" : level === "M" ? "15%" : level === "Q" ? "25%" : "30%"}
              </button>
            ))}
          </div>
        </div>

        {/* Size */}
        <div>
          <label className="block text-sm font-semibold mb-2">Size: {size}px</label>
          <input
            type="range"
            min={150}
            max={1000}
            step={50}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-full accent-primary"
            title="QR code size"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>150px</span>
            <span>1000px</span>
          </div>
        </div>

        {/* Colors */}
        <div>
          <label className="block text-sm font-semibold mb-2">
            <Palette size={14} className="inline mr-1.5" />
            Color Presets
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {colorPresets.map((cp) => (
              <button
                key={cp.label}
                onClick={() => { setFgColor(cp.fg); setBgColor(cp.bg); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  fgColor === cp.fg && bgColor === cp.bg
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full border border-border"
                  style={{ background: `linear-gradient(135deg, ${cp.fg} 50%, ${cp.bg} 50%)` }}
                />
                {cp.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Foreground</label>
              <div className="flex items-center gap-2">
                <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" title="Foreground color" />
                <input
                  type="text"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  title="Foreground color hex"
                  placeholder="#000000"
                  className="flex-1 px-3 py-1.5 text-xs font-mono rounded-lg border border-border bg-muted/50 uppercase"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Background</label>
              <div className="flex items-center gap-2">
                <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" title="Background color" />
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  title="Background color hex"
                  placeholder="#ffffff"
                  className="flex-1 px-3 py-1.5 text-xs font-mono rounded-lg border border-border bg-muted/50 uppercase"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Preview + Download */}
      <div className="space-y-5">
        {/* Preview */}
        <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <QrCode size={16} className="text-primary" />
            Preview
          </div>
          {text.trim() ? (
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto rounded-lg"
              style={{ imageRendering: "pixelated", maxHeight: "360px" }}
            />
          ) : (
            <div className="w-64 h-64 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground text-sm">
              Enter text to generate QR
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => downloadQR("png")}
            disabled={!text.trim()}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            Download PNG
          </button>
          <button
            onClick={() => downloadQR("svg")}
            disabled={!text.trim()}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            Download SVG
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={copyToClipboard}
            disabled={!text.trim()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            {copied ? "Copied!" : "Copy Image"}
          </button>
          <button
            onClick={() => { setText(""); }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
          >
            <RefreshCw size={16} />
            Reset
          </button>
        </div>

        {/* Quick tips */}
        <div className="rounded-xl bg-muted/50 border border-border p-4 text-xs text-muted-foreground space-y-1.5">
          <p className="font-semibold text-foreground text-sm mb-2">Quick Tips</p>
          <p>• For WiFi: <code className="bg-muted px-1 rounded">WIFI:T:WPA;S:Name;P:pass;;</code></p>
          <p>• Higher error correction = more scannable but denser QR</p>
          <p>• Dark foreground on light background scans best</p>
          <p>• SVG exports are infinitely scalable</p>
        </div>
      </div>
    </div>
  );
}
