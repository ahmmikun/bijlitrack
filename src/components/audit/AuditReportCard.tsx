'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ShieldAlert, Lightbulb, Info, TrendingDown, AlertTriangle, ScrollText, Loader2, Gauge, Flame } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { DisputeLetterModal } from '@/components/audit/DisputeLetterModal';

interface Finding {
  code: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  discrepancyAmount: number | null;
}

interface AuditReport {
  status: 'verified' | 'discrepancy';
  billedTotal: number;
  trueLandedCost: number;
  discrepancyAmount: number;
  findings: Finding[];
  loadShiftAdvice: Array<{
    title: string;
    detail: string;
    peakWindow: string;
    estimatedMonthlySaving: number | null;
  }>;
  disclaimer: string;
}

interface ParsedBill {
  consumer: { name: string; referenceNo: string; disco: string; billingMonth: string };
  tariff: { category: string; isProtected: boolean; sanctionedLoadKw: number | null };
  consumption: { totalUnits: number; peakUnits: number | null; offPeakUnits: number | null };
  financialBreakdown: {
    costOfElectricity: number;
    fca: number;
    qta: number;
    electricityDuty: number;
    salesTax: number;
    advanceIncomeTax: number;
    totalAmount: number;
  };
  confidence: number;
  warnings: string[];
}

interface AuditReportCardProps {
  billData: ParsedBill;
  auditFindings: AuditReport;
}

const severityStyles: Record<Finding['severity'], string> = {
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
  warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  info: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
};

const severityLabels: Record<Finding['severity'], string> = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Info',
};

function formatPkr(value: number): string {
  return `Rs ${value.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatKwh(value: number): string {
  return `${value.toLocaleString('en-PK')} kWh`;
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-border/50 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="font-mono tabular-nums text-sm font-black text-foreground">{value}</span>
    </div>
  );
}

export function AuditReportCard({ billData, auditFindings }: AuditReportCardProps) {
  const router = useRouter();
  const isVerified = auditFindings.status === 'verified';
  const hasDiscrepancy =
    !isVerified && Math.abs(auditFindings.discrepancyAmount) >= 1;

  const [isGenerating, setIsGenerating] = useState(false);
  const [disputeLetter, setDisputeLetter] = useState<string | null>(null);
  const [disputeError, setDisputeError] = useState<string | null>(null);

  const [isRoasting, setIsRoasting] = useState(false);
  const [roast, setRoast] = useState<string | null>(null);
  const [roastError, setRoastError] = useState<string | null>(null);

  // Disputes are only meaningful when money or rule violations are in play.
  // Purely informational findings do not justify a petition.
  const actionableFindings = auditFindings.findings.filter(
    (f) => f.severity === 'critical' || f.severity === 'warning'
  );
  const canDispute =
    actionableFindings.length > 0 || auditFindings.discrepancyAmount > 0;

  const handleGenerateDispute = async () => {
    setIsGenerating(true);
    setDisputeError(null);
    try {
      const res = await fetch('/api/audit/generate-dispute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billData: {
            consumerName: billData.consumer.name,
            referenceNo: billData.consumer.referenceNo,
            disco: billData.consumer.disco,
            billingMonth: billData.consumer.billingMonth,
            totalAmount: billData.financialBreakdown.totalAmount,
          },
          auditFindings: {
            discrepancyAmount: auditFindings.discrepancyAmount,
            issuesDetected: actionableFindings.map((f) => `${f.title}: ${f.detail}`),
            recommendedAction: hasDiscrepancy
              ? `Correct the billed charges and credit the over-recovered amount of Rs ${Math.abs(auditFindings.discrepancyAmount).toLocaleString('en-PK')} to the next billing cycle.`
              : 'Review and correct the disputed line items in the next billing cycle.',
          },
        }),
      });

      const data = (await res.json()) as {
        success: boolean;
        disputeLetter?: string;
        error?: string;
      };

      if (!res.ok || !data.success || !data.disputeLetter) {
        setDisputeError(data.error || 'Could not draft the dispute notice.');
        return;
      }

      setDisputeLetter(data.disputeLetter);
    } catch (err: unknown) {
      setDisputeError(
        err instanceof Error ? err.message : 'Network error while generating the notice.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRoast = async () => {
    setIsRoasting(true);
    setRoastError(null);
    try {
      const res = await fetch('/api/audit/roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalUnits: billData.consumption.totalUnits,
          totalAmount: billData.financialBreakdown.totalAmount,
          disco: billData.consumer.disco,
          isProtected: billData.tariff.isProtected,
          billingMonth: billData.consumer.billingMonth,
        }),
      });

      const data = (await res.json()) as {
        success: boolean;
        roast?: string;
        error?: string;
      };

      if (!res.ok || !data.success || !data.roast) {
        setRoastError(data.error || 'Could not generate the roast.');
        return;
      }

      setRoast(data.roast);
    } catch (err: unknown) {
      setRoastError(
        err instanceof Error ? err.message : 'Network error while roasting your bill.'
      );
    } finally {
      setIsRoasting(false);
    }
  };

  // The API returns the roast followed by a "Tips to cut your bill:" section.
  // Splitting on that marker lets the two halves get distinct treatments.
  const roastParts = roast
    ? (() => {
        const marker = /tips to cut your bill:/i.exec(roast);
        if (!marker) return { punchline: roast.trim(), tips: [] as string[] };
        return {
          punchline: roast.slice(0, marker.index).trim(),
          tips: roast
            .slice(marker.index + marker[0].length)
            .split('\n')
            .map((line) => line.replace(/^[-*\s]+/, '').trim())
            .filter(Boolean),
        };
      })()
    : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Verdict Header */}
      <Card
        className={cn(
          'border-2 overflow-hidden rounded-[3rem]',
          isVerified
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : 'border-amber-500/30 bg-amber-500/5'
        )}
      >
        <CardHeader className="p-6 sm:p-10 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-3">
              <Badge
                className={cn(
                  'h-8 px-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] border',
                  isVerified
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                )}
              >
                {isVerified ? (
                  <ShieldCheck className="h-3.5 w-3.5" />
                ) : (
                  <ShieldAlert className="h-3.5 w-3.5" />
                )}
                {isVerified ? 'Verified Legitimate' : 'Discrepancy / Overbilling Detected'}
              </Badge>
              <div>
                <CardTitle className="text-xl sm:text-3xl font-black tracking-tighter uppercase text-foreground">
                  {billData.consumer.disco || 'Utility'}{' '}
                  <span className="text-muted-foreground">{billData.consumer.billingMonth}</span>
                </CardTitle>
                <CardDescription className="font-bold text-muted-foreground uppercase text-[10px] tracking-widest mt-2">
                  Ref {billData.consumer.referenceNo || 'N/A'} &middot; {billData.tariff.category} &middot;{' '}
                  {billData.tariff.isProtected ? 'Protected Slab' : 'Non-Protected'}
                </CardDescription>
              </div>
            </div>

            {hasDiscrepancy && (
              <div className="shrink-0 text-left sm:text-right">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-1">
                  Discrepancy Amount
                </p>
                <p className="font-mono tabular-nums text-3xl sm:text-5xl font-black text-amber-500 tracking-tighter">
                  {formatPkr(Math.abs(auditFindings.discrepancyAmount))}
                </p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-2">
                  {auditFindings.discrepancyAmount > 0 ? 'Overbilled to you' : 'Under-recovered by DISCO'}
                </p>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-10">
          <div className="grid sm:grid-cols-2 gap-x-10 gap-y-2">
            <div>
              <MetricRow label="Utility Billed Cost" value={formatPkr(auditFindings.billedTotal)} />
              <MetricRow label="True Landed Cost" value={formatPkr(auditFindings.trueLandedCost)} />
              <MetricRow
                label="Cost of Electricity"
                value={formatPkr(billData.financialBreakdown.costOfElectricity)}
              />
              <MetricRow label="FCA" value={formatPkr(billData.financialBreakdown.fca)} />
              <MetricRow label="QTA" value={formatPkr(billData.financialBreakdown.qta)} />
            </div>
            <div>
              <MetricRow
                label="Electricity Duty"
                value={formatPkr(billData.financialBreakdown.electricityDuty)}
              />
              <MetricRow
                label="Sales Tax"
                value={formatPkr(billData.financialBreakdown.salesTax)}
              />
              <MetricRow
                label="Advance Tax (§235)"
                value={formatPkr(billData.financialBreakdown.advanceIncomeTax)}
              />
              <MetricRow
                label="Total Units"
                value={formatKwh(billData.consumption.totalUnits)}
              />
              <MetricRow
                label="Extraction Confidence"
                value={`${Math.round(billData.confidence * 100)}%`}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bill roast */}
      <Card className="border-2 border-orange-500/25 bg-orange-500/5 overflow-hidden rounded-[3rem]">
        <CardHeader className="p-6 sm:p-10 border-b border-orange-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <CardTitle className="text-xl font-black tracking-tighter uppercase">
              Bill Roast
            </CardTitle>
            <CardDescription className="font-bold text-muted-foreground uppercase text-[9px] tracking-widest mt-1">
              Two lines of commentary on your consumption
            </CardDescription>
          </div>

          <Button
            onClick={handleRoast}
            disabled={isRoasting}
            className="h-12 px-7 bg-orange-500 hover:bg-orange-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md transition-all active:scale-95 border-0 gap-2 shrink-0 disabled:opacity-60"
          >
            {isRoasting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Flame className="h-4 w-4" />
            )}
            {isRoasting ? 'Roasting...' : 'Roast My Bill'}
          </Button>
        </CardHeader>

        {roastError && (
          <CardContent className="p-6 sm:p-10 pt-6">
            <Alert variant="destructive" className="rounded-[2rem] p-6">
              <AlertTriangle className="h-5 w-5" />
              <div className="ml-3">
                <AlertTitle className="text-xs font-black uppercase tracking-widest">
                  Roast Failed
                </AlertTitle>
                <AlertDescription className="text-xs font-medium mt-1">
                  {roastError}
                </AlertDescription>
              </div>
            </Alert>
          </CardContent>
        )}

        {roastParts && (
          <CardContent className="p-6 sm:p-10 space-y-6">
            <p className="text-base sm:text-lg font-bold leading-relaxed text-foreground">
              {roastParts.punchline}
            </p>

            {roastParts.tips.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">
                  Tips to cut your bill
                </p>
                <ul className="space-y-2">
                  {roastParts.tips.map((tip, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 p-3.5 rounded-xl bg-background/60 border border-orange-500/15"
                    >
                      <Flame className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                      <span className="text-xs font-medium leading-relaxed text-muted-foreground">
                        {tip}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
              Generated by Claude. Comedy only, not a bill assessment.
            </p>
          </CardContent>
        )}
      </Card>

      {/* Findings */}
      <Card className="border-border shadow-2xl shadow-foreground/5 overflow-hidden rounded-[3rem]">
        <CardHeader className="p-6 sm:p-10 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <CardTitle className="text-xl font-black tracking-tighter uppercase">
              Audit Findings
            </CardTitle>
            <CardDescription className="font-bold text-muted-foreground uppercase text-[9px] tracking-widest mt-1">
              Cross-checked against NEPRA protected-slab and statutory tax rules
            </CardDescription>
          </div>

          <Button
            onClick={handleGenerateDispute}
            disabled={!canDispute || isGenerating}
            className="h-12 px-7 bg-primary hover:opacity-90 text-primary-foreground font-bold text-[10px] uppercase tracking-widest rounded-xl shadow-md transition-all active:scale-95 border-0 gap-2 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ScrollText className="h-4 w-4" />
            )}
            {isGenerating ? 'Drafting...' : 'Generate Formal Dispute Notice'}
          </Button>
        </CardHeader>
        <CardContent className="p-6 sm:p-10 space-y-4">
          {auditFindings.findings.length === 0 ? (
            <div className="flex items-center gap-4 py-6">
              <ShieldCheck className="h-8 w-8 text-emerald-500 shrink-0" />
              <p className="text-sm font-bold text-muted-foreground">
                No discrepancies detected. Every line item reconciles to the printed total.
              </p>
            </div>
          ) : (
            auditFindings.findings.map((finding) => (
              <div
                key={finding.code}
                className="flex flex-col sm:flex-row sm:items-start gap-4 p-5 rounded-2xl border border-border bg-background"
              >
                <div className="shrink-0 mt-0.5">
                  {finding.severity === 'info' ? (
                    <Info className="h-5 w-5 text-sky-500" />
                  ) : (
                    <AlertTriangle
                      className={cn(
                        'h-5 w-5',
                        finding.severity === 'critical' ? 'text-red-500' : 'text-amber-500'
                      )}
                    />
                  )}
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-black tracking-tight text-foreground">
                      {finding.title}
                    </span>
                    <Badge
                      className={cn(
                        'h-5 px-2 rounded-lg font-black text-[9px] uppercase tracking-widest border',
                        severityStyles[finding.severity]
                      )}
                    >
                      {severityLabels[finding.severity]}
                    </Badge>
                  </div>
                  <p className="text-xs font-medium leading-relaxed text-muted-foreground">
                    {finding.detail}
                  </p>
                  <span className="inline-block font-mono text-[9px] text-muted-foreground/50 uppercase tracking-wider">
                    {finding.code}
                  </span>
                </div>
                {finding.discrepancyAmount !== null && (
                  <div className="shrink-0 sm:text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      Impact
                    </p>
                    <p
                      className={cn(
                        'font-mono tabular-nums text-base font-black',
                        finding.discrepancyAmount > 0 ? 'text-red-500' : 'text-emerald-500'
                      )}
                    >
                      {formatPkr(Math.abs(finding.discrepancyAmount))}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Load shift advice */}
      {auditFindings.loadShiftAdvice.length > 0 && (
        <Card className="border-border shadow-2xl shadow-foreground/5 overflow-hidden rounded-[3rem]">
          <CardHeader className="p-6 sm:p-10 border-b border-border bg-muted/20">
            <div className="flex items-center gap-4">
              <div className="h-11 w-11 rounded-2xl bg-primary flex items-center justify-center shrink-0">
                <Lightbulb className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl font-black tracking-tighter uppercase">
                  Peak-Hour Load Shifting
                </CardTitle>
                <CardDescription className="font-bold text-muted-foreground uppercase text-[9px] tracking-widest mt-1">
                  Lower your next bill without changing your habits
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 sm:p-10 space-y-6">
            {auditFindings.loadShiftAdvice.map((advice) => (
              <div key={advice.title} className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <TrendingDown className="h-4 w-4 text-primary" />
                  <span className="text-sm font-black tracking-tight text-foreground">
                    {advice.title}
                  </span>
                </div>
                <p className="text-xs font-medium leading-relaxed text-muted-foreground pl-7">
                  {advice.detail}
                </p>
                <div className="flex flex-wrap gap-4 pl-7">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full border border-border">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                      Peak Window
                    </span>
                    <span className="font-mono tabular-nums text-[10px] font-black text-foreground">
                      {advice.peakWindow}
                    </span>
                  </div>
                  {advice.estimatedMonthlySaving !== null && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                      <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                        Est. Saving
                      </span>
                      <span className="font-mono tabular-nums text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                        {formatPkr(advice.estimatedMonthlySaving)}/mo
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Deep-link into the slab simulator, seeded with this bill's usage */}
      <Button
        onClick={() =>
          router.push(
            `/dashboard/simulator?units=${Math.round(
              billData.consumption.totalUnits
            )}&protected=${billData.tariff.isProtected ? 'true' : 'false'}`
          )
        }
        className="w-full h-14 px-8 bg-foreground text-background hover:opacity-90 font-black text-xs uppercase tracking-[0.2em] rounded-[2rem] shadow-lg transition-all active:scale-[0.99] border-0 gap-3"
      >
        <Gauge className="h-5 w-5 text-primary" />
        Simulate &amp; Guard 200U Cliff
      </Button>

      {/* Parser warnings */}
      {billData.warnings.length > 0 && (
        <Alert className="rounded-[2rem] border-2 border-amber-500/20 bg-amber-500/5 p-6">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <div className="ml-3">
            <AlertTitle className="text-xs font-black uppercase tracking-widest">
              Extraction Warnings
            </AlertTitle>
            <AlertDescription className="mt-2 space-y-1">
              {billData.warnings.map((warning, i) => (
                <p key={i} className="text-xs font-medium">
                  &bull; {warning}
                </p>
              ))}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {disputeError && (
        <Alert variant="destructive" className="rounded-[2rem] p-6">
          <AlertTriangle className="h-5 w-5" />
          <div className="ml-3">
            <AlertTitle className="text-xs font-black uppercase tracking-widest">
              Dispute Notice Failed
            </AlertTitle>
            <AlertDescription className="text-xs font-medium mt-1">
              {disputeError}
            </AlertDescription>
          </div>
        </Alert>
      )}

      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 text-center leading-relaxed">
        {auditFindings.disclaimer}
      </p>

      {disputeLetter && (
        <DisputeLetterModal
          open={disputeLetter !== null}
          onOpenChange={(next) => {
            if (!next) setDisputeLetter(null);
          }}
          disputeLetter={disputeLetter}
          consumerName={billData.consumer.name}
          referenceNo={billData.consumer.referenceNo}
          billingMonth={billData.consumer.billingMonth}
        />
      )}
    </div>
  );
}

export default AuditReportCard;