/**
 * GlassCard — primary content surface (cards, modals, hover previews).
 * SPEC §5.1 — Regular (default) or Thin (popovers/hover-cards) variants.
 *
 * Variants:
 *   - weight="regular" → blur(18px) sat(160%) + 72% tint
 *   - weight="thin"    → blur(12px) sat(140%) + 56% tint
 *
 * `interactive` adds a hover lift + brighter ring (Apple springiness).
 *
 * Performance: respect SPEC §5.7 budget — ≤6 simultaneous glass surfaces per viewport.
 */

import { cn } from "@/lib/cn";
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

export type GlassWeight = "regular" | "thin";

type GlassCardProps<T extends ElementType = "div"> = {
  as?: T;
  weight?: GlassWeight;
  interactive?: boolean;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function GlassCard<T extends ElementType = "div">({
  as,
  weight = "regular",
  interactive = false,
  children,
  className,
  ...rest
}: GlassCardProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag
      className={cn(
        weight === "regular" ? "glass-regular" : "glass-thin",
        "glass-specular",
        "p-6",
        interactive &&
          "cursor-pointer will-change-transform hover:-translate-y-0.5 hover:shadow-[0_30px_70px_-20px_oklch(0_0_0_/_0.6)]",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
