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
          fetchProfile(session.user.id, session.user);
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
        fetchProfile(session.user.id, session.user);
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

  async function fetchProfile(authUserId, authUser = null) {
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
        const fallbackName = authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'New user';
        const fallbackProfile = {
          id: authUserId,
          full_name: fallbackName,
          role: 'chew',
        };

        try {
          const { data: createdProfile, error: createError } = await supabase
            .from('users')
            .insert({
              id: authUserId,
              full_name: fallbackName,
              role: 'chew',
            })
            .select('*')
            .maybeSingle();

          if (!createError && createdProfile) {
            setProfile(createdProfile);
          } else {
            console.info('Using local fallback profile because the users table is protected or unavailable.');
            setProfile(fallbackProfile);
          }
        } catch (insertError) {
          console.info('Using local fallback profile because the users table is protected or unavailable.');
          setProfile(fallbackProfile);
        }
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

  async function sendMagicLink(emailAddress) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Authentication is not configured for this deployment.');
    }

    const value = String(emailAddress || '').trim().toLowerCase();
    if (!value) {
      throw new Error('Please enter an email address.');
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: value,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });

    if (error) {
      console.error('Supabase magic-link request failed:', error);
      throw error;
    }

    return true;
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
    <AuthContext.Provider value={{ user, profile, loading, login, sendMagicLink, logout, isSupabaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
