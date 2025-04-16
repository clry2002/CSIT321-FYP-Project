'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/contexts/SessionContext';

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

export default function ProfilePage() {
  // const { userAccount, userProfile, refreshProfile } = useSession();
  const { userAccount, userProfile } = useSession();
  const [profileData, setProfileData] = useState<{
    full_name: string;
    username: string;
    age: number;
    favourite_genres: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userAccount){ // only attempt to fetch if userAccount exists
      fetchProfileData();
    } else {
      setLoading(false);
      setError("You must logged in to view this page");
    }
  }, [userAccount, userProfile]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      
      if (!userAccount) {
        throw new Error('No user account found');
      }

      // Retrieve user account data
      const { data: userData, error: userError } = await supabase
        .from('user_account')
        .select('fullname, username, age')
        .eq('user_id', userAccount.user_id)
        .single();

      if (userError) throw userError;

      // Retrieve child profile data including favourite genres
      const { data: profileData, error: profileError } = await supabase
        .from('child_profile')
        .select('favourite_genres')
        .eq('child_id', userAccount.user_id)
        .single();

      if (profileError) throw profileError;

      // Combine the data
      setProfileData({
        full_name: userData.fullname,
        username: userData.username,
        age: userData.age,
        favourite_genres: profileData.favourite_genres || []
      });
    } catch (err) {
      console.error('Error fetching profile data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching profile data');
    } finally {
      setLoading(false);
    }
  };
  
  if (!userAccount && !loading) {
  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-white overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-y-auto pt-16">
          <div className="px-6 py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h2>
            <div className="max-w-2xl">
              <div className="space-y-6">
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Full Name</label>
                      <div className="mt-1 text-lg text-gray-900">{profileData?.full_name}</div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Username</label>
                      <div className="mt-1 text-lg text-gray-900">{profileData?.username}</div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Age</label>
                      <div className="mt-1 text-lg text-gray-900">{profileData?.age}</div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Favorite Genres</label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {profileData?.favourite_genres.map((genre, index) => (
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
                    href="/settings"
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
    </ErrorBoundary>
  );
}
}

