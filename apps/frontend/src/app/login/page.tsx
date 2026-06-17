'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Zap, Key, Mail, ArrowRight } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.token, res.data.user);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Check your email/password and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 transition-colors duration-300 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-primary/10 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full"></div>
      </div>

      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md border-0 shadow-2xl rounded-[2.5rem] bg-card/80 backdrop-blur-xl relative z-10">
        <CardHeader className="space-y-4 text-center pt-10">
          <div className="mx-auto h-16 w-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 animate-in zoom-in duration-500">
            <Zap className="h-8 w-8 text-primary-foreground fill-current" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-black tracking-tighter uppercase text-foreground">Welcome Back</CardTitle>
            <CardDescription className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground opacity-60">
              Access your electricity dashboard
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive" className="rounded-2xl bg-destructive/5 border-destructive/20 text-destructive py-4">
                <AlertDescription className="font-bold text-center text-xs tracking-tight">{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2.5">
              <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Email Address</Label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@company.com" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 h-14 bg-muted/30 border-border rounded-2xl focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                />
              </div>
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="password" title="password" className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Security Password</Label>
              <div className="relative group">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••"
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 h-14 bg-muted/30 border-border rounded-2xl focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-primary hover:opacity-90 text-primary-foreground font-black h-14 rounded-2xl text-sm shadow-xl shadow-primary/20 transition-all active:scale-95 border-0 uppercase tracking-widest" disabled={isLoading}>
              {isLoading ? 'Authenticating...' : (
                <span className="flex items-center gap-2">
                    Login to System <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 text-center pb-10">
          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-primary hover:underline ml-1">
              Create one now
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
