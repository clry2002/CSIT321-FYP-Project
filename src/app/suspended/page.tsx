'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

export default function SuspendedPage() {
  const router = useRouter();
  const [suspensionReason, setSuspensionReason] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSuspension = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/auth/login');
          return;
        }

        const { data: userData, error } = await supabase
          .from('user_account')
          .select('suspended, comments')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        // If user is not suspended, redirect them to login
        if (!userData?.suspended) {
          router.push('/auth/login');
          return;
        }

        setSuspensionReason(userData.comments || 'No reason provided');
      } catch (err) {
        console.error('Error checking suspension:', err);
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };

    checkSuspension();
  }, [router]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/auth/login');
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Image
                src="/logo2.png"
                alt="Logo"
                width={40}
                height={40}
                className="mr-2"
              />
              <h1 className="text-2xl font-bold text-gray-900">CoReadability</h1>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-800 font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="h-8 w-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>
          
          <h2 className="text-center text-3xl font-bold text-gray-900 mb-4">
            Account Suspended
          </h2>
          
          <div className="text-center mb-8">
            <p className="text-gray-500">
              Your account has been suspended. Please review the information below.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Reason for Suspension
            </h3>
            <p className="text-gray-600 whitespace-pre-wrap">
              {suspensionReason}
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-2">
              What should I do?
            </h3>
            <p className="text-blue-600">
              If you believe this suspension was made in error or would like to appeal,
              please contact our admin team at:{' '}
              <a
                href="mailto:admin@coreadability.com"
                className="underline hover:text-blue-800"
              >
                admin@coreadability.com
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
} 