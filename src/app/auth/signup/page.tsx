'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

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

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [stars, setStars] = useState<Star[]>([]);
  const [formVisible, setFormVisible] = useState(false);

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

    // Trigger the fly-in animation after a short delay when the component mounts
    setTimeout(() => {
      setFormVisible(true);
    }, 100);
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        setSuccess(true);
        router.push('/setup');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
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
            {/* Added Logo and CoReadability */}
            <div
              className="flex items-center cursor-pointer"
              onClick={() => router.push('/landing')}
            >
              <Image
                src="/logo2.png"
                alt="Logo"
                width={40}
                height={40}
                className="mr-2"
                unoptimized
              />
              <h1 className="text-2xl font-bold text-purple-700">CoReadability</h1>
            </div>
            <button
              onClick={() => router.push('/landing')}
              className="text-sm text-gray-600 hover:text-gray-800 font-medium"
            >
              ← Back to Home
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex flex-1 items-center justify-center relative z-10">
          <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg text-center">
            <div className="text-2xl font-bold text-gray-900">Check your email</div>
            <p className="text-gray-600">
              We&apos;ve sent you an email with a verification link. Please check your inbox and click the link to verify your account.
            </p>
            <p className="text-sm text-gray-500 mt-4">
              After verifying your email, you&apos;ll be able to set up your account.
            </p>
            <Link
              href="/auth/login"
              className="inline-block mt-4 text-purple-700 hover:text-purple-800 font-medium"
            >
              Return to login
            </Link>
          </div>
        </main>
        {/* Star animation */}
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
        `}</style>
      </div>
    );
  }

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
          {/* Added Logo and CoReadability */}
          <div
            className="flex items-center cursor-pointer"
            onClick={() => router.push('/landing')}
          >
            <Image
              src="/logo2.png"
              alt="Logo"
              width={40}
              height={40}
              className="mr-2"
              unoptimized
            />
            <h1 className="text-2xl font-bold text-purple-700">CoReadability</h1>
          </div>
          <button
            onClick={() => router.push('/landing')}
            className="text-sm text-gray-600 hover:text-gray-800 font-medium"
          >
            ← Back to Home
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center relative z-10">
        <div className={`max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg ${formVisible ? 'animate-fly-in' : 'translate-y-full opacity-0'}`}>
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Create your account</h2>
            <p className="mt-2 text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-purple-700 hover:text-purple-800 font-medium"> {/* Changed link color */}
                Sign in
              </Link>
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-700 focus:border-transparent !text-black" // Changed focus ring color
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-700 focus:border-transparent !text-black" // Changed focus ring color
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-700 hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-700 disabled:opacity-50 disabled:cursor-not-allowed" // Changed button background and focus ring color
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>
      </main>

      {/* Star and Fly-in animation */}
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

        @keyframes fly-in {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-fly-in {
          animation: fly-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}