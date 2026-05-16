/**
 * Lumen — pure ISO-week seed (plan WS7).
 *
 * "Featured tonight" and the hero billboard must feel curated and refresh
 * on a weekly cadence rather than re-rolling on every request. We derive a
 * stable integer from the ISO-week-numbering year + week so the same pick
 * holds all week, then advances. Pure + dependency-free for unit testing.
 */

/** ISO-8601 week number (1–53) for a date, with its week-numbering year. */
export function isoWeek(date: Date): { year: number; week: number } {
  // Copy to a UTC date at midnight to avoid TZ/DST drift.
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // ISO weeks start Monday; shift Sunday(0) → 7.
  const day = d.getUTCDay() || 7;
  // Thursday of the current week decides the week-numbering year.
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const year = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year, week };
}

/**
 * A non-negative integer that is stable within an ISO week and changes
 * every week. `year * 53 + week` keeps it monotonic across year boundaries.
 */
export function weekSeed(date: Date = new Date()): number {
  const { year, week } = isoWeek(date);
  return year * 53 + week;
}

/**
 * Deterministically pick an index in `[0, poolLength)` for the given week.
 * Returns 0 for an empty pool (caller guards). Stable per week, rotates
 * weekly, and visits different entries as the pool/length varies.
 */
export function weeklyIndex(poolLength: number, date: Date = new Date()): number {
  if (poolLength <= 0) return 0;
  return weekSeed(date) % poolLength;
}
