import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { posts, categories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "ByteVerse Blog Post";

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let title = "ByteVerse";
  let categoryName = "";
  let categoryColor = "#6366f1";
  let authorName = "ByteVerse Team";
  let readingTime = "";

  if (db) {
    const result = await db.select().from(posts).where(eq(posts.slug, slug)).limit(1);
    const post = result[0];
    if (post) {
      title = post.title;
      authorName = post.author;
      readingTime = post.readingTime || "";
      if (post.categoryId) {
        const catResult = await db.select().from(categories).where(eq(categories.id, post.categoryId)).limit(1);
        if (catResult[0]) {
          categoryName = catResult[0].name;
          categoryColor = catResult[0].color;
        }
      }
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          fontFamily: "sans-serif",
          padding: "60px 80px",
        }}
      >
        {/* Grid pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.04,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Gradient orb */}
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 350,
            height: 350,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${categoryColor}40, transparent 70%)`,
          }}
        />

        {/* Top: Category + Reading time */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {categoryName && (
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#ffffff",
                background: categoryColor,
                padding: "6px 20px",
                borderRadius: "100px",
              }}
            >
              {categoryName}
            </div>
          )}
          {readingTime && (
            <div style={{ fontSize: 16, color: "#94a3b8" }}>
              {readingTime}
            </div>
          )}
        </div>

        {/* Middle: Title */}
        <div
          style={{
            fontSize: title.length > 60 ? 40 : 48,
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.2,
            letterSpacing: "-1px",
            maxWidth: "90%",
          }}
        >
          {title}
        </div>

        {/* Bottom: Author + Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #6366f1, #3b82f6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                fontWeight: 800,
                color: "#fff",
              }}
            >
              {authorName.charAt(0)}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#ffffff" }}>{authorName}</span>
              <span style={{ fontSize: 14, color: "#64748b" }}>byteverse.fyi</span>
            </div>
          </div>

          <div style={{ fontSize: 28, fontWeight: 800, color: "#ffffff", letterSpacing: "-1px" }}>
            ByteVerse
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
