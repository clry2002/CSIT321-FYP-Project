'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function EditChildProfile() {
  const router = useRouter();
  const [childData, setChildData] = useState<{
    fullname: string;
    username: string;
    age: number;
    favourite_genres: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChildData();
  }, []);

  const fetchChildData = async () => {
    try {
      // Get the current logged-in user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user found');

      // Get the child's user account data
      const { data: userData, error: userDataError } = await supabase
        .from('user_account')
        .select('fullname, username, age')
        .eq('user_id', user.id)
        .single();

      if (userDataError) throw userDataError;

      // Get the child's profile data including favourite genres
      const { data: profileData, error: profileError } = await supabase
        .from('child_profile')
        .select('favourite_genres')
        .eq('child_id', user.id)
        .single();

      if (profileError) throw profileError;

      // Combine the data
      setChildData({
        fullname: userData.fullname,
        username: userData.username,
        age: userData.age,
        favourite_genres: profileData.favourite_genres || []
      });
    } catch (err) {
      console.error('Error fetching child data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching profile data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <div className="flex-1 overflow-y-auto pt-16">
        <div className="px-6 py-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h2>
          <div className="max-w-2xl">
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <div className="mt-1 text-lg text-gray-900">{childData?.fullname}</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Username</label>
                    <div className="mt-1 text-lg text-gray-900">{childData?.username}</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Age</label>
                    <div className="mt-1 text-lg text-gray-900">{childData?.age}</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Favorite Genres</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {childData?.favourite_genres.map((genre, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-rose-100 text-rose-800"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Link
                  href="/parentpage"
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Back
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
