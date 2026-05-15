"use client";

/**
 * ViewedRecapBeacon — fires the `viewed_recap` product event once when the
 * recap surface renders (SPEC_COMPLETION §2 B3). Render-only, no UI.
 */

import { capture } from "@/lib/analytics/events";
import { useEffect } from "react";

export function ViewedRecapBeacon({ entryCount }: { entryCount: number }) {
  useEffect(() => {
    capture("viewed_recap", { entryCount });
  }, [entryCount]);
  return null;
}
