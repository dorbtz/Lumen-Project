/**
 * Lumen — Open Graph image for the marketing landing.
 *
 * Generated at build / on-demand via Next.js's built-in ImageResponse.
 * Renders the same sapphire-on-aurora aesthetic as the live site so links
 * shared in Slack / X / iMessage look like a real product.
 */

import { ImageResponse } from "next/og";

export const alt = "Lumen — discover films by mood";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 96px",
        background:
          "radial-gradient(60% 80% at 70% 12%, oklch(0.66 0.17 200 / 0.35), transparent 60%), radial-gradient(50% 70% at 18% 88%, oklch(0.62 0.15 160 / 0.30), transparent 60%), oklch(0.10 0.03 245)",
        color: "#FAFAFA",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          fontSize: 24,
          letterSpacing: 8,
          textTransform: "uppercase",
          color: "oklch(0.84 0.16 200)",
          marginBottom: 28,
        }}
      >
        Lumen
      </div>
      <div
        style={{
          fontSize: 96,
          fontWeight: 700,
          letterSpacing: -2,
          lineHeight: 1.02,
          maxWidth: 1000,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <span>Discover by mood.</span>
        <span style={{ color: "oklch(0.84 0.16 200)" }}>Remember every watch.</span>
      </div>
      <div
        style={{
          marginTop: 40,
          fontSize: 28,
          color: "rgba(190, 220, 235, 0.75)",
          maxWidth: 900,
          lineHeight: 1.4,
        }}
      >
        A mood-first movie companion. Explainable taste. A living journal.
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 56,
          right: 96,
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 22,
          color: "rgba(190, 220, 235, 0.6)",
          letterSpacing: 4,
          textTransform: "uppercase",
        }}
      >
        Built on free-tier AI
      </div>
    </div>,
    size,
  );
}
