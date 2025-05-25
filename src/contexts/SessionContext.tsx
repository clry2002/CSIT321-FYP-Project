'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

interface UserAccount {
  id: string;
  user_id: string;
  username: string;
  fullname: string;
  age: number;
  upid: number;
  created_at: string;
}

interface UserProfile {
  upid: number;
  name: string;
  suspended: boolean;
}

interface SessionContextType {
  userAccount: UserAccount | null;
  userProfile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType>({
  userAccount: null,
  userProfile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch User Account and Profile
  const fetchUserAccount = async () => {
    try {
      console.log('Fetching authenticated user...');
      setLoading(true); // Start loading

      // Get current session using the updated method
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error(`Error fetching session: ${sessionError.message}`);
        setUserAccount(null);
        setUserProfile(null);
        return;
      }

      if (!session) {
        console.warn('No active session found!');
        setUserAccount(null);
        setUserProfile(null);
        return;
      }

      const user = session.user;
      if (!user) {
        console.warn('No user found in session!');
        setUserAccount(null);
        setUserProfile(null);
        return;
      }

      console.log('User fetched:', user);

      // Retrieve User Account
      const { data: userAccountData, error: userAccountError } = await supabase
        .from('user_account')
        .select('*')
        .eq('user_id', user.id);
        
      if (userAccountError) {
        console.error(`Error fetching user account: ${userAccountError.message}`);
        setUserAccount(null);
        setUserProfile(null);
        return;
      }

      console.log('User account data fetched:', userAccountData);

      if (!userAccountData || userAccountData.length === 0) {
        console.warn('No user account found for user');
        setUserAccount(null);
        setUserProfile(null);
        return;
      }

      if (userAccountData.length > 1) {
        console.warn(`Multiple user accounts found for user ${user.id}, the first one will be used`);
      }

      // Set the user account
      const accountData = userAccountData[0];
      setUserAccount(accountData);
      console.log('User account set:', accountData);

      // Now fetch the user profile using the upid from the account
      const { data: userProfileData, error: userProfileError } = await supabase
        .from('userprofile')
        .select('*')
        .eq('upid', accountData.upid)
        .single();

      if (userProfileError) {
        console.error(`Error fetching user profile: ${userProfileError.message}`);
        setUserProfile(null);
      } else {
        console.log('User profile fetched:', userProfileData);
        setUserProfile(userProfileData);
      }
    } catch (error) {
      console.error('Unexpected error fetching user data:', error);
      setUserAccount(null);
      setUserProfile(null);
    } finally {
      setLoading(false); // End loading
    }
  };

  useEffect(() => {
    fetchUserAccount(); // Fetch user data on mount

    // Listen for auth state changes (e.g., login/logout)
    console.log('Subscribing to auth state changes...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);
      fetchUserAccount(); // Refresh user data after auth state change
    });

    // Cleanup subscription on unmount
    return () => {
      console.log('Unsubscribing from auth state changes...');
      subscription.unsubscribe();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ 
      userAccount, 
      userProfile, 
      loading, 
      refreshProfile: fetchUserAccount 
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);