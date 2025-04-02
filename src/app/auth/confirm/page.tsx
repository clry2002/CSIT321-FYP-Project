'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get the token from the URL
        const token = searchParams.get('token');
        const type = searchParams.get('type');

        if (!token || type !== 'email') {
          setError('Invalid verification link');
          setIsVerifying(false);
          return;
        }

        // Verify the email
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'email',
        });

        if (verifyError) throw verifyError;

        // After verification, check if user has a profile
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) throw new Error('User not found after verification');

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        // If user has no profile, redirect to setup
        if (!profile) {
          router.push('/setup');
        } else {
          router.push('/childpage');
        }
      } catch (err) {
        console.error('Error verifying email:', err);
        setError(err instanceof Error ? err.message : 'An error occurred during verification');
        setIsVerifying(false);
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500 mx-auto"></div>
          <p className="text-gray-600">Verifying your email...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg text-center">
          <div className="text-red-500 text-lg font-medium">Verification Failed</div>
          <p className="text-gray-600">{error}</p>
          <Link 
            href="/auth/login"
            className="inline-block mt-4 text-rose-500 hover:text-rose-600"
          >
            Return to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg text-center">
        <div className="text-2xl font-bold text-gray-900">Your account has been verified</div>
        <p className="text-gray-600">
          Redirecting you to setup your account...
        </p>
      </div>
    </div>
  );
} 