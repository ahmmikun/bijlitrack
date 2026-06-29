'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '@/lib/api';
import { fetchAllCCMSData, fetchFeederStatus } from '@/lib/ccms';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Activity, CalendarClock, Zap, Receipt, MapPin, AlertCircle, ArrowRight, RefreshCw, BarChart3, User, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { toast } from 'sonner';

export default function DashboardOverview() {
  const { activeRefId, setActiveRefId } = useAuth();
  const queryClient = useQueryClient();
  const [syncingRefId, setSyncingRefId] = useState<string | null>(null);

  const { data: references, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-references'],
    queryFn: async () => {
      const res = await api.get('/reference/my');
      
      if (!Array.isArray(res.data)) return [];

      const detailedRefs = await Promise.all(res.data.map(async (ref: any) => {
        try {
          const summaryRes = await api.get(`/dashboard/${ref._id}`);
          const details = summaryRes.data;

          // If no data stored yet, fetch from CCMS directly and save
          if (!details.consumerInfo && !details.billingInfo) {
            try {
              const ccmsData = await fetchAllCCMSData(ref.referenceNo);
              if (ccmsData.user || ccmsData.bill) {
                await api.post(`/dashboard/${ref._id}/save`, {
                  consumerInfo: ccmsData.user,
                  billingInfo: ccmsData.bill,
                  outageInfo: ccmsData.loadInfo
                });
                return { ...ref, details: { 
                  consumerInfo: ccmsData.user, 
                  billingInfo: ccmsData.bill, 
                  outageInfo: ccmsData.loadInfo,
                  lastUpdated: new Date().toISOString()
                }};
              }
            } catch (ccmsErr) {
              console.error('CCMS auto-fetch failed:', ccmsErr);
            }
          }

          return { ...ref, details };
        } catch (e) {
          return ref;
        }
      }));
      return detailedRefs;
    },
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Live feeder status polling every 3 minutes for active reference
  const activeRef = references?.find((r: any) => r._id === activeRefId);
  const { data: liveStatus } = useQuery({
    queryKey: ['live-feeder-status', activeRef?.referenceNo],
    queryFn: () => fetchFeederStatus(activeRef!.referenceNo),
    enabled: !!activeRef?.referenceNo,
    refetchInterval: 3 * 60 * 1000, // Every 3 minutes
    refetchIntervalInBackground: false,
    retry: 1,
  });

  const handleSync = async (id: string, referenceNo: string) => {
    const toastId = toast.loading("Fetching latest data from CCMS...");
    setSyncingRefId(id);
    try {
      // Fetch directly from CCMS (client-side, no geo-block)
      const ccmsData = await fetchAllCCMSData(referenceNo);
      
      // Send to backend to save
      await api.post(`/dashboard/${id}/save`, {
        consumerInfo: ccmsData.user,
        billingInfo: ccmsData.bill,
        outageInfo: ccmsData.loadInfo
      });

      // Immediately update local UI with fresh data (no re-fetching from backend)
      queryClient.setQueryData(['dashboard-references'], (oldData: any) => {
        if (!Array.isArray(oldData)) return oldData;

        return oldData.map((ref: any) => {
          if (ref._id !== id) return ref;

          return {
            ...ref,
            details: {
              consumerInfo: ccmsData.user,
              billingInfo: ccmsData.bill,
              outageInfo: ccmsData.loadInfo,
              loadManagementInfo: ccmsData.loadInfo,
              lastUpdated: new Date().toISOString(),
            },
          };
        });
      });

      // Also update the details page cache if user navigates there
      queryClient.setQueryData(['reference-details', id], {
        consumerInfo: ccmsData.user,
        billingInfo: ccmsData.bill,
        feederInfo: ccmsData.loadInfo ? {
          code: ccmsData.loadInfo.feederCode,
          name: ccmsData.loadInfo.feederName,
          grid: ccmsData.loadInfo.gridStation,
        } : null,
        loadManagementInfo: ccmsData.loadInfo,
        outageInfo: ccmsData.loadInfo,
        lastUpdated: new Date().toISOString(),
      });

      // Force refresh live feeder status
      queryClient.invalidateQueries({ queryKey: ['live-feeder-status', referenceNo] });

      toast.success("Account data updated", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Update failed", { id: toastId });
    } finally {
      setSyncingRefId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-lg" />
        </div>
        <div className="grid gap-10 grid-cols-1 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="overflow-hidden border-0 shadow-xl rounded-[2.5rem] bg-card">
              <Skeleton className="h-96 w-full" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Dashboard</h1>
        <Alert variant="destructive" className="rounded-3xl border-2 bg-destructive/5 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="font-black text-lg">Connection Failed</AlertTitle>
          <AlertDescription className="flex flex-col gap-6 mt-4">
            <p className="font-bold opacity-80 leading-relaxed uppercase text-xs tracking-widest">We couldn't reach the server. Please check your connection and try again.</p>
            <Button onClick={() => refetch()} variant="outline" className="w-fit font-black rounded-xl h-14 px-8 border-destructive/20 bg-background hover:bg-destructive/10 shadow-lg">Retry Now</Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const hasReferences = Array.isArray(references) && references.length > 0;

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            My <span className="text-primary">Accounts</span>
          </h1>
          <div className="text-muted-foreground font-medium text-sm flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_currentColor]"></div>
            Live Monitoring Active
          </div>
        </div>
        <Link href="/dashboard/lookup" className="w-full sm:w-auto">
          <Button className="bg-primary hover:opacity-90 text-primary-foreground w-full h-14 px-8 rounded-xl font-semibold transition-all shadow-md group border-0">
            <Search className="mr-3 h-5 w-5 transition-transform group-hover:scale-110" />
            Add New Account
          </Button>
        </Link>
      </div>

      {!hasReferences ? (
        <Card className="text-center py-24 border-dashed border-2 border-border bg-card shadow-sm rounded-3xl group hover:border-primary/20 transition-colors">
          <CardContent className="flex flex-col items-center justify-center space-y-8">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full scale-150 animate-pulse"></div>
              <div className="relative rounded-full bg-background p-8 shadow-sm border border-border group-hover:-translate-y-1 transition-transform duration-300">
                <Activity className="h-12 w-12 text-primary" />
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-foreground">No Accounts Yet</h2>
              <p className="text-muted-foreground max-w-md mx-auto text-base">
                Enter your electricity reference number to start tracking your bills and power status.
              </p>
            </div>
            <Link href="/dashboard/lookup">
              <Button size="lg" className="bg-primary hover:opacity-90 text-primary-foreground px-10 rounded-xl font-semibold h-14 text-base shadow-md transition-all hover:scale-105 active:scale-95 border-0">
                Register First Account <ArrowRight className="ml-3 h-5 w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
          {references.map((ref: any) => {
            const details = ref.details || {};
            const bill = details.billingInfo?.basicInfo;
            const feeder = details.outageInfo;
            const consumer = details.consumerInfo;
            const isActive = activeRefId === ref._id;
            const isSyncing = syncingRefId === ref._id;
            // Use live polled status if this is the active reference, otherwise use saved snapshot
            const currentFeederStatus = (isActive && liveStatus) ? liveStatus.currentStatus : feeder?.currentStatus;
            const isOnline = currentFeederStatus === 'ON';

            return (
              <div 
                key={ref._id} 
                className={`flex flex-col group transition-all duration-300 border rounded-2xl overflow-hidden relative bg-card ${
                  isActive 
                    ? 'border-primary shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(255,255,255,0.05)] ring-1 ring-primary' 
                    : 'border-border shadow-sm hover:border-primary/40 hover:shadow-md'
                }`}
              >
                <div className={`h-1.5 w-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} transition-all duration-500`}></div>
                
                <div className="p-8 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-8">
                    <div className="truncate flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="px-2.5 py-0.5 bg-muted text-muted-foreground rounded-md">
                           <span className="text-xs font-semibold">Meter {ref.referenceNoLast4}</span>
                        </div>
                        {isActive && (
                          <div className="flex items-center gap-2 bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20">
                             <div className="h-1.5 w-1.5 rounded-full bg-primary animate-ping"></div>
                             <span className="text-xs font-semibold text-primary">Active</span>
                          </div>
                        )}
                      </div>
                      <h3 className="text-2xl font-mono font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                        {ref.referenceNo}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate flex items-center gap-2">
                        <User className="h-3.5 w-3.5" /> {consumer?.NAME || 'Updating Name...'}
                      </p>
                      {details.lastUpdated && (
                        <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Updated {new Date(details.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
                      <Badge variant={isOnline ? "default" : "destructive"} className={`${isOnline ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 hover:bg-green-500/20" : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20"} font-semibold text-xs px-3 py-1 rounded-full border`}>
                        {currentFeederStatus || 'OFF'}
                      </Badge>
                      <span className="text-xs text-muted-foreground/60">Power Status</span>
                      {!isOnline && feeder?.expectedRestorationTime && (
                        <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 mt-1">
                          ERT: {feeder.expectedRestorationTime}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-8 p-6 bg-muted/30 rounded-xl border border-border relative overflow-hidden transition-colors">
                    <div className="flex flex-col justify-center relative z-10">
                      <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-primary" /> Latest Bill
                      </p>
                      <div className="flex items-baseline">
                        <span className="text-sm text-muted-foreground mr-1">Rs.</span>
                        <p className="text-3xl font-mono font-bold text-foreground">
                          {bill?.netBill ? bill.netBill.toLocaleString() : '---'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col justify-center items-end text-right border-l border-border pl-6 relative z-10">
                      <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-amber-500" /> Due Date
                      </p>
                      <p className="text-lg font-mono font-medium text-foreground">
                        {bill?.billDueDate ? new Date(bill.billDueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '---'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-border mt-auto">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-card shadow-sm border border-border flex items-center justify-center shrink-0">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-medium mb-0.5">Feeder Name</p>
                        <p className="truncate text-sm font-semibold text-foreground">{feeder?.feederName || 'Syncing...'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-card shadow-sm border border-border flex items-center justify-center shrink-0">
                        <Zap className="h-5 w-5 text-amber-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground font-medium mb-0.5">Technical</p>
                        <p className="text-sm font-mono font-medium text-foreground">
                          {feeder?.voltage || 0} <span className="text-xs font-sans text-muted-foreground">kV</span> 
                          <span className="mx-2 text-muted-foreground/30">|</span> 
                          {feeder?.powerFactor || 0}<span className="text-xs font-sans text-muted-foreground">%</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-muted/20 grid grid-cols-3 gap-4 border-t border-border">
                  <Button 
                    onClick={() => setActiveRefId(ref._id)}
                    className={`h-12 font-semibold rounded-xl text-xs transition-all active:scale-95 border-0 ${
                      isActive 
                        ? 'bg-primary text-primary-foreground shadow-md' 
                        : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                    }`}
                  >
                    {isActive ? 'Selected' : 'Select'}
                  </Button>
                  <Button
                    onClick={() => handleSync(ref._id, ref.referenceNo)}
                    disabled={isSyncing}
                    variant="outline"
                    className="h-12 font-semibold rounded-xl text-xs bg-card text-foreground border-border hover:bg-accent hover:text-foreground transition-all active:scale-95 group/sync"
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 transition-transform ${isSyncing ? 'animate-spin' : 'group-active/sync:rotate-180'}`} />
                    {isSyncing ? 'Updating' : 'Update'}
                  </Button>
                  <Link href={`/dashboard/details?ref=${ref._id}`} className="w-full">
                    <Button variant="ghost" className="w-full h-12 font-semibold rounded-xl text-xs text-primary hover:bg-primary/10 hover:text-primary transition-all active:scale-95 border border-primary/20">
                      Details
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
