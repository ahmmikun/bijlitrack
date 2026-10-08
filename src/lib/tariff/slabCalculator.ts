/**
 * NEPRA slab cliff calculator.
 *
 * Pure functions only — no React, no I/O — so the tariff maths is testable and
 * reusable from both the simulator UI and server-side advisory logic.
 */

/** Consumers lose protected status when a billing cycle exceeds this ceiling. */
export const PROTECTED_SLAB_CEILING_UNITS = 200;

export const DEFAULT_CYCLE_DAYS = 30;

/**
 * Telescopic residential slab rates, PKR per kWh.
 *
 * PROTECTED: consumer retains the protected (lower) schedule up to the ceiling.
 * UNPROTECTED: the schedule a consumer is reclassified onto once the ceiling is
 * crossed, and the one non-protected consumers already pay.
 */
export const SLAB_RATES = {
  protected: [
    { upTo: 100, rate: 10.54 },
    { upTo: 200, rate: 13.01 },
  ],
  unprotected: [
    { upTo: 100, rate: 22.44 },
    { upTo: 200, rate: 28.91 },
    { upTo: 300, rate: 33.1 },
  ],
} as const;

/** GST applied to the recovery delta. */
export const GST_RATE = 0.18;

/**
 * Standard monthly fixed charge (customer service charge) in PKR, levied per
 * sanctioned load. Doubles where more than one slab group is billed.
 */
export const FIXED_CHARGE_PKR = 60;

/**
 * Projects end-of-cycle consumption from the run rate so far.
 * Guards against division by zero on day 0.
 */
export function calculateProjectedUnits(
  currentUnits: number,
  daysElapsed: number,
  cycleDays: number = DEFAULT_CYCLE_DAYS
): number {
  if (daysElapsed <= 0 || cycleDays <= 0) {
    return Math.max(0, currentUnits);
  }

  const dailyRate = currentUnits / daysElapsed;
  return round2(dailyRate * cycleDays);
}

export interface SlabImpact {
  projectedTotal: number;
  isAtRisk: boolean;
  unitsUntilCliff: number;
  estimatedJumpCostPkr: number;
  dailySafeBudgetUnits: number;
}

/**
 * Telescopic cost of `units` across a slab schedule. Each slab is charged only
 * on the units falling inside it.
 */
export function calculateTelescopicCost(
  units: number,
  schedule: ReadonlyArray<{ upTo: number; rate: number }>
): number {
  if (units <= 0) return 0;

  let cost = 0;
  let previousCap = 0;

  for (const slab of schedule) {
    const unitsInSlab = Math.min(units, slab.upTo) - previousCap;
    if (unitsInSlab > 0) {
      cost += unitsInSlab * slab.rate;
    }
    previousCap = slab.upTo;
    if (units <= slab.upTo) break;
  }

  // Units beyond the last modelled slab are charged at the final slab's rate.
  if (units > previousCap) {
    const finalRate = schedule[schedule.length - 1].rate;
    cost += (units - previousCap) * finalRate;
  }

  return cost;
}

export function calculateProtectedCost(units: number): number {
  return calculateTelescopicCost(units, SLAB_RATES.protected);
}

export function calculateUnprotectedCost(units: number): number {
  return calculateTelescopicCost(units, SLAB_RATES.unprotected);
}

/**
 * Cost of reclassifying a consumer from the protected to the unprotected
 * schedule, inclusive of GST on the delta and the fixed-charge step.
 *
 * The reclassification applies to the whole cycle, not just the units above
 * 200, so the penalty is priced across the full projected consumption.
 */
export function calculateJumpCost(projectedUnits: number): number {
  if (projectedUnits <= PROTECTED_SLAB_CEILING_UNITS) return 0;

  const protectedCost = calculateProtectedCost(projectedUnits);
  const unprotectedCost = calculateUnprotectedCost(projectedUnits);
  const delta = unprotectedCost - protectedCost;
  const gstOnDelta = delta * GST_RATE;
  const fixedChargeDelta = FIXED_CHARGE_PKR;

  return round2(delta + gstOnDelta + fixedChargeDelta);
}

/**
 * Projects the ceiling position for a consumer.
 *
 * `daysRemaining` is optional so the two-argument form in the spec keeps
 * working; it is required for an accurate daily budget, since the safe daily
 * allowance is the remaining headroom divided by the days left to spend it.
 */
export function calculateSlabImpact(
  projectedUnits: number,
  isCurrentlyProtected: boolean,
  daysRemaining: number = 0
): SlabImpact {
  const projectedTotal = Math.max(0, round2(projectedUnits));

  const crossesCliff =
    isCurrentlyProtected && projectedTotal > PROTECTED_SLAB_CEILING_UNITS;

  // A consumer who is not protected has no ceiling headroom worth protecting.
  const unitsUntilCliff = isCurrentlyProtected
    ? Math.max(0, round2(PROTECTED_SLAB_CEILING_UNITS - projectedTotal))
    : 0;

  const dailySafeBudgetUnits =
    isCurrentlyProtected && daysRemaining > 0
      ? round2(unitsUntilCliff / daysRemaining)
      : 0;

  return {
    projectedTotal,
    isAtRisk: crossesCliff,
    unitsUntilCliff,
    estimatedJumpCostPkr: crossesCliff ? calculateJumpCost(projectedTotal) : 0,
    dailySafeBudgetUnits,
  };
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export type RiskZone = 'safe' | 'warning' | 'critical';

/**
 * Colour bands for the progress gauge. The amber band starts at 160 rather
 * than exactly at the ceiling so a consumer still under 200 gets a warning
 * before it is too late to course-correct.
 */
export function getRiskZone(units: number): RiskZone {
  if (units >= PROTECTED_SLAB_CEILING_UNITS) return 'critical';
  if (units >= 160) return 'warning';
  return 'safe';
}