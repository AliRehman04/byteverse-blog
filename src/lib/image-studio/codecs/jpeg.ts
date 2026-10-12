import { emscriptenOptions } from "./assets";

let encoder: Promise<typeof import("@jsquash/jpeg/encode.js")> | undefined;
let decoder: Promise<typeof import("@jsquash/jpeg/decode.js")> | undefined;

export async function encode(pixels: ImageData, quality: number): Promise<ArrayBuffer> {
  encoder ??= (async () => {
    const codec = await import("@jsquash/jpeg/encode.js");
    await codec.init(await emscriptenOptions("jpegEncode"));
    return codec;
  })().catch((error: unknown) => { encoder = undefined; throw error; });
  return (await encoder).default(pixels, { quality });
}

export async function decode(bytes: ArrayBuffer): Promise<ImageData> {
  decoder ??= (async () => {
    const codec = await import("@jsquash/jpeg/decode.js");
    await codec.init(await emscriptenOptions("jpegDecode"));
    return codec;
  })().catch((error: unknown) => { decoder = undefined; throw error; });
  // This option APPLIES EXIF orientation (verified in the installed README).
  // Do not rotate the returned pixels a second time.
  return (await decoder).default(bytes, { preserveOrientation: true });
}