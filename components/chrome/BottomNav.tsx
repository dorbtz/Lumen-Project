"use client";

/**
 * BottomNav — iOS-style fixed tab bar shown on mobile only.
 *
 *   - Below `md:` (≥768px) only — desktop uses inline NavLinks in the top
 *     chrome.
 *   - All six destinations rendered as icon + small label, equally distributed.
 *   - Active route: sapphire-tinted icon + label with a soft glass pill.
 *   - Bottom edge respects `env(safe-area-inset-bottom)` so it lifts above
 *     the iPhone home indicator.
 *
 * Source of truth for icons + hrefs is `./nav-config`, shared with NavLinks.
 */

import { NAV_LINKS, isActive } from "@/components/chrome/nav-config";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Primary navigation"
      className="md:hidden fixed left-0 right-0 bottom-0 z-30"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-3 mb-3 glass-regular glass-specular rounded-full ring-1 ring-white/10 shadow-[0_-12px_40px_-10px_oklch(0_0_0_/_0.55)]">
        <ul className="flex items-stretch justify-between px-2 py-1.5">
          {NAV_LINKS.map((link) => {
            const active = isActive(pathname, link.match);
            const Icon = link.icon;
            return (
              <li key={link.href} className="flex-1">
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-full transition-colors ${
                    active
                      ? "text-[var(--color-accent)]"
                      : "text-[var(--color-ink-2)] hover:text-[var(--color-ink-0)]"
                  }`}
                >
                  <span className="inline-flex w-5 h-5">
                    <Icon />
                  </span>
                  <span className="text-[9px] tracking-[0.06em] leading-none">
                    {link.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
