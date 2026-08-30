import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { storageService } from '../services/storageService';

interface Profile {
  id: string;
  email: string;
  isAdmin: boolean;
  fullName: string | null;
  schoolName: string | null;
  phone: string | null;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signInWithFacebook: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: { fullName: string; schoolName: string; phone: string }) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(userId: string, email: string): Promise<Profile> {
  const { data } = await supabase
    .from('profiles')
    .select('id, email, is_admin, full_name, school_name, phone')
    .eq('id', userId)
    .maybeSingle();
  if (data) {
    return {
      id: data.id,
      email: data.email,
      isAdmin: data.is_admin,
      fullName: data.full_name,
      schoolName: data.school_name,
      phone: data.phone,
    };
  }
  // Profile row is created by a DB trigger on signup; it may not have landed yet
  // (e.g. right after sign-up before the trigger commits). Fall back to a safe default.
  return { id: userId, email, isAdmin: false, fullName: null, schoolName: null, phone: null };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user ?? null;
      if (cancelled) return;
      setUser(sessionUser);
      if (sessionUser) {
        fetchProfile(sessionUser.id, sessionUser.email || '').then((p) => {
          if (!cancelled) setProfile(p);
        });
      }
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) {
        fetchProfile(sessionUser.id, sessionUser.email || '').then((p) => {
          if (!cancelled) setProfile(p);
        });
        // Only a real sign-in, not the session restore that fires on every
        // page load (INITIAL_SESSION) or a background token refresh.
        if (event === 'SIGNED_IN') {
          storageService.logActivity('Đăng nhập').catch(() => {});
        }
      } else {
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message, needsEmailConfirmation: false };
    return { error: null, needsEmailConfirmation: !data.session };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    return { error: error ? error.message : null };
  };

  const signInWithFacebook = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: { redirectTo: window.location.origin },
    });
    return { error: error ? error.message : null };
  };

  const signOut = async () => {
    // Log while the session is still live — resolveActor would see no user
    // (and misfile this as a guest action) if it ran after signOut clears it.
    await storageService.logActivity('Đăng xuất').catch(() => {});
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: { fullName: string; schoolName: string; phone: string }) => {
    if (!user) return { error: 'Chưa đăng nhập.' };
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: updates.fullName || null,
        school_name: updates.schoolName || null,
        phone: updates.phone || null,
      })
      .eq('id', user.id);
    if (error) return { error: error.message };
    setProfile((prev) =>
      prev
        ? { ...prev, fullName: updates.fullName || null, schoolName: updates.schoolName || null, phone: updates.phone || null }
        : prev
    );
    return { error: null };
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, isAdmin: !!profile?.isAdmin, isLoading, signUp, signIn, signInWithGoogle, signInWithFacebook, signOut, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
