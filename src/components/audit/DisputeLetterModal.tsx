'use client';

import { useEffect, useState } from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { Check, Copy, Printer, X, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DisputeLetterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disputeLetter: string;
  consumerName: string;
  referenceNo: string;
  billingMonth: string;
}

export function DisputeLetterModal({
  open,
  onOpenChange,
  disputeLetter,
  consumerName,
  referenceNo,
  billingMonth,
}: DisputeLetterModalProps) {
  const [copied, setCopied] = useState(false);

  // The success tick self-clears on a timer rather than via an effect-driven
  // setState, so the only state update happens in a timer callback.
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleOpenChange = (next: boolean) => {
    if (!next) setCopied(false);
    onOpenChange(next);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(disputeLetter);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 print:hidden" />

        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col gap-4 overflow-y-auto bg-background p-4 sm:p-8 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 print:h-auto print:overflow-visible print:bg-white print:p-0"
          aria-describedby={undefined}
        >
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0 print:hidden">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <ScrollText className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <DialogPrimitive.Title className="text-base font-black tracking-tight uppercase text-foreground">
                  Dispute Notice Preview
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Review before printing or submitting
                </DialogPrimitive.Description>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={handleCopy}
                className="h-11 px-5 bg-primary hover:opacity-90 text-primary-foreground font-bold text-[10px] uppercase tracking-widest rounded-xl border-0 gap-2"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? 'Copied' : 'Copy to Clipboard'}
              </Button>

              <Button
                onClick={() => window.print()}
                variant="outline"
                className="h-11 px-5 border-border bg-card hover:bg-accent text-foreground font-bold text-[10px] uppercase tracking-widest rounded-xl gap-2"
              >
                <Printer className="h-4 w-4" />
                Print / Save PDF
              </Button>

              <DialogPrimitive.Close asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent shrink-0"
                >
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close</span>
                </Button>
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* A4 sheet */}
          <article
            data-dispute-letter
            className="mx-auto w-full max-w-[210mm] bg-white text-black shadow-2xl print:shadow-none print:max-w-none"
            style={{
              fontFamily: 'Georgia, "Times New Roman", Times, serif',
              padding: '18mm 16mm',
              lineHeight: 1.7,
              fontSize: '11.5pt',
            }}
          >
            <header style={{ marginBottom: '10mm', textAlign: 'center' }}>
              <p
                style={{
                  fontWeight: 700,
                  fontSize: '9pt',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: '#444',
                  margin: 0,
                }}
              >
                Through the Sub-Divisional Officer
              </p>
              <p
                style={{
                  fontWeight: 700,
                  fontSize: '9pt',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: '#444',
                  margin: '2mm 0 0',
                }}
              >
                {consumerName || 'Consumer'} &mdash; Ref: {referenceNo || 'N/A'}
              </p>
              <hr
                style={{
                  border: 0,
                  borderTop: '1.5px solid #000',
                  margin: '6mm auto',
                  width: '55%',
                }}
              />
            </header>

            <div style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{disputeLetter}</div>

            <footer
              style={{
                marginTop: '12mm',
                paddingTop: '5mm',
                borderTop: '1px solid #ccc',
                fontSize: '9pt',
                color: '#666',
                textAlign: 'center',
              }}
            >
              <p style={{ margin: 0 }}>
                Billing month {billingMonth || 'N/A'} &middot; Reference {referenceNo || 'N/A'}
              </p>
              <p style={{ margin: '2mm 0 0' }}>
                Generated by BijliTrack. Verify all statutory citations before filing.
              </p>
            </footer>
          </article>

          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 text-center shrink-0 print:hidden">
            Verify all citations and figures against your original bill before submitting.
          </p>

          {/* Print isolation: hide everything except the letter sheet. */}
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              [data-dispute-letter],
              [data-dispute-letter] * { visibility: visible !important; }
              [data-dispute-letter] {
                position: absolute !important;
                inset: 0 !important;
                margin: 0 !important;
                width: 100% !important;
                max-width: none !important;
                box-shadow: none !important;
              }
              @page { size: A4; margin: 0; }
            }
          `}</style>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default DisputeLetterModal;