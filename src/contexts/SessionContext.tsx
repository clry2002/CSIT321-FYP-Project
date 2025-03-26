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
  const fetchUserProfile = async () => {
    try {
      console.log('Fetching authenticated user...');
      setLoading(true); // Start loading

      // Retrieve authenticated user from Supabase
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error(`Error fetching user: ${userError.message}`);
        setUserProfile(null); // Reset the user profile on error
        return;
      }
      if (!user) {
        console.warn('No user found!');
        setUserProfile(null); // No user logged in
        return;
      }

      // Fetch user profile data from Supabase database
      console.log('Fetching user profile from user_account table...');
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

      console.log('Profile successfully fetched:', profile);
      setUserProfile(profile);
    } catch (error) {
      console.error('Unexpected error fetching user profile:', error);
      setUserProfile(null); // Handle unexpected errors gracefully
    } finally {
      setLoading(false); // End loading
    }
  };

  useEffect(() => {
    fetchUserProfile(); // Fetch user profile on mount

    // Listen for auth state changes (e.g., login/logout)
    console.log('Subscribing to auth state changes...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      console.log('Auth state changed, refreshing user profile...');
      fetchUserProfile();
    });

    // Cleanup subscription on unmount
    return () => {
      console.log('Unsubscribing from auth state changes...');
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
