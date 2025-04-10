'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function TeacherViewProfile() {
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

      // Fetch educator profile
      const { data, error: profileError } = await supabase
        .from('user_account')
        .select('fullname, username, age')
        .eq('user_id', user.id)
        .eq('upid', 5) // upid for educator
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
        .eq('upid', 5); // upid for educator

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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-black">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-6 text-black">My Profile</h1>
          
          {saveMessage && (
            <div className={`mb-4 p-4 rounded-lg ${
              saveMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {saveMessage.text}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              {editingField === 'fullname' ? (
                <input
                  type="text"
                  value={profile?.fullname || ''}
                  onChange={(e) => handleFieldChange('fullname', e.target.value)}
                  onBlur={handleFieldBlur}
                  autoFocus
                  className="mt-1 block w-full text-lg text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              ) : (
                <div 
                  onClick={() => handleFieldClick('fullname')}
                  className="mt-1 text-lg text-black cursor-pointer hover:bg-gray-50 p-2 rounded"
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
                  className="mt-1 block w-full text-lg text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              ) : (
                <div 
                  onClick={() => handleFieldClick('username')}
                  className="mt-1 text-lg text-black cursor-pointer hover:bg-gray-50 p-2 rounded"
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
                  className="mt-1 block w-full text-lg text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              ) : (
                <div 
                  onClick={() => handleFieldClick('age')}
                  className="mt-1 text-lg text-black cursor-pointer hover:bg-gray-50 p-2 rounded"
                >
                  {profile?.age || 'Not set'}
                </div>
              )}
            </div>
          </div>

          {hasChanges && (
            <div className="mt-6">
              <button
                onClick={handleSave}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Save Changes
              </button>
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={() => router.push('/teacher/settings')}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              Back to Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
