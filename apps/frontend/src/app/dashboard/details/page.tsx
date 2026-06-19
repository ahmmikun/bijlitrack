'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { fetchAllCCMSData } from '@/lib/ccms';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  User, Receipt, Zap, MapPin, Activity, 
  ArrowLeft, Calendar, Info, ShieldCheck, 
  TrendingUp, Clock, Terminal, RefreshCw, Cpu
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from 'sonner';

export default function ReferenceDetailsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const refId = searchParams.get('ref');
  const { setActiveRefId } = useAuth();

  // Get reference info (to know the referenceNo)
  const { data: references } = useQuery({
    queryKey: ['my-references-list'],
    queryFn: async () => {
      const res = await api.get('/reference/my');
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  const { data: details, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['reference-details', refId],
    queryFn: async () => {
      if (!refId) return null;
      const res = await api.get(`/dashboard/${refId}`);
      return res.data;
    },
    enabled: !!refId
  });

  const handleManualSync = async () => {
    const ref = references?.find((r: any) => r._id === refId);
    if (!ref) return;

    const toastId = toast.loading("Fetching latest data from CCMS...");
    try {
      const ccmsData = await fetchAllCCMSData(ref.referenceNo);
      await api.post(`/dashboard/${refId}/save`, {
        consumerInfo: ccmsData.user,
        billingInfo: ccmsData.bill,
        outageInfo: ccmsData.loadInfo
      });
      toast.success("Account data updated", { id: toastId });
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to update data", { id: toastId });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 sm:space-y-8 w-full max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl" />
          <div className="space-y-2 text-center sm:text-left">
            <Skeleton className="h-6 sm:h-8 w-64 sm:w-80 rounded-lg" />
            <Skeleton className="h-3 w-40 sm:w-48 rounded-md mx-auto sm:mx-0" />
          </div>
        </div>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-3">
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-2xl" />
      </div>
    );
  }

  if (!refId || error || !details) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 w-full max-w-7xl mx-auto">
        <Button variant="ghost" onClick={() => router.push('/dashboard')} className="group font-bold text-xs uppercase tracking-widest hover:bg-accent rounded-lg px-4 h-10 w-full sm:w-auto">
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to Dashboard
        </Button>
        <Alert variant="destructive" className="rounded-2xl border-2 bg-destructive/10 p-6">
          <Info className="h-5 w-5" />
          <div className="ml-3">
             <AlertTitle className="text-base font-bold uppercase">Account Not Found</AlertTitle>
             <AlertDescription className="mt-1 font-medium opacity-80 leading-relaxed uppercase text-[10px] tracking-widest">
               We couldn't retrieve the information for this reference number.
             </AlertDescription>
          </div>
        </Alert>
      </div>
    );
  }

  const consumer = details.consumerInfo || {};
  const bill = details.billingInfo?.basicInfo || {};
  const feeder = details.outageInfo || {};
  const isOnline = feeder.currentStatus === 'ON';

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto pb-16 animate-in fade-in duration-1000 w-full overflow-x-hidden">
      {/* Header Profile */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left w-full lg:w-auto">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => router.push('/dashboard')} 
            className="rounded-xl h-12 w-12 border-2 border-border bg-card hover:bg-accent transition-all shadow-sm group shrink-0 hidden sm:flex"
          >
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
          </Button>
          <div className="space-y-1 flex-1">
            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 sm:gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground uppercase truncate w-full sm:w-auto max-w-full">
                {consumer.NAME || 'UNKNOWN_NODE'}
              </h1>
              <Badge className="bg-primary text-primary-foreground h-6 px-2 font-bold uppercase tracking-widest text-[9px] shrink-0">Live Connection</Badge>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 sm:gap-3">
               <p className="text-muted-foreground font-semibold font-mono text-sm">{consumer.REFNO || '---'}</p>
               <div className="hidden sm:block h-3 w-px bg-border"></div>
               <div className="text-primary font-bold uppercase text-[10px] tracking-widest flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_currentColor]"></div>
                  Selected Meter
               </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full lg:w-auto mt-2 lg:mt-0">
          <Button 
            onClick={handleManualSync} 
            disabled={isRefetching}
            className="bg-foreground text-background hover:opacity-90 font-bold h-12 px-6 rounded-xl shadow-sm transition-all active:scale-95 flex-1 sm:flex-none flex gap-2 border-0 w-full sm:w-auto text-xs uppercase tracking-widest"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              setActiveRefId(refId);
              router.push('/dashboard/billing?ref=' + refId);
            }} 
            className="font-bold border-2 h-12 px-6 rounded-xl transition-all text-muted-foreground flex-1 sm:flex-none w-full sm:w-auto text-xs uppercase tracking-widest"
          >
            Bill Logs
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Info Card */}
        <Card className="border-border shadow-sm bg-card rounded-2xl overflow-hidden group">
          <div className={`h-1.5 w-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <CardHeader className="p-4 sm:p-6 bg-muted/20 border-b border-border">
            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-500" /> Account Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-70">Registered Address</p>
              <p className="text-xs font-semibold text-foreground leading-snug bg-muted/30 p-3 sm:p-4 rounded-xl border border-border uppercase">
                {consumer.ADDR1}<br/>{consumer.ADDR2}
              </p>
            </div>
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-70">Reference No</p>
                <p className="text-sm font-bold text-foreground font-mono truncate">{consumer.REFNO || bill.refNo || 'N/A'}</p>
              </div>
              <div className="space-y-1 xs:text-right">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-70">Connection Type</p>
                <p className="text-sm font-bold text-foreground truncate">{bill.cons_type || bill.cons_cat || bill.tariffDescription || 'N/A'}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-70">CNIC</p>
                <p className="text-sm font-bold text-foreground font-mono truncate">{consumer.NICNO || 'N/A'}</p>
              </div>
              <div className="space-y-1 xs:text-right">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-70">Mobile</p>
                <p className="text-sm font-bold text-foreground font-mono truncate">{consumer.CONTACTNO || 'N/A'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest opacity-70 mb-1">Tariff</p>
                <Badge variant="secondary" className="font-bold h-6 px-2.5 rounded-md text-[10px]">{consumer.TARIFF || '---'}</Badge>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest opacity-70 mb-1">Load</p>
                <Badge className="bg-primary text-primary-foreground font-bold h-6 px-2.5 rounded-md text-[10px]">{consumer.SLOAD || '0'} kW</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing Card */}
        <Card className="border-border shadow-sm bg-card rounded-2xl overflow-hidden group">
          <CardHeader className="p-4 sm:p-6 bg-muted/20 border-b border-border">
            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Receipt className="h-4 w-4 text-indigo-500" /> Current Bill
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-6">
            <div className="p-4 sm:p-6 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-center transition-colors hover:bg-indigo-500/10">
              <p className="text-[9px] text-indigo-500 uppercase font-bold tracking-widest mb-1.5">Total Amount Due</p>
              <div className="flex items-baseline justify-center mb-3">
                 <span className="text-xs font-bold text-indigo-500/60 mr-1 uppercase">Rs.</span>
                 <p className="text-3xl font-bold font-mono text-indigo-600 dark:text-indigo-400 tracking-tight truncate max-w-full">{bill.netBill || '0'}</p>
              </div>
              <div className="flex justify-center">
                <Badge className={`h-6 px-3 font-bold rounded-md shadow-sm border-0 text-[9px] uppercase tracking-widest ${bill.currMonthPayment === "0" ? "bg-red-500 text-white" : "bg-green-500 text-white"}`}>
                  {bill.currMonthPayment === "0" ? "UNPAID" : "PAID"}
                </Badge>
              </div>
            </div>
            <div className="space-y-3 px-1 sm:px-2">
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Due Date</span>
                <span className="text-sm font-semibold text-foreground uppercase">{bill.billDueDate ? new Date(bill.billDueDate).toLocaleDateString('en-GB') : 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Units Used</span>
                <span className="text-sm font-semibold text-foreground font-mono">{bill.totConsum || bill.totCurCons || '0'} <span className="text-[9px] font-sans text-muted-foreground ml-0.5">kWh</span></span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Late Fee</span>
                <span className="text-sm font-semibold text-red-500 font-mono">Rs. {bill.LatePaymentSurcharge || '0'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card className="border-border shadow-sm bg-card rounded-2xl overflow-hidden group">
          <CardHeader className="p-4 sm:p-6 bg-muted/20 border-b border-border">
            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-500" /> Live Power Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-6">
            <div className={`p-4 sm:p-6 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${isOnline ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-2 relative z-10">Grid Signal</p>
              <div className="flex items-center gap-2 relative z-10">
                <div className={`h-3 w-3 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-red-500 animate-ping'} shrink-0`}></div>
                <p className={`text-2xl font-bold tracking-tight uppercase ${isOnline ? 'text-green-500' : 'text-red-500'}`}>{feeder.currentStatus || 'OFFLINE'}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-xl border border-border">
                <div className="h-8 w-8 rounded-lg bg-background shadow-sm border border-border flex items-center justify-center shrink-0">
                  <Zap className="h-4 w-4 text-amber-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest mb-0.5 opacity-80">Local Feeder</p>
                  <p className="text-xs font-semibold text-foreground truncate uppercase">{feeder.feederName || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-xl border border-border">
                <div className="h-8 w-8 rounded-lg bg-background shadow-sm border border-border flex items-center justify-center shrink-0">
                  <MapPin className="h-4 w-4 text-blue-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest mb-0.5 opacity-80">Grid Station</p>
                  <p className="text-xs font-semibold text-foreground truncate uppercase">{feeder.gridStation || 'N/A'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-3">
                <div className="text-center">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest opacity-80 mb-0.5">Voltage</p>
                  <p className="text-lg font-bold font-mono text-foreground">{feeder.voltage || '0'} <span className="text-[9px] font-sans text-muted-foreground uppercase ml-0.5">kV</span></p>
                </div>
                <div className="text-center border-l border-border">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest opacity-80 mb-0.5">P. Factor</p>
                  <p className="text-lg font-bold font-mono text-foreground">{feeder.powerFactor || '0'}<span className="text-[9px] font-sans text-muted-foreground uppercase ml-0.5">%</span></p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meter Status Section */}
      {(() => {
        const meterInfo = details.billingInfo?.metersInfo?.[0];
        const meterStatus = details.billingInfo?.basicInfo?.meter1Status;
        const meterReadDate = details.billingInfo?.basicInfo?.meterReadDate;
        if (!meterInfo && !meterStatus) return null;

        return (
          <Card className="border-border shadow-sm bg-card rounded-2xl overflow-hidden">
            <CardHeader className="p-4 sm:p-6 bg-muted/20 border-b border-border">
              <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Cpu className="h-4 w-4 text-emerald-500" /> Meter Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                <div className="space-y-1.5 text-center p-4 bg-muted/30 rounded-xl border border-border">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest opacity-70">Meter No</p>
                  <p className="text-sm font-bold text-foreground font-mono truncate">{meterInfo?.mtrNo || 'N/A'}</p>
                </div>
                <div className="space-y-1.5 text-center p-4 bg-muted/30 rounded-xl border border-border">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest opacity-70">Consumption</p>
                  <p className="text-sm font-bold text-foreground font-mono">{meterInfo?.mtrKwhConsump || '0'} <span className="text-[9px] text-muted-foreground font-sans">kWh</span></p>
                </div>
                <div className="space-y-1.5 text-center p-4 bg-muted/30 rounded-xl border border-border">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest opacity-70">Meter Status</p>
                  <Badge className={`font-bold text-[10px] px-3 py-1 rounded-lg ${
                    (meterInfo?.mtrStatus || meterStatus) === 'OK' || (meterInfo?.mtrStatus || meterStatus) === 'Normal'
                      ? 'bg-green-500/10 text-green-500 border-green-500/20'
                      : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  } border`}>
                    {meterInfo?.mtrStatus || meterStatus || 'N/A'}
                  </Badge>
                </div>
                <div className="space-y-1.5 text-center p-4 bg-muted/30 rounded-xl border border-border">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest opacity-70">Last Reading</p>
                  <p className="text-sm font-bold text-foreground">
                    {meterReadDate ? new Date(meterReadDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Bill Breakdown Section */}
      {(() => {
        const company = details.billingInfo?.basicInfo?.companyCharges;
        const govt = details.billingInfo?.basicInfo?.govtCharges;
        if (!company && !govt) return null;

        return (
          <Card className="border-border shadow-sm bg-card rounded-2xl overflow-hidden">
            <CardHeader className="p-4 sm:p-6 bg-muted/20 border-b border-border">
              <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Receipt className="h-4 w-4 text-indigo-500" /> Current Bill Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Company Charges */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border pb-2">Company Charges</p>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Energy Charges', value: company?.energyCharges },
                      { label: 'Fixed Charges', value: company?.fixedCharges },
                      { label: 'Variable FPA', value: company?.varFPA },
                      { label: 'Qtr Tariff Adjustments', value: company?.qtrTariffAdjustments },
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                        <span className="text-sm font-bold text-foreground font-mono">Rs. {item.value || '0'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Government Charges */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border pb-2">Govt Charges & Taxes</p>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Electricity Duty', value: govt?.electricityDuty },
                      { label: 'GST', value: govt?.gst },
                      { label: 'FC Surcharge', value: govt?.fcSurcharge },
                      { label: 'Taxes on FPA', value: govt?.taxesOnFPA },
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                        <span className="text-sm font-bold text-foreground font-mono">Rs. {item.value || '0'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Analytics Tabs */}
      <Tabs defaultValue="schedule" className="w-full">
        <div className="flex justify-center mb-8">
            <TabsList className="bg-muted/50 backdrop-blur-sm p-1.5 rounded-2xl inline-flex h-14 shadow-sm border border-border gap-1">
                {[
                    { val: 'schedule', icon: Clock, label: 'Schedule' },
                    { val: 'billing', icon: TrendingUp, label: 'Bills' },
                    { val: 'technical', icon: Activity, label: 'Technical' },
                    { val: 'raw', icon: Terminal, label: 'Raw Data' }
                ].map(t => (
                    <TabsTrigger 
                        key={t.val}
                        value={t.val} 
                        className="rounded-xl font-bold uppercase text-[9px] sm:text-[10px] tracking-widest h-10 px-4 sm:px-6 data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-md transition-all flex items-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                        <t.icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="hidden sm:block">{t.label}</span>
                    </TabsTrigger>
                ))}
            </TabsList>
        </div>

        {/* Schedule */}
        <TabsContent value="schedule" className="animate-in fade-in slide-in-from-top-4 duration-500 outline-none w-full">
          <Card className="border-border shadow-sm rounded-2xl bg-card overflow-hidden w-full">
            <CardHeader className="p-6 border-b border-border bg-muted/20">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-bold text-foreground uppercase">Today&apos;s Power Schedule</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground font-medium">
                    24-hour maintenance schedule for {feeder.feederName || 'your feeder'}
                  </CardDescription>
                </div>
                <div className="flex gap-3">
                  <Badge variant="outline" className="px-2.5 py-1 border-green-500/20 bg-green-500/5 text-green-500 rounded-md font-bold text-[9px] uppercase tracking-widest flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div> ON
                  </Badge>
                  <Badge variant="outline" className="px-2.5 py-1 border-amber-500/20 bg-amber-500/5 text-amber-500 rounded-md font-bold text-[9px] uppercase tracking-widest flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500"></div> Partial
                  </Badge>
                  <Badge variant="outline" className="px-2.5 py-1 border-red-500/20 bg-red-500/5 text-red-500 rounded-md font-bold text-[9px] uppercase tracking-widest flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></div> OFF
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {(() => {
                // Try new format first (from parseLoadInfo)
                const loadInfo = details.loadManagementInfo || details.outageInfo;
                const schedule = loadInfo?.todaySchedule || [];
                const days = loadInfo?.days || {};
                const dayKeys = Object.keys(days).sort().reverse();
                const latestDay = dayKeys.length > 0 ? days[dayKeys[0]] : null;
                const hourlyMins = latestDay?.hourlyOutageMinutes || [];

                // Try old format
                const oldMaintenance = Array.isArray(details.loadManagementInfo) && details.loadManagementInfo[0]?.maintenance_data;
                const oldScheduleValues = oldMaintenance ? (Object.values(oldMaintenance)[0] as any[] || []) : [];

                if (hourlyMins.length === 24) {
                  // New format - show hourly outage minutes
                  const totalOff = hourlyMins.reduce((s: number, v: number) => s + v, 0);
                  return (
                    <div className="space-y-6">
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border">
                        <Zap className="h-5 w-5 text-amber-500 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {totalOff === 0 ? 'No outages recorded today' : `${Math.floor(totalOff/60)}h ${totalOff%60}m total outage today`}
                          </p>
                          <p className="text-xs text-muted-foreground">Date: {dayKeys[0] || new Date().toISOString().split('T')[0]}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2 sm:gap-3">
                        {hourlyMins.map((mins: number, hour: number) => {
                          let bgClass = 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400';
                          let label = 'ON';
                          if (mins >= 60) {
                            bgClass = 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400';
                            label = '60m';
                          } else if (mins > 0) {
                            bgClass = 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400';
                            label = `${mins}m`;
                          }
                          return (
                            <div key={hour} className="flex flex-col items-center gap-1.5 group">
                              <span className="text-[8px] sm:text-[9px] font-bold font-mono text-muted-foreground/60 group-hover:text-primary transition-colors">
                                {hour.toString().padStart(2, '0')}:00
                              </span>
                              <div className={`w-full aspect-square rounded-xl flex items-center justify-center text-[8px] sm:text-[9px] font-bold tracking-wide transition-all border ${bgClass} hover:scale-105`}>
                                {label}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                } else if (schedule.length === 24) {
                  // maintenance_sch format (0 = no shedding scheduled)
                  return (
                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2 sm:gap-3">
                      {schedule.map((val: number, hour: number) => (
                        <div key={hour} className="flex flex-col items-center gap-1.5 group">
                          <span className="text-[8px] sm:text-[9px] font-bold font-mono text-muted-foreground/60 group-hover:text-primary transition-colors">
                            {hour.toString().padStart(2, '0')}:00
                          </span>
                          <div className={`w-full aspect-square rounded-xl flex items-center justify-center text-[8px] sm:text-[9px] font-bold tracking-wide transition-all border ${
                            val === 0 
                              ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' 
                              : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                          } hover:scale-105`}>
                            {val === 0 ? 'ON' : 'OFF'}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                } else if (oldScheduleValues.length > 0) {
                  // Old format fallback
                  return (
                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2 sm:gap-3">
                      {oldScheduleValues.map((val: any, hour: number) => (
                        <div key={hour} className="flex flex-col items-center gap-1.5 group">
                          <span className="text-[8px] sm:text-[9px] font-bold font-mono text-muted-foreground/60 group-hover:text-primary transition-colors">
                            {hour.toString().padStart(2, '0')}:00
                          </span>
                          <div className={`w-full aspect-square rounded-xl flex items-center justify-center text-[8px] sm:text-[9px] font-bold tracking-wide transition-all border ${
                            val === 0 
                              ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' 
                              : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                          } hover:scale-105`}>
                            {val === 0 ? 'ON' : 'OFF'}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                } else {
                  return (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="h-16 w-16 rounded-2xl bg-muted/30 border border-border flex items-center justify-center mb-4">
                        <Clock className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                      <p className="text-sm font-semibold text-muted-foreground mb-1">Schedule data not available</p>
                      <p className="text-xs text-muted-foreground/60">Click &quot;Refresh&quot; to sync the latest schedule from CCMS</p>
                    </div>
                  );
                }
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing" className="animate-in fade-in slide-in-from-top-4 duration-500 outline-none w-full">
          <Card className="border-border shadow-sm rounded-2xl bg-card overflow-hidden w-full">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/10">
               <div>
                  <h4 className="text-xl sm:text-2xl font-bold text-foreground uppercase">Bill Records</h4>
                  <p className="text-muted-foreground text-[10px] mt-0.5">12-Month Historical Financial Data</p>
               </div>
               <Badge className="bg-foreground text-background font-bold h-6 px-3 rounded-md text-[9px]">Verified</Badge>
            </div>
            <div className="overflow-x-auto w-full">
              <Table className="w-full min-w-[500px]">
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-0 h-12">
                    <TableHead className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest pl-6">Month</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest text-right">Units</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest text-right">Total Amount</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest pr-6 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(13)].map((_, i) => {
                    const idx = i + 1;
                    const hist = details.billingInfo?.histInfo || {};
                    const month = hist[`gbHistMM${idx}`];
                    const units = hist[`gbHistUnits${idx}`];
                    const amount = hist[`gbHistAssment${idx}`];
                    const payment = hist[`payment${idx}`];
                    
                    if (!month) return null;
                    return (
                      <TableRow key={idx} className="hover:bg-muted/30 transition-colors h-14 border-b border-border/50">
                        <TableCell className="font-semibold text-foreground pl-6 text-sm uppercase whitespace-nowrap">{month}</TableCell>
                        <TableCell className="font-medium text-muted-foreground text-right text-sm whitespace-nowrap font-mono">{units} <span className="text-[9px] ml-0.5 font-sans">kWh</span></TableCell>
                        <TableCell className="font-bold text-primary text-right text-base whitespace-nowrap font-mono">Rs. {amount}</TableCell>
                        <TableCell className="text-right pr-6 whitespace-nowrap">
                          {payment && payment !== "0" ? (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20 px-2 py-0.5 rounded text-[9px] font-bold">PAID Rs.{payment}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50 px-2 py-0.5 rounded text-[9px] font-bold">UNPAID</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Technical */}
        <TabsContent value="technical" className="animate-in fade-in slide-in-from-top-4 duration-500 outline-none w-full">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full">
            {[
              { label: 'Active Power', value: (feeder.activePower || 0) + ' kW', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
              { label: 'Power Factor', value: (feeder.powerFactor || 0) + '%', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { label: 'Frequency', value: '50.0 Hz', icon: Clock, color: 'text-green-500', bg: 'bg-green-500/10' },
              { label: 'Voltage', value: (feeder.voltage || 0) + ' kV', icon: Info, color: 'text-purple-500', bg: 'bg-purple-500/10' }
            ].map((stat, i) => (
              <Card key={i} className="border-border shadow-sm rounded-2xl bg-card p-4 sm:p-6 transition-all hover:border-primary/20">
                <CardContent className="p-0">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                      <stat.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                      <p className="text-lg sm:text-xl font-bold font-mono text-foreground">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Diagnostic */}
        <TabsContent value="raw" className="animate-in fade-in slide-in-from-top-4 duration-500 outline-none w-full">
          <Card className="border-0 shadow-md rounded-2xl bg-[#0d1117] overflow-hidden border border-slate-800 w-full">
            <CardHeader className="border-b border-slate-800 p-4 sm:p-6 bg-[#0d1117]">
                <CardTitle className="text-emerald-400/60 font-mono text-[10px] flex items-center gap-2 uppercase">
                    <Terminal className="h-4 w-4 shrink-0" /> Response Data
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 w-full overflow-hidden">
              <pre className="p-4 sm:p-6 overflow-auto max-h-[300px] sm:max-h-[500px] text-[10px] sm:text-[11px] font-mono leading-relaxed text-emerald-400/80 selection:bg-emerald-500/20 custom-scrollbar w-full">
                {JSON.stringify(details, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}