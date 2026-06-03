'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, UserProfile } from '@/lib/supabase';
import {
  isDemoMode,
  createDemoUser,
  createDemoProfile,
  loadDemoSession,
  saveDemoSession,
  clearDemoSession,
  DEMO_EMAIL,
  DEMO_PASSWORD,
} from '@/lib/demo-mode';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signInDemo: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  const applyDemoSession = useCallback(() => {
    const stored = loadDemoSession();
    const demoUser = stored?.user ?? createDemoUser();
    const demoProfile = stored?.profile ?? createDemoProfile();
    saveDemoSession(demoUser, demoProfile);
    setUser(demoUser);
    setProfile(demoProfile);
    setSession(null);
    setIsDemo(true);
  }, []);

  useEffect(() => {
    if (isDemoMode()) {
      const stored = loadDemoSession();
      if (stored) {
        setUser(stored.user);
        setProfile(stored.profile);
        setIsDemo(true);
      }
      setLoading(false);
      return;
    }

    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({ data: { session: activeSession } }) => {
        if (cancelled) return;
        setSession(activeSession);
        setUser(activeSession?.user ?? null);
        if (activeSession?.user) loadProfile(activeSession.user.id);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, activeSession) => {
      if (cancelled) return;
      setSession(activeSession);
      setUser(activeSession?.user ?? null);
      setIsDemo(false);
      if (activeSession?.user) {
        void loadProfile(activeSession.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setProfile(data);
  }

  async function signInDemo() {
    applyDemoSession();
    return { error: null };
  }

  async function signIn(email: string, password: string) {
    if (isDemoMode()) {
      if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
        applyDemoSession();
        return { error: null };
      }
      return {
        error: new Error(
          'Mode démo : utilisez demo@demandiq.local / demo1234 ou le bouton « Connexion démo ».'
        ),
      };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }

  async function signUp(email: string, password: string, fullName: string) {
    if (isDemoMode()) {
      return {
        error: new Error(
          'Création de compte indisponible en mode démo. Utilisez « Connexion démo » ou configurez Supabase.'
        ),
      };
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (!error && data.user) {
      await supabase.from('user_profiles').insert({
        id: data.user.id,
        full_name: fullName,
        role: 'demand_planner',
      });
    }
    return { error: error as Error | null };
  }

  async function signOut() {
    if (isDemo) {
      clearDemoSession();
      setUser(null);
      setProfile(null);
      setSession(null);
      setIsDemo(false);
      return;
    }
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{ user, session, profile, loading, isDemo, signIn, signUp, signInDemo, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
