'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function TeacherAccountSettings() {
  const router = useRouter();
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
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
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) {
          router.push('/auth/login');
          return;
        }
        setCurrentEmail(session.user.email || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred while loading your account');
      } finally {
        setLoading(false);
      }
    };
    initializeAccount();
  }, [router]);

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });
      if (error) throw error;
      setSuccess(true);
      setNewEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating email');
    } finally {
      setLoading(false);
    }
  };

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
      setPasswordMessage({ 
        type: 'error', 
        text: err instanceof Error ? err.message : 'An error occurred while changing your password'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center">
        <div className="text-black">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 py-10 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
              Account Settings
            </h1>
            <p className="mt-1 text-md text-gray-500">Manage your account security and preferences.</p>
          </div>
          <button
            onClick={() => router.push('/teacher/settings')}
            className="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-md font-semibold text-sm hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-opacity-50 transition-colors"
          >
            Back to Settings
          </button>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="space-y-8">
            {/* Email Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Email Address</h2>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-gray-600">Current email: <span className="font-medium text-gray-900">{currentEmail}</span></p>
              </div>
              <form onSubmit={handleEmailChange} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    New Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-black"
                    placeholder="Enter new email address"
                    required
                  />
                </div>
                {error && (
                  <div className="text-red-500 text-sm">{error}</div>
                )}
                {success && (
                  <div className="text-green-500 text-sm">
                    Email updated successfully!
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md font-semibold text-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Email'}
                </button>
              </form>
            </div>
            {/* Password Section */}
            <div className="pt-6 border-t border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Change Password</h2>
              {passwordMessage && (
                <div className={`mb-4 p-4 rounded-lg ${passwordMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {passwordMessage.text}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Password</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">New Password</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-black"
                  />
                </div>
                <button
                  onClick={handlePasswordChange}
                  className="w-full inline-flex justify-center items-center px-4 py-2 bg-indigo-600 text-white rounded-md font-semibold text-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-colors"
                >
                  Update Password
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
