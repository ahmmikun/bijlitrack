'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, MessageSquareWarning, Search, Info, TicketCheck, FileText, Loader2, Clock } from 'lucide-react';
import api from '@/lib/api';
import { fetchComplaintsByReference, fetchComplaintByTicket } from '@/lib/ccms';
import { toast } from 'sonner';

interface Complaint {
  ticketNo: string;
  status: string;
  reopened: boolean;
  refNo: string;
  nature: string;
  type: string;
  source: string;
  feedback: string;
  history: string[];
}

export default function ComplaintsPage() {
  const [referenceNo, setReferenceNo] = useState('');
  const [ticketNo, setTicketNo] = useState('');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoadingRef, setIsLoadingRef] = useState(false);
  const [isLoadingTicket, setIsLoadingTicket] = useState(false);
  const [searchType, setSearchType] = useState<'reference' | 'ticket' | null>(null);

  const handleTrackByReference = async () => {
    if (!referenceNo || referenceNo.length !== 14) return;
    setIsLoadingRef(true);
    setComplaints([]);
    setSearchType('reference');
    try {
      // Fetch directly from CCMS (client-side) to avoid geo-blocking on production server
      const results = await fetchComplaintsByReference(referenceNo);
      setComplaints(results);
      if (results.length === 0) toast.info("No complaints found for this reference");
    } catch (err: any) {
      // Fallback to backend in case CORS or other client-side issue
      try {
        const res = await api.get(`/complaints/track-by-reference?referenceNo=${referenceNo}`);
        setComplaints(res.data.complaints || []);
        if (res.data.complaints?.length === 0) toast.info("No complaints found for this reference");
      } catch (fallbackErr: any) {
        toast.error(fallbackErr.response?.data?.message || "Failed to fetch complaints");
      }
    } finally {
      setIsLoadingRef(false);
    }
  };

  const handleTrackByTicket = async () => {
    if (!ticketNo.trim()) return;
    setIsLoadingTicket(true);
    setComplaints([]);
    setSearchType('ticket');
    try {
      // Fetch directly from CCMS (client-side) to avoid geo-blocking on production server
      const results = await fetchComplaintByTicket(ticketNo.trim());
      setComplaints(results);
      if (results.length === 0) toast.info("No complaint found with this ticket number");
    } catch (err: any) {
      // Fallback to backend in case CORS or other client-side issue
      try {
        const res = await api.get(`/complaints/track-by-ticket?ticketNo=${ticketNo.trim()}`);
        setComplaints(res.data.complaints || []);
        if (res.data.complaints?.length === 0) toast.info("No complaint found with this ticket number");
      } catch (fallbackErr: any) {
        toast.error(fallbackErr.response?.data?.message || "Failed to fetch ticket");
      }
    } finally {
      setIsLoadingTicket(false);
    }
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('closed')) return 'bg-muted text-muted-foreground border-border';
    if (s.includes('pending')) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    if (s.includes('resolved')) return 'bg-green-500/10 text-green-500 border-green-500/20';
    return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
  };

  const getFeedbackColor = (feedback: string) => {
    if (feedback.toLowerCase().includes('satisfied') && !feedback.toLowerCase().includes('unsatisfied')) return 'bg-green-500/10 text-green-500 border-green-500/20';
    if (feedback.toLowerCase().includes('unsatisfied')) return 'bg-red-500/10 text-red-500 border-red-500/20';
    return 'bg-muted text-muted-foreground border-border';
  };

  return (
    <div className="space-y-8 sm:space-y-10 animate-in fade-in duration-700 pb-20 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="text-3xl sm:text-5xl font-black tracking-tighter text-foreground uppercase">
          Complaint <span className="text-primary">Center</span>
        </h1>
        <div className="text-muted-foreground font-bold uppercase text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.3em] flex items-center justify-center sm:justify-start gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_currentColor]"></div>
          Register & Track Complaints
        </div>
      </div>

      {/* Register Complaint Section */}
      <Card className="border-border shadow-sm bg-card rounded-2xl overflow-hidden">
        <CardHeader className="p-5 sm:p-6 border-b border-border bg-muted/20">
          <CardTitle className="text-sm font-bold text-foreground uppercase flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
              <MessageSquareWarning className="h-4 w-4 text-red-500" />
            </div>
            Register a Complaint
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 sm:p-6 space-y-4">
          <Alert className="rounded-xl border border-amber-500/20 bg-amber-500/5">
            <Info className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-muted-foreground text-xs font-medium ml-2">
              Complaint registration is not available through this app. Please use the official CCMS portal.
            </AlertDescription>
          </Alert>
          <a href="https://ccms.pitc.com.pk/complaint" target="_blank" rel="noopener noreferrer">
            <Button className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-red-500/20 transition-all active:scale-95 gap-2 border-0">
              <ExternalLink className="h-4 w-4" />
              Open CCMS Portal to Register
            </Button>
          </a>
        </CardContent>
      </Card>

      {/* Track Complaint Section */}
      <Card className="border-border shadow-sm bg-card rounded-2xl overflow-hidden">
        <CardHeader className="p-5 sm:p-6 border-b border-border bg-muted/20">
          <CardTitle className="text-sm font-bold text-foreground uppercase flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Search className="h-4 w-4 text-blue-500" />
            </div>
            Track Your Complaint
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 sm:p-6 space-y-6">
          
          {/* Track by Reference Number */}
          <div className="space-y-3 p-4 sm:p-5 bg-muted/20 rounded-xl border border-border">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Track by Reference Number</Label>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Enter 14-digit reference number"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                maxLength={14}
                className="h-11 bg-background border-border rounded-xl font-mono text-sm tracking-wider placeholder:font-sans placeholder:tracking-normal flex-1"
              />
              <Button 
                onClick={handleTrackByReference}
                disabled={!referenceNo || referenceNo.length !== 14 || isLoadingRef}
                className="h-11 px-5 bg-primary hover:opacity-90 text-primary-foreground font-bold uppercase text-[10px] tracking-wider rounded-xl transition-all active:scale-95 border-0 gap-2 shrink-0"
              >
                {isLoadingRef ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
              </Button>
            </div>
          </div>

          {/* Track by Ticket Number */}
          <div className="space-y-3 p-4 sm:p-5 bg-muted/20 rounded-xl border border-border">
            <div className="flex items-center gap-2">
              <TicketCheck className="h-4 w-4 text-amber-500" />
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Track by Ticket Number</Label>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Enter complaint ticket number"
                value={ticketNo}
                onChange={(e) => setTicketNo(e.target.value)}
                className="h-11 bg-background border-border rounded-xl font-mono text-sm tracking-wider placeholder:font-sans placeholder:tracking-normal flex-1"
              />
              <Button 
                onClick={handleTrackByTicket}
                disabled={!ticketNo.trim() || isLoadingTicket}
                className="h-11 px-5 bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase text-[10px] tracking-wider rounded-xl shadow-md shadow-amber-500/20 transition-all active:scale-95 border-0 gap-2 shrink-0"
              >
                {isLoadingTicket ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {(isLoadingRef || isLoadingTicket) && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {complaints.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground uppercase tracking-tight">
            {complaints.length} Complaint{complaints.length > 1 ? 's' : ''} Found
          </h2>
          
          {complaints.map((complaint, idx) => (
            <Card key={idx} className="border-border shadow-sm bg-card rounded-2xl overflow-hidden">
              {/* Complaint Header */}
              <CardHeader className="p-4 sm:p-5 border-b border-border bg-muted/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Badge className={`${getStatusColor(complaint.status)} font-bold text-[10px] px-3 py-1 rounded-lg border uppercase`}>
                      {complaint.status}
                    </Badge>
                    {complaint.reopened && (
                      <Badge className="bg-red-500/10 text-red-500 border-red-500/20 font-bold text-[10px] px-2 py-1 rounded-lg border">
                        Reopened
                      </Badge>
                    )}
                  </div>
                  <span className="font-mono text-sm font-bold text-foreground">{complaint.ticketNo}</span>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-4">
                {/* Complaint Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Nature</p>
                    <p className="text-xs font-semibold text-foreground">{complaint.nature}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Type</p>
                    <p className="text-xs font-semibold text-foreground">{complaint.type}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Source</p>
                    <p className="text-xs font-semibold text-foreground">{complaint.source}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Feedback</p>
                    <Badge className={`${getFeedbackColor(complaint.feedback)} font-bold text-[9px] px-2 py-0.5 rounded border`}>
                      {complaint.feedback || 'N/A'}
                    </Badge>
                  </div>
                </div>

                {/* History Timeline */}
                {complaint.history.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-border">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> Complaint History
                    </p>
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-2">
                      {complaint.history.map((entry, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                            i === 0 ? 'bg-primary' : 'bg-muted-foreground/30'
                          }`} />
                          <span className="text-muted-foreground leading-relaxed">{entry}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {searchType && !isLoadingRef && !isLoadingTicket && complaints.length === 0 && (
        <Card className="border-border shadow-sm bg-card rounded-2xl p-10 text-center">
          <TicketCheck className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground font-bold text-sm">No complaints found</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Try a different reference or ticket number</p>
        </Card>
      )}
    </div>
  );
}
