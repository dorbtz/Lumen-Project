/**
 * GlassChrome — top nav / persistent toolbar surface.
 * SPEC §5.1 — Chrome material: blur(24px) saturate(180%) + 64% opaque tint.
 *
 * Use for: app-wide nav bar, sticky toolbars, bottom tab bars.
 * Do NOT use for cards or sheets — use GlassCard / GlassSheet.
 */

import { cn } from "@/lib/cn";
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type GlassChromeProps<T extends ElementType = "div"> = {
  as?: T;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function GlassChrome<T extends ElementType = "div">({
  as,
  children,
  className,
  ...rest
}: GlassChromeProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag className={cn("glass-chrome glass-specular", className)} {...rest}>
      {children}
    </Tag>
  );
}
