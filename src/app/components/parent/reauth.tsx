'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

export default function ParentReauth() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReauth = searchParams?.get('reauth') === 'true';
  const action = searchParams?.get('action');
  const childId = searchParams?.get('childId');

  
  
  const [parentEmail, setParentEmail] = useState('');
  const [parentPassword, setParentPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [parentSession, setParentSession] = useState<Session | null>(null);
  const [isSessionLoaded, setIsSessionLoaded] = useState(false);
  // State for different reauth actions
  interface ChildData {
    email: string;
    password: string;
    username: string;
    fullName: string;
    age: number;
    parentId: string;
    parentEmail?: string;
  }

  interface PasswordUpdateData {
    childUserId: string;
    newPassword: string;
  }

  // State for different reauth actions
  const [pendingChildData, setPendingChildData] = useState<ChildData | null>(null);
  
  const [pendingPasswordUpdate, setPendingPasswordUpdate] = useState<PasswordUpdateData | null>(null);

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
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setError('Authentication error. Please log in again.');
          router.push('/landing');
          return;
        }
        
        if (session) {
          setParentSession(session);
          console.log('Stored parent session for later restoration');
          
          // Get parent auth email from Supabase Auth
          if (session.user?.email) {
            console.log('Setting parent email from session:', session.user.email);
            setParentEmail(session.user.email);
          } else {
            console.error('No email found in session user');
          }
        } else {
          console.error('No active session found');
          setError('No active session. Please log in again.');
          router.push('/landing');
          return;
        }
        
        setIsSessionLoaded(true);
      } catch (err) {
        console.error('Error in getParentSession:', err);
        setError('Failed to get session. Please try again.');
      }
    };
    
    getParentSession();
  }, [router]);

  useEffect(() => {
    // Only run this after session is loaded
    if (!isSessionLoaded) return;
    
    // Debug: Log the current state
    console.log('ParentReauth effect running, isReauth:', isReauth, 'action:', action);
    console.log('Parent email state:', parentEmail);
    
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
    
    // Handle different reauth actions
    if (action === 'createChild') {
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
        // If parent email is not set from session, try from localStorage
        if (!parentEmail && childData.parentEmail) {
          console.log('Setting parent email from child data:', childData.parentEmail);
          setParentEmail(childData.parentEmail);
        }
      } catch (err) {
        console.error('Error accessing or parsing child data:', err);
        router.replace('/parentpage?error=Invalid child data');
      }
    } 
    else if (action === 'updateChildPassword') {
      try {
        const storedPasswordData = localStorage.getItem('childPasswordUpdate');
        console.log('Retrieved password update data:', storedPasswordData);
        
        if (!storedPasswordData) {
          console.error('No password update data in localStorage');
          router.replace('/parentpage?error=No password update data found');
          return;
        }

        const passwordData = JSON.parse(storedPasswordData);
        console.log('Parsed password update data:', passwordData);
        
        setPendingPasswordUpdate(passwordData);
        
        // If parent email is not set from session, try from localStorage
        if (!parentEmail && passwordData.parentEmail) {
          console.log('Setting parent email from password data:', passwordData.parentEmail);
          setParentEmail(passwordData.parentEmail);
        }
      } catch (err) {
        console.error('Error accessing or parsing password data:', err);
        router.replace('/parentpage?error=Invalid password update data');
      }
    }
    else {
      console.error('Unknown reauth action:', action);
      router.replace('/parentpage?error=Invalid reauth action');
    }
  }, [isSessionLoaded, router, isReauth, action, childId, parentEmail]);

  const handleCreateChildAccount = async () => {
    if (!pendingChildData) {
      setError('No pending child data found');
      return { success: false };
    }

    try {
      console.log('Creating child account');
      
      // 1. Create the child account in Supabase Auth
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

      // 2. Create the child profile in the user_account table
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

      // 3. Create parent-child relationship in the database
      await supabase.from('isparentof').insert({
        parent_id: pendingChildData.parentId,
        child_id: userAccountData.id,
        timeLimitMinute: 0,
      });

      console.log('Parent-child relationship established');

      // 4. Clear the pending data
      localStorage.removeItem('pendingChildData');
      console.log('pendingChildData cleared from localStorage');
      
      return { success: true };
    } catch (err) {
      console.error('Error in creating child account:', err);
      throw err;
    }
  };

  const handleUpdateChildPassword = async () => {
    if (!pendingPasswordUpdate) {
      setError('No password update data found');
      return { success: false };
    }

    try {
      console.log('Updating child password');
      
      // Use direct fetch call with admin API headers
      const response = await fetch('/api/update-child-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          childUserId: pendingPasswordUpdate.childUserId,
          newPassword: pendingPasswordUpdate.newPassword,
          authenticated: true, // Flag to indicate this is from reauth flow
        }),
      });
      
      // Log response for debugging
      console.log('Password update response status:', response.status);
      
      // Check for non-OK response
      if (!response.ok) {
        // Try to parse JSON response
        let errorMessage = 'Error updating password';
        try {
          const result = await response.json();
          errorMessage = result.error || errorMessage;
        } catch {
          // If can't parse JSON, use text response
          errorMessage = await response.text();
        }
        throw new Error(errorMessage);
      }
      
      console.log('Password updated successfully');
      
      // Clear the pending data
      localStorage.removeItem('childPasswordUpdate');
      
      return { success: true };
    } catch (err) {
      console.error('Error in updating child password:', err);
      throw err;
    }
  };

  const handleParentReauth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      console.log('Starting parent reauthentication process');
      console.log('Using parent email:', parentEmail);
      
      if (!parentEmail) {
        throw new Error('Email is missing. Please refresh the page and try again.');
      }
      
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

      // 2. Handle different reauth actions
      if (action === 'createChild') {
        await handleCreateChildAccount();
      } 
      else if (action === 'updateChildPassword') {
        await handleUpdateChildPassword();
      }
      
      // Make sure parent is signed in with their credentials
      await supabase.auth.signInWithPassword({
        email: parentEmail,
        password: parentPassword,
      });
      
      console.log('Parent signed back in');

      // 3. Redirect to parent dashboard with success message
      setTimeout(() => {
        let successMessage = '';
        if (action === 'createChild') {
          successMessage = 'Child account successfully created!';
        } else if (action === 'updateChildPassword') {
          successMessage = 'Child password successfully updated!';
        }
        
        // Use a slight delay to ensure auth state is updated
        router.replace(`/parentpage?success=${successMessage}`);
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
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    // Remove the pending data based on action
    console.log('Cancelling process');
    
    if (action === 'createChild') {
      localStorage.removeItem('pendingChildData');
    } else if (action === 'updateChildPassword') {
      localStorage.removeItem('childPasswordUpdate');
    }
    
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

  // Determine the title and description based on the action
  const getPageTitle = () => {
    if (action === 'createChild') {
      return 'Confirm Child Account Creation';
    } else if (action === 'updateChildPassword') {
      return 'Confirm Password Update';
    }
    return 'Confirm Parent Account';
  };

  const getPageDescription = () => {
    if (action === 'createChild') {
      return 'Please re-enter your password to complete the child account creation.';
    } else if (action === 'updateChildPassword') {
      return 'Please re-enter your password to update your child\'s password.';
    }
    return 'Please re-enter your password to continue.';
  };

  // For debugging - show form state
  const debugInfo = () => {
    if (process.env.NODE_ENV !== 'production') {
      return (
        <div className="text-xs text-gray-500 mt-4 p-2 bg-gray-100 rounded">
          <p>Debug - Parent Email: {parentEmail || 'not set'}</p>
          <p>Action: {action || 'not set'}</p>
          <p>Session Loaded: {isSessionLoaded ? 'Yes' : 'No'}</p>
        </div>
      );
    }
    return null;
  };

  if (!isSessionLoaded) {
    return <div className="flex items-center justify-center h-screen">Loading session data...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 py-10 px-6 shadow-xl overflow-hidden flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-md p-8 max-w-md w-full mx-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          {getPageTitle()}
        </h1>
        <p className="text-gray-600 mb-6 text-center">
          {getPageDescription()}
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
              onChange={(e) => setParentEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700"
              placeholder="Enter your email"
              required
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

          <div className="space-y-4">
            {action === 'createChild' && (
              <div className="p-4 rounded-lg bg-red-50 text-red-600 text-sm">
                <p className="font-medium">Important:</p>
                <p>After clicking confirm, a verification email will be sent to your child&apos;s email address. 
                Please make sure they check their inbox and verify their account.</p>
              </div>
            )}
            
            <div className="flex space-x-4">
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
          </div>
        </form>
        
        {debugInfo()}
      </div>
    </div>
  );
}