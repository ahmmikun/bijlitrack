'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { fetchAllCCMSData } from '@/lib/ccms';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Search, Info, CheckCircle2, ShieldAlert, User, Receipt, Zap, MapPin, Activity, Terminal, ArrowRight, ShieldCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Badge } from '@/components/ui/badge';

export default function LookupPage() {
  const [referenceNo, setReferenceNo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingDays, setTrackingDays] = useState(30);
  const router = useRouter();

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLookupResult(null);
    setIsLoading(true);

    try {
      // Fetch directly from CCMS (client-side)
      const data = await fetchAllCCMSData(referenceNo);
      
      if (!data.user && !data.bill) {
        throw new Error(data.errors.user || data.errors.bill || 'Failed to fetch details');
      }

      setLookupResult({
        referenceNo,
        user: data.user,
        bill: data.bill,
        schedule: data.loadInfo,
        timestamp: new Date().toISOString()
      });
      toast.success("Data fetched successfully");
    } catch (err: any) {
      const msg = err.message || 'Utility provider not responding. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrack = async () => {
    setIsTracking(true);
    try {
      // 1. Register the reference in backend
      const trackRes = await api.post('/reference/track', { referenceNo, consentGiven: true, trackingDays });
      const refId = trackRes.data._id;

      // 2. Save the already-fetched lookup data as initial snapshot
      if (lookupResult && refId) {
        await api.post(`/dashboard/${refId}/save`, {
          consumerInfo: lookupResult.user,
          billingInfo: lookupResult.bill,
          outageInfo: lookupResult.schedule
        });
      }

      toast.success(`Outage tracking activated for ${trackingDays} days!`);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save account.');
    } finally {
      setIsTracking(false);
    }
  };

  return (
    <div className="space-y-10 max-w-6xl mx-auto animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-5xl font-black tracking-tighter text-foreground uppercase">Find <span className="text-primary">Account</span></h1>
          <div className="text-muted-foreground font-bold uppercase text-xs tracking-[0.3em] flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Live Connection with PITC Portal
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] rounded-[3rem] overflow-hidden bg-card transition-colors">
        <div className="bg-foreground/5 dark:bg-foreground/10 px-6 sm:px-10 py-12">
          <form onSubmit={handleLookup} className="flex flex-col lg:flex-row gap-6 items-end">
            <div className="flex-1 space-y-4 w-full">
              <Label htmlFor="referenceNo" className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">14-Digit Reference Number</Label>
              <div className="relative group">
                 <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                    <Search className="h-6 w-6 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                 </div>
                 <Input
                  id="referenceNo"
                  placeholder="Enter reference number here..."
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  required
                  pattern="\d{14}"
                  className="w-full h-20 pl-16 pr-8 bg-background border-2 border-border text-foreground text-2xl font-black tracking-[0.1em] rounded-3xl focus:ring-4 focus:ring-primary/10 placeholder:text-muted-foreground/30 placeholder:tracking-normal transition-all"
                />
              </div>
            </div>
            <Button type="submit" disabled={isLoading} size="lg" className="bg-primary hover:opacity-90 text-primary-foreground w-full lg:w-auto h-20 px-12 rounded-3xl font-black text-lg shadow-2xl shadow-primary/20 transition-all active:scale-95 border-0">
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-4 border-primary-foreground/20 border-t-primary-foreground"></div>
                  <span>SEARCHING...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span>GET BILL INFO</span>
                  <ArrowRight className="h-6 w-6" />
                </div>
              )}
            </Button>
          </form>
          {error && (
            <Alert variant="destructive" className="mt-8 rounded-2xl bg-destructive/10 border-destructive/20 text-destructive shadow-sm">
              <ShieldAlert className="h-5 w-5" />
              <AlertTitle className="font-black text-base uppercase">Search Failed</AlertTitle>
              <AlertDescription className="font-bold opacity-80 text-xs tracking-tight">{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </Card>

      {lookupResult && (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-1000">
          <div className="flex flex-col gap-6 p-10 rounded-[3rem] bg-primary/10 border-2 border-primary/20 shadow-xl shadow-primary/5">
            <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
               <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                  <CheckCircle2 className="h-10 w-10 text-primary-foreground" />
               </div>
               <div className="space-y-1">
                  <h3 className="text-2xl font-black text-foreground tracking-tight uppercase">Account Found</h3>
                  <p className="text-muted-foreground font-bold text-sm uppercase tracking-wider">Enable daily outage tracking for this account?</p>
                  <p className="text-muted-foreground/70 text-xs font-medium mt-1">
                    <Info className="h-3 w-3 inline mr-1" />
                    Daily tracking monitors <span className="font-bold text-foreground">power outages only</span>. Log in regularly to sync recent outage data, otherwise some days can be missed.
                  </p>
               </div>
            </div>

            {/* Tracking Duration Selector */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-6 bg-background/50 rounded-2xl border border-border">
              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap">Track for:</Label>
              <div className="flex flex-wrap gap-2">
                {[7, 14, 30].map(days => (
                  <Button 
                    key={days}
                    type="button"
                    variant={trackingDays === days ? "default" : "outline"}
                    onClick={() => setTrackingDays(days)}
                    className={`h-10 px-5 rounded-xl font-black text-xs ${trackingDays === days ? 'bg-primary text-primary-foreground' : 'bg-card'}`}
                  >
                    {days} Days
                  </Button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground font-medium ml-auto hidden sm:block">
                Tracking ends automatically after {trackingDays} days
              </p>
            </div>

            <Button onClick={handleTrack} disabled={isTracking} className="bg-primary hover:opacity-90 text-primary-foreground font-black h-16 px-12 rounded-2xl text-lg shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 border-0 w-full">
               {isTracking ? "SAVING..." : `ACTIVATE ${trackingDays}-DAY OUTAGE TRACKING`}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Identity Card */}
            <Card className="shadow-2xl shadow-foreground/5 border-border rounded-[3rem] bg-card overflow-hidden group transition-all duration-500 hover:border-primary/20">
              <div className="h-2 w-full bg-blue-500 opacity-60"></div>
              <CardHeader className="bg-muted/30 border-b border-border px-8 py-8">
                <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] flex items-center gap-3">
                  <User className="h-5 w-5 text-blue-500" /> Account Owner
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8 text-center sm:text-left">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Registered Name</p>
                  <p className="font-black text-foreground text-2xl leading-tight group-hover:text-primary transition-colors uppercase">{lookupResult.user?.NAME || 'NOT AVAILABLE'}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1 opacity-60">Ref Number</p>
                    <p className="text-xs font-black text-foreground tracking-widest font-mono">{lookupResult.referenceNo}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1 opacity-60">CNIC / NIC</p>
                    <p className="text-sm font-black text-foreground tracking-tighter">{lookupResult.user?.NICNO || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-3 opacity-60 flex items-center justify-center sm:justify-start gap-2">
                    <MapPin className="h-3 w-3" /> Billing Address
                  </p>
                  <p className="text-xs font-bold text-muted-foreground leading-relaxed bg-muted/20 p-5 rounded-2xl border border-border shadow-inner uppercase">
                    {lookupResult.user?.ADDR1}<br/>{lookupResult.user?.ADDR2}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div className="text-center">
                    <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1 opacity-60">Tariff Class</p>
                    <Badge variant="secondary" className="font-black text-[10px] h-7 px-4 rounded-full uppercase">{lookupResult.user?.TARIFF || '---'}</Badge>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1 opacity-60">Limit (kW)</p>
                    <Badge className="bg-primary text-primary-foreground font-black text-[10px] h-7 px-4 rounded-full uppercase">{lookupResult.user?.SLOAD || '0'} kW</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Card */}
            <Card className="shadow-2xl shadow-foreground/5 border-border rounded-[3rem] bg-card overflow-hidden group transition-all duration-500 hover:border-primary/20">
              <div className="h-2 w-full bg-indigo-500 opacity-60"></div>
              <CardHeader className="bg-muted/30 border-b border-border px-8 py-8">
                <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] flex items-center gap-3">
                  <Receipt className="h-5 w-5 text-indigo-500" /> Current Bill
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-10">
                <div className="p-8 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/10 shadow-inner text-center">
                  <p className="text-[10px] text-indigo-500 uppercase font-black tracking-[0.3em] mb-3">Total Payable</p>
                  <p className="text-5xl font-black text-foreground tracking-tighter mb-4">Rs. {lookupResult.bill?.basicInfo?.netBill || '0'}</p>
                  <div className="flex justify-center">
                    <Badge className={`px-5 h-8 font-black rounded-full shadow-lg border-0 ${lookupResult.bill?.basicInfo?.currMonthPayment === "0" ? "bg-red-500 text-white" : "bg-green-500 text-white"}`}>
                      {lookupResult.bill?.basicInfo?.currMonthPayment === "0" ? "UNPAID" : "PAID"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-center px-2">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-70">Month</span>
                    <span className="text-sm font-black text-foreground uppercase">
                      {lookupResult.bill?.basicInfo?.billMonth ? new Date(lookupResult.bill.basicInfo.billMonth).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-2">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-70">Due Date</span>
                    <span className="text-sm font-black text-foreground uppercase">
                      {lookupResult.bill?.basicInfo?.billDueDate ? new Date(lookupResult.bill.basicInfo.billDueDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-2 pt-6 border-t border-border">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-70">Energy Used</span>
                    <span className="text-xl font-black text-foreground">{lookupResult.bill?.basicInfo?.totCurCons || '0'} <span className="text-[10px] text-muted-foreground ml-1">kWh</span></span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feeder Card */}
            <Card className="shadow-2xl shadow-foreground/5 border-border rounded-[3rem] bg-card overflow-hidden group transition-all duration-500 hover:border-primary/20">
              <div className="h-2 w-full bg-amber-500 opacity-60"></div>
              <CardHeader className="bg-muted/30 border-b border-border px-8 py-8">
                <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] flex items-center gap-3">
                  <Activity className="h-5 w-5 text-amber-500" /> Live Power Status
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-10">
                <div className={`p-8 rounded-[2.5rem] border-2 flex flex-col items-center justify-center transition-all shadow-inner ${lookupResult.schedule?.currentStatus === 'ON' ? 'bg-green-500/5 border-green-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.3em] mb-4">Grid Signal</p>
                  <div className="flex items-center gap-4">
                    <div className={`h-4 w-4 rounded-full ${lookupResult.schedule?.currentStatus === 'ON' ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,1)] animate-pulse' : 'bg-red-500 animate-ping'}`}></div>
                    <p className={`text-4xl font-black tracking-tighter uppercase ${lookupResult.schedule?.currentStatus === 'ON' ? 'text-green-500' : 'text-red-500'}`}>
                      {lookupResult.schedule?.currentStatus || 'OFFLINE'}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-5">
                    <div className="h-10 w-10 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0">
                      <Zap className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1 opacity-70">Local Feeder</p>
                      <p className="text-sm font-black text-foreground truncate uppercase tracking-tighter">{lookupResult.schedule?.feederName || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-5">
                    <div className="h-10 w-10 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1 opacity-70">Grid Station</p>
                      <p className="text-sm font-black text-foreground truncate uppercase tracking-tighter">{lookupResult.schedule?.gridStation || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-8 pt-6 border-t border-border">
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest opacity-60 mb-1">Voltage</p>
                      <p className="text-xl font-black text-foreground tracking-tighter">{lookupResult.schedule?.voltage || '0'} <span className="text-[10px] text-muted-foreground uppercase">kV</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest opacity-60 mb-1">Power Factor</p>
                      <p className="text-xl font-black text-foreground tracking-tighter">{lookupResult.schedule?.powerFactor || '0'}%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Tabs */}
          <Tabs defaultValue="schedule" className="w-full">
            <div className="flex justify-start sm:justify-center mb-8 sm:mb-12 overflow-x-auto pb-4 custom-scrollbar">
              <TabsList className="bg-muted p-1.5 rounded-[1.5rem] sm:rounded-2xl w-full min-w-max flex sm:grid sm:max-w-2xl sm:grid-cols-3 h-16 shadow-inner border border-border">
                <TabsTrigger value="schedule" className="rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all flex-1">
                  <Zap className="h-4 w-4 mr-2 hidden sm:block" /> Load Grid
                </TabsTrigger>
                <TabsTrigger value="billing" className="rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all flex-1">
                  <Receipt className="h-4 w-4 mr-2 hidden sm:block" /> Bill History
                </TabsTrigger>
                <TabsTrigger value="raw" className="rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all flex-1">
                  <Terminal className="h-4 w-4 mr-2 hidden sm:block" /> Raw Data
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="schedule" className="mt-8 animate-in fade-in slide-in-from-top-4 duration-700 outline-none w-full">
              <Card className="border-border shadow-2xl shadow-foreground/5 rounded-3xl sm:rounded-[3rem] bg-card p-6 sm:p-12 w-full">
                <div className="flex flex-col lg:flex-row gap-8 sm:gap-12 w-full">
                   <div className="lg:w-1/3 space-y-4 sm:space-y-6">
                      <h4 className="text-3xl sm:text-2xl font-black text-foreground tracking-tighter uppercase">Power Schedule</h4>
                      <p className="text-xs sm:text-sm font-bold text-muted-foreground leading-relaxed uppercase tracking-wider opacity-80">24-hour maintenance window forecast showing exactly when power is scheduled to be ON or OFF.</p>
                      <div className="pt-2 sm:pt-4 flex flex-wrap gap-4">
                         <Badge variant="outline" className="px-3 sm:px-4 py-1.5 sm:py-2 border-green-500/20 bg-green-500/5 text-green-500 rounded-full font-black text-[9px] sm:text-[10px] uppercase tracking-widest flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div> Power On
                         </Badge>
                         <Badge variant="outline" className="px-3 sm:px-4 py-1.5 sm:py-2 border-red-500/20 bg-red-500/5 text-red-500 rounded-full font-black text-[9px] sm:text-[10px] uppercase tracking-widest flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></div> Power Off
                         </Badge>
                      </div>
                   </div>
                   <div className="lg:w-2/3 w-full">
                      {lookupResult.schedule?.todaySchedule?.length > 0 ? (
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 sm:gap-4 w-full">
                          {lookupResult.schedule.todaySchedule.map((val: any, hour: number) => (
                            <div key={hour} className="flex flex-col items-center gap-1.5 sm:gap-2 group">
                              <span className="text-[9px] sm:text-[10px] font-black text-muted-foreground/40 uppercase tracking-tighter group-hover:text-primary transition-colors">{hour}:00</span>
                              <div className={`w-full aspect-square rounded-[1rem] sm:rounded-2xl flex items-center justify-center text-[9px] sm:text-[10px] font-black tracking-widest transition-all border-2 ${
                                val === 0 
                                  ? 'bg-background text-green-500 border-border hover:border-green-500 hover:shadow-xl hover:shadow-green-500/10' 
                                  : 'bg-red-500 text-white border-red-600 shadow-lg shadow-red-500/20 scale-95 opacity-90'
                              }`}>
                                {val === 0 ? 'ON' : 'OFF'}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-muted/10 h-48 sm:h-64 rounded-2xl sm:rounded-3xl flex items-center justify-center border-2 border-dashed border-border text-center p-6">
                          <p className="text-muted-foreground/40 font-black uppercase tracking-widest text-[10px] sm:text-xs italic">Schedule data not available</p>
                        </div>
                      )}
                   </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="billing" className="mt-8 animate-in fade-in slide-in-from-top-4 duration-700">
              <Card className="border-border shadow-2xl shadow-foreground/5 rounded-[3rem] bg-card overflow-hidden">
                <div className="p-10 border-b border-border flex justify-between items-center bg-muted/20">
                   <h4 className="text-2xl font-black text-foreground tracking-tighter uppercase">Yearly Bill Sync</h4>
                   <Badge className="bg-foreground text-background font-black h-8 px-5 rounded-full uppercase tracking-widest text-[9px]">Verified Records</Badge>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="hover:bg-transparent border-0 h-16">
                        <TableHead className="font-black text-[10px] uppercase text-muted-foreground tracking-[0.2em] pl-10">Billing Month</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-muted-foreground tracking-[0.2em] text-right">Units Used</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-muted-foreground tracking-[0.2em] text-right">Bill Amount</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-muted-foreground tracking-[0.2em] pr-10 text-right">Payment Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...Array(13)].map((_, i) => {
                        const idx = i + 1;
                        const month = lookupResult.bill?.histInfo?.[`gbHistMM${idx}`];
                        const units = lookupResult.bill?.histInfo?.[`gbHistUnits${idx}`];
                        const amount = lookupResult.bill?.histInfo?.[`gbHistAssment${idx}`];
                        const payment = lookupResult.bill?.histInfo?.[`payment${idx}`];
                        
                        if (!month) return null;
                        return (
                          <TableRow key={idx} className="hover:bg-primary/5 transition-colors h-20 border-b border-border/50">
                            <TableCell className="font-black text-foreground pl-10 text-base uppercase">{month}</TableCell>
                            <TableCell className="font-bold text-muted-foreground text-right text-base">{units} <span className="text-[10px] ml-1">kWh</span></TableCell>
                            <TableCell className="font-black text-primary text-right text-lg tracking-tighter">Rs. {amount}</TableCell>
                            <TableCell className="text-right pr-10">
                              {payment && payment !== "0" ? (
                                <Badge className="bg-green-500/10 text-green-500 border-green-500/20 px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest">Paid Rs. {payment}</Badge>
                              ) : (
                                <Badge variant="outline" className="text-red-400 border-red-100 bg-red-400/5 px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest opacity-60">Unpaid</Badge>
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

            <TabsContent value="raw" className="mt-8 animate-in fade-in slide-in-from-top-4 duration-700">
              <Card className="border-0 shadow-2xl shadow-foreground/10 rounded-[3rem] bg-slate-950 overflow-hidden ring-8 ring-slate-900">
                <CardHeader className="border-b border-slate-900 p-8">
                   <CardTitle className="text-emerald-500/60 font-mono text-[10px] flex items-center gap-3 font-black tracking-[0.4em] uppercase">
                     <Terminal className="h-5 w-5" /> Provider_Response_Stdout
                   </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <pre className="p-10 overflow-auto max-h-[500px] text-[11px] font-mono leading-relaxed text-emerald-500/70 selection:bg-emerald-500/20 custom-scrollbar">
                    {JSON.stringify(lookupResult, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
