import { readWasm } from "./assets";

let encoder: Promise<typeof import("@jsquash/oxipng/codec/pkg/squoosh_oxipng.js")> | undefined;
let decoder: Promise<typeof import("@jsquash/png/decode.js")> | undefined;

export async function encode(pixels: ImageData, level: number): Promise<Uint8Array> {
  encoder ??= (async () => {
    const codec = await import("@jsquash/oxipng/codec/pkg/squoosh_oxipng.js");
    await codec.default(await readWasm("oxipng"));
    return codec;
  })().catch((error: unknown) => { encoder = undefined; throw error; });
  // optimise_raw already produces a complete PNG. No second PNG encoder, no
  // quality fiction, and no alteration of RGB values behind transparent pixels.
  return (await encoder).optimise_raw(pixels.data, pixels.width, pixels.height, level, false, false);
}

export async function decode(bytes: ArrayBuffer): Promise<ImageData> {
  decoder ??= (async () => {
    const codec = await import("@jsquash/png/decode.js");
    await codec.init(await readWasm("pngDecode"));
    return codec;
  })().catch((error: unknown) => { decoder = undefined; throw error; });
  return (await decoder).default(bytes);
}