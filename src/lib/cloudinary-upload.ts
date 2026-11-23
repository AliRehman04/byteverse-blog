// Signed uploads through Cloudinary's REST API using fetch and Web Crypto, so the same code runs on
// Vercel (Node.js) and Cloudflare Workers, where the Node SDK's streaming upload is not dependable.
const UPLOAD_FOLDER = "byteverse/posts";
// The incoming transformation the SDK produced for { width: 1200, height: 630, crop: "fill", quality: "auto" }.
const UPLOAD_TRANSFORMATION = "c_fill,h_630,q_auto,w_1200";

export type CloudinaryCredentials = { cloudName: string; apiKey: string; apiSecret: string };

async function sha1Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Cloudinary's signature: sorted non-empty key=value pairs joined by "&", then the API secret, hashed with SHA-1. */
export function signCloudinaryParams(params: Record<string, string>, apiSecret: string): Promise<string> {
  const payload = Object.keys(params)
    .filter((key) => params[key] !== "")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return sha1Hex(payload + apiSecret);
}

export function postImageUploadParams(nowMs = Date.now()): Record<string, string> {
  return { folder: UPLOAD_FOLDER, timestamp: String(Math.floor(nowMs / 1000)), transformation: UPLOAD_TRANSFORMATION };
}

export async function uploadPostImage(file: Blob, credentials: CloudinaryCredentials): Promise<{ secureUrl: string; publicId: string }> {
  const params = postImageUploadParams();
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", credentials.apiKey);
  for (const [key, value] of Object.entries(params)) form.append(key, value);
  form.append("signature", await signCloudinaryParams(params, credentials.apiSecret));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(credentials.cloudName)}/image/upload`, {
    method: "POST",
    body: form,
  });
  const data = (await response.json().catch(() => null)) as { secure_url?: string; public_id?: string; error?: { message?: string } } | null;
  if (!response.ok || !data?.secure_url || !data.public_id) {
    throw new Error(data?.error?.message || `Cloudinary upload failed with HTTP ${response.status}`);
  }
  return { secureUrl: data.secure_url, publicId: data.public_id };
}
