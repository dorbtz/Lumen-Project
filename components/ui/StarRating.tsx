"use client";

/**
 * StarRating — shared controlled 1–5 star control (plan WS9).
 *
 * Extracted from the onboarding card so the journal can capture a rating
 * with the exact same UX and a11y semantics. Buttons act as a custom radio
 * group (cleaner styling than native inputs); the wrapper carries the
 * radiogroup role + label for screen readers.
 */

export type StarValue = 1 | 2 | 3 | 4 | 5;

export interface StarRatingProps {
  /** Current rating, 0 = unrated. */
  value: number;
  onChange: (stars: StarValue) => void;
  /** Accessible group label, e.g. `Rate ${title}`. */
  ariaLabel: string;
  /** Tailwind text-size class for the stars. Defaults to text-3xl. */
  sizeClass?: string;
  className?: string;
}

export function StarRating({
  value,
  onChange,
  ariaLabel,
  sizeClass = "text-3xl",
  className,
}: StarRatingProps) {
  return (
    <div
      className={`flex items-center gap-2${className ? ` ${className}` : ""}`}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          // biome-ignore lint/a11y/useSemanticElements: custom rating control by design
          type="button"
          role="radio"
          aria-checked={value >= s}
          aria-label={`${s} star${s > 1 ? "s" : ""}`}
          onClick={() => onChange(s as StarValue)}
          className={`${sizeClass} px-1 py-0.5 hover:scale-110 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded`}
        >
          <span
            aria-hidden
            style={{ color: value >= s ? "var(--color-accent)" : "var(--color-ink-3)" }}
          >
            ★
          </span>
        </button>
      ))}
    </div>
  );
}
