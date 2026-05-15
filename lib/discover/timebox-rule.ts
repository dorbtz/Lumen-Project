/**
 * Lumen — pure Time-Box rules (SPEC_COMPLETION §1 A1).
 *
 * Extracted so the runtime-budget rules are unit-testable without a DB
 * (SPEC_COMPLETION §2 B2):
 *   - budgets below 40 min are non-viable (empty state)
 *   - the runtime filter is `runtime_min <= budget + 8` (grace)
 */

export const TIMEBOX_MIN_VIABLE_MIN = 40;
export const TIMEBOX_GRACE_MIN = 8;

export function isViableBudget(minutes: number): boolean {
  return Number.isFinite(minutes) && minutes >= TIMEBOX_MIN_VIABLE_MIN;
}

export function runtimeCap(minutes: number): number {
  return Math.round(minutes) + TIMEBOX_GRACE_MIN;
}

export function fitsBudget(runtimeMin: number | null, minutes: number): boolean {
  if (runtimeMin == null) return false;
  return runtimeMin <= runtimeCap(minutes);
}
