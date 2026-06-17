'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { AlertCircle, History, Receipt, Info, TrendingUp, Calendar, CalendarClock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export default function BillingPage() {
  const searchParams = useSearchParams();
  const refId = searchParams.get('ref');
  const { activeRefId } = useAuth();

  const activeRef = refId || activeRefId;

  const { data: billingHistory, isLoading, error, refetch } = useQuery({
    queryKey: ['billing-history', activeRef],
    queryFn: async () => {
      if (!activeRef) return [];
      const res = await api.get(`/dashboard/${activeRef}/billing`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!activeRef
  });

  if (isLoading) {
    return (
      <div className="space-y-12">
        <Skeleton className="h-14 w-64 rounded-2xl" />
        <div className="grid gap-10">
          <Skeleton className="h-[400px] w-full rounded-[3rem]" />
          <Skeleton className="h-[500px] w-full rounded-[3rem]" />
        </div>
      </div>
    );
  }

  if (!activeRef) {
    return (
      <Alert className="rounded-[2.5rem] border-2 border-primary/20 bg-primary/5 p-10">
        <AlertCircle className="h-8 w-8 text-primary" />
        <div className="ml-4">
            <AlertTitle className="text-xl font-black uppercase tracking-tight">Account Selection Required</AlertTitle>
            <AlertDescription className="text-muted-foreground font-bold mt-2 uppercase text-[10px] tracking-widest leading-relaxed">
              Please select an active meter from the sidebar or dashboard to view billing trends.
            </AlertDescription>
        </div>
      </Alert>
    );
  }

  const hasHistory = Array.isArray(billingHistory) && billingHistory.length > 0;
  
  // Parse billMonth (e.g. "SEP-25", "MAY-26") into a sortable date
  const parseBillMonth = (monthStr: string) => {
    if (!monthStr) return new Date(0);
    const months: Record<string, number> = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
    const parts = monthStr.split('-');
    if (parts.length !== 2) return new Date(0);
    const mon = months[parts[0].toUpperCase()] ?? 0;
    const year = 2000 + parseInt(parts[1] || '0');
    return new Date(year, mon, 1);
  };

  // Sort chronologically for chart (oldest → newest, 2025 first then 2026)
  const chartData = hasHistory 
    ? [...billingHistory]
        .filter(b => b.amountDue > 0)
        .sort((a, b) => parseBillMonth(a.billMonth).getTime() - parseBillMonth(b.billMonth).getTime())
        .map(b => ({ month: b.billMonth, amount: b.amountDue }))
    : [{ month: '---', amount: 0 }];

  // Sort reverse chronologically for table (newest first, 2026 on top then 2025)
  const sortedBillingHistory = hasHistory
    ? [...billingHistory].sort((a, b) => parseBillMonth(b.billMonth).getTime() - parseBillMonth(a.billMonth).getTime())
    : [];

  return (
    <div className="space-y-8 sm:space-y-12 animate-in fade-in duration-1000 pb-20">
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="text-3xl sm:text-5xl font-black tracking-tighter text-foreground uppercase">
          Bill <span className="text-primary">Analysis</span>
        </h1>
        <div className="text-muted-foreground font-bold uppercase text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.3em] flex items-center justify-center sm:justify-start gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_currentColor]"></div>
          Historical Consumption Ledger
        </div>
      </div>

      <div className="grid gap-8 sm:gap-12">
        {/* Chart Card */}
        <Card className="border-border shadow-2xl shadow-foreground/5 bg-card rounded-3xl sm:rounded-[3rem] overflow-hidden group">
          <CardHeader className="p-6 sm:p-10 border-b border-border bg-muted/20">
            <div className="flex justify-between items-center gap-4">
                <div className="space-y-1">
                    <CardTitle className="text-xl sm:text-2xl font-black tracking-tight uppercase">Spending Trend</CardTitle>
                    <CardDescription className="font-bold text-muted-foreground uppercase text-[9px] sm:text-[10px] tracking-widest mt-1">Monthly variation in electricity costs</CardDescription>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20 shrink-0">
                    <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-10 h-[300px] sm:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-muted-foreground)" opacity={0.2} />
                <XAxis 
                  dataKey="month" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10, fontWeight: 900 }}
                  dy={15}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10, fontWeight: 900 }}
                  tickFormatter={(value) => `Rs ${value.toLocaleString()}`}
                  width={70}
                />
                <Tooltip 
                  cursor={{ stroke: 'var(--color-primary)', strokeWidth: 1 }}
                  formatter={(value: any) => [`Rs ${(value || 0).toLocaleString()}`, 'BILL_AMOUNT']}
                  contentStyle={{ 
                    backgroundColor: 'var(--color-card)',
                    color: 'var(--color-card-foreground)',
                    borderRadius: '20px', 
                    border: '1px solid var(--color-muted-foreground)', 
                    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
                    padding: '12px',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    fontSize: '9px'
                  }}
                  labelStyle={{ color: 'var(--color-muted-foreground)', fontWeight: '700' }}
                  itemStyle={{ color: 'var(--color-foreground)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="var(--color-primary)" 
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorAmt)"
                  dot={{ r: 5, fill: 'var(--color-primary)', strokeWidth: 3, stroke: 'var(--color-card)' }}
                  activeDot={{ r: 8, fill: 'var(--color-primary)', strokeWidth: 3, stroke: 'var(--color-card)' }} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Table Card */}
        <Card className="border-border shadow-2xl shadow-foreground/5 bg-card rounded-3xl sm:rounded-[3rem] overflow-hidden">
          <CardHeader className="p-6 sm:p-12 border-b border-border bg-muted/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 sm:gap-8">
            <div className="space-y-1 w-full sm:w-auto">
                <CardTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase">Detailed Records</CardTitle>
                <CardDescription className="font-bold text-muted-foreground uppercase text-[9px] sm:text-[10px] tracking-widest">Chronological list of all payments and dues</CardDescription>
            </div>
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-background shadow-xl flex items-center justify-center border border-border shrink-0 self-end sm:self-auto -mt-16 sm:mt-0 mr-2 sm:mr-0">
                <History className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {hasHistory ? (
              <div className="overflow-x-auto w-full">
                <Table className="min-w-[500px]">
                  <TableHeader className="bg-muted/30">
                    <TableRow className="h-16 sm:h-20 border-0 hover:bg-transparent">
                      <TableHead className="font-black text-[9px] sm:text-[10px] uppercase text-muted-foreground tracking-[0.2em] sm:tracking-[0.3em] pl-6 sm:pl-12">Billing Month</TableHead>
                      <TableHead className="font-black text-[9px] sm:text-[10px] uppercase text-muted-foreground tracking-[0.2em] sm:tracking-[0.3em] text-right">Amount (Rs.)</TableHead>
                      <TableHead className="hidden md:table-cell font-black text-[9px] sm:text-[10px] uppercase text-muted-foreground tracking-[0.2em] sm:tracking-[0.3em] text-center">Due Date</TableHead>
                      <TableHead className="text-right font-black text-[9px] sm:text-[10px] uppercase text-muted-foreground tracking-[0.2em] sm:tracking-[0.3em] pr-6 sm:pr-12">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedBillingHistory.map((bill: any) => (
                      <TableRow key={bill._id} className="h-20 sm:h-24 border-b border-border/50 hover:bg-primary/5 transition-all group">
                        <TableCell className="font-black text-foreground pl-6 sm:pl-12 text-base sm:text-lg tracking-tighter uppercase whitespace-nowrap">{bill.billMonth}</TableCell>
                        <TableCell className="font-black text-primary text-right text-lg sm:text-xl tracking-tighter group-hover:scale-105 transition-transform whitespace-nowrap">
                            {bill.amountDue?.toLocaleString() || '0'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-center whitespace-nowrap">
                           <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-muted rounded-full font-black text-[9px] text-muted-foreground uppercase tracking-widest border border-border">
                               <Calendar className="h-3 w-3" />
                               {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : 'N/A'}
                           </div>
                        </TableCell>
                        <TableCell className="text-right pr-6 sm:pr-12 whitespace-nowrap">
                          <Badge className={`h-7 sm:h-8 px-3 sm:px-4 font-black rounded-xl text-[9px] sm:text-[10px] uppercase tracking-widest ${
                              bill.status === 'Paid' 
                                ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                                : 'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}>
                            {bill.status || 'UNPAID'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-24 sm:py-32">
                <Receipt className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/10 mx-auto mb-4 sm:mb-6" />
                <p className="text-muted-foreground/40 font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[10px] italic">Fetching financial history...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
