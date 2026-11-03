import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, type Profile } from '../lib/supabaseClient';
import { AuthContext, type AuthContextValue } from './useAuth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const profileUserId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadProfile = async (userId: string): Promise<void> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (!active || profileUserId.current !== userId) return;
      if (error) {
        console.error('Error cargando perfil:', error.message);
        profileUserId.current = null;
        setProfile(null);
      } else {
        setProfile(data);
      }
      setLoading(false);
    };

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      const userId = newSession?.user.id ?? null;
      if (!userId) {
        profileUserId.current = null;
        setProfile(null);
        setLoading(false);
        return;
      }
      if (profileUserId.current === userId) return;
      profileUserId.current = userId;
      setLoading(true);
      setTimeout(() => { void loadProfile(userId); }, 0);
    });

    return () => {
      active = false;
      profileUserId.current = null;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      role: profile?.role ?? null,
      loading,
      signOut: async () => { await supabase.auth.signOut(); },
    }),
    [session, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}