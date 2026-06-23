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
import { Zap, User, Mail, Lock, ArrowRight } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message || fallback;
  }

  return fallback;
};

export default function SignupPage() {
  const [name, setName] = useState('');
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
      const res = await api.post('/auth/signup', { name, email, password });
      login(res.data.token, res.data.user);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to create your account. Try another email.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 transition-colors duration-300 relative overflow-hidden">
      {/* Background flare */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full"></div>
      </div>

      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md border-0 shadow-2xl rounded-[3rem] bg-card/80 backdrop-blur-xl relative z-10">
        <CardHeader className="space-y-4 text-center pt-10">
          <div className="mx-auto h-16 w-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 animate-in zoom-in duration-500">
            <Zap className="h-8 w-8 text-primary-foreground fill-current" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-black tracking-tighter uppercase text-foreground">Create Account</CardTitle>
            <CardDescription className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground opacity-60">
              Join the electricity intelligence network
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive" className="rounded-2xl bg-destructive/5 border-destructive/20 text-destructive">
                <AlertDescription className="font-bold text-center text-xs tracking-tight">{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground opacity-80">Full Name</Label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  id="name" 
                  type="text" 
                  placeholder="e.g. Ali Ahmed" 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-12 h-14 bg-muted/30 border-border rounded-2xl focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground opacity-80">Email Address</Label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="ali@example.com" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 h-14 bg-muted/30 border-border rounded-2xl focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" title="password" className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground opacity-80">Password</Label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Min. 8 characters"
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 h-14 bg-muted/30 border-border rounded-2xl focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-primary hover:opacity-90 text-primary-foreground font-black h-14 rounded-2xl text-sm shadow-xl shadow-primary/20 transition-all active:scale-95 border-0 uppercase tracking-widest mt-4" disabled={isLoading}>
              {isLoading ? 'Creating...' : (
                <span className="flex items-center gap-2">
                    Create My Account <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 text-center pb-10">
          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline ml-1">
              Sign In
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
