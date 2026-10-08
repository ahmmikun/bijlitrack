'use client';

import { useMemo, useState } from 'react';
import { Gauge, TrendingUp, ShieldCheck, ShieldAlert, AlertTriangle, CalendarClock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  calculateProjectedUnits,
  calculateSlabImpact,
  calculateProtectedCost,
  calculateUnprotectedCost,
  getRiskZone,
  GST_RATE,
  FIXED_CHARGE_PKR,
  PROTECTED_SLAB_CEILING_UNITS,
  type RiskZone,
} from '@/lib/tariff/slabCalculator';

const MAX_UNITS_INPUT = 500;
const MAX_DAYS_INPUT = 30;

const zoneStyles: Record<RiskZone, { bar: string; text: string; badge: string; label: string }> = {
  safe: {
    bar: 'bg-emerald-500',
    text: 'text-emerald-500',
    badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    label: 'On Track',
  },
  warning: {
    bar: 'bg-amber-500',
    text: 'text-amber-500',
    badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    label: 'Approaching Ceiling',
  },
  critical: {
    bar: 'bg-red-500',
    text: 'text-red-500',
    badge: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
    label: 'Ceiling Breached',
  },
};

function formatPkr(value: number): string {
  return `Rs ${value.toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export interface SlabSimulatorCardProps {
  /** Seeds units consumed, used by the audit deep-link. */
  initialUnits?: number;
  /** Seeds protected status, used by the audit deep-link. */
  initialIsProtected?: boolean;
}

export function SlabSimulatorCard({
  initialUnits,
  initialIsProtected,
}: SlabSimulatorCardProps = {}) {
  const [currentUnits, setCurrentUnits] = useState(() =>
    typeof initialUnits === 'number' && Number.isFinite(initialUnits)
      ? Math.max(0, Math.min(MAX_UNITS_INPUT, Math.round(initialUnits)))
      : 120
  );
  const [daysElapsed, setDaysElapsed] = useState(15);
  const [isProtected, setIsProtected] = useState(initialIsProtected ?? true);

  const impact = useMemo(() => {
    const projected = calculateProjectedUnits(currentUnits, daysElapsed);
    const daysRemaining = Math.max(0, MAX_DAYS_INPUT - daysElapsed);
    return {
      projected,
      result: calculateSlabImpact(projected, isProtected, daysRemaining),
    };
  }, [currentUnits, daysElapsed, isProtected]);

  const { projected, result } = impact;
  const zone = getRiskZone(projected);
  const styles = zoneStyles[zone];

  // Gauge fills against 300 units so the post-cliff zone stays visible.
  const gaugePercent = Math.min(100, (projected / 300) * 100);
  const ceilingPercent = (PROTECTED_SLAB_CEILING_UNITS / 300) * 100;

  return (
    <div className="space-y-8">
      <Card className="border-border shadow-2xl shadow-foreground/5 overflow-hidden rounded-[3rem]">
        <CardHeader className="p-6 sm:p-10 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase">
                Slab Cliff Simulator
              </CardTitle>
              <CardDescription className="font-bold text-muted-foreground uppercase text-[9px] tracking-widest mt-1">
                Protect your {PROTECTED_SLAB_CEILING_UNITS}-unit protected status
              </CardDescription>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-primary flex items-center justify-center shrink-0">
              <Gauge className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-10 space-y-10">
          {/* Units consumed */}
          <div className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <label
                htmlFor="sim-units"
                className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
              >
                Units Consumed So Far
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="sim-units"
                  type="number"
                  min={0}
                  max={MAX_UNITS_INPUT}
                  value={currentUnits}
                  onChange={(e) =>
                    setCurrentUnits(
                      Math.max(
                        0,
                        Math.min(MAX_UNITS_INPUT, Number(e.target.value) || 0)
                      )
                    )
                  }
                  className="w-24 h-11 px-3 bg-background border border-border rounded-xl text-right font-mono tabular-nums text-sm font-black text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  kWh
                </span>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={MAX_UNITS_INPUT}
              value={currentUnits}
              onChange={(e) => setCurrentUnits(Number(e.target.value))}
              className="w-full accent-primary"
              aria-label="Units consumed so far"
            />
          </div>

          {/* Days elapsed */}
          <div className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <label
                htmlFor="sim-days"
                className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
              >
                Days Elapsed This Cycle
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="sim-days"
                  type="number"
                  min={1}
                  max={MAX_DAYS_INPUT}
                  value={daysElapsed}
                  onChange={(e) =>
                    setDaysElapsed(
                      Math.max(
                        1,
                        Math.min(MAX_DAYS_INPUT, Number(e.target.value) || 1)
                      )
                    )
                  }
                  className="w-24 h-11 px-3 bg-background border border-border rounded-xl text-right font-mono tabular-nums text-sm font-black text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Days
                </span>
              </div>
            </div>
            <input
              type="range"
              min={1}
              max={MAX_DAYS_INPUT}
              value={daysElapsed}
              onChange={(e) => setDaysElapsed(Number(e.target.value))}
              className="w-full accent-primary"
              aria-label="Days elapsed this cycle"
            />
          </div>

          {/* Protected status toggle */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Currently Protected Consumer
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setIsProtected(true)}
                className={cn(
                  'h-12 font-bold text-[10px] uppercase tracking-widest rounded-xl border transition-all gap-2',
                  isProtected
                    ? 'bg-primary text-primary-foreground border-transparent shadow-md'
                    : 'bg-background border-border text-muted-foreground hover:bg-accent'
                )}
              >
                <ShieldCheck className="h-4 w-4" />
                Yes
              </Button>
              <Button
                onClick={() => setIsProtected(false)}
                className={cn(
                  'h-12 font-bold text-[10px] uppercase tracking-widest rounded-xl border transition-all gap-2',
                  !isProtected
                    ? 'bg-primary text-primary-foreground border-transparent shadow-md'
                    : 'bg-background border-border text-muted-foreground hover:bg-accent'
                )}
              >
                <ShieldAlert className="h-4 w-4" />
                No
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projection output */}
      <Card
        className={cn(
          'border-2 overflow-hidden rounded-[3rem]',
          zone === 'critical'
            ? 'border-red-500/30 bg-red-500/5'
            : zone === 'warning'
              ? 'border-amber-500/30 bg-amber-500/5'
              : 'border-emerald-500/30 bg-emerald-500/5'
        )}
      >
        <CardHeader className="p-6 sm:p-10 border-b border-border/50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase text-foreground">
                Projected End-of-Cycle Usage
              </CardTitle>
              <CardDescription className="font-bold text-muted-foreground uppercase text-[9px] tracking-widest mt-1">
                Based on your current run rate
              </CardDescription>
            </div>
            <Badge
              className={cn(
                'h-8 px-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] border',
                styles.badge
              )}
            >
              {styles.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-10 space-y-8">
          {/* Big number + gauge */}
          <div className="space-y-4">
            <div className="flex items-end gap-3">
              <p className={cn('font-mono tabular-nums text-5xl sm:text-6xl font-black tracking-tighter', styles.text)}>
                {projected.toLocaleString('en-PK')}
              </p>
              <span className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-2">
                kWh
              </span>
            </div>

            <div className="relative h-5 w-full rounded-full bg-border overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', styles.bar)}
                style={{ width: `${gaugePercent}%` }}
              />
              <div
                className="absolute top-0 h-full w-0.5 bg-foreground/70"
                style={{ left: `${ceilingPercent}%` }}
                title={`${PROTECTED_SLAB_CEILING_UNITS}-unit ceiling`}
              />
            </div>

            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
              <span>0</span>
              <span className={cn(zone === 'critical' ? 'text-red-500' : 'text-foreground/70')}>
                {PROTECTED_SLAB_CEILING_UNITS} Unit Ceiling
              </span>
              <span>300+</span>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl border border-border bg-background">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                <CalendarClock className="h-3.5 w-3.5" />
                Days Remaining
              </p>
              <p className="font-mono tabular-nums text-2xl font-black text-foreground">
                {Math.max(0, MAX_DAYS_INPUT - daysElapsed)}
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-border bg-background">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5" />
                Safe Daily Budget
              </p>
              <p className={cn('font-mono tabular-nums text-2xl font-black', result.isAtRisk ? 'text-red-500' : 'text-emerald-500')}>
                {result.dailySafeBudgetUnits.toFixed(1)}
                <span className="text-xs font-black text-muted-foreground ml-1">
                  kWh/day
                </span>
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-border bg-background">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5" />
                Headroom
              </p>
              <p className={cn('font-mono tabular-nums text-2xl font-black', result.unitsUntilCliff === 0 ? 'text-red-500' : 'text-foreground')}>
                {result.unitsUntilCliff.toLocaleString('en-PK')}
                <span className="text-xs font-black text-muted-foreground ml-1">
                  kWh
                </span>
              </p>
            </div>
          </div>

          {/* Advisory line */}
          {!result.isAtRisk && isProtected && (
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              Stay under {result.dailySafeBudgetUnits.toFixed(1)} units/day to
              protect your slab and save{' '}
              {formatPkr(calculateCliffAvoidance(projected))}.
            </p>
          )}

          {!isProtected && (
            <p className="text-sm font-bold text-muted-foreground">
              You are already on the unprotected schedule, so there is no
              ceiling to protect. This projection shows the slab you are paying.
            </p>
          )}

          {result.isAtRisk && (
            <Alert className="rounded-[2rem] border-2 border-red-500/20 bg-red-500/5 p-6">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
              <div className="ml-3">
                <AlertTitle className="text-xs font-black uppercase tracking-widest text-red-600 dark:text-red-400">
                  Cliff Penalty Alert
                </AlertTitle>
                <AlertDescription className="text-xs font-medium mt-2 leading-relaxed">
                  Your projected consumption of{' '}
                  <span className="font-mono tabular-nums font-black">
                    {projected.toLocaleString('en-PK')} kWh
                  </span>{' '}
                  crosses the {PROTECTED_SLAB_CEILING_UNITS}-unit ceiling. You
                  will be reclassified onto the unprotected schedule for the
                  full cycle, costing an estimated{' '}
                  <span className="font-mono tabular-nums font-black text-red-500">
                    {formatPkr(result.estimatedJumpCostPkr)}
                  </span>{' '}
                  in additional charges including GST.
                </AlertDescription>
              </div>
            </Alert>
          )}

          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 leading-relaxed">
            Estimate only. Slab rates are NEPRA-published figures and are revised
            each tariff cycle; confirm against your current tariff schedule and
            bill.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/** What the consumer stands to avoid by holding consumption under the ceiling. */
/**
 * What the consumer stands to avoid by holding consumption under the ceiling.
 * Reuses the shared calculator so the advisory figure cannot drift from the
 * tariff maths the module actually applies.
 */
function calculateCliffAvoidance(projectedUnits: number): number {
  const units = Math.min(projectedUnits, PROTECTED_SLAB_CEILING_UNITS);
  const delta = calculateUnprotectedCost(units) - calculateProtectedCost(units);
  return delta + delta * GST_RATE + FIXED_CHARGE_PKR;
}

export default SlabSimulatorCard;