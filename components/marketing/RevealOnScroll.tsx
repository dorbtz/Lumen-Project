"use client";

/**
 * RevealOnScroll — wraps content with an `IntersectionObserver`-driven
 * reveal: rises 24px and fades in once the element scrolls into view.
 * One-shot (doesn't re-trigger on subsequent scrolls). Honours
 * prefers-reduced-motion.
 */

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Stagger this section's start relative to a parent reveal (seconds). */
  delay?: number;
  /** How much of the element must be in view to trigger (0..1). */
  amount?: number;
  className?: string;
}

export function RevealOnScroll({ children, delay = 0, amount = 0.25, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const inView = useInView(ref, { once: true, amount });

  return (
    <motion.div
      ref={ref}
      initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={
        reduceMotion ? { duration: 0 } : { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}
