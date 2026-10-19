import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ByteVerse — Free developer tools and practical tech guides";
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
          background: "#121d32",
          fontFamily: "sans-serif",
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
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,130,246,0.18), transparent 70%)",
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
            background: "radial-gradient(circle, rgba(185,220,131,0.12), transparent 70%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
            textAlign: "left",
            width: "100%",
            padding: "48px 80px",
          }}
        >
          {/* Logo text */}
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-1px",
              marginBottom: 44,
            }}
          >
            ByteVerse
          </div>

          {/* Tagline */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: "-3px",
              color: "#f1f5ff",
              marginBottom: 44,
            }}
          >
            <span>Free developer tools.</span>
            <span style={{ color: "#b6caff" }}>Practical tech guides.</span>
          </div>

          {/* URL */}
          <div
            style={{
              fontSize: 18,
              color: "#c6dfb5",
              fontWeight: 600,
              padding: "8px 24px",
              borderRadius: 12,
              border: "1px solid #485c49",
              background: "#1d2c29",
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
