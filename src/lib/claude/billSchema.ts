import { z } from 'zod';

export const BILL_MEDIA_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type BillMediaType = (typeof BILL_MEDIA_TYPES)[number];

export function isBillMediaType(value: unknown): value is BillMediaType {
  return (
    typeof value === 'string' &&
    (BILL_MEDIA_TYPES as readonly string[]).includes(value)
  );
}

export const ParsedBillSchema = z.object({
  consumer: z.object({
    name: z.string(),
    referenceNo: z.string(),
    disco: z.string(),
    billingMonth: z.string(),
  }),
  tariff: z.object({
    category: z.string(),
    isProtected: z.boolean(),
    sanctionedLoadKw: z.number().nullable(),
  }),
  consumption: z.object({
    totalUnits: z.number(),
    peakUnits: z.number().nullable(),
    offPeakUnits: z.number().nullable(),
  }),
  financialBreakdown: z.object({
    costOfElectricity: z.number(),
    fca: z.number(),
    qta: z.number(),
    electricityDuty: z.number(),
    salesTax: z.number(),
    advanceIncomeTax: z.number(),
    totalAmount: z.number(),
  }),
  confidence: z.number(),
  warnings: z.array(z.string()),
});

export type ParsedBill = z.infer<typeof ParsedBillSchema>;