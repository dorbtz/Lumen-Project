/**
 * Shared nav config for AppChrome — single source of truth for the 6 nav
 * destinations, their labels, active-route matchers, and SVG icons. Imported
 * by both the desktop inline `NavLinks` row and the mobile `BottomNav` bar.
 */

import type { ReactElement } from "react";

export interface NavLink {
  href: string;
  label: string;
  /** Section prefix used for active matching. */
  match: string;
  icon: () => ReactElement;
}

export const NAV_LINKS: NavLink[] = [
  { href: "/home", label: "Home", match: "/home", icon: HomeIcon },
  { href: "/discover", label: "Discover", match: "/discover", icon: CompassIcon },
  { href: "/journal", label: "Journal", match: "/journal", icon: BookIcon },
  { href: "/watchlist", label: "Watchlist", match: "/watchlist", icon: BookmarkIcon },
  { href: "/weather", label: "Weather", match: "/weather", icon: CloudSunIcon },
  { href: "/recap", label: "Recap", match: "/recap", icon: FeatherIcon },
];

export function isActive(pathname: string, match: string): boolean {
  return pathname === match || pathname.startsWith(`${match}/`);
}

function HomeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="w-full h-full"
    >
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="w-full h-full"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5.5-5.5 2 2-5.5 5.5-2Z" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="w-full h-full"
    >
      <path d="M12 6.5C10 5 7 4 4 4v15c3 0 6 1 8 2.5" />
      <path d="M12 6.5C14 5 17 4 20 4v15c-3 0-6 1-8 2.5" />
      <path d="M12 6.5v15" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="w-full h-full"
    >
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function CloudSunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="w-full h-full"
    >
      <path d="M12 3v1.5" />
      <path d="M5.6 5.6 6.7 6.7" />
      <path d="M3 12h1.5" />
      <path d="M18.4 5.6 17.3 6.7" />
      <circle cx="11" cy="11" r="3.2" />
      <path d="M16 14a4 4 0 0 1 4 4 3 3 0 0 1-3 3H9a4 4 0 0 1-1-7.9" />
    </svg>
  );
}

function FeatherIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="w-full h-full"
    >
      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5Z" />
      <path d="M16 8 2 22" />
      <path d="M17.5 15H9" />
    </svg>
  );
}
