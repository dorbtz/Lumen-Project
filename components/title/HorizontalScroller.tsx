"use client";

/**
 * HorizontalScroller — Apple TV / Netflix–style scrollable row, built on
 * Embla Carousel.
 *
 * Behaviour:
 *   - Loop mode: seamless infinite scrolling. Embla repositions slides
 *     internally so the wraparound from last → first looks like any other
 *     card-to-card step (uniform gap, no jump).
 *   - One card per arrow click (slidesToScroll: 1).
 *   - Keyboard / D-pad ArrowLeft / ArrowRight: focuses prev / next slide
 *     and uses Embla's own scrollTo so loop wrap is honored — no DOM-jump
 *     to the leftmost first slide.
 *   - Drag-to-swipe with inertia on touch + trackpad (Embla native).
 *   - prefers-reduced-motion: animations collapse to instant.
 *
 * Slide spacing follows Embla's official pattern: each slide carries
 * `padding-left: SLIDE_SPACING` and the container has `margin-left:
 * -SLIDE_SPACING`. Loop wrap stays visually uniform because every slide —
 * including Embla's repositioned ones — uses the same padding rule.
 */

import useEmblaCarousel from "embla-carousel-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Children,
  isValidElement,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface HorizontalScrollerProps {
  children: ReactNode;
  ariaLabel?: string;
  /** When true and content overflows, the row loops infinitely. */
  loop?: boolean;
}

const SLIDE_SPACING_PX = 16; // matches former gap-4

export function HorizontalScroller({ children, ariaLabel, loop = true }: HorizontalScrollerProps) {
  const reduceMotion = useReducedMotion();
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: loop ? false : "trimSnaps",
    loop,
    skipSnaps: false,
    dragFree: false,
    duration: reduceMotion ? 0 : 22, // tween frames per step — feels brisk
    slidesToScroll: 1, // one card per arrow click
    // 100% — only fully visible slides count as "in view". Without this the
    // default (0) treats a 1px-clipped slide as visible, so right-arrow nav
    // would land focus on a poster still clipped at the viewport edge.
    inViewThreshold: 1,
  });
  const [hovered, setHovered] = useState(false);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  // Detect touch primary input — buttons hide on touch (native swipe handles it).
  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  // Sync prev/next button state from Embla.
  useEffect(() => {
    if (!emblaApi) return;
    const update = () => {
      setCanPrev(loop ? true : emblaApi.canScrollPrev());
      setCanNext(loop ? true : emblaApi.canScrollNext());
    };
    update();
    emblaApi.on("init", update);
    emblaApi.on("reInit", update);
    emblaApi.on("select", update);
    return () => {
      emblaApi.off("init", update);
      emblaApi.off("reInit", update);
      emblaApi.off("select", update);
    };
  }, [emblaApi, loop]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  // Wrap each child in an Embla "slide" envelope. Padding-left is what creates
  // the uniform gap; the container's negative margin-left offsets the first
  // slide's padding so the row visually starts at the viewport edge.
  const slides = useMemo(() => {
    const out: ReactElement[] = [];
    Children.forEach(children, (c, i) => {
      if (!isValidElement(c)) return;
      out.push(
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: stable position per render
          key={i}
          className="flex-none min-w-0"
          style={{ paddingLeft: SLIDE_SPACING_PX }}
        >
          {c}
        </div>,
      );
    });
    return out;
  }, [children]);

  // Keyboard / D-pad navigation — focus-first, like Apple TV.
  //
  //   - Each press moves focus to the next/prev slide.
  //   - The row only scrolls when the newly focused slide is NOT already
  //     visible in the viewport. Cards that are on-screen stay put; only
  //     crossing the viewport edge triggers a scroll.
  //   - Loop wrap is honored: Right at the last slide focuses the first and
  //     scrolls (since first is off-screen) via Embla's scrollTo.
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (!emblaApi) return;
    const slideEls = emblaApi.slideNodes();
    const n = slideEls.length;
    if (n === 0) return;
    const activeEl = document.activeElement;
    const currentIdx = slideEls.findIndex(
      (s) => s === activeEl || s.contains(activeEl as Node | null),
    );
    let idx: number;
    if (currentIdx >= 0) {
      idx = currentIdx;
    } else {
      // Nothing focused inside the row yet — start from the leftmost
      // visible slide so the first keypress lands somewhere sensible.
      const visible = emblaApi.slidesInView();
      idx = visible.length > 0 ? visible[0]! : emblaApi.selectedScrollSnap();
    }
    const next = e.key === "ArrowRight" ? (idx + 1) % n : (idx - 1 + n) % n;
    e.preventDefault();

    // Only scroll if the next slide isn't already fully on-screen. Use
    // directional scrollNext/scrollPrev (NOT scrollTo) — with align: "start"
    // a scrollTo(next) would snap `next` to the LEFT edge of the viewport,
    // causing the previously-visible left cards to fly off (the "jump" bug).
    // scrollNext advances exactly one slide and honors loop wrap.
    const visibleSlides = emblaApi.slidesInView();
    if (!visibleSlides.includes(next)) {
      if (e.key === "ArrowRight") emblaApi.scrollNext();
      else emblaApi.scrollPrev();
    }

    // Move focus to the new slide's first interactive child. Wait one
    // frame so Embla's layout settles before focusing (only matters when
    // we did scroll).
    requestAnimationFrame(() => {
      const target = slideEls[next];
      const focusable = target?.querySelector<HTMLElement>("a, button");
      focusable?.focus({ preventScroll: true });
    });
  };

  const showButtons = !isTouch;

  return (
    <div
      ref={rowRef}
      className="relative group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onKeyDown={onKeyDown}
    >
      <div
        className="overflow-hidden -mx-6 px-6 md:-mx-10 md:px-10"
        ref={emblaRef}
        aria-label={ariaLabel ?? "Scrollable row"}
        role="region"
      >
        <div className="flex py-4" style={{ marginLeft: -SLIDE_SPACING_PX }}>
          {slides}
        </div>
      </div>

      {showButtons && (
        <>
          <ChevronButton
            side="left"
            visible={hovered && canPrev}
            onClick={scrollPrev}
            reduceMotion={reduceMotion ?? false}
          />
          <ChevronButton
            side="right"
            visible={hovered && canNext}
            onClick={scrollNext}
            reduceMotion={reduceMotion ?? false}
          />
        </>
      )}
    </div>
  );
}

function ChevronButton({
  side,
  visible,
  onClick,
  reduceMotion,
}: {
  side: "left" | "right";
  visible: boolean;
  onClick: () => void;
  reduceMotion: boolean;
}) {
  const sideClasses = side === "left" ? "left-2 md:left-4" : "right-2 md:right-4";
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Scroll row left" : "Scroll row right"}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      initial={false}
      animate={{
        opacity: visible ? 1 : 0,
        scale: visible ? 1 : 0.85,
        pointerEvents: visible ? "auto" : "none",
      }}
      transition={
        reduceMotion ? { duration: 0 } : { type: "spring", damping: 28, stiffness: 280 }
      }
      className={`absolute top-1/2 -translate-y-1/2 z-20 ${sideClasses} size-11 md:size-12 rounded-full glass-thin glass-specular flex items-center justify-center text-[var(--color-ink-0)] hover:scale-105 active:scale-95 transition-transform`}
    >
      {side === "left" ? <ChevronLeft /> : <ChevronRight />}
    </motion.button>
  );
}

function ChevronLeft() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="w-5 h-5"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="w-5 h-5"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
