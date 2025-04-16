'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/contexts/SessionContext';
import { useRouter } from 'next/navigation';

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
  // const { userProfile, refreshProfile } = useSession();
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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

      } catch (err) {
        console.error('Error loading account:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while loading your account');
      } finally {
        setLoading(false);
      }
    };

    initializeAccount();
  }, [router]);

  const handlePasswordChange = async () => {
    try {
      setPasswordMessage(null);
      
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      setPasswordMessage({ type: 'success', text: 'Password updated successfully!' });
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      console.error('Error changing password:', err);
      setPasswordMessage({ 
        type: 'error', 
        text: err instanceof Error ? err.message : 'An error occurred while changing your password'
      });
    }
  };

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="flex h-screen bg-white overflow-hidden">
          <Navbar />
          <div className="flex-1 overflow-y-auto pt-16">
            <div className="flex items-center justify-center h-full">
              <div className="text-lg">Loading your account settings...</div>
            </div>
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
          <div className="flex-1 overflow-y-auto pt-16">
            <div className="flex items-center justify-center h-full">
              <div className="text-red-500">{error}</div>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-white overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-y-auto pt-16">
          <div className="px-6 py-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Account Settings</h2>
            </div>

            <div className="max-w-2xl">
              <div className="space-y-6">
                <div className="bg-white p-6">
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

                    <div className="pt-4">
                      <h4 className="text-md font-medium text-gray-900 mb-3">Change Password</h4>
                      
                      {passwordMessage && (
                        <div className={`mb-4 p-3 rounded-lg text-sm ${
                          passwordMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {passwordMessage.text}
                        </div>
                      )}
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Current Password</label>
                          <input
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 [&::-webkit-contacts-auto-fill-button]:hidden [&::-webkit-credentials-auto-fill-button]:hidden [&::-webkit-credentials-auto-fill-button]:bg-black [&::-webkit-contacts-auto-fill-button]:bg-black [&::-webkit-credentials-auto-fill-button]:text-black [&::-webkit-contacts-auto-fill-button]:text-black"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">New Password</label>
                          <input
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 [&::-webkit-contacts-auto-fill-button]:hidden [&::-webkit-credentials-auto-fill-button]:hidden [&::-webkit-credentials-auto-fill-button]:bg-black [&::-webkit-contacts-auto-fill-button]:bg-black [&::-webkit-credentials-auto-fill-button]:text-black [&::-webkit-contacts-auto-fill-button]:text-black"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                          <input
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 [&::-webkit-contacts-auto-fill-button]:hidden [&::-webkit-credentials-auto-fill-button]:hidden [&::-webkit-credentials-auto-fill-button]:bg-black [&::-webkit-contacts-auto-fill-button]:bg-black [&::-webkit-credentials-auto-fill-button]:text-black [&::-webkit-contacts-auto-fill-button]:text-black"
                          />
                        </div>
                        
                        <button
                          onClick={handlePasswordChange}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Update Password
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <Link
                href="/childsettings"
                className="text-blue-600 hover:text-blue-800"
              >
                ← Back to Settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
} 