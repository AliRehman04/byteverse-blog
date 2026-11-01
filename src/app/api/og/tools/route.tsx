import { ImageResponse } from "next/og";
import { toolCatalog, toolCategories } from "@/lib/tool-catalog";

// Rendered once at build and cached; the hub metadata references this URL.
export const dynamic = "force-static";

const size = { width: 1200, height: 630 };

export function GET() {
  const counts = toolCategories.map((category) => ({ title: category.title, count: toolCatalog.filter((tool) => tool.category === category.title).length }));
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "52px 60px", background: "linear-gradient(135deg, #0b0f1d 0%, #141a2e 55%, #1b1440 100%)", color: "#f8fafc", fontFamily: "sans-serif" }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.08, backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
      <div style={{ position: "absolute", top: -140, right: -120, width: 460, height: 460, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.35), transparent 70%)" }} />
      <div style={{ position: "absolute", bottom: -160, left: -100, width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.3), transparent 70%)" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 26, fontWeight: 700 }}>
          <span style={{ display: "flex", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", borderRadius: 12, padding: "8px 14px" }}>B</span>ByteVerse
        </div>
        <div style={{ display: "flex", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 40, padding: "12px 22px", fontSize: 19, color: "#dbe3ff" }}>Free · No account · Nothing to install</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 64 }}>
        <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: "#c4b5fd" }}>{`${toolCatalog.length} FREE ONLINE TOOLS`}</div>
        <div style={{ display: "flex", marginTop: 16, fontSize: 68, lineHeight: 1.05, letterSpacing: -3, fontWeight: 700 }}>Developer, writing<br />and SEO tools.</div>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: "auto", flexWrap: "wrap" }}>
        {counts.map((entry) => (
          <div key={entry.title} style={{ display: "flex", gap: 10, alignItems: "center", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 14, padding: "12px 18px", fontSize: 20 }}>
            <span style={{ color: "#f8fafc" }}>{entry.title}</span>
            <span style={{ color: "#c4b5fd", fontWeight: 700 }}>{entry.count}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", marginTop: 26, color: "#aab6d6", fontSize: 20 }}>byteverse.fyi/tools</div>
    </div>,
    { ...size, headers: { "Cache-Control": "public, max-age=86400, s-maxage=31536000" } },
  );
}
