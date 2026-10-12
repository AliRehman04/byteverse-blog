/* eslint-disable @typescript-eslint/triple-slash-reference -- Upstream Emscripten declarations are ambient scripts, not importable modules. */
/// <reference path="../../../node_modules/@jsquash/jpeg/emscripten-types.d.ts" />

/** The installed jSquash declarations omit these supported Emscripten options. */
declare namespace EmscriptenWasm {
  interface ModuleOpts {
    wasmBinary?: ArrayBuffer | Uint8Array<ArrayBuffer>;
    print?: (...values: unknown[]) => void;
    printErr?: (...values: unknown[]) => void;
  }
}

/** Replaced by the static-asset build, never resolved by Next or a CDN. */
declare module "image-studio:assets" {
  export type WasmKey = "jpegEncode" | "jpegDecode" | "webpEncode" | "webpDecode"
    | "avifEncode" | "avifDecode" | "pngDecode" | "oxipng" | "resize";
  export interface WasmAsset {
    readonly url: string;
    readonly filename: string;
    readonly bytes: number;
    readonly sha256: string;
  }
  export const wasmAssets: Readonly<Record<WasmKey, WasmAsset>>;
}

/** The factory form of libheif-js/wasm-bundle (same embedded WASM, ESM wrapper).
 * Unlike the CommonJS convenience entry, this accepts quiet module options. */
declare module "libheif-js/libheif-wasm/libheif-bundle.mjs" {
  const factory: (options?: {
    print?: (...values: unknown[]) => void;
    printErr?: (...values: unknown[]) => void;
    noInitialRun?: boolean;
    locateFile?: (filename: string) => string;
  }) => unknown;
  export default factory;
}