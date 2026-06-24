'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Receipt, Zap, FileText, Settings, LogOut, Menu, ChevronDown, Check, Bell, Search, MessageSquareWarning, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { ThemeToggle } from '@/components/ThemeToggle';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Bill History', href: '/dashboard/billing', icon: Receipt },
  { name: 'Outages & Load', href: '/dashboard/outages', icon: Zap },
  { name: 'Complaints', href: '/dashboard/complaints', icon: MessageSquareWarning },
  { name: 'Reports', href: '/dashboard/reports', icon: FileText },
  { name: 'About', href: '/dashboard/about', icon: Info },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, activeRefId, setActiveRefId } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: references } = useQuery({
    queryKey: ['my-references'],
    queryFn: async () => {
      const res = await api.get('/reference/my');
      return res.data;
    },
    enabled: !!user
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (references && references.length > 0) {
      // If activeRefId is stale (not in current references), reset to first valid one
      const isValid = references.some((r: any) => r._id === activeRefId);
      if (!activeRefId || !isValid) {
        setActiveRefId(references[0]._id);
      }
    } else if (references && references.length === 0) {
      // No references at all, clear any stale ID
      setActiveRefId(null);
    }
  }, [references, activeRefId, setActiveRefId]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <div className="h-14 w-14 bg-primary rounded-2xl flex items-center justify-center animate-bounce shadow-xl shadow-primary/20">
            <Zap className="h-7 w-7 text-primary-foreground fill-current" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em]">Preparing Dashboard</p>
            <p className="text-xs text-muted-foreground/60 font-bold uppercase tracking-widest">Loading secure utility link...</p>
          </div>
        </div>
      </div>
    );
  }

  const activeRef = references?.find((r: any) => r._id === activeRefId);

  const ReferenceSelector = () => (
    <div className="px-4 mb-8">
      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] px-3 mb-3 opacity-60">Manage Accounts</p>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between bg-card border-border text-card-foreground hover:bg-accent h-14 shadow-sm rounded-2xl group transition-all">
            <div className="flex items-center truncate">
              <div className="h-3 w-3 rounded-full bg-green-500 mr-3 shrink-0 ring-4 ring-green-500/10 group-hover:animate-pulse" />
              <div className="flex flex-col items-start min-w-0">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter leading-none mb-1">Active Meter</span>
                <span className="truncate font-black text-sm tracking-tight text-foreground leading-none">
                  {activeRef ? activeRef.referenceNo : 'Select Account'}
                </span>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 opacity-30 shrink-0 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[250px] rounded-2xl p-2 border-border shadow-2xl" align="start" sideOffset={10}>
          <DropdownMenuLabel className="px-3 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Saved Meter Numbers</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-muted" />
          <div className="max-h-[300px] overflow-y-auto">
            {references?.map((ref: any) => (
              <DropdownMenuItem 
                key={ref._id} 
                onClick={() => setActiveRefId(ref._id)}
                className="flex items-center justify-between cursor-pointer rounded-xl py-3 px-3 hover:bg-accent focus:bg-accent group mb-1"
              >
                <div className="flex flex-col">
                  <span className="font-mono text-xs font-black text-foreground">{ref.referenceNo}</span>
                  <span className="text-[10px] font-bold text-muted-foreground">Electricity Meter</span>
                </div>
                {activeRefId === ref._id && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            ))}
          </div>
          <DropdownMenuSeparator className="bg-muted" />
          <Link href="/dashboard/lookup" className="w-full">
            <DropdownMenuItem className="text-primary cursor-pointer font-black text-xs p-3 rounded-xl hover:bg-primary/5 focus:bg-primary/5 uppercase tracking-widest flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              Add New Reference
            </DropdownMenuItem>
          </Link>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const NavLinks = () => (
    <nav className="flex-1 overflow-y-auto space-y-1.5 px-4 py-2">
      {navigation.map((item) => {
        const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard');
        const isExactDashboard = item.href === '/dashboard' && pathname === '/dashboard';
        const finalActive = item.href === '/dashboard' ? isExactDashboard : isActive;

        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setMobileMenuOpen(false)}
            className={`group flex items-center px-4 py-3.5 text-xs font-black rounded-xl transition-all duration-200 uppercase tracking-widest ${
              finalActive
                ? 'bg-foreground text-background shadow-lg scale-[1.02]'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <item.icon
              className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${
                finalActive ? 'text-primary' : 'text-muted-foreground/60 group-hover:text-foreground'
              }`}
              aria-hidden="true"
            />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background flex font-sans selection:bg-primary/10 selection:text-primary transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 bg-card border-r border-border shadow-sm z-50">
        <div className="flex h-24 shrink-0 items-center px-8">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 transition-transform group-hover:rotate-6">
              <Zap className="h-5 w-5 text-primary-foreground fill-current" />
            </div>
            <span className="text-2xl font-black text-foreground tracking-tighter">BijliTrack</span>
          </Link>
        </div>
        
        <ReferenceSelector />
        <NavLinks />

        <div className="p-4 mt-auto shrink-0">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-xl relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-lg border-2 border-background/20">
                {user.name.charAt(0)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-black text-foreground truncate uppercase tracking-widest">{user.name}</span>
                <span className="text-[9px] font-bold text-muted-foreground truncate uppercase tracking-tighter">{user.email}</span>
              </div>
            </div>
            <button 
              onClick={logout}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-destructive/5 hover:bg-destructive/10 text-destructive rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-destructive/10"
            >
              <LogOut className="h-3 w-3" /> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col md:pl-72 w-full min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex h-20 shrink-0 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-6 sm:px-10">
          <div className="md:hidden flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)} className="rounded-xl bg-muted hover:bg-accent text-foreground">
              <Menu className="h-6 w-6" />
            </Button>
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary-foreground fill-current" />
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_currentColor]"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Grid Monitoring Active</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="rounded-xl relative text-muted-foreground hover:text-foreground hover:bg-accent">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-background"></span>
            </Button>
            <div className="h-8 w-px bg-border"></div>
            <p className="hidden lg:block text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right leading-tight">
              Operational Mode<br/>
              <span className="text-foreground">Stable-v1.5</span>
            </p>
          </div>
        </header>

        <main className="flex-1 py-10 px-4 sm:px-10 lg:px-12 max-w-[1600px] w-full mx-auto transition-all duration-300">
          {children}
        </main>

        <footer className="border-t border-border px-6 sm:px-10 py-5 text-center bg-amber-500/5 space-y-2">
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest">
            ⚡ Coverage: PITC/CCMS supported public-sector DISCOs only. <span className="text-red-500">K-Electric may not be supported.</span>
          </p>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">
            Made with ❤ by{' '}
            <a href="https://www.github.com/ahmmikun" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors">
              Salman Ahmad
            </a>
          </p>
        </footer>
      </div>

      {/* Mobile Drawer */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[300px] p-0 border-r-0 rounded-r-3xl bg-card flex flex-col">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <div className="flex h-24 shrink-0 items-center px-8 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary-foreground fill-current" />
              </div>
              <span className="text-2xl font-black text-foreground tracking-tighter uppercase">BijliTrack</span>
            </div>
          </div>
          <div className="flex-1 py-6 overflow-y-auto">
            <ReferenceSelector />
            <NavLinks />
          </div>
          <div className="p-6 border-t border-border shrink-0">
             <Button 
              onClick={logout}
              variant="destructive"
              className="w-full rounded-xl font-black uppercase tracking-widest h-12 shadow-lg shadow-destructive/20 border-0"
            >
              Logout
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
