'use client';

import { Suspense } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ArrowRight, Lock, ShieldCheck, Zap } from 'lucide-react';

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message || fallback;
  }

  return fallback;
};

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('Reset token is missing. Please request a new password reset link.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.post('/auth/reset-password', { token, password });
      setMessage(res.data.message || 'Password reset successful.');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => router.push('/login'), 1500);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not reset password. Please request a new link.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 transition-colors duration-300 relative overflow-hidden">
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
            <CardTitle className="text-3xl font-black tracking-tighter uppercase text-foreground">New Password</CardTitle>
            <CardDescription className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground opacity-60">
              Secure your BijliTrack account
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {!token && (
              <Alert variant="destructive" className="rounded-2xl bg-destructive/5 border-destructive/20 text-destructive py-4">
                <AlertDescription className="font-bold text-center text-xs tracking-tight">
                  Reset token is missing. Request a fresh password reset link.
                </AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive" className="rounded-2xl bg-destructive/5 border-destructive/20 text-destructive py-4">
                <AlertDescription className="font-bold text-center text-xs tracking-tight">{error}</AlertDescription>
              </Alert>
            )}
            {message && (
              <Alert className="rounded-2xl bg-primary/5 border-primary/20 py-4">
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription className="font-bold text-center text-xs tracking-tight text-foreground">
                  {message}
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2.5">
              <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">New Password</Label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 h-14 bg-muted/30 border-border rounded-2xl focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                />
              </div>
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="confirmPassword" className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Confirm Password</Label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repeat new password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-12 h-14 bg-muted/30 border-border rounded-2xl focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-primary hover:opacity-90 text-primary-foreground font-black h-14 rounded-2xl text-sm shadow-xl shadow-primary/20 transition-all active:scale-95 border-0 uppercase tracking-widest" disabled={isLoading || !token}>
              {isLoading ? 'Saving...' : (
                <span className="flex items-center gap-2">
                  Save New Password <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 text-center pb-10">
          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            Need another link?{' '}
            <Link href="/forgot-password" className="text-primary hover:underline ml-1">
              Start again
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
