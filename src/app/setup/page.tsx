'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/contexts/SessionContext';

// Define types for better type safety
type UserType = 'Parent' | 'Publisher' | 'Educator' | '';

interface UserData {
  user_id: string;
  username: string;
  fullname: string;
  age: number;
  upid: number;
  updated_at: string;
  created_at?: string;
}

const USER_TYPES: UserType[] = ['Parent', 'Publisher', 'Educator'];

export default function SetupPage() {
  const router = useRouter();
  const { refreshProfile } = useSession();
  const [name, setName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [userType, setUserType] = useState<UserType>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isSessionReady, setIsSessionReady] = useState<boolean>(false);

  // Check if session is available
  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Session error:', error);
        setError('Authentication session missing. Please verify your email and try again.');
        return;
      }
      if (data.session) {
        setIsSessionReady(true);
      } else {
        setError('Authentication session missing. Please verify your email and try again.');
      }
    };
    
    checkSession();
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
    setUserType(value as UserType);
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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Auth error:', userError);
        throw userError;
      }
      if (!user) throw new Error('No user found');

      // Determine upid based on selected role
      const upid = userType === 'Parent' ? 2 :
        userType === 'Publisher' ? 1 :
        userType === 'Educator' ? 5 : null;

      if (!upid) {
        throw new Error('Invalid user type');
      }

      const userData: UserData = {
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

      // Handle profile creation based on user type
      if (upid === 1) { // Publisher
        router.push('/publisherpage');
      } else if (upid === 2) { // Parent
        router.push('/parentpage');
      } else if (upid === 5) { // Educator
        router.push('/educatorpage');
      }

      await refreshProfile();
      
    } catch (err) {
      console.error('Submission error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        setError((err as { message: string }).message);
      } else {
        setError('An error occurred while saving your preferences');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle back button click
  const handleBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header with back button */}
      <header className="p-4 border-b bg-white shadow-md">
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
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Complete your profile</h2>
            <p className="mt-2 text-sm text-gray-600">
              Tell us a bit about yourself to get personalized recommendations
            </p>
          </div>

          {!isSessionReady ? (
            <div className="bg-yellow-50 text-yellow-700 p-4 rounded-lg text-center">
              <p>Verifying your session. If this message persists, please make sure you&apos;ve verified your email.</p>
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
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-700 hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Finish setup'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}