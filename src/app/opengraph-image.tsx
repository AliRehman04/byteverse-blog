import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ByteVerse | AI Tools, Tech Guides & Productivity";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Grid pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.05,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Gradient orb */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,130,246,0.3), transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -80,
            left: -80,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.2), transparent 70%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "40px 60px",
          }}
        >
          {/* Logo text */}
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-2px",
              marginBottom: 16,
            }}
          >
            ByteVerse
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 28,
              fontWeight: 500,
              color: "#94a3b8",
              marginBottom: 40,
            }}
          >
            AI Tools • Tech Guides • Productivity • Coding Tutorials
          </div>

          {/* URL */}
          <div
            style={{
              fontSize: 18,
              color: "#60a5fa",
              fontWeight: 600,
              padding: "8px 24px",
              borderRadius: 12,
              border: "1px solid rgba(96,165,250,0.3)",
              background: "rgba(96,165,250,0.1)",
            }}
          >
            www.byteverse.fyi
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
