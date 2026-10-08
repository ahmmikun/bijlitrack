'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import BillDropzone, { type AuditParseResponse } from '@/components/audit/BillDropzone';
import AuditReportCard from '@/components/audit/AuditReportCard';

export default function AuditPage() {
  const [result, setResult] = useState<AuditParseResponse | null>(null);

  return (
    <div className="space-y-8 sm:space-y-12 animate-in fade-in duration-1000 pb-20">
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="text-3xl sm:text-5xl font-black tracking-tighter text-foreground uppercase">
          Bill <span className="text-primary">Audit</span>
        </h1>
        <div className="text-muted-foreground font-bold uppercase text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.3em] flex items-center justify-center sm:justify-start gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_currentColor]"></div>
          Claude Vision Multilateral Bill Verification
        </div>
      </div>

      <BillDropzone onParsed={setResult} />

      {result?.success && result.billData && result.auditFindings && (
        <AuditReportCard billData={result.billData} auditFindings={result.auditFindings} />
      )}

      {!result && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4 text-center">
          {[
            { label: 'Extracts FCA, QTA, GST & §235' },
            { label: 'Checks the 200-unit protected slab' },
            { label: 'Flags overbilling in PKR' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}