'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

export default function ParentReauth() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReauth = searchParams?.get('reauth') === 'true';
  
  const [parentEmail, setParentEmail] = useState('');
  const [parentPassword, setParentPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [parentSession, setParentSession] = useState<Session | null>(null);
  
  // New state to store the pending child account information
  const [pendingChildData, setPendingChildData] = useState<{
    parentId: string;
    username: string;
    email: string;
    password: string;
    fullName: string;
    age: number;
    parentEmail: string;
  } | null>(null);

  // Check if localStorage is available
  const isLocalStorageAvailable = () => {
    try {
      const testKey = '__test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    // Store parent session for later use
    const getParentSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setParentSession(session);
        console.log('Stored parent session for later restoration');
      }
    };
    
    getParentSession();
    
    // Debug: Log the current state
    console.log('ParentReauth mounted, isReauth:', isReauth);
    
    // Make sure we're in a reauth process
    if (!isReauth) {
      console.log('Not in reauth process');
      router.replace('/parentpage?error=Invalid authentication flow');
      return;
    }
    
    // Check if localStorage is available
    if (!isLocalStorageAvailable()) {
      console.error('localStorage is not available');
      setError('Your browser storage is not accessible. Please check your privacy settings.');
      return;
    }
    
    // Fetch the pending child account data from localStorage
    try {
      const storedChildData = localStorage.getItem('pendingChildData');
      console.log('Retrieved from localStorage:', storedChildData);
      
      if (!storedChildData) {
        console.error('No pendingChildData in localStorage');
        router.replace('/parentpage?error=No pending child data found');
        return;
      }

      const childData = JSON.parse(storedChildData);
      console.log('Parsed child data:', childData);
      
      setPendingChildData(childData);
      setParentEmail(childData.parentEmail || '');
    } catch (err) {
      console.error('Error accessing or parsing data:', err);
      router.replace('/parentpage?error=Invalid child data');
    }
  }, [router, isReauth]);

  const handleParentReauth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!pendingChildData) {
      setError('No pending child data found');
      setLoading(false);
      return;
    }

    try {
      console.log('Starting parent reauthentication process');
      
      // 1. First, reauthenticate the parent
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: parentEmail,
        password: parentPassword,
      });

      if (reauthError) {
        console.error('Reauthentication error:', reauthError);
        throw new Error('Incorrect password. Please try again.');
      }

      console.log('Parent successfully reauthenticated');

      // 2. Now create the child account in Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ 
        email: pendingChildData.email, 
        password: pendingChildData.password 
      });
      
      if (signUpError || !signUpData.user) {
        console.error('Sign up error:', signUpError);
        throw new Error('Failed to create child account.');
      }

      const childUser = signUpData.user;
      console.log('Child user created:', childUser.id);

      // 3. Create the child profile in the user_account table
      const { data: userAccountData, error: userAccountError } = await supabase
        .from('user_account')
        .insert({
          user_id: childUser.id,
          username: pendingChildData.username,
          fullname: pendingChildData.fullName,
          age: pendingChildData.age,
          upid: 3, // Child role
        })
        .select('*')
        .single();

      if (userAccountError || !userAccountData) {
        console.error('User account error:', userAccountError);
        throw new Error('Failed to create user account record.');
      }

      console.log('Child user account created:', userAccountData.id);

      // 4. Create parent-child relationship in the database
      await supabase.from('isparentof').insert({
        parent_id: pendingChildData.parentId,
        child_id: userAccountData.id,
        timeLimitMinute: 0,
      });

      console.log('Parent-child relationship established');

      // 5. Clear the pending data
      localStorage.removeItem('pendingChildData');
      console.log('pendingChildData cleared from localStorage');

      // Make sure parent is signed in with their credentials
      await supabase.auth.signInWithPassword({
        email: parentEmail,
        password: parentPassword,
      });
      
      console.log('Parent signed back in');

      // 6. Redirect to parent dashboard with success message
      setTimeout(() => {
        // Use a slight delay to ensure auth state is updated
        router.replace('/parentpage?success=Child account successfully created!');
      }, 300);
    } catch (err) {
      console.error('Error in parent reauth process:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during the process');
      
      // Handle authentication error - make sure to sign the parent back in
      try {
        if (parentSession) {
          // Sign the parent back in with their original session
          await supabase.auth.setSession({
            access_token: parentSession.access_token,
            refresh_token: parentSession.refresh_token,
          });
          console.log('Restored parent session after error');
        } else {
          // If we don't have the session object, try to sign in again
          if (parentEmail && parentPassword) {
            await supabase.auth.signInWithPassword({
              email: parentEmail,
              password: parentPassword,
            });
            console.log('Parent signed back in after error');
          }
        }
      } catch (authErr) {
        console.error('Failed to restore parent session:', authErr);
      }
      
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    // Simply remove the pending data and redirect back to parent dashboard
    console.log('Cancelling child account creation process');
    localStorage.removeItem('pendingChildData');
    
    // Ensure parent is still signed in before navigating
    try {
      if (parentSession) {
        // Ensure parent session is active
        await supabase.auth.setSession({
          access_token: parentSession.access_token,
          refresh_token: parentSession.refresh_token,
        });
        console.log('Restored parent session after cancel');
      }
    } catch (err) {
      console.error('Error restoring parent session on cancel:', err);
    }
    
    router.replace('/parentpage?canceled=true');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 py-10 px-6 shadow-xl overflow-hidden flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-md p-8 max-w-md w-full mx-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Confirm Parent Account
        </h1>
        <p className="text-gray-600 mb-6 text-center">
          Please re-enter your password to complete the child account creation.
        </p>

        <form onSubmit={handleParentReauth} className="space-y-6">
          {error && (
            <div className="p-4 rounded-lg bg-red-50 text-red-500">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="parentEmail" className="block text-sm font-medium text-gray-700 mb-1">
              Parent Email
            </label>
            <input
              id="parentEmail"
              type="email"
              value={parentEmail}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              aria-readonly="true"
            />
          </div>

          <div>
            <label htmlFor="parentPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Parent Password
            </label>
            <div className="relative">
              <input
                id="parentPassword"
                type={showPassword ? 'text' : 'password'}
                value={parentPassword}
                onChange={(e) => setParentPassword(e.target.value)}
                required
                placeholder="Enter your password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zM12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zM12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600"
            >
              {loading ? 'Verifying...' : 'Confirm Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}