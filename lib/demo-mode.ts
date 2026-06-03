import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '@/lib/supabase';

export const DEMO_SESSION_KEY = 'demandiq_demo_session';
export const DEMO_EMAIL = 'demo@demandiq.local';
export const DEMO_PASSWORD = 'demo1234';

export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001';

export function isDemoMode(): boolean {
  if (process.env.NEXT_PUBLIC_ENABLE_DEMO_AUTH === 'true') return true;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return url.includes('placeholder') || url.includes('your-project');
}

export function createDemoUser(): User {
  return {
    id: DEMO_USER_ID,
    app_metadata: { provider: 'demo' },
    user_metadata: { full_name: 'Demo Planner' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    email: DEMO_EMAIL,
    phone: '',
    role: 'authenticated',
    updated_at: new Date().toISOString(),
  } as User;
}

export function createDemoProfile(): UserProfile {
  return {
    id: DEMO_USER_ID,
    full_name: 'Demo Planner',
    role: 'demand_planner',
    business_unit: 'Demo',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function loadDemoSession(): { user: User; profile: UserProfile } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DEMO_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { user: User; profile: UserProfile };
  } catch {
    return null;
  }
}

export function saveDemoSession(user: User, profile: UserProfile): void {
  localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({ user, profile }));
}

export function clearDemoSession(): void {
  localStorage.removeItem(DEMO_SESSION_KEY);
}
