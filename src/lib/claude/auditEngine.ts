import type { ParsedBill } from './billSchema';

export const PROTECTED_SLAB_CEILING_UNITS = 200;

export type FindingSeverity = 'critical' | 'warning' | 'info';

export interface AuditFinding {
  code: string;
  severity: FindingSeverity;
  title: string;
  detail: string;
  /** PKR amount recoverable or additionally owed. Null when not quantifiable. */
  discrepancyAmount: number | null;
}

export interface LoadShiftAdvice {
  title: string;
  detail: string;
  peakWindow: string;
  estimatedMonthlySaving: number | null;
}

export interface AuditReport {
  status: 'verified' | 'discrepancy';
  billedTotal: number;
  trueLandedCost: number;
  discrepancyAmount: number;
  findings: AuditFinding[];
  loadShiftAdvice: LoadShiftAdvice[];
  disclaimer: string;
}

const DISCLAIMER =
  'Automated estimate produced from visual bill extraction. Figures are advisory only and should be confirmed against your DISCO tariff schedule before being used in a formal dispute.';

/**
 * Sales tax rate applied to the energy+duty subtotal on Pakistani bills.
 * Exposed as a constant because NEPRA revises GST treatment between tariff revisions.
 */
const SALES_TAX_RATE = 0.17;

/**
 * Advance tax under Section 235 is levied on the bill amount above this threshold
 * for commercial/industrial categories. Residential consumers are exempt.
 */
const ADVANCE_TAX_THRESHOLD_PKR = 25_000;
const ADVANCE_TAX_RATE = 0.01;

const NON_RESIDENTIAL_CATEGORIES = [
  'commercial',
  'industrial',
  'agricultural',
  'industrial-agricultural',
];

const PEAK_WINDOW = '5:00 PM – 9:00 PM';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function isNonResidential(category: string): boolean {
  const normalized = category.toLowerCase().trim();
  return NON_RESIDENTIAL_CATEGORIES.some((token) => normalized.includes(token));
}

export function auditBill(bill: ParsedBill): AuditReport {
  const findings: AuditFinding[] = [];
  const { tariff, consumption, financialBreakdown } = bill;

  const billedTotal = financialBreakdown.totalAmount;
  const componentSum = round2(
    financialBreakdown.costOfElectricity +
      financialBreakdown.fca +
      financialBreakdown.qta +
      financialBreakdown.electricityDuty +
      financialBreakdown.salesTax +
      financialBreakdown.advanceIncomeTax
  );

  // 1. Internal arithmetic: the itemised lines must reconcile to the printed total.
  if (Math.abs(componentSum - billedTotal) > 1) {
    const delta = round2(billedTotal - componentSum);
    findings.push({
      code: 'TOTAL_MISMATCH',
      severity: 'critical',
      title: 'Itemised charges do not match the printed total',
      detail: `Line items sum to Rs ${componentSum.toLocaleString('en-PK')} but the bill prints Rs ${billedTotal.toLocaleString('en-PK')} (difference Rs ${Math.abs(delta).toLocaleString('en-PK')}).`,
      discrepancyAmount: delta,
    });
  }

  // 2. Protected slab entitlement. A consumer flagged protected who consumed at or
  // below the ceiling should have been billed on the protected residential slab.
  if (tariff.isProtected) {
    if (consumption.totalUnits > PROTECTED_SLAB_CEILING_UNITS) {
      findings.push({
        code: 'PROTECTED_SLAB_EXCEEDED',
        severity: 'info',
        title: 'Consumption above the protected slab ceiling',
        detail: `The bill marks this consumer as protected, but consumption of ${consumption.totalUnits.toLocaleString('en-PK')} kWh exceeds the ${PROTECTED_SLAB_CEILING_UNITS}-unit ceiling. Higher slab rates are expected and this is not an overbilling.`,
        discrepancyAmount: null,
      });
    }
  } else if (consumption.totalUnits <= PROTECTED_SLAB_CEILING_UNITS) {
    findings.push({
      code: 'PROTECTED_SLAB_NOT_APPLIED',
      severity: 'critical',
      title: 'Protected slab may have been denied',
      detail: `Consumption of ${consumption.totalUnits.toLocaleString('en-PK')} kWh is within the ${PROTECTED_SLAB_CEILING_UNITS}-unit protected ceiling, but the bill does not carry protected status. If this is a residential connection, the DISCO may have billed you at the higher non-protected slab rate.`,
      discrepancyAmount: null,
    });
  }

  // 3. Sales tax check against the energy + duty subtotal.
  const taxBase = round2(
    financialBreakdown.costOfElectricity +
      financialBreakdown.fca +
      financialBreakdown.qta +
      financialBreakdown.electricityDuty
  );
  const expectedSalesTax = round2(taxBase * SALES_TAX_RATE);
  if (taxBase > 0 && financialBreakdown.salesTax > 0) {
    const taxDelta = round2(financialBreakdown.salesTax - expectedSalesTax);
    if (Math.abs(taxDelta) > 1) {
      findings.push({
        code: 'SALES_TAX_VARIANCE',
        severity: 'warning',
        title: 'Sales tax differs from the expected rate',
        detail: `Taxable base of Rs ${taxBase.toLocaleString('en-PK')} at ${(SALES_TAX_RATE * 100).toFixed(0)}% yields Rs ${expectedSalesTax.toLocaleString('en-PK')}, but the bill charges Rs ${financialBreakdown.salesTax.toLocaleString('en-PK')}.`,
        discrepancyAmount: taxDelta,
      });
    }
  }

  // 4. Section 235 advance tax should not appear below the threshold or on
  // residential connections.
  const advanceTax = financialBreakdown.advanceIncomeTax;
  if (advanceTax > 0 && !isNonResidential(tariff.category)) {
    findings.push({
      code: 'ADVANCE_TAX_UNEXPECTED',
      severity: 'warning',
      title: 'Advance income tax charged outside Section 235 scope',
      detail: `Advance tax of Rs ${advanceTax.toLocaleString('en-PK')} was billed to a "${tariff.category}" category. Section 235 applies to commercial and industrial supply above Rs ${ADVANCE_TAX_THRESHOLD_PKR.toLocaleString('en-PK')}; residential connections should not carry it.`,
      discrepancyAmount: -round2(advanceTax),
    });
  } else if (advanceTax > 0) {
    const expectedAdvanceTax = round2(
      Math.max(0, componentSum - ADVANCE_TAX_THRESHOLD_PKR) * ADVANCE_TAX_RATE
    );
    if (Math.abs(advanceTax - expectedAdvanceTax) > 1) {
      findings.push({
        code: 'ADVANCE_TAX_VARIANCE',
        severity: 'warning',
        title: 'Section 235 advance tax does not match the statutory formula',
        detail: `At ${(ADVANCE_TAX_RATE * 100).toFixed(0)}% on the amount above Rs ${ADVANCE_TAX_THRESHOLD_PKR.toLocaleString('en-PK')}, expected tax is Rs ${expectedAdvanceTax.toLocaleString('en-PK')} but Rs ${advanceTax.toLocaleString('en-PK')} was charged.`,
        discrepancyAmount: round2(expectedAdvanceTax - advanceTax),
      });
    }
  }

  // 5. FUEL/load adjustment components are pass-through; confirm they are present
  // rather than silently zero on a residential bill.
  if (
    financialBreakdown.fca === 0 &&
    financialBreakdown.qta === 0 &&
    financialBreakdown.costOfElectricity > 0
  ) {
    findings.push({
      code: 'NO_TARIFF_ADJUSTMENTS',
      severity: 'info',
      title: 'No tariff adjustment charges on this bill',
      detail: 'FCA and QTA are both zero. This is legitimate for some tariff periods but worth confirming, since these components are reviewed quarterly by NEPRA.',
      discrepancyAmount: null,
    });
  }

  // 6. Landed cost is the sum of charges that represent the true cost of supply.
  // Fuel/tariff adjustments are pass-throughs, so they are excluded from the
  // "true landed cost" comparison but still billed to the consumer.
  const trueLandedCost = round2(
    financialBreakdown.costOfElectricity +
      financialBreakdown.electricityDuty +
      financialBreakdown.salesTax +
      financialBreakdown.advanceIncomeTax
  );
  const discrepancyAmount = round2(billedTotal - trueLandedCost);

  const quantifiable = findings
    .map((f) => f.discrepancyAmount)
    .filter((amount): amount is number => amount !== null);
  const netDiscrepancy = round2(quantifiable.reduce((sum, amount) => sum + amount, 0));

  const loadShiftAdvice: LoadShiftAdvice[] = [];
  const { peakUnits, offPeakUnits, totalUnits } = consumption;

  if (peakUnits !== null && peakUnits > 0) {
    const shiftable = round2(peakUnits * 0.15);
    const estimatedSaving =
      offPeakUnits !== null && offPeakUnits > 0
        ? round2(
            totalUnits > 0
              ? (financialBreakdown.costOfElectricity / totalUnits) *
                  shiftable *
                  0.25
              : 0
          )
        : null;

    loadShiftAdvice.push({
      title: `Shift roughly ${shiftable.toLocaleString('en-PK')} kWh out of peak hours`,
      detail:
        'Residential TOU peak runs from 5:00 PM to 9:00 PM and is priced materially above the off-peak slab. Running dishwashers, laundry, geysers and EV charging before 5:00 PM or after 9:00 PM moves the same load onto the cheaper slab. Geyser use is best scheduled late at night.',
      peakWindow: PEAK_WINDOW,
      estimatedMonthlySaving: estimatedSaving,
    });
  }

  const hasCriticalOrWarning = findings.some(
    (f) => f.severity === 'critical' || f.severity === 'warning'
  );

  return {
    status: hasCriticalOrWarning ? 'discrepancy' : 'verified',
    billedTotal,
    trueLandedCost,
    discrepancyAmount:
      hasCriticalOrWarning && netDiscrepancy !== 0 ? netDiscrepancy : discrepancyAmount,
    findings,
    loadShiftAdvice,
    disclaimer: DISCLAIMER,
  };
}