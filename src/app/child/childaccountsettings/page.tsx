'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/app/components/Navbar';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [children]);

  return hasError ? (
    <div className="text-red-600 bg-red-50 p-4 rounded-lg">
      Oops! Something went wrong. Please try reloading the page.
    </div>
  ) : (
    <>{children}</>
  );
}

export default function AccountSettings() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountSettingsDisabled, setAccountSettingsDisabled] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [, setUserProfile] = useState<number | null>(null);

  useEffect(() => {
    const initializeAccount = async () => {
      try {
        setLoading(true);

        // Check if user is authenticated
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          router.push('/auth/login');
          return;
        }

        setEmail(session.user.email || '');

        // Get user profile type (upid)
        const { data: userData, error: userError } = await supabase
          .from('user_account')
          .select('upid')
          .eq('user_id', session.user.id) 
          .single();

        if (userError) {
          console.error('Error fetching user profile:', userError);
          throw userError;
        }

        setUserProfile(userData.upid);

        // Check if the child profile has the "disable_account_settings" permission
        if (userData.upid === 3) { 
          const { data: permissionData, error: permissionError } = await supabase
            .from('profile_permissions')
            .select('active')
            .eq('upid', 3)
            .eq('permission_key', 'disable_account_settings')
            .single();

          if (permissionError && permissionError.code !== 'PGRST116') { // PGRST116 is "not found" error
            console.error('Error fetching account settings permission:', permissionError);
          } else {
            // If the permission exists and is active, settings are disabled
            setAccountSettingsDisabled(permissionData?.active || false);
          }
        }

      } catch (err) {
        console.error('Error loading account:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while loading your account');
      } finally {
        setLoading(false);
      }
    };

    initializeAccount();
  }, [router]);

  const handleChangePassword = async () => {
    try {
      setSuccess(null);

      if (newPassword !== confirmPassword) {
        setError('New passwords do not match');
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Error changing password:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while changing your password');
    }
  };

  const handleBackToSettings = () => {
    router.push('/child/childsettings');
  };

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="flex h-screen bg-white overflow-hidden">
          <Navbar />
          <div className="flex-1 overflow-y-auto pt-16 flex flex-col items-center justify-start">
            <div className="text-lg">Loading your account settings...</div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (error) {
    return (
      <ErrorBoundary>
        <div className="flex h-screen bg-white overflow-hidden">
          <Navbar />
          <div className="flex-1 overflow-y-auto pt-16 flex flex-col items-center justify-start">
            <div className="text-red-500">{error}</div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div
        className="flex flex-col h-screen overflow-hidden bg-cover bg-no-repeat bg-center"
        style={{ backgroundImage: 'url("/stars.png")' }}
      >
        <Navbar />
        <div className="flex-1 overflow-y-auto pt-16 flex flex-col items-center justify-start">
          <div className="container mx-auto px-6 py-8">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white p-6 rounded-lg shadow">
                {/* Back button above the title */}
                <div className="mb-2">
                  <button
                    onClick={handleBackToSettings}
                    className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5 mr-1" />
                    <span>Back to Settings</span>
                  </button>
                </div>
                
                {/* Title centered */}
                <h2 className="text-3xl font-bold text-center text-yellow-400 mb-6">Account Settings</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <div className="mt-1 text-lg text-gray-900">
                      {email}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Contact support to change your email address
                    </p>
                  </div>

                  {accountSettingsDisabled ? (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-700 text-sm">
                        Account settings are currently disabled by an administrator. Please contact your parent or guardian for assistance with account changes.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {success && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-green-700 text-sm">{success}</p>
                        </div>
                      )}
                      {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-red-700 text-sm">{error}</p>
                        </div>
                      )}
                      <div>
                        <label htmlFor="current-password" className="block text-sm font-medium text-gray-700">
                          Current Password
                        </label>
                        <input
                          type="password"
                          id="current-password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-black"
                        />
                      </div>

                      <div>
                        <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                          New Password
                        </label>
                        <input
                          type="password"
                          id="new-password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-black"
                        />
                      </div>

                      <div>
                        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          id="confirm-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-black"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={handleChangePassword}
                          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Change Password
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}