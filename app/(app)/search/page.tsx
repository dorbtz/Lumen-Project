/**
 * /search — orphan-route compatibility shim.
 *
 * The primary search UX is the global SearchOverlay (Cmd/Ctrl+K or `/`). This
 * page exists only so that deep links and bookmarks to /search still work — it
 * redirects to /home with a query flag the overlay listens for, so the user
 * lands on Home with the search modal already open.
 */

import { redirect } from "next/navigation";

export default function SearchRedirect(): never {
  redirect("/home?search=1");
}
