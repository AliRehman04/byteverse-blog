import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Offline check: the fetch-based admin upload must send and sign the same parameters as Cloudinary's Node SDK.
// No network, no real credentials.
const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const { v2: cloudinary } = require("cloudinary");

const source = readFileSync(resolve(root, "src/lib/cloudinary-upload.ts"), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const lib = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

const nowMs = Date.UTC(2026, 10, 23, 10, 0, 0);
const ours = lib.postImageUploadParams(nowMs);

// Parameters the SDK signed for the former upload_stream({ folder, transformation }) call.
const sdkParams = Object.fromEntries(
  Object.entries(cloudinary.utils.build_upload_params({
    folder: "byteverse/posts",
    transformation: [{ width: 1200, height: 630, crop: "fill", quality: "auto" }],
    timestamp: Math.floor(nowMs / 1000),
  })).filter(([, value]) => value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && value.length === 0)),
);
assert.deepEqual(Object.fromEntries(Object.entries(sdkParams).map(([key, value]) => [key, String(value)])), ours, "Signed upload parameters must match the SDK");

for (const secret of ["test-secret-not-real", "another-test-secret"]) {
  assert.equal(await lib.signCloudinaryParams(ours, secret), cloudinary.utils.api_sign_request(ours, secret), "Signature must match the SDK");
}
assert.equal(await lib.signCloudinaryParams({ b: "2", a: "1", empty: "" }, "s"), cloudinary.utils.api_sign_request({ b: "2", a: "1" }, "s"), "Empty values are not signed");

console.log(`PASS: fetch upload signs ${Object.keys(ours).join(", ")} exactly like the Cloudinary SDK (offline).`);
