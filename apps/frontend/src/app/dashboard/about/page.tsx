'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Zap, Database, ShieldAlert, Globe, MessageSquareWarning, Lock, AlertTriangle, Info } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="space-y-8 sm:space-y-10 animate-in fade-in duration-700 pb-20 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="space-y-3 text-center">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20">
            <Zap className="h-8 w-8 text-primary-foreground fill-current" />
          </div>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tighter text-foreground uppercase">
          About <span className="text-primary">BijliTrack</span>
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          A smart electricity dashboard that helps users view their electricity bill, consumer information, feeder status, outage details, and bill history — all in one place.
        </p>
      </div>

      {/* Mission */}
      <Card className="border-border shadow-sm bg-card rounded-2xl overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          <p className="text-muted-foreground text-sm leading-relaxed">
            Our goal is to make electricity-related information <span className="font-bold text-foreground">easier to understand for normal users</span>. Instead of checking multiple pages manually, users can enter their reference number and view all important information in a clean, organized dashboard.
          </p>
        </CardContent>
      </Card>

      {/* Data Source */}
      <Card className="border-border shadow-sm bg-card rounded-2xl overflow-hidden">
        <CardHeader className="p-5 sm:p-6 border-b border-border bg-muted/20">
          <CardTitle className="text-sm font-bold text-foreground uppercase flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Database className="h-4 w-4 text-blue-500" />
            </div>
            Data Source
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 sm:p-6 space-y-4">
          <p className="text-muted-foreground text-sm leading-relaxed">
            All electricity-related data shown on BijliTrack is fetched from <span className="font-bold text-foreground">official CCMS/PITC public services</span> using the reference number provided by the user.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              'Consumer Information', 'Current Bill Details', 'Bill Due Date',
              'Units Consumed', 'Meter Status', 'Feeder Information',
              'Load Management', 'Outage History', 'Previous Bill History'
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0"></div>
                <span className="text-[11px] font-medium text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Card className="border-red-500/20 shadow-sm bg-card rounded-2xl overflow-hidden">
        <CardHeader className="p-5 sm:p-6 border-b border-red-500/10 bg-red-500/5">
          <CardTitle className="text-sm font-bold text-foreground uppercase flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
              <ShieldAlert className="h-4 w-4 text-red-500" />
            </div>
            Disclaimer
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 sm:p-6 space-y-3">
          <p className="text-muted-foreground text-sm leading-relaxed">
            BijliTrack is an <span className="font-bold text-red-500">independent utility dashboard</span>. We are <span className="font-bold text-foreground">NOT</span> an official government website and we are <span className="font-bold text-foreground">NOT affiliated</span> with:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {['PITC', 'WAPDA', 'LESCO', 'IESCO', 'FESCO', 'GEPCO', 'MEPCO', 'PESCO', 'HESCO', 'SEPCO', 'QESCO', 'TESCO', 'K-Electric'].map((name, i) => (
              <Badge key={i} variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded border-border text-muted-foreground">
                {name}
              </Badge>
            ))}
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed pt-2">
            The data displayed is collected from publicly available official CCMS/PITC services. We do not own, modify, or guarantee the accuracy of the official data.
          </p>
        </CardContent>
      </Card>

      {/* Coverage */}
      <Card className="border-border shadow-sm bg-card rounded-2xl overflow-hidden">
        <CardHeader className="p-5 sm:p-6 border-b border-border bg-muted/20">
          <CardTitle className="text-sm font-bold text-foreground uppercase flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
              <Globe className="h-4 w-4 text-green-500" />
            </div>
            Coverage
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 sm:p-6 space-y-4">
          <p className="text-muted-foreground text-sm leading-relaxed">
            BijliTrack supports consumers whose electricity data is available through <span className="font-bold text-foreground">PITC/CCMS supported public-sector DISCOs</span>:
          </p>
          <div className="flex flex-wrap gap-2">
            {['LESCO', 'GEPCO', 'FESCO', 'IESCO', 'MEPCO', 'PESCO', 'HESCO', 'SEPCO', 'QESCO', 'TESCO', 'AJ&K Electricity'].map((name, i) => (
              <Badge key={i} className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 font-bold text-[10px] px-2.5 py-1 rounded-lg border">
                {name}
              </Badge>
            ))}
          </div>
          <Alert className="rounded-xl border border-red-500/20 bg-red-500/5 mt-3">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-sm font-medium text-red-500 ml-2">
              K-Electric and other unsupported electricity providers may not work on this platform.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Complaints */}
      <Card className="border-border shadow-sm bg-card rounded-2xl overflow-hidden">
        <CardHeader className="p-5 sm:p-6 border-b border-border bg-muted/20">
          <CardTitle className="text-sm font-bold text-foreground uppercase flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <MessageSquareWarning className="h-4 w-4 text-amber-500" />
            </div>
            Complaints
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          <p className="text-muted-foreground text-sm leading-relaxed">
            BijliTrack <span className="font-bold text-foreground">does not directly register official complaints</span>. For complaint registration, bill correction, meter issues, or legal matters, users will be redirected to the official CCMS complaint portal. Final complaint submission must be completed by the user on the official website.
          </p>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card className="border-border shadow-sm bg-card rounded-2xl overflow-hidden">
        <CardHeader className="p-5 sm:p-6 border-b border-border bg-muted/20">
          <CardTitle className="text-sm font-bold text-foreground uppercase flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
              <Lock className="h-4 w-4 text-purple-500" />
            </div>
            Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 sm:p-6 space-y-3">
          <p className="text-muted-foreground text-sm leading-relaxed">
            Users should only search electricity records for <span className="font-bold text-foreground">their own account</span> or with the permission of the account holder.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            BijliTrack may store user account references only to provide dashboard features such as bill tracking, history viewing, and saved accounts. Sensitive information such as CNIC or contact number should not be publicly displayed.
          </p>
        </CardContent>
      </Card>

      {/* Important Note */}
      <Alert className="rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 p-6">
        <Info className="h-5 w-5 text-amber-500" />
        <AlertDescription className="ml-3">
          <p className="font-bold text-foreground text-sm mb-1">Important Note</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            BijliTrack is made only for <span className="font-bold text-amber-600 dark:text-amber-400">convenience and information purposes</span>. For any official decision, payment, complaint, or correction, users should always verify details from the official CCMS/PITC website or their electricity distribution company.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
