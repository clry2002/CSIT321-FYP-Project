// app/first-time-setup/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import FirstTimeLoginSetup from '@/app/components/child/FirstTimeLoginSetup';

export default function FirstTimeSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          router.push('/auth/login');
          return;
        }

        // Get user type
        const { data: userData, error: userError } = await supabase
          .from('user_account')
          .select('upid')
          .eq('user_id', user.id)
          .single();
          
        if (userError || !userData) {
          router.push('/auth/login');
          return;
        }

        // Make sure it's a child account
        if (userData.upid !== 3) {
          router.push('/');
          return;
        }

        setLoading(false);
      } catch (err) {
        console.error('Error checking authentication:', err);
        router.push('/auth/login');
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return <FirstTimeLoginSetup />;
}