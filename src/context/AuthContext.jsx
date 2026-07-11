import { createContext, useContext, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // Supabase auth user
  const [profile, setProfile] = useState(null); // Row from users table
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function restoreSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (session?.user) {
          setUser(session.user);
          fetchProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Unable to restore Supabase session:', error);
        if (isMounted) setLoading(false);
      }
    }

    restoreSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(authUserId) {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUserId)
        .maybeSingle();

      if (error) {
        console.warn('Profile lookup failed:', error?.message || error);
        setProfile(null);
      } else if (!data) {
        // No profile row found for this auth user. This is expected for newly created
        // auth-only users; log as info to avoid noisy warnings in the console.
        console.info(`No profile row found for user id ${authUserId}`);
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.warn('Unable to load user profile:', error?.message || error);
      setProfile(null);
    }

    setLoading(false);
  }

  async function login(identifier, password) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Authentication is not configured for this deployment.');
    }

    const value = String(identifier || '').trim();
    let email;
    // Accept either an email or a phone number; if phone is provided map to phone@cliniq.ng
    if (value.includes('@')) {
      email = value;
    } else {
      email = `${value.replace(/\s+/g, '')}@cliniq.ng`;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Supabase login failed:', error);
      throw error;
    }
    return data;
  }

  async function logout() {
    if (!isSupabaseConfigured || !supabase) {
      setUser(null);
      setProfile(null);
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, isSupabaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
