'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { syncFavoriteGenres } from '@/services/userInteractionsService';
import { timeLimitCheckService } from '@/services/loginTimeLimitService';
import TimeLimitExceededPage from '../../components/child/LoginTimeLimit'

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

interface TimeLimitState {
  isExceeded: boolean;
  timeUsed: number;
  timeLimit: number;
  username: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stars, setStars] = useState<Star[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [mascotClicks, setMascotClicks] = useState(0);
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [showSignUpLink, setShowSignUpLink] = useState(false);
  // New state for password
  const [showPassword, setShowPassword] = useState(false);
  
  // State for time limit exceeded
  const [timeLimitState, setTimeLimitState] = useState<TimeLimitState | null>(null);

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
    }, 100); // Adjust the delay as needed
  }, []);

  // Reset the time limit exceeded state and return to login form
  const handleBackToLogin = () => {
    setTimeLimitState(null);
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Modified login handler with improved error handling
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowSignUpLink(false);
    setLoading(true);

    try {
      // Attempt to sign in with the provided credentials
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Handle auth errors
      if (error) {
        console.error('Auth error:', error);
        
        if (error.message.includes('Invalid login credentials')) {
          setError('No user found');
          setShowSignUpLink(true);
        } else {
          setError(error.message);
        }
        
        setLoading(false);
        return;
      }

      // User authenticated successfully
      if (data.user) {
        // First, check if user_account record exists
        const { data: basicUserData, error: basicUserError } = await supabase
          .from('user_account')
          .select('id, user_id, upid, fullname, suspended, comments')
          .eq('user_id', data.user.id)
          .single();
        
        if (basicUserError) {
          console.error('Error fetching basic user data:', basicUserError);
          
          // If no user_account record exists, send to setup
          if (basicUserError.code === 'PGRST116') { // "Results contain 0 rows"
            console.log('User authenticated but no profile exists, redirecting to setup');
            router.push('/setup');
            return;
          }
          
          setError('Error loading your profile. Please try again.');
          setLoading(false);
          return;
        }
        
        // Check if user has a role assigned (upid)
        if (!basicUserData.upid) {
          console.log('User has no role assigned, redirecting to setup');
          router.push('/setup');
          return;
        }
        
        // Check if account is suspended
        if (basicUserData.suspended) {
          router.push('/suspended');
          return;
        }
        
        // Fetch the userprofile info
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('userprofile')
            .select('upid, name, suspended')
            .eq('upid', basicUserData.upid)
            .single();
          
          if (profileError) {
            console.error('Error fetching user profile type:', profileError);
          } else {
            // Check profile suspension status
            if (profileData.suspended) {
              router.push('/suspended');
              return;
            }
          }
        } catch (profileErr) {
          console.error('Error in profile lookup:', profileErr);
          // Continue with what we have
        }
        
        // Route based on upid (user role)
        const userType = basicUserData.upid;
        
        if (userType === 1) {
          router.push('/publisherpage');
        } else if (userType === 2) {
          router.push('/parentpage');
        } else if (userType === 3) {
          // Child account flow - with time limit checks
          try {
            // Check time limit for child accounts
            const timeLimitCheck = await timeLimitCheckService.checkUserTimeLimit(basicUserData.id);
            
            // If time limit is exceeded, show time limit exceeded page
            if (timeLimitCheck.isExceeded && timeLimitCheck.timeLimit !== null) {
              console.log("Time limit exceeded, preventing login");
              setTimeLimitState({
                isExceeded: true,
                timeUsed: timeLimitCheck.timeUsed,
                timeLimit: timeLimitCheck.timeLimit,
                username: basicUserData.fullname || "there"
              });
              setLoading(false);
              return;
            }
            
            // Child account logic...
            const { data: childDetailsArray, error: childDetailsError } = await supabase
              .from('child_details')
              .select('favourite_genres')
              .eq('child_id', basicUserData.id);

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
              await syncFavoriteGenres(basicUserData.id.toString());
              router.push('/childpage');
            } else {
              if (!childDetailsArray || childDetailsArray.length === 0) {
                console.log("Creating new child_details record");
                const { error: insertError } = await supabase
                  .from('child_details')
                  .insert({
                    child_id: basicUserData.id,
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
        } else if (userType === 5) {
          router.push('/educatorpage');
        } else {
          console.log('Unknown user type:', userType);
          setError('Unknown user type. Please contact support.');
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during login');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during Google sign in');
    }
  };

  // Handle mascot clicks
  const handleMascotClick = () => {
    const newCount = mascotClicks + 1;
    if (newCount === 3) {
      setShowAdminDialog(true);
      setMascotClicks(0); // Reset counter
    } else {
      setMascotClicks(newCount);
    }
  };

  // Handle admin dialog response
  const handleAdminDialogResponse = (isAdmin: boolean) => {
    setShowAdminDialog(false);
    if (isAdmin) {
      router.push('/auth/adminlogin');
    }
  };

  // If time limit is exceeded, show the time limit exceeded page
  if (timeLimitState && timeLimitState.isExceeded) {
    return (
      <TimeLimitExceededPage
        timeUsed={timeLimitState.timeUsed}
        timeLimit={timeLimitState.timeLimit}
        username={timeLimitState.username}
        onBack={handleBackToLogin}
      />
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ ...backgroundStyle }}
    >
      {/* Admin Dialog - moved here to cover the whole screen */}
      {showAdminDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Are you the Admin or an Impostor?</h3>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => handleAdminDialogResponse(true)}
                className="px-4 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-800 transition-colors"
              >
                Admin
              </button>
              <button
                onClick={() => handleAdminDialogResponse(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Impostor
              </button>
            </div>
          </div>
        </div>
      )}

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
        <div className={`max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg relative ${formVisible ? 'animate-fly-in' : 'translate-y-full opacity-0'}`}>
          {/* Animated Mascot */}
          <div 
            className="absolute -top-20 left-1/2 -translate-x-1/2 cursor-pointer"
            onClick={handleMascotClick}
          >
            <Image
              src="/mascotnew.png"
              alt="Animated Mascot"
              width={100}
              height={100}
              className="animate-wiggle"
              unoptimized
            />
          </div>

          <div className="text-center mt-12">
            <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
            <p className="mt-2 text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className="text-purple-700 hover:text-purple-800 font-medium">
                Sign Up
              </Link>
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm">
              {showSignUpLink ? (
                <>
                  Invalid login credentials.{" "}
                  <Link href="/auth/signup" className="text-purple-700 hover:text-purple-800 font-medium">
                    Sign up now
                  </Link>
                  {" to create an account."}
                </>
              ) : (
                error
              )}
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-700 focus:border-transparent !text-black"
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-700 focus:border-transparent !text-black pr-10"
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
                        // Eye icon (for showing password)
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
                
                {/* Reset Password link - now shows as text below the input */}
                <div className="mt-1 text-right">
                  <Link
                    href="/auth/resetpassword"
                    className="text-sm text-purple-700 hover:text-purple-800 hover:underline font-medium"
                  >
                    Reset Password
                  </Link>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-700 hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-700 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform duration-200"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-700"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign in with Google
            </button>
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
          animation: wiggle 1s infinite ease-in-out;
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