/**
 * GlassSheet — full-width drawer / bottom sheet / modal scrim panel.
 * SPEC §5.1 — Regular material, stretches to fill its container.
 *
 * Use for: profile picker, settings drawer, recap story cards background.
 */

import { cn } from "@/lib/cn";
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type GlassSheetProps<T extends ElementType = "section"> = {
  as?: T;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function GlassSheet<T extends ElementType = "section">({
  as,
  children,
  className,
  ...rest
}: GlassSheetProps<T>) {
  const Tag = (as ?? "section") as ElementType;
  return (
    <Tag
      className={cn(
        "glass-regular glass-specular",
        "w-full max-w-3xl mx-auto p-8 md:p-12",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
