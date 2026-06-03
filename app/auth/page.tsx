'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Package, Users, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { isDemoMode } from '@/lib/demo-mode';

export default function AuthPage() {
  const { signIn, signUp, signInDemo } = useAuth();
  const demoMode = isDemoMode();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [signInData, setSignInData] = useState({ email: '', password: '' });
  const [signUpData, setSignUpData] = useState({ email: '', password: '', fullName: '', confirmPassword: '' });

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await signIn(signInData.email, signInData.password);
    if (error) {
      setError(error.message);
    } else {
      toast.success('Welcome back!');
      router.push('/dashboard');
    }
    setLoading(false);
  }

  async function handleDemoSignIn() {
    setLoading(true);
    setError('');
    const { error } = await signInDemo();
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    toast.success('Mode démo activé');
    router.push('/dashboard');
    setLoading(false);
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (signUpData.password !== signUpData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await signUp(signUpData.email, signUpData.password, signUpData.fullName);
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      toast.success('Account created! Welcome to DemandIQ.');
      router.push('/dashboard');
    }
  }

  return (
    <div className="min-h-screen bg-[hsl(220,28%,6%)] flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-[hsl(220,28%,8%)] to-[hsl(213,60%,15%)] border-r border-[hsl(220,20%,14%)]">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-[hsl(213,94%,48%)] flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">DemandIQ</span>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            Enterprise Demand<br />Planning at Scale
          </h1>
          <p className="text-[hsl(220,15%,60%)] text-lg leading-relaxed max-w-md">
            Unify forecasting, inventory optimization, and S&OP collaboration in one intelligent platform.
          </p>
        </div>

        <div className="space-y-6">
          {[
            { icon: BarChart3, title: '15 Statistical Models', desc: 'From ARIMA to XGBoost, auto-select the best model per SKU' },
            { icon: Package, title: 'Inventory Optimization', desc: 'Dynamic safety stock and reorder points with service level targets' },
            { icon: TrendingUp, title: 'ABC/XYZ Analytics', desc: 'Automatic product segmentation and Pareto analysis' },
            { icon: Users, title: 'S&OP Collaboration', desc: 'Statistical → Sales → Consensus workflow with full audit trail' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-lg bg-[hsl(213,94%,48%)]/15 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-[hsl(213,94%,60%)]" />
              </div>
              <div>
                <div className="text-white font-medium text-sm">{title}</div>
                <div className="text-[hsl(220,15%,55%)] text-sm mt-0.5">{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[hsl(220,15%,45%)] text-sm">
          Trusted by supply chain leaders worldwide
        </p>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-[hsl(213,94%,48%)] flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">DemandIQ</span>
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="w-full mb-6 bg-[hsl(220,23%,11%)]">
              <TabsTrigger value="signin" className="flex-1">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">Create Account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <Card className="bg-[hsl(220,23%,11%)] border-[hsl(220,20%,18%)]">
                <CardHeader>
                  <CardTitle className="text-white">Welcome back</CardTitle>
                  <CardDescription>Sign in to your DemandIQ workspace</CardDescription>
                </CardHeader>
                <form onSubmit={handleSignIn}>
                  <CardContent className="space-y-4">
                    {error && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="planner@company.com"
                        value={signInData.email}
                        onChange={e => setSignInData(p => ({ ...p, email: e.target.value }))}
                        required
                        className="bg-[hsl(220,20%,16%)] border-[hsl(220,20%,22%)]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={signInData.password}
                        onChange={e => setSignInData(p => ({ ...p, password: e.target.value }))}
                        required
                        className="bg-[hsl(220,20%,16%)] border-[hsl(220,20%,22%)]"
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2">
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Signing in…' : 'Sign In'}
                    </Button>
                    {demoMode && (
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full"
                        disabled={loading}
                        onClick={handleDemoSignIn}
                      >
                        Connexion démo (sans Supabase)
                      </Button>
                    )}
                  </CardFooter>
                </form>
                {demoMode && (
                  <p className="text-xs text-muted-foreground px-6 pb-4 -mt-2">
                    Compte démo : <span className="font-mono">{`demo@demandiq.local`}</span> /{' '}
                    <span className="font-mono">demo1234</span>
                  </p>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="signup">
              <Card className="bg-[hsl(220,23%,11%)] border-[hsl(220,20%,18%)]">
                <CardHeader>
                  <CardTitle className="text-white">Create account</CardTitle>
                  <CardDescription>Get started with DemandIQ for free</CardDescription>
                </CardHeader>
                <form onSubmit={handleSignUp}>
                  <CardContent className="space-y-4">
                    {error && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label>Full Name</Label>
                      <Input
                        placeholder="Jane Smith"
                        value={signUpData.fullName}
                        onChange={e => setSignUpData(p => ({ ...p, fullName: e.target.value }))}
                        required
                        className="bg-[hsl(220,20%,16%)] border-[hsl(220,20%,22%)]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="planner@company.com"
                        value={signUpData.email}
                        onChange={e => setSignUpData(p => ({ ...p, email: e.target.value }))}
                        required
                        className="bg-[hsl(220,20%,16%)] border-[hsl(220,20%,22%)]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Password</Label>
                      <Input
                        type="password"
                        placeholder="Min. 8 characters"
                        value={signUpData.password}
                        onChange={e => setSignUpData(p => ({ ...p, password: e.target.value }))}
                        required
                        minLength={8}
                        className="bg-[hsl(220,20%,16%)] border-[hsl(220,20%,22%)]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Confirm Password</Label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={signUpData.confirmPassword}
                        onChange={e => setSignUpData(p => ({ ...p, confirmPassword: e.target.value }))}
                        required
                        className="bg-[hsl(220,20%,16%)] border-[hsl(220,20%,22%)]"
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Creating account…' : 'Create Account'}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
