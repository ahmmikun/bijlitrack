/**
 * Appliance run-cost calculator.
 *
 * Pure functions, no React. Powers the interactive calculator on
 * /dashboard/simulator.
 */

/** Peak-hour unit rate, PKR/kWh. */
export const PEAK_RATE_PER_UNIT = 46.85;

/** Off-peak / normal unit rate, PKR/kWh. */
export const OFF_PEAK_RATE_PER_UNIT = 33.1;

/** GST applied to energy charges. */
export const APPLIANCE_GST_RATE = 0.18;

/** Residential peak window as published by the DISCOs. */
export const PEAK_WINDOW = '5:00 PM – 9:00 PM';

export interface AppliancePreset {
  id: string;
  name: string;
  /** Nominal plate rating in watts. */
  wattage: number;
  /** Typical hours of use per day, used to preselect the slider. */
  defaultHoursPerDay: number;
  note?: string;
  group: 'cooling' | 'water' | 'kitchen' | 'laundry' | 'ventilation';
}

export const APPLIANCE_PRESETS: AppliancePreset[] = [
  {
    id: 'ac-1.5t',
    name: '1.5-Ton Inverter AC',
    wattage: 1100,
    defaultHoursPerDay: 8,
    note: 'Rated ~1,800W; inverter average draw is lower.',
    group: 'cooling',
  },
  {
    id: 'motor-1hp',
    name: '1 HP Water Pumping Motor',
    wattage: 750,
    defaultHoursPerDay: 2,
    group: 'water',
  },
  {
    id: 'iron',
    name: 'Electric Iron',
    wattage: 1000,
    defaultHoursPerDay: 1,
    group: 'laundry',
  },
  {
    id: 'geyser',
    name: 'Electric Geyser',
    wattage: 2000,
    defaultHoursPerDay: 1,
    note: 'Heavily penalised if scheduled inside the peak window.',
    group: 'water',
  },
  {
    id: 'fridge',
    name: 'Refrigerator',
    wattage: 250,
    defaultHoursPerDay: 24,
    note: 'Continuous cycle average, not compressor peak.',
    group: 'kitchen',
  },
  {
    id: 'microwave',
    name: 'Microwave Oven',
    wattage: 1200,
    defaultHoursPerDay: 0.5,
    group: 'kitchen',
  },
  {
    id: 'fan-ac',
    name: 'Ceiling Fan (AC Motor)',
    wattage: 80,
    defaultHoursPerDay: 12,
    group: 'ventilation',
  },
  {
    id: 'fan-bldc',
    name: 'BLDC Ceiling Fan',
    wattage: 35,
    defaultHoursPerDay: 12,
    note: 'Roughly half the draw of a conventional induction motor.',
    group: 'ventilation',
  },
];

export interface ApplianceCostInput {
  wattage: number;
  hoursPerDay: number;
  daysPerMonth: number;
  ratePerUnit: number;
  isPeakHour?: boolean;
}

export interface ApplianceCostResult {
  energyKwh: number;
  hourlyCostPkr: number;
  dailyCostPkr: number;
  monthlyCostPkr: number;
  costAtPeakPkr: number;
  costAtOffPeakPkr: number;
  shiftingSavingsPkr: number;
  effectiveRatePerUnit: number;
}

/**
 * Cost of running a load, including GST.
 *
 * `ratePerUnit` is the pre-GST energy rate. GST is applied to the energy
 * charge, so the effective delivered rate is the input rate times 1.18.
 */
export function calculateApplianceCost({
  wattage,
  hoursPerDay,
  daysPerMonth,
  ratePerUnit,
  isPeakHour = false,
}: ApplianceCostInput): ApplianceCostResult {
  const safeWattage = Math.max(0, wattage);
  const safeHours = Math.max(0, hoursPerDay);
  const safeDays = Math.max(0, daysPerMonth);

  const energyKwh = (safeWattage / 1000) * safeHours * safeDays;

  // isPeakHour is authoritative, so the caller's ratePerUnit cannot silently
  // contradict the selected usage window.
  const safeRate = Math.max(
    0,
    isPeakHour ? PEAK_RATE_PER_UNIT : ratePerUnit
  );

  const effectiveRatePerUnit = safeRate * (1 + APPLIANCE_GST_RATE);

  // Daily and monthly figures are derived from the unrounded hourly cost so a
  // rounded per-hour display value cannot accumulate into the monthly total.
  const unroundedHourly = (safeWattage / 1000) * effectiveRatePerUnit;
  const hourlyCostPkr = round2(unroundedHourly);
  const dailyCostPkr = round2(unroundedHourly * safeHours);
  const monthlyCostPkr = round2(unroundedHourly * safeHours * safeDays);

  // Both scenarios are priced at the same operating hours, so the difference
  // is purely the tariff band.
  const costAtPeakPkr = round2(
    energyKwh * PEAK_RATE_PER_UNIT * (1 + APPLIANCE_GST_RATE)
  );
  const costAtOffPeakPkr = round2(
    energyKwh * OFF_PEAK_RATE_PER_UNIT * (1 + APPLIANCE_GST_RATE)
  );
  const shiftingSavingsPkr = round2(costAtPeakPkr - costAtOffPeakPkr);

  return {
    energyKwh: round2(energyKwh),
    hourlyCostPkr,
    dailyCostPkr,
    monthlyCostPkr,
    costAtPeakPkr,
    costAtOffPeakPkr,
    shiftingSavingsPkr,
    effectiveRatePerUnit: round2(effectiveRatePerUnit),
  };
}

export function getPresetById(id: string): AppliancePreset | undefined {
  return APPLIANCE_PRESETS.find((preset) => preset.id === id);
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}