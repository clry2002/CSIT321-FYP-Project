'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image'; // Import the Image component
import { supabase } from '@/lib/supabase';

// Define types for UserProfile and UserData
interface UserProfile {
  upid: number;
}

interface UserData {
  upid: number;
  userprofile: UserProfile;
}

interface ErrorData {
  message: string;
  code?: number;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Get user's upid from user_account table joined with userprofile
        const { data: userData, error: userError } = await supabase
          .from('user_account')
          .select(`
            upid,
            userprofile!inner (
              upid
            )
          `)
          .eq('user_id', data.user.id)
          .single() as { data: UserData | null, error: ErrorData | null }; // Fixed type

        if (userError) {
          console.error('Error fetching user type:', userError.message);
          throw new Error('Failed to fetch user profile');
        }

        // Route based on upid from userprofile
        if (userData?.userprofile?.upid === 1) {
          router.push('/publisherpage');
        } else if (userData?.userprofile?.upid === 2) {
          router.push('/parentpage');
        } else if (userData?.userprofile?.upid === 3) {
          router.push('/childpage');
        } else if (userData?.userprofile?.upid === 5) {
          router.push('/teacherpage');
        } else {
          throw new Error('Invalid user type');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'linear-gradient(135deg, #f3a4d7, #8b5cf6)', // Custom gradient background
      }}
    >
      {/* Header */}
      <header className="p-4 border-b bg-white shadow-md">
        <div className="flex justify-between items-center">
          {/* Added Logo and CoReadability */}
          <div
            className="flex items-center cursor-pointer"
            onClick={() => router.push('/')} // Navigate to homepage
          >
            <Image
              src="/logo2.png" // Path to your logo
              alt="Logo"
              width={40} // Adjust the width
              height={40} // Adjust the height
              className="mr-2"
            />
            <h1 className="text-2xl font-bold text-black">CoReadability</h1>
          </div>
          <button
            onClick={() => router.push('/')} // Redirects to homepage
            className="text-sm text-gray-600 hover:text-gray-800 font-medium"
          >
            ← Back to Home
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
            <p className="mt-2 text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className="text-rose-500 hover:text-rose-600 font-medium">
                Sign up
              </Link>
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent !text-black"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent !text-black"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            <div className="text-center">
              <Link
                href="/auth/adminlogin"
                className="text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                Admin Login
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}