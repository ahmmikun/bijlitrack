'use client';

import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Trash2, AlertCircle, Settings, BellRing, UserCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsPage() {
  const { activeRefId, setActiveRefId, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: references, isLoading } = useQuery({
    queryKey: ['my-references'],
    queryFn: async () => {
      const res = await api.get('/reference/my');
      return res.data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/reference/${id}`);
    },
    onSuccess: (_, deletedId) => {
      toast.success("Account removed");
      queryClient.invalidateQueries({ queryKey: ['my-references'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-references'] });
      if (activeRefId === deletedId) {
        setActiveRefId(null);
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <Skeleton className="h-14 w-64 rounded-2xl" />
        <Skeleton className="h-[400px] w-full rounded-[3rem]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-12 max-w-5xl mx-auto animate-in fade-in duration-1000 pb-24">
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="text-3xl sm:text-5xl font-black tracking-tighter text-foreground uppercase flex items-center justify-center sm:justify-start gap-4">
          <Settings className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
          Settings
        </h1>
        <div className="text-muted-foreground font-bold uppercase text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.3em] flex items-center justify-center sm:justify-start gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_currentColor]"></div>
          Manage Accounts & Preferences
        </div>
      </div>

      <div className="grid gap-6 sm:gap-10">
        {/* Profile Info */}
        <Card className="border-border shadow-2xl shadow-foreground/5 bg-card rounded-3xl sm:rounded-[3rem] overflow-hidden group">
          <CardHeader className="p-6 sm:p-10 border-b border-border bg-muted/20">
             <CardTitle className="text-lg sm:text-xl font-black uppercase flex items-center gap-3">
                <UserCircle className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> User Profile
             </CardTitle>
          </CardHeader>
          <CardContent className="p-6 sm:p-10">
             <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl sm:rounded-[2rem] bg-primary flex items-center justify-center text-primary-foreground text-3xl sm:text-4xl font-black shadow-2xl shadow-primary/20 transition-transform group-hover:rotate-6">
                    {user?.name.charAt(0)}
                </div>
                <div className="text-center sm:text-left space-y-1">
                    <h3 className="text-xl sm:text-2xl font-black text-foreground uppercase">{user?.name}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground font-bold">{user?.email}</p>
                    <Badge variant="outline" className="mt-2 border-primary/20 text-primary font-black uppercase text-[9px] sm:text-[10px] tracking-widest">Authorized Member</Badge>
                </div>
             </div>
          </CardContent>
        </Card>

        {/* Tracked Accounts */}
        <Card className="border-border shadow-2xl shadow-foreground/5 bg-card rounded-3xl sm:rounded-[4rem] overflow-hidden">
          <CardHeader className="p-6 sm:p-12 border-b border-border bg-muted/20">
            <CardTitle className="text-lg sm:text-xl font-black uppercase">Monitored Accounts</CardTitle>
            <CardDescription className="font-bold text-muted-foreground uppercase text-[9px] sm:text-[10px] tracking-widest mt-1">Manage your registered electricity meters</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {references && references.length > 0 ? (
              <div className="overflow-x-auto">
                <Table className="min-w-[500px]">
                  <TableHeader className="bg-muted/30">
                    <TableRow className="h-12 sm:h-16 border-0">
                      <TableHead className="font-black text-[9px] sm:text-[10px] uppercase text-muted-foreground tracking-[0.2em] pl-4 sm:pl-12">Meter ID</TableHead>
                      <TableHead className="font-black text-[9px] sm:text-[10px] uppercase text-muted-foreground tracking-[0.2em]">Status</TableHead>
                      <TableHead className="font-black text-[9px] sm:text-[10px] uppercase text-muted-foreground tracking-[0.2em]">Registered On</TableHead>
                      <TableHead className="text-right font-black text-[9px] sm:text-[10px] uppercase text-muted-foreground tracking-[0.2em] pr-4 sm:pr-12">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {references.map((ref: any) => (
                      <TableRow key={ref._id} className={`h-16 sm:h-24 border-b border-border/50 transition-all ${activeRefId === ref._id ? "bg-primary/5" : "hover:bg-muted/30"}`}>
                        <TableCell className="font-mono font-black text-primary pl-4 sm:pl-12 text-sm sm:text-base tracking-tighter">{ref.referenceNo}</TableCell>
                        <TableCell>
                          <Badge className="bg-green-500 text-white font-black text-[8px] sm:text-[9px] h-6 sm:h-7 px-3 sm:px-4 rounded-full uppercase tracking-widest">Monitoring</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground font-bold text-xs sm:text-sm uppercase">
                          {new Date(ref.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right pr-4 sm:pr-12">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl text-destructive hover:text-white hover:bg-destructive shadow-sm transition-all active:scale-90"
                            onClick={() => {
                              if (confirm("Stop tracking this meter? All history will be permanently erased.")) {
                                deleteMutation.mutate(ref._id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="p-10 sm:p-20 text-center">
                <AlertCircle className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/10 mx-auto mb-4 sm:mb-6" />
                <p className="text-muted-foreground/40 font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[10px] sm:text-xs italic">No accounts linked to profile...</p>
                <Button variant="link" className="text-primary font-black uppercase text-[9px] sm:text-[10px] tracking-widest mt-4" onClick={() => window.location.href='/dashboard/lookup'}>
                  Add Your First Account
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border-amber-500/20 bg-amber-500/5 rounded-3xl sm:rounded-[3rem] p-6 sm:p-12 group">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 text-center sm:text-left">
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl sm:rounded-[2rem] bg-amber-500/10 flex items-center justify-center transition-transform group-hover:rotate-12 shrink-0">
                    <BellRing className="h-8 w-8 sm:h-10 sm:w-10 text-amber-600" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-xl sm:text-2xl font-black text-amber-900 dark:text-amber-100 uppercase tracking-tighter">Notification Alerts</h3>
                    <p className="text-amber-700/60 dark:text-amber-300/40 font-bold uppercase text-[9px] sm:text-[10px] tracking-widest leading-relaxed">
                        Automatic WhatsApp and Email notifications for load shedding and due dates.
                    </p>
                </div>
            </div>
            <Badge variant="outline" className="h-10 sm:h-12 px-6 sm:px-8 rounded-xl sm:rounded-2xl border-amber-500/30 text-amber-600 font-black uppercase tracking-widest text-[9px] sm:text-[10px] shrink-0">COMING_SOON</Badge>
          </div>
        </Card>
      </div>
    </div>
  );
}
