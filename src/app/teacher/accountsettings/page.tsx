'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function TeacherAccountSettings() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      //const { data, error } = await supabase.auth.updateUser({
      const { error } = await supabase.auth.updateUser({
        email: email
      });

      if (error) throw error;

      setSuccess(true);
      setEmail('');
    } catch (err) {
      console.error('Error updating email:', err);
      setError(err instanceof Error ? err.message : 'Error updating email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-6 text-black">Account Settings</h1>
          
          <form onSubmit={handleEmailChange} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Change Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-black placeholder-black/60"
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

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Email'}
              </button>

              <button
                type="button"
                onClick={() => router.push('/teacher/settings')}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Back to Settings
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
