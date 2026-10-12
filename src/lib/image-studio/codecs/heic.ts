import { IMAGE_LIMITS } from "../types";
import { checkDimensions, imageData } from "../pixels";
import { StudioError, quiet } from "./errors";

interface HeifImage {
  handle: number | null;
  get_width(): number;
  get_height(): number;
  is_primary(): boolean;
  has_alpha_channel(): boolean;
  display(target: ImageData, callback: (result: ImageData | null) => void): void;
  free(): void;
}

interface HeifDecoder { decoder: number | null; decode(bytes: Uint8Array): HeifImage[] }
interface HeifPacket {
  code?: number;
  image: number;
  channels: { id: number; width: number; height: number; stride: number; data: Uint8Array }[];
}
interface HeifModule {
  HeifDecoder: new () => HeifDecoder;
  heif_context_free(context: number): void;
  heif_context_set_maximum_image_size_limit(context: number, limit: number): void;
  heif_context_set_max_decoding_threads(context: number, threads: number): void;
  heif_image_release(image: number): void;
  heif_channel: { heif_channel_interleaved: number };
  heif_js_decode_image2(handle: number, colorSpace: number, chroma: number): HeifPacket | null | Promise<HeifPacket | null>;
}

let modulePromise: Promise<HeifModule> | undefined;
async function getModule(): Promise<HeifModule> {
  modulePromise ??= (async () => {
    // This is the factory entry of the installed wasm-bundle, not the asm.js
    // default. Its WASM is embedded, so it requires no implicit/remote fetch.
    const { default: factory } = await import("libheif-js/libheif-wasm/libheif-bundle.mjs");
    const codec = await factory({
      print: quiet, printErr: quiet, noInitialRun: true,
      // The wasm-bundle factory explicitly sets wasmBinary from its embedded
      // bytes. Emscripten still computes a filename before using those bytes;
      // no URL lookup or download is used by this variant.
    }) as Partial<HeifModule>;
    if (typeof codec.HeifDecoder !== "function" || typeof codec.heif_context_free !== "function"
      || typeof codec.heif_js_decode_image2 !== "function") throw new StudioError("unsupported", "The local HEIC decoder is unavailable in this browser.");
    return codec as HeifModule;
  })().catch(() => {
    modulePromise = undefined;
    throw new StudioError("unsupported", "The local HEIC decoder could not initialize. Try exporting this photo as JPEG or PNG.");
  });
  return modulePromise;
}

export interface OpenHeic {
  width: number;
  height: number;
  imageCount: number;
  hasAlpha: boolean;
  decode(): Promise<ImageData>;
  close(): void;
}

/** libheif's decode() reads a context and image HANDLES, not RGBA pixels.
 * get_width/get_height are checked before ImageData, native bitmap or display.
 * Handles and the context must be freed even if another decoder is used. */
export async function openHeic(bytes: Uint8Array, maxPixels: number): Promise<OpenHeic> {
  const codec = await getModule();
  const decoder = new codec.HeifDecoder();
  let images: HeifImage[] = [];
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    for (const image of images) { try { image.free(); } catch { /* Continue releasing remaining handles. */ } }
    images = [];
    if (decoder.decoder) {
      try { codec.heif_context_free(decoder.decoder); }
      finally { decoder.decoder = null; }
    }
  };
  try {
    images = decoder.decode(bytes);
    if (!Array.isArray(images) || !images.length) throw new StudioError("unsupported", "This HEIC/HEIF file is corrupt or uses a compression variant unavailable in the local decoder.");
    if (images.length > 64) throw new StudioError("resource", "This HEIF collection contains too many images for the worker's safety budget.");
    for (const image of images) checkDimensions(image.get_width(), image.get_height(), maxPixels);
    const selected = images.find((image) => image.is_primary()) ?? images[0];
    const width = selected.get_width();
    const height = selected.get_height();
    if (decoder.decoder) {
      codec.heif_context_set_maximum_image_size_limit(decoder.decoder, IMAGE_LIMITS.maxDimension);
      codec.heif_context_set_max_decoding_threads(decoder.decoder, 1);
    }
    return {
      width, height, imageCount: images.length, hasAlpha: selected.has_alpha_channel(), close,
      async decode() {
        if (closed || !selected.handle) throw new StudioError("codec", "The HEIC image has already been released.");
        checkDimensions(width, height, maxPixels);
        const pixels = imageData(new Uint8ClampedArray(width * height * 4), width, height, maxPixels);
        const original = codec.heif_js_decode_image2;
        // The upstream display callback is scheduled asynchronously and does
        // not catch a rejected decode. Keep its documented display-data path,
        // but turn malformed/failed packets into callback(null), without logs,
        // unhandled rejections, out-of-bounds copies or leaked decoded images.
        codec.heif_js_decode_image2 = async (handle, space, chroma) => {
          let packet: HeifPacket | null = null;
          try {
            packet = await original.call(codec, handle, space, chroma);
            if (!packet || packet.code) return null;
            const channel = packet.channels.find((item) => item.id === codec.heif_channel.heif_channel_interleaved);
            if (!channel || channel.width !== width || channel.height !== height || !Number.isSafeInteger(channel.stride)
              || channel.stride < width * 4 || channel.stride * height > maxPixels * 4 + height * 4096
              || channel.data.byteLength < channel.stride * height) throw new Error();
            return packet;
          } catch {
            if (packet?.image) codec.heif_image_release(packet.image);
            return null;
          }
        };
        try {
          return await new Promise<ImageData>((resolve, reject) => {
            selected.display(pixels, (result) => {
              if (result) resolve(result);
              else reject(new StudioError("unsupported", "This HEIC photo could not be decoded. Try exporting it as JPEG or PNG."));
            });
          });
        } finally {
          codec.heif_js_decode_image2 = original;
        }
        // libheif display applies irot/imir. Never apply EXIF orientation again.
      },
    };
  } catch (error) {
    close();
    if (error instanceof StudioError) throw error;
    throw new StudioError("unsupported", "This HEIC/HEIF file could not be read by the local decoder.");
  }
}