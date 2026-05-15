"use client";

/**
 * NavLinks — desktop inline nav row inside the top chrome.
 *
 *   - Hidden below `md:` (mobile uses BottomNav instead).
 *   - Home is icon-only; the rest show their icon only when active.
 *   - Active state derives from `usePathname`.
 *
 * Icons + link config live in `./nav-config` so BottomNav shares the same
 * source of truth.
 */

import { NAV_LINKS, isActive } from "@/components/chrome/nav-config";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks() {
  const pathname = usePathname() ?? "";

  return (
    <div className="hidden md:flex items-center gap-6">
      {NAV_LINKS.map((link) => {
        const active = isActive(pathname, link.match);
        const isHome = link.href === "/home";
        const Icon = link.icon;
        const baseClasses = active
          ? "text-[var(--color-accent)]"
          : "text-[var(--color-ink-2)] hover:text-[var(--color-ink-0)] transition-colors";

        if (isHome) {
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-label={link.label}
              aria-current={active ? "page" : undefined}
              className={`inline-flex items-center w-5 h-5 ${baseClasses}`}
            >
              <Icon />
            </Link>
          );
        }

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex items-center gap-1.5 text-sm tracking-tight ${baseClasses}`}
          >
            {active && (
              <span className="inline-flex w-4 h-4">
                <Icon />
              </span>
            )}
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
