'use client';

import { useCallback, useRef, useState } from 'react';
import { UploadCloud, FileText, Loader2, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { ParsedBill } from '@/lib/claude/billSchema';
import type { AuditReport } from '@/lib/claude/auditEngine';

const MAX_BYTES = 4.5 * 1024 * 1024;
const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export interface AuditParseResponse {
  success: boolean;
  error?: string;
  billData?: ParsedBill;
  auditFindings?: AuditReport;
}

interface BillDropzoneProps {
  onParsed: (response: AuditParseResponse) => void;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Could not read file as base64'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

export function BillDropzone({ onParsed }: BillDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!ACCEPTED.includes(file.type)) {
        setError('Only PDF, JPEG, and PNG bills are supported.');
        return;
      }

      if (file.size > MAX_BYTES) {
        setError(
          `Bill is ${(file.size / 1024 / 1024).toFixed(1)}MB, which exceeds the 4.5MB limit.`
        );
        return;
      }

      setIsLoading(true);
      try {
        const fileBase64 = await fileToBase64(file);
        const res = await fetch('/api/audit/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileBase64, mediaType: file.type }),
        });

        const data = (await res.json()) as AuditParseResponse;

        if (!res.ok || !data.success) {
          setError(data.error || 'Failed to parse this bill.');
          return;
        }

        onParsed(data);
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : 'Network error while uploading the bill.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [onParsed]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          'relative rounded-[2.5rem] border-2 border-dashed transition-all duration-200',
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border bg-muted/20 hover:border-primary/50',
          isLoading && 'opacity-60 pointer-events-none'
        )}
      >
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center sm:py-24">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            {isLoading ? (
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            ) : (
              <UploadCloud className="h-8 w-8 text-primary" />
            )}
          </div>

          <div className="space-y-2">
            <p className="text-lg font-black tracking-tight uppercase text-foreground">
              {isLoading ? 'Claude Vision is reading your bill' : 'Drop your bill here'}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              PDF, JPEG, PNG or WebP &middot; Max 4.5MB
            </p>
          </div>

          {isLoading && (
            <div className="w-full max-w-sm space-y-2 pt-2">
              <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                <div className="h-full w-1/3 rounded-full bg-primary animate-pulse" />
              </div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                Extracting FCA, QTA, GST &amp; Section 235
              </p>
            </div>
          )}

          <Button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isLoading}
            className="mt-2 h-12 px-8 bg-primary hover:opacity-90 text-primary-foreground font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 border-0 gap-2"
          >
            <FileText className="h-4 w-4" />
            {isLoading ? 'Parsing...' : 'Browse Files'}
          </Button>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(',')}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
          />
        </div>

        {isLoading && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="absolute top-5 right-5 h-8 w-8 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Cancel parsing"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-[2rem] p-6">
          <AlertCircle className="h-5 w-5" />
          <div className="ml-3">
            <AlertTitle className="text-xs font-black uppercase tracking-widest">
              Upload Failed
            </AlertTitle>
            <AlertDescription className="text-xs font-medium mt-1">{error}</AlertDescription>
          </div>
        </Alert>
      )}
    </div>
  );
}

export default BillDropzone;