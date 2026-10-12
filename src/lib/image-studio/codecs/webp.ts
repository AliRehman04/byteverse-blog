import { emscriptenOptions } from "./assets";
import { StudioError } from "./errors";

let encoder: Promise<import("@jsquash/webp/codec/enc/webp_enc.js").WebPModule> | undefined;
let decoder: Promise<typeof import("@jsquash/webp/decode.js")> | undefined;

export async function encode(pixels: ImageData, quality: number): Promise<Uint8Array> {
  // Direct single-thread, non-SIMD factory; never probes threads or loads MT glue.
  const { defaultOptions } = await import("@jsquash/webp/meta.js");
  encoder ??= (async () => {
    const { default: factory } = await import("@jsquash/webp/codec/enc/webp_enc.js");
    return factory(await emscriptenOptions("webpEncode"));
  })().catch((error: unknown) => { encoder = undefined; throw error; });
  const result = (await encoder).encode(pixels.data, pixels.width, pixels.height, {
    ...defaultOptions, quality, thread_level: 0, alpha_quality: 100, exact: 1,
  });
  if (!result?.byteLength) throw new StudioError("codec", "WebP encoding failed for these pixels.");
  return result;
}

export async function decode(bytes: ArrayBuffer): Promise<ImageData> {
  decoder ??= (async () => {
    const codec = await import("@jsquash/webp/decode.js");
    await codec.init(await emscriptenOptions("webpDecode"));
    return codec;
  })().catch((error: unknown) => { decoder = undefined; throw error; });
  return (await decoder).default(bytes);
}