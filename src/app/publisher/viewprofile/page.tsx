'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft } from 'lucide-react';

export default function PublisherViewProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<{
    fullname: string;
    username: string;
    age: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user found');

      // Fetch publisher profile
      const { data, error: profileError } = await supabase
        .from('user_account')
        .select('fullname, username, age')
        .eq('user_id', user.id)
        .eq('upid', 1) // upid for publisher
        .single();

      if (profileError) throw profileError;
      if (!data) throw new Error('Profile not found');

      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err instanceof Error ? err.message : 'Error fetching profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldClick = (field: string) => {
    setEditingField(field);
  };

  const handleFieldChange = (field: string, value: string | number) => {
    if (profile) {
      setProfile({ ...profile, [field]: value });
      setHasChanges(true);
    }
  };

  const handleFieldBlur = () => {
    setEditingField(null);
  };

  const handleSave = async () => {
    try {
      if (!profile) return;

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user found');

      const { error: updateError } = await supabase
        .from('user_account')
        .update({
          fullname: profile.fullname,
          username: profile.username,
          age: profile.age
        })
        .eq('user_id', user.id)
        .eq('upid', 1);

      if (updateError) throw updateError;

      setSaveMessage({ type: 'success', text: 'Profile updated successfully' });
      setHasChanges(false);
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error updating profile' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center">
        <div className="text-black">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 py-10 px-6 shadow-xl overflow-hidden">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
              My Profile
            </h1>
            <p className="mt-1 text-md text-gray-500">View and edit your profile information.</p>
          </div>
          <button
            onClick={() => router.push('/publisher/settings')}
            className="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-md font-semibold text-sm hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-opacity-50 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Settings
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          {saveMessage && (
            <div className={`mb-6 p-4 rounded-lg ${
              saveMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {saveMessage.text}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              {editingField === 'fullname' ? (
                <input
                  type="text"
                  value={profile?.fullname || ''}
                  onChange={(e) => handleFieldChange('fullname', e.target.value)}
                  onBlur={handleFieldBlur}
                  autoFocus
                  className="mt-2 block w-full text-lg text-black rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-colors duration-200 bg-white px-4 py-2 hover:border-indigo-300"
                />
              ) : (
                <div 
                  onClick={() => handleFieldClick('fullname')}
                  className="mt-2 text-lg text-black cursor-pointer hover:bg-gray-50 p-2 rounded border border-transparent hover:border-gray-200"
                >
                  {profile?.fullname || 'Not set'}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              {editingField === 'username' ? (
                <input
                  type="text"
                  value={profile?.username || ''}
                  onChange={(e) => handleFieldChange('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  onBlur={handleFieldBlur}
                  autoFocus
                  pattern="[a-z0-9_]+"
                  title="Username can only contain lowercase letters, numbers, and underscores."
                  className="mt-2 block w-full text-lg text-black rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-colors duration-200 bg-white px-4 py-2 hover:border-indigo-300"
                />
              ) : (
                <div 
                  onClick={() => handleFieldClick('username')}
                  className="mt-2 text-lg text-black cursor-pointer hover:bg-gray-50 p-2 rounded border border-transparent hover:border-gray-200"
                >
                  {profile?.username || 'Not set'}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Age</label>
              {editingField === 'age' ? (
                <input
                  type="number"
                  value={profile?.age || ''}
                  onChange={(e) => handleFieldChange('age', parseInt(e.target.value))}
                  onBlur={handleFieldBlur}
                  autoFocus
                  className="mt-2 block w-full text-lg text-black rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-colors duration-200 bg-white px-4 py-2 hover:border-indigo-300"
                />
              ) : (
                <div 
                  onClick={() => handleFieldClick('age')}
                  className="mt-2 text-lg text-black cursor-pointer hover:bg-gray-50 p-2 rounded border border-transparent hover:border-gray-200"
                >
                  {profile?.age || 'Not set'}
                </div>
              )}
            </div>
          </div>

          {hasChanges && (
            <div className="mt-8">
              <button
                onClick={handleSave}
                className="w-full inline-flex justify-center items-center px-4 py-3 bg-indigo-600 text-white rounded-md font-semibold text-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 