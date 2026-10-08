import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Gauge } from 'lucide-react';
import { SlabSimulatorCard } from '@/components/simulator/SlabSimulatorCard';
import { ApplianceCostCard } from '@/components/simulator/ApplianceCostCard';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Slab Cliff Simulator | BijliTrack',
  description:
    'Project your end-of-month consumption, protect your NEPRA 200-unit protected slab, and price out what your appliances actually cost to run.',
};

interface SimulatorPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parsePositiveInt(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined) return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.round(parsed);
}

function parseBoolean(value: string | string[] | undefined): boolean | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined) return undefined;
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  return undefined;
}

export default async function SimulatorPage({ searchParams }: SimulatorPageProps) {
  const params = await searchParams;
  const units = parsePositiveInt(params.units);
  const isProtected = parseBoolean(params.protected);

  // Remount the client card whenever the deep-link inputs change, so the
  // seeded state is re-read instead of being ignored after first render.
  const seedKey = `${units ?? 'default'}-${isProtected ?? 'default'}`;

  return (
    <div className="space-y-8 sm:space-y-12 animate-in fade-in duration-1000 pb-20">
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="text-3xl sm:text-5xl font-black tracking-tighter text-foreground uppercase">
          Slab <span className="text-primary">Simulator</span>
        </h1>
        <div className="text-muted-foreground font-bold uppercase text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.3em] flex items-center justify-center sm:justify-start gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_currentColor]"></div>
          <Gauge className="h-3 w-3" aria-hidden="true" />
          Protected Slab Budget Forecaster
        </div>
      </div>

      {units !== undefined && (
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary text-center sm:text-left">
          Seeded from your audit &mdash; {units.toLocaleString('en-PK')} kWh
          consumed, {isProtected ? 'protected' : 'non-protected'} status
        </p>
      )}

      <Suspense fallback={<Skeleton className="h-[600px] w-full rounded-[3rem]" />}>
        <SlabSimulatorCard
          key={seedKey}
          initialUnits={units}
          initialIsProtected={isProtected}
        />
      </Suspense>

      <ApplianceCostCard />
    </div>
  );
}