'use client';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Settings, User, Bell, Shield, Palette, Database } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your workspace preferences</p>
      </div>

      {/* Profile */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Profile</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Full Name</Label>
            <Input defaultValue={profile?.full_name ?? ''} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Business Unit</Label>
            <Input defaultValue={profile?.business_unit ?? ''} placeholder="Supply Chain" className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input value={user?.email ?? ''} disabled className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Role</Label>
            <Input value={profile?.role?.replace('_', ' ') ?? 'viewer'} disabled className="h-8 text-sm capitalize" />
          </div>
        </div>
        <Button size="sm" onClick={() => toast.success('Profile updated')}>Save Changes</Button>
      </div>

      {/* Appearance */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Palette className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Appearance</h3>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Theme</Label>
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger className="w-40 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Forecasting */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Forecast Engine</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Default Horizon (months)</Label>
            <Select defaultValue="6">
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[3, 6, 12, 18, 24].map(v => <SelectItem key={v} value={String(v)}>{v} months</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Confidence Interval</Label>
            <Select defaultValue="95">
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[80, 90, 95, 99].map(v => <SelectItem key={v} value={String(v)}>{v}%</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Notifications</h3>
        </div>
        {[
          { label: 'Forecast accuracy drops below threshold', enabled: true },
          { label: 'Critical inventory alerts', enabled: true },
          { label: 'S&OP forecast submitted for approval', enabled: true },
          { label: 'Weekly digest email', enabled: false },
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
            <span className="text-sm">{item.label}</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked={item.enabled} />
              <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
