/**
 * TitleRow — horizontal scroll strip used on Home for the three personalized
 * rows. Server Component that renders the section header + delegates the
 * scrollable rail to <HorizontalScroller> (client) so we get on-hover arrows
 * and TV-remote / D-pad navigation.
 *
 * SPEC §3.2 Home: hero billboard + 3 rows. Apple-style snap-scroll + scrollers.
 */

import type { ReactNode } from "react";
import { HorizontalScroller } from "./HorizontalScroller";
import { TitlePreviewCard, type TitlePreviewData } from "./TitlePreviewCard";

interface TitleRowProps {
  label: ReactNode;
  hint?: ReactNode;
  items: TitlePreviewData[];
  posterWidth?: number;
}

export function TitleRow({ label, hint, items, posterWidth = 184 }: TitleRowProps) {
  if (items.length === 0) return null;
  const labelText =
    typeof label === "string" || typeof label === "number" ? String(label) : "row";
  return (
    <section className="px-6 md:px-10 py-6">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg md:text-xl tracking-tight font-[var(--font-display)]">{label}</h2>
        {hint && (
          <p className="text-[11px] uppercase tracking-widest text-[var(--color-ink-3)]">{hint}</p>
        )}
      </div>
      <HorizontalScroller ariaLabel={`${labelText} row`} loop>
        {items.map((item) => (
          <div key={item.tmdbId} data-scroller-item className="snap-start shrink-0">
            <TitlePreviewCard data={item} posterWidth={posterWidth} />
          </div>
        ))}
      </HorizontalScroller>
    </section>
  );
}
