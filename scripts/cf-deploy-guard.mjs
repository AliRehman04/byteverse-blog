import { existsSync } from "node:fs";

// `opennextjs-cloudflare build` compiles .env* values into .open-next/cloudflare/next-env.mjs, which ships inside
// the Worker. Deploy from Workers Builds (no .env files there) so secrets live only in Cloudflare's encrypted settings.
const embedded = [".env", ".env.production", ".env.local", ".env.production.local"].filter((file) => existsSync(file));
if (embedded.length) {
  console.error(`Refusing to deploy: ${embedded.join(", ")} would be compiled into the Worker. Push to GitHub and let Workers Builds deploy.`);
  process.exit(1);
}
