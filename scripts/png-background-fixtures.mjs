import sharp from 'sharp';

export const dimensions = { width: 480, height: 320 };
export const samplePoints = { empty: [30, 30], partial: [340, 160], colour: [200, 160], blackDetail: [240, 160] };

export async function makePngFixtures() {
  const { width, height } = dimensions;
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = (y * width + x) * 4;
    const radius = Math.hypot(x - 240, y - 160);
    if (radius > 115) continue;
    pixels.set([37, 99, 235, radius > 90 ? 128 : 255], offset);
    if (x >= 220 && x < 260 && y >= 144 && y < 176) pixels.set([0, 0, 0, 255], offset);
  }
  const source = await sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
  const whiteJpg = await sharp(source).flatten({ background: '#ffffff' }).jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toBuffer();
  const blackJpg = await sharp(source).flatten({ background: '#000000' }).jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toBuffer();
  const bakedPng = await sharp(source).flatten({ background: '#000000' }).png().toBuffer();
  return { source, whiteJpg, blackJpg, bakedPng };
}

export async function inspectPixels(bytes) {
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height,
    samples: Object.fromEntries(Object.entries(samplePoints).map(([key, [x, y]]) => [key, [...data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4)]])) };
}