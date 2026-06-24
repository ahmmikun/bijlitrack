import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Search, Zap, BarChart3, ShieldCheck, ArrowRight, Activity, Bell } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Home() {
  return (
    <div className="bg-background min-h-screen flex flex-col selection:bg-primary/10 selection:text-primary overflow-x-hidden transition-colors duration-300">
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
              Smart Bill & <span className="text-primary">Outage</span> Tracker
            </h1>
            <p className="mt-8 text-lg sm:text-xl leading-8 text-muted-foreground font-medium max-w-2xl mx-auto">
              Easily manage your electricity accounts. Track your monthly bills, check live feeder status, and get automated reports in one place.
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
                  title: 'Live Status', 
                  desc: 'Check if your power is on or off in real-time with direct updates from your grid station.',
                  icon: Activity,
                  color: 'text-blue-500 bg-blue-500/10'
                },
                { 
                  title: 'Bill History', 
                  desc: 'See your last 12 months of bills and payments in a clean, easy-to-read table and graph.',
                  icon: BarChart3,
                  color: 'text-indigo-500 bg-indigo-500/10'
                },
                { 
                  title: 'Easy Alerts', 
                  desc: 'Never miss a due date again. Get insights and recommendations on your consumption patterns.',
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
