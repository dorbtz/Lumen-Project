/**
 * Lumen — public landing page at `/`.
 *
 * Hero (live mini Mood Dial) → three pillar showcases (mood discovery,
 * explainable taste, living journal) → how-it-works → final CTA → footer.
 *
 * SPEC §4: unauthed visitors see this. Authed visitors are forwarded to the
 * profile picker. Auth check is isolated in its own Suspense boundary so the
 * marketing content can stream without waiting on cookies().
 */

import { GlassCard, GlassChrome } from "@/components/glass";
import { JournalRecapPreview } from "@/components/marketing/JournalRecapPreview";
import { MarketingMoodDial } from "@/components/marketing/MarketingMoodDial";
import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";
import { WhyCardPreview } from "@/components/marketing/WhyCardPreview";
import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Lumen — discover films by mood, remember every watch",
  description:
    "A mood-first movie companion. Discover by feeling, hear why each recommendation fits, and grow a living journal of who you become as a viewer. Built on free-tier AI.",
  openGraph: {
    title: "Lumen — discover films by mood",
    description:
      "Mood-first discovery, explainable taste, and a living journal of your watches.",
    type: "website",
    siteName: "Lumen",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lumen — discover films by mood",
    description:
      "Mood-first discovery, explainable taste, and a living journal of your watches.",
  },
};

async function SignedInRedirect() {
  const { userId } = await auth();
  if (userId) redirect("/profiles");
  return null;
}

export default function MarketingHome() {
  return (
    <main className="relative min-h-dvh overflow-hidden">
      <Suspense fallback={null}>
        <SignedInRedirect />
      </Suspense>

      {/* Ambient backdrop — sapphire + emerald aurora wash */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 80% at 70% 12%, oklch(0.66 0.17 200 / 0.30), transparent 60%), radial-gradient(50% 70% at 18% 88%, oklch(0.62 0.15 160 / 0.26), transparent 60%), radial-gradient(60% 70% at 50% 50%, oklch(0.40 0.10 245 / 0.18), transparent 60%), var(--color-surface-0)",
        }}
      />

      <TopChrome />

      <Hero />

      <PillarMood />

      <PillarWhy />

      <PillarJournal />

      <HowItWorks />

      <FinalCta />

      <Footer />
    </main>
  );
}

/* ---------------- Top chrome ---------------- */

function TopChrome() {
  return (
    <GlassChrome
      as="header"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 md:gap-6 px-3.5 md:px-5 py-2 md:py-3 rounded-full"
    >
      <Link
        href="/"
        className="font-[var(--font-display)] text-base md:text-lg tracking-tight"
      >
        Lumen
      </Link>
      <nav className="hidden md:flex items-center gap-5 text-sm text-[var(--color-ink-2)]">
        <a href="#discovery" className="hover:text-[var(--color-ink-0)] transition-colors">
          Discovery
        </a>
        <a href="#taste" className="hover:text-[var(--color-ink-0)] transition-colors">
          Taste
        </a>
        <a href="#journal" className="hover:text-[var(--color-ink-0)] transition-colors">
          Journal
        </a>
      </nav>
      <Link
        href="/sign-in"
        className="ml-auto text-xs md:text-sm px-3 md:px-4 py-1.5 rounded-full bg-[var(--color-accent-strong)] text-black font-medium hover:bg-[var(--color-accent)] transition-colors whitespace-nowrap"
      >
        Sign in
      </Link>
    </GlassChrome>
  );
}

/* ---------------- Hero ---------------- */

function Hero() {
  return (
    <section className="relative z-10 mx-auto max-w-6xl px-6 pt-28 md:pt-40 pb-16 md:pb-24">
      <div className="grid md:grid-cols-[1.2fr_1fr] gap-10 md:gap-14 items-center">
        {/* Left — copy + CTAs */}
        <div className="text-center md:text-left">
          <RevealOnScroll>
            <p className="text-[11px] sm:text-xs tracking-[0.28em] uppercase text-[var(--color-accent)]">
              A new kind of movie companion
            </p>
          </RevealOnScroll>

          <RevealOnScroll delay={0.05}>
            <h1
              className="mt-4 md:mt-5 font-[var(--font-display)] tracking-tight leading-[1.02] text-[clamp(2.25rem,7vw,5rem)]"
              style={{ letterSpacing: "-0.025em" }}
            >
              Discover by mood.
              <br />
              <span className="text-[var(--color-accent)]">
                Remember every watch.
              </span>
            </h1>
          </RevealOnScroll>

          <RevealOnScroll delay={0.12}>
            <p className="mt-5 md:mt-6 text-base md:text-lg leading-relaxed text-[var(--color-ink-2)] max-w-xl mx-auto md:mx-0">
              Lumen is built around the three things every recommender gets wrong: it asks how
              you feel, explains why each film fits, and grows a living journal of who you become
              as a viewer.
            </p>
          </RevealOnScroll>

          <RevealOnScroll delay={0.18}>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3">
              <Link
                href="/sign-in"
                className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-[var(--color-accent-strong)] hover:bg-[var(--color-accent)] text-[#02161F] text-base font-medium tracking-tight shadow-[0_10px_30px_-12px_oklch(0.76_0.18_195_/_0.55)] transition-colors"
              >
                Start with your taste seed
              </Link>
              <Link
                href="/sign-up"
                className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 rounded-full glass-thin glass-specular ring-1 ring-white/15 text-[var(--color-ink-0)] text-base font-medium tracking-tight hover:ring-white/30 transition-all"
              >
                Create account
              </Link>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={0.24}>
            <p className="mt-6 text-[11px] uppercase tracking-widest text-[var(--color-ink-3)]">
              Free · No ads · Free-tier AI
            </p>
          </RevealOnScroll>
        </div>

        {/* Right — live mini Mood Dial */}
        <RevealOnScroll delay={0.15} className="flex justify-center">
          <MarketingMoodDial />
        </RevealOnScroll>
      </div>
    </section>
  );
}

/* ---------------- Pillar — Mood-first discovery ---------------- */

function PillarMood() {
  return (
    <section
      id="discovery"
      className="relative z-10 mx-auto max-w-6xl px-6 py-20 md:py-28 scroll-mt-24"
    >
      <RevealOnScroll>
        <PillarHeader
          eyebrow="Pillar 1 · Discovery"
          headline="What do you want to feel tonight?"
          lede="Drag a 2D affect dial. Results stream live as you move. Calm, joyful, bleak, intense — every quadrant maps to a different shelf of films."
        />
      </RevealOnScroll>

      <div className="mt-12 grid md:grid-cols-3 gap-4">
        {[
          {
            title: "Mood, not metadata",
            body: "Forget genres and year filters. Lumen tags every film on 64 emotional dimensions, so 'restless but hopeful' is a real query.",
          },
          {
            title: "Live as you drag",
            body: "Results refresh every 220ms as the orb moves. The films closest to your chosen mood surface first.",
          },
          {
            title: "TV-friendly",
            body: "Arrow-key navigation works end to end. Designed to feel as good on a remote as a trackpad.",
          },
        ].map((card, i) => (
          <RevealOnScroll key={card.title} delay={i * 0.08}>
            <GlassCard weight="thin" className="h-full">
              <h3 className="text-base font-[var(--font-display)] tracking-tight">
                {card.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-2)]">
                {card.body}
              </p>
            </GlassCard>
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Pillar — Explainable taste ---------------- */

function PillarWhy() {
  return (
    <section
      id="taste"
      className="relative z-10 mx-auto max-w-6xl px-6 py-20 md:py-28 scroll-mt-24"
    >
      <RevealOnScroll>
        <PillarHeader
          eyebrow="Pillar 2 · Taste"
          headline="Every recommendation, explained."
          lede="No black-box scores. Open any title and Lumen shows you the three dimensions of your taste it tapped — in warm prose, like a friend who knows what you've watched."
        />
      </RevealOnScroll>

      <RevealOnScroll delay={0.1}>
        <div className="mt-12">
          <WhyCardPreview />
        </div>
      </RevealOnScroll>
    </section>
  );
}

/* ---------------- Pillar — Living journal + recap ---------------- */

function PillarJournal() {
  return (
    <section
      id="journal"
      className="relative z-10 mx-auto max-w-6xl px-6 py-20 md:py-28 scroll-mt-24"
    >
      <RevealOnScroll>
        <PillarHeader
          eyebrow="Pillar 3 · Journal"
          headline="A living record of who you become as a viewer."
          lede="Write a sentence after each film. Lumen replies with a question worth sitting with — never therapist-y, always specific. Weeks later, your entries become a story."
        />
      </RevealOnScroll>

      <RevealOnScroll delay={0.1}>
        <div className="mt-14 mb-6">
          <JournalRecapPreview />
        </div>
      </RevealOnScroll>

      <RevealOnScroll delay={0.18}>
        <p className="mt-12 text-center text-sm text-[var(--color-ink-3)] max-w-2xl mx-auto">
          Plus a daily <span className="text-[var(--color-accent-secondary)]">Cinema Weather</span>{" "}
          forecast — a personal mood map built from your recent journal trajectory.
        </p>
      </RevealOnScroll>
    </section>
  );
}

/* ---------------- How it works ---------------- */

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Sign in",
      body: "Google or email. Multiple profiles per account so each member of a household has their own taste model.",
    },
    {
      n: "02",
      title: "Rate ten films",
      body: "A 90-second onboarding deck. Skip what you haven't seen — you can come back later. Or skip entirely; Lumen learns slowly from use.",
    },
    {
      n: "03",
      title: "Lumen learns",
      body: "Your ratings + journal + dial-drags shape a private taste centroid that personalizes everything.",
    },
  ];
  return (
    <section className="relative z-10 mx-auto max-w-6xl px-6 py-20 md:py-28">
      <RevealOnScroll>
        <PillarHeader
          eyebrow="Quick start"
          headline="Three minutes to a taste model."
          lede="No questionnaires. No genres to tick off. Just rate a handful of films and Lumen takes it from there."
        />
      </RevealOnScroll>

      <ol className="mt-12 grid md:grid-cols-3 gap-4">
        {steps.map((s, i) => (
          <RevealOnScroll key={s.n} delay={i * 0.08}>
            <GlassCard className="h-full">
              <p className="text-xs tracking-[0.28em] uppercase text-[var(--color-accent)]">
                {s.n}
              </p>
              <h3 className="mt-3 text-xl font-[var(--font-display)] tracking-tight">
                {s.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-2)]">{s.body}</p>
            </GlassCard>
          </RevealOnScroll>
        ))}
      </ol>
    </section>
  );
}

/* ---------------- Final CTA ---------------- */

function FinalCta() {
  return (
    <section className="relative z-10 mx-auto max-w-3xl px-6 py-20 md:py-28 text-center">
      <RevealOnScroll>
        <h2
          className="font-[var(--font-display)] tracking-tight leading-[1.05] text-[clamp(2rem,5vw,3.5rem)]"
          style={{ letterSpacing: "-0.025em" }}
        >
          Cinema, but it knows you.
        </h2>
      </RevealOnScroll>
      <RevealOnScroll delay={0.06}>
        <p className="mt-5 text-base md:text-lg text-[var(--color-ink-2)] max-w-xl mx-auto">
          Free to use, free-tier AI under the hood, no tracking beyond what you ask Lumen to
          remember.
        </p>
      </RevealOnScroll>
      <RevealOnScroll delay={0.12}>
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/sign-in"
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-full bg-[var(--color-accent-strong)] hover:bg-[var(--color-accent)] text-[#02161F] text-base font-medium tracking-tight shadow-[0_14px_36px_-14px_oklch(0.76_0.18_195_/_0.65)] transition-colors"
          >
            Start with your taste seed
          </Link>
          <Link
            href="/sign-up"
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-full glass-thin glass-specular ring-1 ring-white/15 text-[var(--color-ink-0)] text-base font-medium tracking-tight hover:ring-white/30 transition-all"
          >
            Create account
          </Link>
        </div>
      </RevealOnScroll>
    </section>
  );
}

/* ---------------- Footer ---------------- */

function Footer() {
  return (
    <footer className="relative z-10 mx-auto max-w-6xl px-6 pt-10 pb-14 border-t border-white/5">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="font-[var(--font-display)] text-base tracking-tight">Lumen</p>
        <p className="text-xs text-[var(--color-ink-3)] text-center sm:text-right">
          A portfolio project · Built with Next.js 16 · Free-tier Gemini · Sapphire glass &amp;
          carefully tuned springs.
        </p>
      </div>
    </footer>
  );
}

/* ---------------- Shared bits ---------------- */

function PillarHeader({
  eyebrow,
  headline,
  lede,
}: {
  eyebrow: string;
  headline: string;
  lede: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-[11px] tracking-[0.28em] uppercase text-[var(--color-accent)]">
        {eyebrow}
      </p>
      <h2
        className="mt-3 font-[var(--font-display)] tracking-tight leading-[1.05] text-[clamp(1.75rem,4vw,2.75rem)]"
        style={{ letterSpacing: "-0.02em" }}
      >
        {headline}
      </h2>
      <p className="mt-4 text-base md:text-lg leading-relaxed text-[var(--color-ink-2)]">
        {lede}
      </p>
    </div>
  );
}
