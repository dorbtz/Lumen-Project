/**
 * Lumen — pure Time-Box rules (SPEC_COMPLETION §1 A1).
 *
 * Extracted so the runtime-budget rules are unit-testable without a DB
 * (SPEC_COMPLETION §2 B2):
 *   - budgets below 40 min are non-viable (empty state)
 *   - the runtime filter is a *band* `floor <= runtime_min <= budget + 8`,
 *     not just a ceiling — so the budget behaves like a target length and
 *     Quick / Standard / Epic surface genuinely different films instead of
 *     the same short popular titles topping every bucket.
 */

export const TIMEBOX_MIN_VIABLE_MIN = 40;
export const TIMEBOX_GRACE_MIN = 8;
/** Lower edge of the band as a fraction of the budget. */
export const TIMEBOX_FLOOR_RATIO = 0.62;

export function isViableBudget(minutes: number): boolean {
  return Number.isFinite(minutes) && minutes >= TIMEBOX_MIN_VIABLE_MIN;
}

export function runtimeCap(minutes: number): number {
  return Math.round(minutes) + TIMEBOX_GRACE_MIN;
}

/**
 * Lower bound of the runtime band for a budget. Scales with the budget
 * (~62%) so picking 90 vs 120 vs 150 targets short / mid / long features
 * respectively. Clamped to the viable minimum and kept strictly below the
 * cap so the band is always non-empty.
 */
export function runtimeFloor(minutes: number): number {
  const floor = Math.round(Math.round(minutes) * TIMEBOX_FLOOR_RATIO);
  return Math.max(
    TIMEBOX_MIN_VIABLE_MIN,
    Math.min(floor, runtimeCap(minutes) - 1),
  );
}

export function fitsBudget(runtimeMin: number | null, minutes: number): boolean {
  if (runtimeMin == null) return false;
  return runtimeMin <= runtimeCap(minutes);
}
