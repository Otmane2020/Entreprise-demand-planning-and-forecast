'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard, TrendingUp, BarChart3, Package, Users,
  Upload, FlaskConical, FileText, Settings, LogOut, Menu, X,
  ChevronRight, Bell, Search, Sun, Moon, Layers, Target,
  Activity, Boxes, GitBranch
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { useAppData } from '@/lib/import-data-context';
import { Database } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Overview', icon: LayoutDashboard, href: '/dashboard', badge: null },
  { label: 'Forecasting', icon: TrendingUp, href: '/dashboard/forecasting', badge: null },
  { label: 'Model Compare', icon: BarChart3, href: '/dashboard/comparison', badge: 'NEW' },
  { label: 'Accuracy', icon: Activity, href: '/dashboard/accuracy', badge: null },
  { label: 'Products', icon: Boxes, href: '/dashboard/products', badge: null },
  { label: 'Inventory', icon: Package, href: '/dashboard/inventory', badge: null },
  { label: 'ABC / XYZ', icon: Layers, href: '/dashboard/analysis', badge: null },
  { label: 'S&OP', icon: GitBranch, href: '/dashboard/sop', badge: '3' },
  { label: 'FVA Tracking', icon: Target, href: '/dashboard/fva', badge: 'NEW' },
  { label: 'Scenarios', icon: FlaskConical, href: '/dashboard/scenarios', badge: null },
  { label: 'Import', icon: Upload, href: '/dashboard/import', badge: null },
  { label: 'Reports', icon: FileText, href: '/dashboard/reports', badge: null },
];

function ImportedDataBanner() {
  const { hasImportedData, snapshot, source, refresh } = useAppData();
  if (!hasImportedData) return null;
  return (
    <div className="px-4 py-2 border-b border-primary/20 bg-primary/10 flex flex-wrap items-center justify-between gap-2 text-sm">
      <div className="flex items-center gap-2 text-primary">
        <Database className="w-4 h-4 shrink-0" />
        <span>
          Données import actives — {snapshot?.rowCount ?? 0} lignes · {snapshot?.skuCount ?? 0} SKU
          {source === 'import' ? ' (mobilier / CSV)' : ''}
        </span>
      </div>
      <button type="button" onClick={refresh} className="text-xs underline text-primary hover:no-underline">
        Actualiser tous les écrans
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, profile, signOut, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/auth');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  async function handleSignOut() {
    await signOut();
    toast.info('Signed out');
    router.push('/auth');
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() ?? 'U';

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col w-60 transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 lg:z-auto',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        'bg-white border-r border-border'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-14 border-b border-border">
          <div className="w-7 h-7 rounded-lg bg-[hsl(213,94%,48%)] flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-foreground text-sm tracking-wide">DemandIQ</span>
          <button className="ml-auto lg:hidden text-muted-foreground hover:text-foreground" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-0.5">
            {NAV_ITEMS.map(item => {
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group',
                    active
                      ? 'bg-[hsl(213,94%,48%)]/10 text-[hsl(213,94%,40%)]'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className={cn('w-4 h-4 shrink-0', active ? 'text-[hsl(213,94%,48%)]' : '')} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-xs rounded-full bg-[hsl(213,94%,48%)] text-white font-medium">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-border space-y-0.5">
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </div>
        </nav>

        {/* User */}
        <div className="px-3 pb-4 border-t border-border pt-3">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted transition-colors">
            <div className="w-8 h-8 rounded-full bg-[hsl(213,94%,48%)] flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">
                {profile?.full_name || user.email?.split('@')[0]}
              </div>
              <div className="text-xs text-muted-foreground capitalize">{profile?.role?.replace('_', ' ') || 'Viewer'}</div>
            </div>
            <button onClick={handleSignOut} className="text-muted-foreground hover:text-destructive transition-colors">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-3 px-4 h-14 border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                placeholder="Search SKU, product, category…"
                className="w-full pl-9 pr-4 py-1.5 text-sm bg-muted/40 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full" />
            </button>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          <ImportedDataBanner />
          <div className="flex-1 min-h-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
