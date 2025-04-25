'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { syncFavoriteGenres } from '@/services/userInteractionsService';

interface StyleObject {
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundRepeat?: string;
}

interface Star {
  top: number;
  left: number;
  size: number;
  delay: number;
}

interface UserProfile {
  upid: number;
  name?: string;
  suspended?: boolean;
}

interface UserData {
  id: string;
  user_id: string;
  userprofile: UserProfile;
  suspended: boolean;
  comments: string;
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
  const [stars, setStars] = useState<Star[]>([]);

  const backgroundStyle: StyleObject = {
    backgroundImage: 'url("/spacemovement.gif")',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
  };

  useEffect(() => {
    const newStars = Array.from({ length: 70 }).map(() => ({
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 6 + 3,
      delay: Math.random() * 5,
    }));
    setStars(newStars);
  }, []);

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
        const { data: userData, error: userError } = await supabase
          .from('user_account')
          .select(`
            id,
            upid,
            suspended,
            comments,
            userprofile!inner (
              upid
            )
          `)
          .eq('user_id', data.user.id)
          .single() as { data: UserData | null, error: ErrorData | null };

        if (userError) {
          console.error('Error fetching user type:', userError.message);
          throw new Error('Failed to fetch user profile');
        }

        if (userData?.suspended) {
          router.push('/suspended');
          return;
        }

        if (userData?.userprofile?.upid === 1) {
          router.push('/publisherpage');
        } else if (userData?.userprofile?.upid === 2) {
          router.push('/parentpage');
        } else if (userData?.userprofile?.upid === 3) {
          try {
            const { data: childDetailsArray, error: childDetailsError } = await supabase
              .from('child_details')
              .select('favourite_genres')
              .eq('child_id', userData.id);

            console.log("Child details check:", { childDetailsArray, error: childDetailsError });

            if (childDetailsError) {
              console.error('Error checking child details:', childDetailsError);
              setError('Error checking account details. Please try again.');
              setLoading(false);
              return;
            }

            if (childDetailsArray && childDetailsArray.length > 0 &&
              childDetailsArray[0].favourite_genres &&
              childDetailsArray[0].favourite_genres.length > 0) {
              console.log("Syncing favorite genres on login");
              await syncFavoriteGenres(userData.id.toString());
              router.push('/childpage');
            } else {
              if (!childDetailsArray || childDetailsArray.length === 0) {
                console.log("Creating new child_details record");
                const { error: insertError } = await supabase
                  .from('child_details')
                  .insert({
                    child_id: userData.id,
                    favourite_genres: []
                  });

                if (insertError) {
                  console.error("Error creating child_details:", insertError);
                  setError('Error setting up your account. Please try again.');
                  setLoading(false);
                  return;
                }
              }
              router.push('/first-time-setup');
            }
          } catch (err) {
            console.error('Error in child flow:', err);
            setError('An unexpected error occurred. Please try again.');
            setLoading(false);
          }
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
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ ...backgroundStyle }}
    >
      {/* Background stars */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {stars.map((star, index) => (
          <div
            key={index}
            className="absolute rounded-full bg-yellow-300 animate-twinkle"
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              width: `${star.size * 1}px`,
              height: `${star.size * 1}px`,
              animationDelay: `${star.delay}s`,
              opacity: 0.9,
              filter: 'blur(1px)',
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="p-4 border-b bg-white shadow-md relative z-10">
        <div className="flex justify-between items-center">
          <div
            className="flex items-center cursor-pointer"
            onClick={() => router.push('/')}
          >
            <Image
              src="/logo2.png"
              alt="Logo"
              width={40}
              height={40}
              className="mr-2"
            />
            <h1 className="text-2xl font-bold text-purple-700">CoReadability</h1>
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-gray-600 hover:text-gray-800 font-medium"
          >
            ← Back to Home
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center relative z-10">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg relative">
          {/* Animated Mascot */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2">
            <Image
              src="/mascot.png"
              alt="Animated Mascot"
              width={100}
              height={100}
              className="animate-wiggle"
            />
          </div>

          <div className="text-center mt-12">
            <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
            <p className="mt-2 text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className="text-purple-700 hover:text-purple-800 font-medium">
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-700 focus:border-transparent !text-black"
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-700 focus:border-transparent !text-black"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-700 hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-700 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform duration-200"
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

      {/* Star and Mascot animation */}
      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.4);
          }
        }
        .animate-twinkle {
          animation: twinkle 3s infinite ease-in-out;
        }

        @keyframes wiggle {
          0% { transform: rotate(0deg); }
          15% { transform: rotate(-5deg); }
          30% { transform: rotate(5deg); }
          45% { transform: rotate(-5deg); }
          60% { transform: rotate(5deg); }
          75% { transform: rotate(-3deg); }
          90% { transform: rotate(3deg); }
          100% { transform: rotate(0deg); }
        }
        .animate-wiggle {
          animation: wiggle 1s infinite ease-in-out; /* Changed duration back to 1s */
        }
      `}</style>
    </div>
  );
}