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
  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);

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

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

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
            <div className="mt-6 space-y-4">
              <button
                onClick={() => router.push('/setup')}
                className="w-full py-2 px-4 bg-purple-700 text-white rounded-lg hover:bg-purple-800 transition-colors"
              >
                Set Up Your Account
              </button>
              <Link
                href="/landing"
                className="inline-block text-purple-700 hover:text-purple-800 font-medium"
              >
                Proceed to Main Page
              </Link>
            </div>
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
            <h2 className="text-3xl font-bold text-gray-900">Create Your Account</h2>
            <p className="mt-2 text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-purple-700 hover:text-purple-800 font-medium"> {/* Changed link color */}
                Sign In
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
                  Email Address
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
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-700 focus:border-transparent !text-black pr-10" // Added right padding for the icon
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                    {/* Password visibility toggle button */}
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="text-gray-400 hover:text-purple-700 mr-2"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        // Eye-slash icon (for hiding password)
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-5 w-5" 
                          viewBox="0 0 20 20" 
                          fill="currentColor"
                        >
                          <path 
                            fillRule="evenodd" 
                            d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" 
                            clipRule="evenodd" 
                          />
                          <path 
                            d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" 
                          />
                        </svg>
                      ) : (
                        // Password icon (for showing password)
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-5 w-5" 
                          viewBox="0 0 20 20" 
                          fill="currentColor"
                        >
                          <path 
                            d="M10 12a2 2 0 100-4 2 2 0 000 4z" 
                          />
                          <path 
                            fillRule="evenodd" 
                            d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" 
                            clipRule="evenodd" 
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-700 hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-700 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform duration-200" // Added hover effect
            >
              {loading ? 'Creating Account...' : 'Create Account'}
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