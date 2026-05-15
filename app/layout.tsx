/**
 * Lumen — root layout.
 * SPEC §10: ClerkProvider with Liquid-Glass-themed appearance.
 * SPEC §5.2: LiquidDisplacementFilter mounted ONCE; .glass-vibrant elements reference it.
 * Analytics + Speed Insights wired here per SPEC §12.
 */

import "./globals.css";

import { readAccessibilityPrefs } from "@/app/(app)/settings/actions";
import { LiquidDisplacementFilter } from "@/components/glass";
import { PwaProvider } from "@/components/pwa/PwaProvider";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Lumen — discover by mood, remember every watch",
  description:
    "Mood-first movie discovery, AI taste explanations, and a living cinema journal. A Netflix+IMDB hybrid with Apple Liquid Glass design.",
  applicationName: "Lumen",
  appleWebApp: {
    capable: true,
    title: "Lumen",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A1428",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const a11y = await readAccessibilityPrefs();
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          // Living-color sapphire palette (matches globals.css tokens)
          colorPrimary: "#3DD3E8",
          colorBackground: "#0A1428",
          colorInputBackground: "rgba(150,210,230,0.06)",
          colorInputText: "#FAFAFA",
          colorText: "#FAFAFA",
          colorTextSecondary: "rgba(190,220,235,0.7)",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif',
          borderRadius: "1rem",
        },
        elements: {
          // Themed to Liquid Glass — see SPEC §10
          card: "backdrop-blur-xl bg-white/5 border border-cyan-200/10 shadow-2xl",
          headerTitle: "tracking-tight",
          formButtonPrimary:
            "bg-[#19B3C8] hover:bg-[#3DD3E8] text-[#02161F] transition-colors duration-200",
          socialButtonsBlockButton:
            "backdrop-blur-md bg-white/5 hover:bg-white/10 border border-cyan-200/10",
          footerActionLink: "text-[#3DD3E8] hover:text-[#5FE5F0]",
        },
      }}
    >
      <html
        lang="en"
        suppressHydrationWarning
        data-reduce-transparency={a11y.reduceTransparency ? "1" : "0"}
        data-reduce-motion={a11y.reduceMotion ? "1" : "0"}
      >
        <body className="min-h-dvh antialiased bg-[var(--color-surface-0)] text-[var(--color-ink-0)]">
          <LiquidDisplacementFilter />
          <PwaProvider>{children}</PwaProvider>
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}
