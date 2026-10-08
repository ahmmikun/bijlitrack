'use client';

import { useMemo, useState } from 'react';
import { Plug, Zap, Clock, Moon, Sun, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  APPLIANCE_PRESETS,
  calculateApplianceCost,
  PEAK_RATE_PER_UNIT,
  OFF_PEAK_RATE_PER_UNIT,
  PEAK_WINDOW,
  type AppliancePreset,
} from '@/lib/tariff/applianceCalculator';

const DAYS_PER_MONTH = 30;
const MAX_HOURS = 24;

function formatPkr(value: number): string {
  return `Rs ${value.toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function ApplianceCostCard() {
  const [selectedId, setSelectedId] = useState(APPLIANCE_PRESETS[0].id);
  const [hoursPerDay, setHoursPerDay] = useState(
    APPLIANCE_PRESETS[0].defaultHoursPerDay
  );
  const [isPeakHour, setIsPeakHour] = useState(false);

  const preset: AppliancePreset =
    APPLIANCE_PRESETS.find((p) => p.id === selectedId) ?? APPLIANCE_PRESETS[0];

  const result = useMemo(
    () =>
      calculateApplianceCost({
        wattage: preset.wattage,
        hoursPerDay,
        daysPerMonth: DAYS_PER_MONTH,
        ratePerUnit: isPeakHour ? PEAK_RATE_PER_UNIT : OFF_PEAK_RATE_PER_UNIT,
        isPeakHour,
      }),
    [preset, hoursPerDay, isPeakHour]
  );

  const handleSelect = (next: AppliancePreset) => {
    setSelectedId(next.id);
    setHoursPerDay(next.defaultHoursPerDay);
  };

  return (
    <Card className="border-border shadow-2xl shadow-foreground/5 overflow-hidden rounded-[3rem]">
      <CardHeader className="p-6 sm:p-10 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase">
              Appliance Run Cost
            </CardTitle>
            <CardDescription className="font-bold text-muted-foreground uppercase text-[9px] tracking-widest mt-1">
              Running cost per appliance, including GST
            </CardDescription>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-primary flex items-center justify-center shrink-0">
            <Plug className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 sm:p-10 space-y-8">
        {/* Preset grid */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Select an Appliance
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {APPLIANCE_PRESETS.map((item) => {
              const isActive = item.id === preset.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  aria-pressed={isActive}
                  className={cn(
                    'flex flex-col items-start gap-1.5 p-3.5 rounded-2xl border text-left transition-all active:scale-[0.98]',
                    isActive
                      ? 'bg-primary text-primary-foreground border-transparent shadow-md'
                      : 'bg-background border-border text-foreground hover:bg-accent'
                  )}
                >
                  <span
                    className={cn(
                      'text-[11px] font-black tracking-tight leading-tight',
                      isActive ? 'text-primary-foreground' : 'text-foreground'
                    )}
                  >
                    {item.name}
                  </span>
                  <span
                    className={cn(
                      'font-mono tabular-nums text-[10px] font-black',
                      isActive
                        ? 'text-primary-foreground/80'
                        : 'text-muted-foreground'
                    )}
                  >
                    {item.wattage.toLocaleString('en-PK')} W
                  </span>
                </button>
              );
            })}
          </div>
          {preset.note && (
            <p className="text-[10px] font-medium text-muted-foreground/70">
              {preset.note}
            </p>
          )}
        </div>

        {/* Hours slider */}
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <label
              htmlFor="appliance-hours"
              className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"
            >
              <Clock className="h-3.5 w-3.5" />
              Hours Per Day
            </label>
            <div className="flex items-center gap-2">
              <input
                id="appliance-hours"
                type="number"
                min={0}
                max={MAX_HOURS}
                step={0.5}
                value={hoursPerDay}
                onChange={(e) =>
                  setHoursPerDay(
                    Math.max(0, Math.min(MAX_HOURS, Number(e.target.value) || 0))
                  )
                }
                className="w-24 h-11 px-3 bg-background border border-border rounded-xl text-right font-mono tabular-nums text-sm font-black text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                h/day
              </span>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={MAX_HOURS}
            step={0.5}
            value={hoursPerDay}
            onChange={(e) => setHoursPerDay(Number(e.target.value))}
            className="w-full accent-primary"
            aria-label="Hours per day"
          />
        </div>

        {/* Peak toggle */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Usage Window
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => setIsPeakHour(false)}
              className={cn(
                'h-12 font-bold text-[10px] uppercase tracking-widest rounded-xl border transition-all gap-2',
                !isPeakHour
                  ? 'bg-primary text-primary-foreground border-transparent shadow-md'
                  : 'bg-background border-border text-muted-foreground hover:bg-accent'
              )}
            >
              <Moon className="h-4 w-4" />
              Off-Peak
            </Button>
            <Button
              onClick={() => setIsPeakHour(true)}
              className={cn(
                'h-12 font-bold text-[10px] uppercase tracking-widest rounded-xl border transition-all gap-2',
                isPeakHour
                  ? 'bg-red-500 text-white border-transparent shadow-md'
                  : 'bg-background border-border text-muted-foreground hover:bg-accent'
              )}
            >
              <Sun className="h-4 w-4" />
              Peak
            </Button>
          </div>
          <p className="text-[10px] font-medium text-muted-foreground/70">
            Peak window is {PEAK_WINDOW} at Rs {PEAK_RATE_PER_UNIT}/kWh versus Rs{' '}
            {OFF_PEAK_RATE_PER_UNIT}/kWh off-peak, both before GST.
          </p>
        </div>

        {/* Cost readout */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl border border-border bg-background">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
              <Zap className="h-3.5 w-3.5" />
              Per Hour
            </p>
            <p className="font-mono tabular-nums text-xl font-black text-foreground">
              {formatPkr(result.hourlyCostPkr)}
            </p>
          </div>
          <div className="p-4 rounded-2xl border border-border bg-background">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">
              Per Day
            </p>
            <p className="font-mono tabular-nums text-xl font-black text-foreground">
              {formatPkr(result.dailyCostPkr)}
            </p>
          </div>
          <div className="p-4 rounded-2xl border-2 border-primary/20 bg-primary/5">
            <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-2">
              Per Month
            </p>
            <p className="font-mono tabular-nums text-xl font-black text-primary">
              {formatPkr(result.monthlyCostPkr)}
            </p>
          </div>
        </div>

        {/* Shift savings */}
        {result.shiftingSavingsPkr >= 1 ? (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <TrendingDown className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 leading-relaxed">
              Switching this load off-peak saves{' '}
              <span className="font-mono tabular-nums">
                {formatPkr(result.shiftingSavingsPkr)}
              </span>{' '}
              per month at{' '}
              {result.energyKwh.toLocaleString('en-PK')} kWh.
            </p>
          </div>
        ) : (
          <p className="text-xs font-medium text-muted-foreground">
            Peak-hour shifting makes no meaningful difference for this load at
            these hours. Refrigerators and similar continuous-duty appliances
            cannot be scheduled.
          </p>
        )}

        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 leading-relaxed">
          Estimate including 18% GST at a flat average rate. Real bills apply
          telescopic slab rates and FCA/QTA adjustments, so actual cost will
          differ.
        </p>
      </CardContent>
    </Card>
  );
}

export default ApplianceCostCard;