import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const img = (id, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const fixes = [
  {
    id: 34,
    newImage: img("1556075798-4825dfaaf498"),
    oldImage: img("1618401471353-236d7d06738e"),
  },
  {
    id: 35,
    newImage: img("1611162617213-7d7a39e9b1d7"),
    oldImage: img("1536240478700-b869070f9279"),
  },
];

async function main() {
  for (const fix of fixes) {
    // Update cover_image
    await sql.query(
      "UPDATE posts SET cover_image = $1, updated_at = NOW() WHERE id = $2",
      [fix.newImage, fix.id]
    );

    // Fix inline markdown images in content
    const rows = await sql.query("SELECT content FROM posts WHERE id = $1", [fix.id]);
    if (rows.length) {
      const content = rows[0].content.replaceAll(fix.oldImage, fix.newImage);
      await sql.query("UPDATE posts SET content = $1 WHERE id = $2", [content, fix.id]);
    }

    console.log(`✅ Fixed image for post ${fix.id}`);
  }
  console.log("Done!");
}

main().catch(e => { console.error(e); process.exit(1); });
