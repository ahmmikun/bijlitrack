import { z } from 'zod';

export const DisputeRequestSchema = z.object({
  billData: z.object({
    consumerName: z.string().trim().min(1).max(120, 'consumerName is too long'),
    referenceNo: z.string().trim().min(1).max(20, 'referenceNo is too long'),
    disco: z.string().trim().min(1).max(120, 'disco is too long'),
    billingMonth: z.string().trim().min(1).max(60, 'billingMonth is too long'),
    totalAmount: z.number().nonnegative().max(10_000_000),
  }),
  auditFindings: z.object({
    discrepancyAmount: z.number().max(10_000_000),
    issuesDetected: z
      .array(z.string().trim().min(1).max(500))
      .max(20, 'Too many findings supplied'),
    recommendedAction: z.string().trim().min(1).max(500),
  }),
});

export type DisputeRequest = z.infer<typeof DisputeRequestSchema>;

/**
 * Canonical DISCO names used in petition addressing. Bills print abbreviated
 * forms, so the petition header should use the legal entity name.
 */
export const DISCO_LEGAL_NAMES: Record<string, string> = {
  lesco: 'Lahore Electric Supply Company (LESCO)',
  kelectric: 'K-Electric',
  gepco: 'Gujranwala Electric Power Company (GEPCO)',
  fesco: 'Faisalabad Electric Supply Company (FESCO)',
  iesco: 'Islamabad Electric Supply Company (IESCO)',
  mepco: 'Multan Electric Power Company (MEPCO)',
  pesco: 'Peshawar Electric Supply Company (PESCO)',
  hazeco: 'Hazara Electric Supply Company (HAZECO)',
  hesco: 'Hyderabad Electric Supply Company (HESCO)',
  sepco: 'Sukkur Electric Supply Company (SEPCO)',
  qesco: 'Quetta Electric Supply Company (QESCO)',
  tesco: 'Tribal Electric Supply Company (TESCO)',
};

export function resolveDiscoLegalName(disco: string): string {
  const key = disco.trim().toLowerCase();
  return DISCO_LEGAL_NAMES[key] ?? disco.trim().toUpperCase();
}