'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';

type UserProfile = {
  upid: number;
};

type UserAccount = {
  id: string;
  user_id: string;
  upid: number;
  suspended: boolean;
  comments: string | null;
  fullname: string;
  userprofile: UserProfile;
};

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) throw error;
        if (!user) throw new Error('No user found');

        // Check if user exists in user_account table
        const { data: userData, error: userError } = await supabase
          .from('user_account')
          .select(`
            id,
            user_id,
            upid,
            suspended,
            comments,
            fullname,
            userprofile!inner (
              upid
            )
          `)
          .eq('user_id', user.id)
          .single() as { data: UserAccount | null, error: PostgrestError | null };

        if (userError) {
          if (userError.code === 'PGRST116') {
            // User not found in user_account table, redirect to setup
            router.push('/setup');
            return;
          }
          throw userError;
        }

        if (userData?.suspended) {
          router.push('/suspended');
          return;
        }

        // Redirect based on user type
        if (userData?.userprofile?.upid === 1) {
          router.push('/publisherpage');
        } else if (userData?.userprofile?.upid === 2) {
          router.push('/parentpage');
        } else if (userData?.userprofile?.upid === 3) {
          router.push('/child/childpage');
        } else if (userData?.userprofile?.upid === 5) {
          router.push('/educatorpage');
        } else {
          throw new Error('Invalid user type');
        }
      } catch (err) {
        console.error('Error in auth callback:', err);
        router.push('/auth/login');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900">Processing your login...</h2>
        <p className="mt-2 text-gray-600">Please wait while we redirect you.</p>
      </div>
    </div>
  );
} 