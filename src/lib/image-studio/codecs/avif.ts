import { emscriptenOptions } from "./assets";
import { StudioError } from "./errors";

let encoder: Promise<import("@jsquash/avif/codec/enc/avif_enc.js").AVIFModule> | undefined;
let decoder: Promise<typeof import("@jsquash/avif/decode.js")> | undefined;

export async function encode(pixels: ImageData, quality: number): Promise<Uint8Array> {
  const { defaultOptions } = await import("@jsquash/avif/meta.js");
  encoder ??= (async () => {
    const { default: factory } = await import("@jsquash/avif/codec/enc/avif_enc.js");
    return factory(await emscriptenOptions("avifEncode"));
  })().catch((error: unknown) => { encoder = undefined; throw error; });
  const result = (await encoder).encode(pixels.data, pixels.width, pixels.height, {
    ...defaultOptions, quality, qualityAlpha: 100, bitDepth: 8,
    // Single-thread AV1 speed 8 is deliberately bounded for interactive jobs.
    speed: 8, tileRowsLog2: 0, tileColsLog2: 0,
  });
  if (!result?.byteLength) throw new StudioError("codec", "AVIF encoding failed for these pixels.");
  return result;
}

export async function decode(bytes: ArrayBuffer): Promise<ImageData> {
  decoder ??= (async () => {
    const codec = await import("@jsquash/avif/decode.js");
    await codec.init(await emscriptenOptions("avifDecode"));
    return codec;
  })().catch((error: unknown) => { decoder = undefined; throw error; });
  const result = await (await decoder).default(bytes, { bitDepth: 8 });
  if (!result) throw new StudioError("codec", "AVIF decoding returned no image pixels.");
  return result;
}