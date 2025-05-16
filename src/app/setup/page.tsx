'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/contexts/SessionContext';

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

const USER_TYPES = ['Parent', 'Publisher', 'Educator'];

export default function SetupPage() {
  const router = useRouter();
  const { refreshProfile } = useSession();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [userType, setUserType] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [authVerified, setAuthVerified] = useState(false);
  const [verificationChecking, setVerificationChecking] = useState(true);
  const [, setUserEmail] = useState('');
  const [stars, setStars] = useState<Star[]>([]);
  const [formVisible, setFormVisible] = useState(false);

  const backgroundStyle: StyleObject = {
    backgroundImage: 'url("/spacemovement.gif")',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
  };

  useEffect(() => {
    // Create stars for background
    const newStars = Array.from({ length: 70 }).map(() => ({
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 6 + 3,
      delay: Math.random() * 5,
    }));
    setStars(newStars);

    // Trigger the fly-in animation after a short delay
    setTimeout(() => {
      setFormVisible(true);
    }, 100);

    // Check authentication status
    const checkAuth = async () => {
      try {
        setVerificationChecking(true);
        
        // First try to get user from auth state
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('Auth error checking user:', userError);
          throw userError;
        }
        
        if (user) {
          console.log('User authenticated:', user.id);
          setAuthVerified(true);
          setUserEmail(user.email || '');
        } else {
          console.log('No user found in auth state, trying to refresh session...');
          
          // Try to refresh the session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('Session error:', sessionError);
            throw sessionError;
          }
          
          if (session) {
            console.log('Session found after refresh:', session.user.id);
            setAuthVerified(true);
            setUserEmail(session.user.email || '');
          } else {
            console.log('No session found after refresh');
            setAuthVerified(false);
          }
        }
      } catch (err) {
        console.error('Auth verification error:', err);
        setAuthVerified(false);
      } finally {
        setVerificationChecking(false);
      }
    };
    
    checkAuth();
  }, []);

  const checkUsername = async (username: string) => {
    if (!username) {
      setUsernameAvailable(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_account')
        .select('username')
        .eq('username', username);

      if (error) {
        console.error('Error checking username:', error);
        return;
      }

      // If no data or empty array returned, username is available
      setUsernameAvailable(!data || data.length === 0);
    } catch (error) {
      console.error('Error checking username:', error);
    }
  };

  const handleUsernameChange = (value: string) => {
    const sanitizedUsername = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(sanitizedUsername);
    checkUsername(sanitizedUsername);
  };

  const handleUserTypeChange = (value: string) => {
    setUserType(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userType) {
      setError('Please select your role');
      return;
    }
    if (!usernameAvailable) {
      setError('Please choose a different username');
      return;
    }
    if (parseInt(age) < 18) {
      setError('You must be at least 18 years old to complete setup');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      // Try to get the current user again to ensure we have the latest session
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Auth error before profile creation:', userError);
        throw userError;
      }
      
      if (!user) {
        throw new Error('Authentication required. Please verify your email and try again.');
      }

      // Determine upid based on selected role
      const upid = userType === 'Parent' ? 2 :
        userType === 'Publisher' ? 1 :
        userType === 'Educator' ? 5 : null;

      if (!upid) {
        throw new Error('Invalid user type');
      }

      const userData = {
        user_id: user.id,
        username,
        fullname: name,
        age: parseInt(age),
        upid,
        updated_at: new Date().toISOString()
      };

      console.log('Saving user data:', userData);

      // First, check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('user_account')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing user:', checkError);
        throw checkError;
      }

      let error;
      if (existingUser) {
        // If user exists, update their profile
        const { error: updateError } = await supabase
          .from('user_account')
          .update(userData)
          .eq('user_id', user.id);
        error = updateError;
      } else {
        // If user doesn't exist, create new profile
        const { error: insertError } = await supabase
          .from('user_account')
          .insert({
            ...userData,
            created_at: new Date().toISOString()
          });
        error = insertError;
      }

      if (error) {
        console.error('Database operation error:', error);
        throw error;
      }

      await refreshProfile();
      
      // Handle profile creation based on user type
      if (upid === 1) { // Publisher
        router.push('/publisherpage');
      } else if (upid === 2) { // Parent
        router.push('/parentpage');
      } else if (upid === 5) { // Educator
        router.push('/educatorpage');
      }
      
    } catch (err) {
      console.error('Submission error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        setError(err.message as string);
      } else {
        setError('An error occurred while saving your preferences');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle manual session refresh
  const handleRefreshSession = async () => {
    try {
      setVerificationChecking(true);
      setError(null);
      
      // Force a fresh session lookup
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Session refresh error:', error);
        setError('Could not refresh session: ' + error.message);
        return;
      }
      
      if (data.session) {
        console.log('Session refreshed successfully');
        setAuthVerified(true);
        setUserEmail(data.session.user.email || '');
      } else {
        console.log('No session found after manual refresh');
        setError('No valid session found. Please verify your email first.');
      }
    } catch (err) {
      console.error('Manual refresh error:', err);
      setError('An error occurred during session refresh');
    } finally {
      setVerificationChecking(false);
    }
  };

  // Handle back button click
  const handleBack = () => {
    router.back();
  };

  // Handle resending verification email
  const handleResendVerification = async () => {
    try {
      const email = prompt('Please enter your email address to resend verification:');
      if (!email) return;
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/login`
        }
      });
      
      if (error) {
        alert(`Error: ${error.message}`);
      } else {
        alert(`Verification email resent to ${email}. Please check your inbox.`);
      }
    } catch (err) {
      console.error('Failed to resend verification:', err);
      alert('Failed to resend verification email');
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

      {/* Header with back button */}
      <header className="p-4 border-b bg-white shadow-md relative z-10">
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
            <h1 className="text-2xl font-bold text-purple-700">CoReadability</h1>
          </div>
          <button
            onClick={handleBack}
            className="text-sm text-gray-600 hover:text-gray-800 font-medium flex items-center"
            type="button"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 mr-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className={`max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg ${formVisible ? 'animate-fly-in' : 'translate-y-full opacity-0'}`}>
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Complete your profile</h2>
            <p className="mt-2 text-sm text-gray-600">
              Tell us a bit about yourself to get personalized recommendations
            </p>
          </div>

          {verificationChecking ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700 mx-auto mb-4"></div>
              <p className="text-gray-600">Checking authentication status...</p>
            </div>
          ) : !authVerified ? (
            <div className="bg-yellow-50 p-6 rounded-lg text-center">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">Email Verification Required</h3>
              <p className="text-yellow-700 mb-6">
                Please verify your email before completing your profile. Check your inbox for a verification link.
              </p>
              
              <div className="space-y-4">
                <button
                  onClick={handleRefreshSession}
                  className="w-full py-2 px-4 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors"
                  type="button"
                >
                  I&apos;ve Verified My Email (Click to Refresh)
                </button>
                
                <button
                  onClick={handleResendVerification}
                  className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                  type="button"
                >
                  Resend Verification Email
                </button>
                
                <button
                  onClick={() => router.push('/landing')}
                  className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                  type="button"
                >
                  Return to Home Page
                </button>
              </div>
            </div>
          ) : (
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent !text-black"
                  />
                </div>

                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                    Username
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:border-transparent !text-black ${
                        username && (
                          usernameAvailable
                            ? 'border-green-500 focus:ring-green-500'
                            : 'border-red-500 focus:ring-red-500'
                        )
                      }`}
                      pattern="[a-z0-9_]+"
                      title="Username can only contain lowercase letters, numbers, and underscores"
                    />
                    {username && (
                      <div className={`mt-1 text-sm ${usernameAvailable ? 'text-green-600' : 'text-red-600'}`}>
                        {usernameAvailable ? 'Username is available' : 'Username is taken'}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="age" className="block text-sm font-medium text-gray-700">
                    Age
                  </label>
                  <input
                    id="age"
                    type="number"
                    required
                    min="1"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent !text-black"
                  />
                </div>

                <div>
                  <label htmlFor="userType" className="block text-sm font-medium text-gray-700">
                    I am a:
                  </label>
                  <select
                    id="userType"
                    value={userType}
                    onChange={(e) => handleUserTypeChange(e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent !text-black"
                  >
                    <option value="">Select your role</option>
                    {USER_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !usernameAvailable}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-700 hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform duration-200"
              >
                {loading ? 'Saving...' : 'Finish Setup'}
              </button>
            </form>
          )}
        </div>
      </div>

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
