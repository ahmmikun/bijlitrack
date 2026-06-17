'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, ZapOff, Clock, Activity, Zap, ShieldCheck, History } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export default function OutagesPage() {
  const searchParams = useSearchParams();
  const refId = searchParams.get('ref');
  const { activeRefId } = useAuth();

  const activeRef = refId || activeRefId;

  const { data: outageHistory, isLoading, error } = useQuery({
    queryKey: ['outage-history', activeRef],
    queryFn: async () => {
      if (!activeRef) return [];
      const res = await api.get(`/dashboard/${activeRef}/outages`);
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
      <Alert className="rounded-[2.5rem] border-2 border-amber-100 bg-amber-50/30 p-12">
        <ShieldCheck className="h-10 w-10 text-amber-500" />
        <div className="ml-6">
            <AlertTitle className="text-2xl font-black text-amber-900 tracking-tighter uppercase">No Account Selected</AlertTitle>
            <AlertDescription className="text-amber-700 font-bold mt-3 uppercase text-xs tracking-[0.2em] leading-relaxed">
              Please select a meter number to analyze grid stability and outage history.
            </AlertDescription>
        </div>
      </Alert>
    );
  }

  const hasHistory = Array.isArray(outageHistory) && outageHistory.length > 0;
  
  const chartData = hasHistory 
    ? [...outageHistory].reverse().map(o => ({ 
        date: new Date(o.date).toLocaleDateString(undefined, { weekday: 'short' }), 
        scheduled: o.scheduledOutageHours || 1, 
        actual: o.actualOutageHours || 2 
      }))
    : [
        { date: 'MON', scheduled: 2, actual: 2.5 },
        { date: 'TUE', scheduled: 2, actual: 1.5 },
        { date: 'WED', scheduled: 4, actual: 4 },
        { date: 'THU', scheduled: 2, actual: 3.5 },
        { date: 'FRI', scheduled: 1, actual: 1 },
      ];

  return (
    <div className="space-y-8 sm:space-y-12 animate-in fade-in duration-1000 pb-20">
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="text-3xl sm:text-5xl font-black tracking-tighter text-foreground uppercase">
          Power <span className="text-amber-500">Status</span>
        </h1>
        <div className="text-muted-foreground font-bold uppercase text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.3em] flex items-center justify-center sm:justify-start gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_currentColor]"></div>
          Grid Stability & Outage Logs
        </div>
      </div>

      <div className="grid gap-6 sm:gap-8 lg:grid-cols-3">
        {[
            { label: 'Avg Outage', val: '2.4', unit: 'Hrs', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Grid Uptime', val: '92', unit: '%', icon: Activity, color: 'text-green-500', bg: 'bg-green-500/10' },
            { label: 'Recent Trip', val: '19:00', unit: 'Hrs', icon: ZapOff, color: 'text-red-500', bg: 'bg-red-500/10' }
        ].map((s, i) => (
            <Card key={i} className="border-border shadow-xl shadow-foreground/5 bg-card rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 group hover:-translate-y-1 transition-all">
                <div className="flex items-center gap-4 sm:gap-6">
                    <div className={`h-12 w-12 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl ${s.bg} ${s.color} flex items-center justify-center shadow-lg transition-transform group-hover:rotate-12 shrink-0`}>
                        <s.icon className="h-6 w-6 sm:h-8 w-8" />
                    </div>
                    <div>
                        <p className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{s.label}</p>
                        <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tighter">{s.val} <span className="text-xs sm:text-sm text-muted-foreground/40 font-bold uppercase">{s.unit}</span></p>
                    </div>
                </div>
            </Card>
        ))}

        {/* Chart */}
        <Card className="border-border shadow-2xl shadow-foreground/5 bg-card rounded-3xl sm:rounded-[4rem] overflow-hidden lg:col-span-3 transition-colors">
          <CardHeader className="p-6 sm:p-12 border-b border-border bg-muted/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="space-y-1">
                <CardTitle className="text-xl sm:text-2xl font-black tracking-tight uppercase">Outage Comparison</CardTitle>
                <CardDescription className="font-bold text-muted-foreground uppercase text-[9px] sm:text-[10px] tracking-widest mt-1">Scheduled vs Actual downtime in hours</CardDescription>
            </div>
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl sm:rounded-3xl bg-amber-500 flex items-center justify-center shadow-2xl shadow-amber-500/20 shrink-0 self-end sm:self-auto -mt-16 sm:mt-0 mr-2 sm:mr-0">
                <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-12 h-[300px] sm:h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 900 }}
                  dy={10}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 900 }}
                  tickFormatter={(value) => `${value}h`}
                />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    borderRadius: '24px', 
                    border: '1px solid hsl(var(--border))', 
                    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
                    padding: '16px'
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontWeight: '900', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                <Bar dataKey="scheduled" name="SCHEDULED" fill="hsl(var(--muted))" radius={[8, 8, 0, 0]} barSize={24} />
                <Bar dataKey="actual" name="ACTUAL" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Logs */}
        <Card className="border-border shadow-2xl shadow-foreground/5 bg-card rounded-3xl sm:rounded-[4rem] overflow-hidden lg:col-span-3 transition-colors">
          <CardHeader className="p-6 sm:p-12 border-b border-border bg-muted/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="space-y-1 w-full sm:w-auto">
                <CardTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase">Recent Events</CardTitle>
                <CardDescription className="font-bold text-muted-foreground uppercase text-[9px] sm:text-[10px] tracking-widest mt-1">History of power status changes</CardDescription>
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
                      <TableHead className="font-black text-[9px] sm:text-[10px] uppercase text-muted-foreground tracking-[0.2em] sm:tracking-[0.3em] pl-6 sm:pl-16">Date</TableHead>
                      <TableHead className="font-black text-[9px] sm:text-[10px] uppercase text-muted-foreground tracking-[0.2em] sm:tracking-[0.3em] text-center">Power Status</TableHead>
                      <TableHead className="font-black text-[9px] sm:text-[10px] uppercase text-muted-foreground tracking-[0.2em] sm:tracking-[0.3em] text-center">Scheduled</TableHead>
                      <TableHead className="font-black text-[9px] sm:text-[10px] uppercase text-muted-foreground tracking-[0.2em] sm:tracking-[0.3em] pr-6 sm:pr-16 text-right">Actual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outageHistory.map((outage: any) => (
                      <TableRow key={outage._id} className="h-20 sm:h-28 border-b border-border/50 hover:bg-amber-500/5 transition-all group">
                        <TableCell className="font-black text-foreground pl-6 sm:pl-16 text-sm sm:text-lg tracking-tighter uppercase whitespace-nowrap">
                          {new Date(outage.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          <div className={`inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-1.5 sm:py-2.5 rounded-full font-black text-[9px] sm:text-[10px] uppercase tracking-widest shadow-sm border transition-all group-hover:scale-105 ${
                            outage.feederStatus === 'ON' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}>
                            <div className={`h-1.5 w-1.5 sm:h-2.5 w-2.5 rounded-full ${outage.feederStatus === 'ON' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                            {outage.feederStatus || 'ACTIVE'}
                          </div>
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1 sm:gap-2 font-black text-muted-foreground/40 text-sm sm:text-base tracking-tighter">
                            <Clock className="h-4 w-4 sm:h-5 sm:w-5 opacity-40 hidden xs:block" />
                            {outage.scheduledOutageHours || 0} <span className="text-[9px] sm:text-[10px] uppercase">Hrs</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6 sm:pr-16 whitespace-nowrap">
                           <span className="text-xl sm:text-2xl font-black text-foreground tracking-tighter">{outage.actualOutageHours || 0}h</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-24 sm:py-40">
                <div className="h-16 w-16 sm:h-24 sm:w-24 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 border border-border">
                    <ZapOff className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/20" />
                </div>
                <p className="text-muted-foreground/40 font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] text-[10px] italic">No outage records detected...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

