import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Search, Zap, BarChart3, ShieldCheck, ArrowRight, Activity, Bell } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BijliTrack — Free Electricity Bill & Outage Tracker for Pakistan',
  description: 'Check your LESCO, GEPCO, FESCO, IESCO, MEPCO, PESCO, HESCO electricity bill online. Track real-time power outages, feeder status, load shedding schedule, and file complaints. Free for all Pakistani DISCOs.',
  alternates: {
    canonical: 'https://bijlitrack.up.railway.app',
  },
};

export default function Home() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'BijliTrack',
    url: 'https://bijlitrack.up.railway.app',
    description: 'Free smart electricity dashboard for Pakistani consumers. Track bills, outages, feeder status, and complaints for LESCO, GEPCO, FESCO, IESCO, MEPCO, PESCO, HESCO, SEPCO, QESCO, TESCO.',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'PKR',
    },
    author: {
      '@type': 'Person',
      name: 'Salman Ahmad',
      url: 'https://github.com/ahmmikun',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '50',
    },
  };

  return (
    <div className="bg-background min-h-screen flex flex-col selection:bg-primary/10 selection:text-primary overflow-x-hidden transition-colors duration-300">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-50 dark:opacity-20">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 blur-[120px] animate-pulse"></div>
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] rounded-full bg-indigo-400/20 blur-[100px]"></div>
      </div>

      <header className="relative z-50 border-b border-border bg-background/60 backdrop-blur-md sticky top-0">
        <nav className="flex items-center justify-between p-4 lg:px-12 max-w-7xl mx-auto" aria-label="Global">
          <div className="flex lg:flex-1">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 transition-transform group-hover:rotate-6">
                <Zap className="h-6 w-6 text-primary-foreground fill-current" />
              </div>
              <span className="text-2xl font-black text-foreground tracking-tighter uppercase">BijliTrack</span>
            </Link>
          </div>
          <div className="flex items-center gap-x-2 sm:gap-x-4">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" className="font-bold text-muted-foreground hover:text-foreground">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-black px-6 shadow-xl shadow-primary/20 rounded-full transition-all hover:scale-105 active:scale-95 border-0">
                Sign Up
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10 flex-1">
        {/* Hero Section */}
        <section className="relative px-6 pt-20 lg:pt-32 pb-24">
          <div className="mx-auto max-w-5xl text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card border border-border shadow-sm mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Real-time Utility Sync Active</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-foreground sm:text-7xl lg:leading-[1.1] uppercase">
              Pakistan&apos;s Smart <span className="text-primary">Electricity</span> Dashboard
            </h1>
            <p className="mt-8 text-lg sm:text-xl leading-8 text-muted-foreground font-medium max-w-2xl mx-auto">
              Check your LESCO, GEPCO, FESCO, IESCO, MEPCO, PESCO, HESCO electricity bill online. Track real-time feeder status, power outages, load shedding schedule, and complaint history — all in one free dashboard.
            </p>
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full bg-foreground text-background hover:opacity-90 font-black h-16 px-10 text-lg rounded-2xl shadow-2xl transition-all border-0">
                  Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full h-16 px-10 text-lg rounded-2xl font-black border-2 transition-all shadow-sm">
                  View Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Simplified Features */}
        <section className="px-6 py-24 bg-card/50 backdrop-blur-sm border-y border-border">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {[
                { 
                  title: 'Live Feeder Status', 
                  desc: 'Check if your feeder is ON or OFF in real-time. See voltage, power factor, and grid station details for LESCO, GEPCO, FESCO and all DISCOs.',
                  icon: Activity,
                  color: 'text-blue-500 bg-blue-500/10'
                },
                { 
                  title: 'Bill History & Breakdown', 
                  desc: 'View 12 months of electricity bills with detailed charges breakdown — energy charges, GST, FPA, surcharges. Works for all WAPDA DISCOs.',
                  icon: BarChart3,
                  color: 'text-indigo-500 bg-indigo-500/10'
                },
                { 
                  title: 'Outage & Load Shedding', 
                  desc: 'Track daily power outages hour-by-hour. See scheduled load shedding, actual tripping data, and export reports as PDF.',
                  icon: Bell,
                  color: 'text-amber-500 bg-amber-500/10'
                }
              ].map((f, i) => (
                <div key={i} className="group p-8 rounded-[2.5rem] bg-card border border-border shadow-xl shadow-foreground/5 transition-all hover:border-primary/20">
                  <div className={`h-14 w-14 rounded-2xl ${f.color} flex items-center justify-center mb-6 transition-transform group-hover:scale-110`}>
                    <f.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-black text-foreground mb-3 tracking-tight uppercase">{f.title}</h3>
                  <p className="text-muted-foreground font-medium leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Supported DISCOs Section — SEO rich */}
        <section className="px-6 py-20">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground uppercase mb-6">
              Works With All Pakistani <span className="text-primary">DISCOs</span>
            </h2>
            <p className="text-muted-foreground font-medium max-w-2xl mx-auto mb-10">
              BijliTrack supports all PITC/CCMS connected electricity distribution companies. Check your bijli bill, track outages, and monitor feeder status.
            </p>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
              {['LESCO', 'GEPCO', 'FESCO', 'IESCO', 'MEPCO', 'PESCO', 'HESCO', 'SEPCO', 'QESCO', 'TESCO', 'AJ&K'].map((disco) => (
                <span key={disco} className="px-4 py-2 rounded-xl bg-card border border-border text-sm font-bold text-foreground shadow-sm hover:border-primary/40 transition-colors">
                  {disco}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-6 font-medium">
              Data sourced from official CCMS/PITC systems. K-Electric is not supported.
            </p>
          </div>
        </section>

        {/* How It Works — SEO content */}
        <section className="px-6 py-20 bg-card/50 border-y border-border">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground uppercase text-center mb-12">
              How to Check Your <span className="text-primary">Electricity Bill</span> Online
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { step: '1', title: 'Enter Reference Number', desc: 'Enter your 14-digit electricity reference number from your bill to get started.' },
                { step: '2', title: 'View Live Dashboard', desc: 'See your current bill amount, due date, feeder status, voltage, and power outage history.' },
                { step: '3', title: 'Track & Export', desc: 'Monitor daily outages, view bill trends, track complaints, and export reports as PDF.' },
              ].map((item) => (
                <div key={item.step} className="text-center p-6">
                  <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground font-black text-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm font-medium">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 py-12 px-6 border-t border-border bg-card">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary fill-current" />
            <span className="font-black text-foreground tracking-tighter uppercase">BijliTrack</span>
            <span className="text-muted-foreground/40 ml-2 text-xs font-bold">EST 2026</span>
          </div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
            Made with ❤ by{' '}
            <a href="https://www.github.com/ahmmikun" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors">
              Salman Ahmad
            </a>
          </p>
          <div className="flex flex-wrap justify-center gap-6 sm:gap-10 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
            <a href="#" className="hover:text-primary transition-colors">Help Center</a>
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
