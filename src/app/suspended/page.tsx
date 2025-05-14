'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

export default function SuspendedPage() {
  const router = useRouter();
  const [suspensionReason, setSuspensionReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSuspensionStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/auth/login');
          return;
        }

        // Get user's suspension details
        const { data: userData, error: userError } = await supabase
          .from('user_account')
          .select('suspended, comments')
          .eq('user_id', user.id)
          .single();

        if (userError) throw userError;

        // If user is not suspended, redirect them to login
        if (!userData?.suspended) {
          router.push('/auth/login');
          return;
        }

        setSuspensionReason(userData.comments);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    checkSuspensionStatus();
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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Image
                src="/logo2.png"
                alt="Logo"
                width={40}
                height={40}
                className="mr-2"
                unoptimized
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
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="flex items-center justify-center mb-8">
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

          <h2 className="text-3xl font-bold text-center text-gray-900 mb-6">
            Account Suspended
          </h2>

          <div className="text-center mb-8">
            <p className="text-gray-600 mb-4">
              Your account has been suspended for the following reason:
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-gray-800">
                {suspensionReason || 'No specific reason provided'}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              What should you do?
            </h3>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>
                Contact our admin team at{' '}
                <a
                  href="mailto:admin@coreadability.com"
                  className="text-blue-600 hover:text-blue-800"
                >
                  admin@coreadability.com
                </a>
              </li>
              <li>Include your username and the reason for suspension in your email</li>
              <li>Provide any relevant information or context about your situation</li>
              <li>Wait for a response from our admin team</li>
            </ul>
          </div>

          {error && (
            <div className="mt-6 bg-red-50 text-red-600 p-4 rounded-lg">
              {error}
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 