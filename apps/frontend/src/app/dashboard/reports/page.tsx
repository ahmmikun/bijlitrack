'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb, TrendingUp, AlertTriangle, ShieldCheck, FileSearch, Sparkles, Target, RefreshCw, Zap } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const refId = searchParams.get('ref');
  const { activeRefId } = useAuth();
  const queryClient = useQueryClient();

  const activeRef = refId || activeRefId;

  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ['latest-report', activeRef],
    queryFn: async () => {
      if (!activeRef) return null;
      const res = await api.get(`/dashboard/${activeRef}/report`);
      return res.data;
    },
    enabled: !!activeRef
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/dashboard/${activeRef}/report/generate`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['latest-report', activeRef], data);
      toast.success('AI report generated successfully!');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to generate report';
      toast.error(msg);
    },
  });

  if (reportLoading) {
    return (
      <div className="space-y-12">
        <Skeleton className="h-14 w-64 rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-[3rem]" />
        <div className="space-y-4">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!activeRef) {
    return (
      <Alert className="rounded-[2.5rem] border-2 border-indigo-100 bg-indigo-500/5 p-12">
        <ShieldCheck className="h-10 w-10 text-indigo-500" />
        <div className="ml-6">
            <AlertTitle className="text-2xl font-black text-foreground tracking-tighter uppercase">Selection Required</AlertTitle>
            <AlertDescription className="text-muted-foreground font-bold mt-3 uppercase text-xs tracking-[0.2em] leading-relaxed">
              We need an active account to generate your AI electricity briefing.
            </AlertDescription>
        </div>
      </Alert>
    );
  }

  const hasReport = report && report._id;

  return (
    <div className="space-y-8 sm:space-y-12 max-w-5xl mx-auto animate-in fade-in duration-1000 pb-24">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tighter text-foreground uppercase">
            AI <span className="text-primary">Report</span>
          </h1>
          <div className="text-muted-foreground font-bold uppercase text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.3em] flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_currentColor]"></div>
            Powered by DeepSeek AI • 2 reports/day
          </div>
        </div>
        <Button 
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className={`bg-primary hover:opacity-90 text-primary-foreground font-black h-14 px-8 rounded-xl shadow-xl shadow-primary/20 transition-all active:scale-95 border-0 gap-3 text-xs uppercase tracking-widest ${generateMutation.isPending ? 'animate-pulse' : ''}`}
        >
          {generateMutation.isPending ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Analyzing Your Data...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Generate New Report
            </>
          )}
        </Button>
      </div>

      {/* Info about what data is used */}
      <Alert className="rounded-2xl border border-blue-500/20 bg-blue-500/5">
        <Zap className="h-5 w-5 text-blue-500" />
        <AlertDescription className="text-muted-foreground text-xs font-medium ml-2">
          AI analyzes your <span className="font-bold text-foreground">12-month bill history</span>, <span className="font-bold text-foreground">30-day outage records</span>, and <span className="font-bold text-foreground">live feeder data</span> to generate insights.
        </AlertDescription>
      </Alert>

      {hasReport ? (
        <>
          <Card className="border-border shadow-2xl shadow-foreground/5 bg-card rounded-3xl sm:rounded-[4rem] overflow-hidden group">
            <div className="h-2.5 w-full bg-gradient-to-r from-primary to-indigo-500"></div>
            <CardHeader className="p-6 sm:p-10 lg:p-16 border-b border-border bg-muted/20">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 sm:gap-8">
                <div className="space-y-2">
                  <CardTitle className="text-xl sm:text-3xl font-black tracking-tighter flex items-center gap-3 sm:gap-4 uppercase">
                    <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
                    Summary
                  </CardTitle>
                  <CardDescription className="font-bold text-muted-foreground uppercase text-[9px] sm:text-[10px] tracking-widest">
                    Generated: {new Date(report.generatedAt).toLocaleString()}
                  </CardDescription>
                </div>
                <Badge className="bg-green-500/10 text-green-500 border-green-500/20 h-8 sm:h-10 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] border shrink-0">AI Generated</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 sm:p-10 lg:p-16">
              <p className="text-foreground text-lg sm:text-2xl font-bold leading-relaxed tracking-tight italic">
                &ldquo;{report.summary}&rdquo;
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-6 sm:gap-8">
            <Accordion type="single" collapsible defaultValue="item-1" className="w-full space-y-4 sm:space-y-6">
              {[
                { id: 'item-1', label: 'Bill Analysis', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10', data: report.billingInsights },
                { id: 'item-2', label: 'Grid Stability', icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', data: report.outageInsights },
                { id: 'item-3', label: 'Recommendations', icon: Target, color: 'text-purple-500', bg: 'bg-purple-500/10', data: report.recommendations }
              ].map((section) => (
                <AccordionItem key={section.id} value={section.id} className="border-border bg-card rounded-2xl sm:rounded-[2.5rem] px-4 sm:px-8 shadow-xl shadow-foreground/5 border transition-all hover:border-primary/20">
                  <AccordionTrigger className="hover:no-underline py-6 sm:py-8 group">
                    <div className="flex items-center text-lg sm:text-xl font-black text-foreground tracking-tighter uppercase text-left">
                      <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl ${section.bg} ${section.color} flex items-center justify-center mr-4 sm:mr-6 shadow-sm transition-transform group-hover:rotate-12 shrink-0`}>
                        <section.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      {section.label}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-8 sm:pb-10 pt-2 sm:pt-4 px-1 sm:px-2">
                    <div className="p-5 sm:p-8 rounded-2xl sm:rounded-[2rem] bg-muted/20 border border-border shadow-inner">
                      <ul className="space-y-4 sm:space-y-6">
                        {section.data?.length > 0 ? section.data.map((insight: string, i: number) => (
                          <li key={i} className="flex items-start gap-3 sm:gap-4 group/li">
                            <div className={`h-1.5 w-1.5 rounded-full ${section.color} mt-2 sm:mt-2.5 shrink-0 shadow-[0_0_8px_currentColor] group-hover/li:scale-150 transition-transform`}></div>
                            <p className="text-muted-foreground font-bold text-sm sm:text-lg leading-relaxed">{insight}</p>
                          </li>
                        )) : (
                          <li className="text-muted-foreground/40 font-black uppercase text-[10px] sm:text-xs tracking-widest italic text-center py-6 sm:py-10">No data available</li>
                        )}
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </>
      ) : (
        /* No report yet — show CTA */
        <Card className="border-border shadow-xl bg-card rounded-3xl p-12 sm:p-16 text-center">
          <div className="flex flex-col items-center gap-6">
            <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">No Report Yet</h2>
              <p className="text-muted-foreground font-medium max-w-md mx-auto">
                Click &quot;Generate New Report&quot; to get AI-powered insights about your electricity usage, billing patterns, and outage history.
              </p>
            </div>
            <Button 
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              size="lg"
              className={`bg-primary hover:opacity-90 text-primary-foreground font-black h-14 px-10 rounded-xl shadow-xl shadow-primary/20 transition-all active:scale-95 border-0 gap-3 ${generateMutation.isPending ? 'animate-pulse' : ''}`}
            >
              {generateMutation.isPending ? (
                <>
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Analyzing Your Data...
                </>
              ) : (
                <><Sparkles className="h-5 w-5" /> Generate First Report</>
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Free • 2 reports per day • Powered by DeepSeek AI</p>
          </div>
        </Card>
      )}

      <div className="pt-8 sm:pt-12 text-center">
        <div className="inline-flex items-center gap-3 sm:gap-4 px-6 sm:px-8 py-3 sm:py-4 bg-muted rounded-2xl sm:rounded-[2rem] border border-border">
          <FileSearch className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-muted-foreground">
            {hasReport ? 'Report based on your actual CCMS data' : 'Waiting for report generation'}
          </span>
        </div>
      </div>
    </div>
  );
}
