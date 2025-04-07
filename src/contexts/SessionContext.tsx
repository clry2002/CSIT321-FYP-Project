'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  age: number;
  favorite_genres: string[];
}

interface SessionContextType {
  userProfile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType>({
  userProfile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to fetch user profile
  const fetchUserProfile = async (session: any) => {
    try {
      setLoading(true);

      if (!session?.user) {
        console.warn('No active session or user found!');
        setUserProfile(null);
        return;
      }

      const user = session.user;

      // Fetch the user profile from the database
      const { data: profile, error: profileError } = await supabase
        .from('user_account')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error(`Error fetching profile: ${profileError.message}`);
        setUserProfile(null);
        return;
      }

      setUserProfile(profile); // Update the profile
    } catch (error) {
      console.error('Unexpected error fetching user profile:', error);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);

      // Only fetch profile if session and user exist
      if (session?.user) {
        fetchUserProfile(session);
      } else {
        setUserProfile(null); // Clear user profile if no session
      }
    });

    // Initial fetch for session on component mount (if available)
    const { data: initialSession } = supabase.auth.getSession();
    if (initialSession?.user) {
      fetchUserProfile(initialSession);
    }

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ userProfile, loading, refreshProfile: fetchUserProfile }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
