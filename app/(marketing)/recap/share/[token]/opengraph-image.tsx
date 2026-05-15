/**
 * Lumen — OG image for a shared public recap (SPEC_COMPLETION §1 A2).
 *
 * Satori (next/og) supports hex / rgb / rgba / hsl ONLY — never oklch().
 * All colors below are hex/rgba equivalents of the site's sapphire+aurora
 * wash. Renders headline + first moment for a Spotify-Wrapped feel.
 */

import { getRecapByShareToken } from "@/lib/recap/share";
import { ImageResponse } from "next/og";

export const alt = "A Lumen Recap";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function RecapOgImage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const recap = await getRecapByShareToken(token);

  const headline = recap?.headline ?? "A living cinema recap";
  const moment = recap?.firstMoment?.title ?? null;

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
          "radial-gradient(60% 80% at 70% 12%, rgba(61,211,232,0.30), transparent 60%), radial-gradient(50% 70% at 18% 88%, rgba(52,211,153,0.24), transparent 60%), #0A1428",
        color: "#FAFAFA",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          fontSize: 24,
          letterSpacing: 8,
          textTransform: "uppercase",
          color: "#3DD3E8",
          marginBottom: 28,
        }}
      >
        A Lumen Recap
      </div>
      <div
        style={{
          fontSize: 76,
          fontWeight: 700,
          letterSpacing: -2,
          lineHeight: 1.05,
          maxWidth: 1000,
          display: "flex",
        }}
      >
        {headline}
      </div>
      {moment && (
        <div
          style={{
            marginTop: 40,
            fontSize: 28,
            color: "rgba(190, 220, 235, 0.78)",
            maxWidth: 900,
            lineHeight: 1.4,
            display: "flex",
          }}
        >
          A defining moment: {moment}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          bottom: 56,
          right: 96,
          display: "flex",
          alignItems: "center",
          fontSize: 22,
          color: "rgba(190, 220, 235, 0.6)",
          letterSpacing: 4,
          textTransform: "uppercase",
        }}
      >
        Made with Lumen
      </div>
    </div>,
    size,
  );
}
