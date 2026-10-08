'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Zap,
  PlugZap,
  Users,
  Radio,
  Clock,
  TriangleAlert,
  MapPin,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type PowerState = 'on' | 'outage';

interface FeederReading {
  code: string;
  name: string;
  disco: string;
  /** Percentage of consumers currently supplied. */
  operationalPercent: number;
  neighborsNormal: number;
}

/**
 * Illustrative feeder telemetry.
 *
 * These figures are static placeholders, not live DISCO data. They exist to
 * demonstrate the radar layout and must not be read as a real supply status.
 */
const CITY_FEEDERS: FeederReading[] = [
  { code: 'GOR-1', name: 'Mall Road', disco: 'LESCO', operationalPercent: 94, neighborsNormal: 12 },
  { code: 'BRR-4', name: 'Baghban Road', disco: 'LESCO', operationalPercent: 88, neighborsNormal: 7 },
  { code: 'FZD-9', name: 'Ferozepur Road', disco: 'LESCO', operationalPercent: 61, neighborsNormal: 2 },
  { code: 'KHI-2', name: 'Korangi Link', disco: 'KE', operationalPercent: 97, neighborsNormal: 31 },
  { code: 'NSA-7', name: 'North Karachi', disco: 'KE', operationalPercent: 42, neighborsNormal: 1 },
  { code: 'GRM-3', name: 'G-9 Markaz', disco: 'IESCO', operationalPercent: 90, neighborsNormal: 19 },
  { code: 'BLT-6', name: 'Blue Area Feeder', disco: 'IESCO', operationalPercent: 73, neighborsNormal: 5 },
];

const MY_FEEDER: FeederReading = CITY_FEEDERS[0];

/** Typical restoration window used for the countdown estimate, in minutes. */
const TYPICAL_RESTORATION_MINUTES = 45;

function formatCountdown(minutesRemaining: number): string {
  if (minutesRemaining <= 0) return 'Restoration overdue';
  const mins = Math.floor(minutesRemaining);
  if (mins < 60) return `~${mins} min`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest === 0 ? `~${hours} hr` : `~${hours} hr ${rest} min`;
}

export function OutageRadarCard() {
  const [powerState, setPowerState] = useState<PowerState>('on');
  const [view, setView] = useState<'mine' | 'city'>('mine');
  const [outageStartedAt, setOutageStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  // Single interval drives both the clock and the countdown. Stored in a ref
  // so the ticker itself is never torn down and re-created on every render.
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    tick.current = setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, []);

  const handleReportOutage = () => {
    setPowerState('outage');
    // Only stamp the first outage; subsequent toggles keep the original report
    // time so "reported 14m ago" does not reset on every click.
    setOutageStartedAt((prev) => prev ?? Date.now());
  };

  const handleRestorePower = () => {
    setPowerState('on');
    setOutageStartedAt(null);
  };

  const elapsedMinutes = useMemo(() => {
    if (outageStartedAt === null) return 0;
    return Math.max(0, Math.round((now - outageStartedAt) / 60_000));
  }, [now, outageStartedAt]);

  const restorationRemaining = Math.max(
    0,
    TYPICAL_RESTORATION_MINUTES - elapsedMinutes
  );

  const isOutage = powerState === 'outage';

  return (
    <Card
      className={cn(
        'border-2 overflow-hidden rounded-[3rem] transition-colors duration-500',
        isOutage
          ? 'border-red-500/30 bg-red-500/5'
          : 'border-emerald-500/30 bg-emerald-500/5'
      )}
    >
      <CardHeader className="p-6 sm:p-10 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'h-12 w-12 rounded-2xl flex items-center justify-center shrink-0',
                isOutage ? 'bg-red-500/15' : 'bg-emerald-500/15'
              )}
            >
              <Radio
                className={cn(
                  'h-6 w-6',
                  isOutage ? 'text-red-500' : 'text-emerald-500'
                )}
              />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase text-foreground">
                Light Gayi?
              </CardTitle>
              <CardDescription className="font-bold text-muted-foreground uppercase text-[9px] tracking-widest mt-1">
                Feeder Outage &amp; Trip Radar
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
              Demo Telemetry
            </span>
            <Badge
              className={cn(
                'h-7 px-3 rounded-lg font-black text-[9px] uppercase tracking-widest border',
                isOutage
                  ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30'
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
              )}
            >
              {isOutage ? 'Outage Reported' : 'Supply Normal'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 sm:p-10 space-y-8">
        {/* Status buttons */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Button
            onClick={handleRestorePower}
            aria-pressed={!isOutage}
            className={cn(
              'h-16 font-black text-xs uppercase tracking-widest rounded-2xl border transition-all active:scale-[0.98] gap-3',
              !isOutage
                ? 'bg-emerald-500 text-white border-transparent shadow-lg shadow-emerald-500/20'
                : 'bg-background border-border text-muted-foreground hover:bg-accent'
            )}
          >
            <Zap className="h-5 w-5" />
            Bijli Hai
          </Button>

          <Button
            onClick={handleReportOutage}
            aria-pressed={isOutage}
            className={cn(
              'h-16 font-black text-xs uppercase tracking-widest rounded-2xl border transition-all active:scale-[0.98] gap-3',
              isOutage
                ? 'bg-red-500 text-white border-transparent shadow-lg shadow-red-500/20'
                : 'bg-background border-border text-muted-foreground hover:bg-accent'
            )}
          >
            <PlugZap className="h-5 w-5" />
            Light Gayi!
          </Button>
        </div>

        {/* View tabs */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-muted/50 border border-border">
          {(
            [
              { key: 'mine', label: 'My Feeder' },
              { key: 'city', label: 'City Heatmap' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setView(tab.key)}
              aria-pressed={view === tab.key}
              className={cn(
                'h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                view === tab.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {view === 'mine' ? (
          <div className="space-y-6">
            {/* Feeder indicator */}
            <div className="p-5 rounded-2xl border border-border bg-background">
              <div className="flex items-start gap-3 mb-3">
                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm font-black tracking-tight text-foreground">
                  {MY_FEEDER.name} / {MY_FEEDER.code} Feeder
                </p>
              </div>
              <div className="flex flex-wrap items-baseline gap-2">
                <span
                  className={cn(
                    'font-mono tabular-nums text-3xl font-black',
                    MY_FEEDER.operationalPercent >= 90
                      ? 'text-emerald-500'
                      : MY_FEEDER.operationalPercent >= 70
                        ? 'text-amber-500'
                        : 'text-red-500'
                  )}
                >
                  {MY_FEEDER.operationalPercent}%
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Operational
                </span>
              </div>
              <p className="text-xs font-bold text-muted-foreground mt-2">
                {isOutage
                  ? 'Trip reported in your radius — awaiting restoration'
                  : 'Grid Stable'}
              </p>
            </div>

            {/* Metrics */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl border border-border bg-background">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  Outage Timeline
                </p>
                {isOutage && outageStartedAt !== null ? (
                  <>
                    <p className="font-mono tabular-nums text-2xl font-black text-red-500">
                      {elapsedMinutes}m ago
                    </p>
                    <p className="text-xs font-bold text-muted-foreground mt-2">
                      Reported at{' '}
                      {new Date(outageStartedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      &middot; Typical restoration:{' '}
                      {formatCountdown(restorationRemaining)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-bold text-emerald-500">
                    No active outage
                  </p>
                )}
              </div>

              <div className="p-5 rounded-2xl border border-border bg-background">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" />
                  Neighbors Reporting
                </p>
                <p className="font-mono tabular-nums text-2xl font-black text-foreground">
                  {isOutage ? 3 : MY_FEEDER.neighborsNormal}
                </p>
                <p className="text-xs font-bold text-muted-foreground mt-2">
                  {isOutage
                    ? 'neighbors also reported a trip in your radius'
                    : 'neighbors reported normal supply in your radius'}
                </p>
              </div>
            </div>

            {isOutage && (
              <div className="flex items-start gap-3 p-5 rounded-2xl bg-red-500/10 border border-red-500/20">
                <TriangleAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-red-600 dark:text-red-400 leading-relaxed">
                  Trip logged for your feeder. If supply stays out beyond the
                  typical window, lodge a complaint with your DISCO and reference
                  your 14-digit meter number.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* City heatmap */
          <div className="space-y-3">
            {CITY_FEEDERS.map((feeder) => (
              <div
                key={feeder.code}
                className="p-4 rounded-2xl border border-border bg-background flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-black tracking-tight text-foreground truncate">
                    {feeder.name}
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                    {feeder.disco} &middot; {feeder.code}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="w-24 sm:w-32 h-2 rounded-full bg-border overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        feeder.operationalPercent >= 90
                          ? 'bg-emerald-500'
                          : feeder.operationalPercent >= 70
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                      )}
                      style={{ width: `${feeder.operationalPercent}%` }}
                    />
                  </div>
                  <span className="font-mono tabular-nums text-sm font-black text-foreground w-12 text-right">
                    {feeder.operationalPercent}%
                  </span>
                </div>
              </div>
            ))}

            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 leading-relaxed pt-2">
              Illustrative feeder list for layout demonstration. Not sourced
              from DISCO telemetry.
            </p>
          </div>
        )}

        <div className="flex items-start gap-3 pt-2">
          <Activity className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 leading-relaxed">
            Community pulse and feeder percentages on this screen are simulated
            sample data. Check your own meter or your DISCO app for real supply
            status.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default OutageRadarCard;