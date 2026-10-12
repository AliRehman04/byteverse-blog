import { readWasm } from "./assets";

let ready: Promise<typeof import("@jsquash/resize/lib/resize/pkg/squoosh_resize.js")> | undefined;

export async function resize(pixels: ImageData, width: number, height: number): Promise<Uint8ClampedArray> {
  ready ??= (async () => {
    const codec = await import("@jsquash/resize/lib/resize/pkg/squoosh_resize.js");
    await codec.default(await readWasm("resize"));
    return codec;
  })().catch((error: unknown) => { ready = undefined; throw error; });
  // The installed API's index 3 is Lanczos3; alpha is premultiplied while
  // resampling and RGB is converted to linear light, then returned as sRGB.
  return (await ready).resize(new Uint8Array(pixels.data.buffer, pixels.data.byteOffset, pixels.data.byteLength),
    pixels.width, pixels.height, width, height, 3, true, true);
}