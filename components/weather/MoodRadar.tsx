"use client";

/**
 * MoodRadar — 280×280 SVG plot of recent journal mood points on the
 * valence × arousal plane (same axes as MoodDial). Pure display, no interaction.
 *
 * x ∈ [-1, 1] maps to [PAD, SIZE-PAD]. y axis is inverted: higher arousal sits
 * at the top, matching the MoodDial convention where up = intense.
 */

const SIZE = 280;
const PAD = 24;
const PLOT_MIN = PAD;
const PLOT_MAX = SIZE - PAD;
const PLOT_RANGE = PLOT_MAX - PLOT_MIN;

export interface RadarPoint {
  v: number;
  a: number;
}

interface MoodRadarProps {
  centroid: RadarPoint;
  points: RadarPoint[];
}

function toX(v: number): number {
  return PLOT_MIN + ((v + 1) / 2) * PLOT_RANGE;
}

function toY(a: number): number {
  // Invert: high arousal → low y (top of SVG)
  return PLOT_MIN + ((1 - a) / 2) * PLOT_RANGE;
}

export function MoodRadar({ centroid, points }: MoodRadarProps) {
  const cx = toX(centroid.v);
  const cy = toY(centroid.a);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width="100%"
      style={{
        maxWidth: SIZE,
        aspectRatio: "1 / 1",
        display: "block",
        background: `
          radial-gradient(60% 60% at 100% 0%, oklch(0.55 0.18 195 / 0.30), transparent 70%),
          radial-gradient(60% 60% at 0% 100%, oklch(0.50 0.18 160 / 0.22), transparent 70%),
          radial-gradient(60% 60% at 0% 0%, oklch(0.40 0.12 275 / 0.20), transparent 70%),
          radial-gradient(60% 60% at 100% 100%, oklch(0.30 0.08 245 / 0.20), transparent 70%)`,
        borderRadius: 16,
      }}
      aria-label="Mood radar — recent journal entries plotted on valence and arousal axes"
      role="img"
    >
      {/* Cross-hair guidelines */}
      <line
        x1={SIZE / 2}
        y1={PLOT_MIN}
        x2={SIZE / 2}
        y2={PLOT_MAX}
        stroke="white"
        strokeOpacity={0.07}
        strokeWidth={1}
      />
      <line
        x1={PLOT_MIN}
        y1={SIZE / 2}
        x2={PLOT_MAX}
        y2={SIZE / 2}
        stroke="white"
        strokeOpacity={0.07}
        strokeWidth={1}
      />

      {/* Axis labels */}
      <text
        x={SIZE / 2}
        y={10}
        textAnchor="middle"
        fontSize={8}
        letterSpacing="0.22em"
        fill="var(--color-accent-secondary)"
        fillOpacity={0.7}
        fontWeight={500}
        style={{ textTransform: "uppercase" }}
      >
        INTENSE
      </text>
      <text
        x={SIZE / 2}
        y={SIZE - 3}
        textAnchor="middle"
        fontSize={8}
        letterSpacing="0.22em"
        fill="var(--color-accent-secondary)"
        fillOpacity={0.7}
        fontWeight={500}
        style={{ textTransform: "uppercase" }}
      >
        CALM
      </text>
      <text
        x={3}
        y={SIZE / 2 + 3}
        textAnchor="start"
        fontSize={8}
        letterSpacing="0.22em"
        fill="var(--color-accent)"
        fillOpacity={0.7}
        fontWeight={500}
        style={{ textTransform: "uppercase" }}
      >
        BLEAK
      </text>
      <text
        x={SIZE - 3}
        y={SIZE / 2 + 3}
        textAnchor="end"
        fontSize={8}
        letterSpacing="0.22em"
        fill="var(--color-accent)"
        fillOpacity={0.7}
        fontWeight={500}
        style={{ textTransform: "uppercase" }}
      >
        JOYFUL
      </text>

      {/* Journal entry dots */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={toX(p.v)}
          cy={toY(p.a)}
          r={4}
          fill="var(--color-accent)"
          fillOpacity={0.55}
        />
      ))}

      {/* Centroid — larger, fully opaque, with CSS pulse animation */}
      <circle
        cx={cx}
        cy={cy}
        r={7}
        fill="var(--color-accent)"
        fillOpacity={1}
        className="radar-centroid-pulse"
      />

      <style>{`
        .radar-centroid-pulse {
          animation: radarPulse 2s ease-in-out infinite;
        }
        @keyframes radarPulse {
          0%, 100% { r: 7; opacity: 1; }
          50%       { r: 9; opacity: 0.7; }
        }
        @media (prefers-reduced-motion: reduce) {
          .radar-centroid-pulse { animation: none; }
        }
      `}</style>
    </svg>
  );
}
