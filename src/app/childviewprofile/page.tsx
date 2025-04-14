// child / viewprofile.tsx
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

export default function ChildViewProfile() {
  const router = useRouter();
  const { userProfile, refreshProfile } = useSession();
  const [profileData, setProfileData] = useState<{
    full_name: string;
    age: number;
    favourite_genres: string[];
    blocked_genres: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [selectedFavouriteGenres, setSelectedFavouriteGenres] = useState<string[]>([]);
  const [selectedBlockedGenres, setSelectedBlockedGenres] = useState<string[]>([]);
  const [showFavouriteGenreSelector, setShowFavouriteGenreSelector] = useState(false);
  const [showBlockedGenreSelector, setShowBlockedGenreSelector] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const initializeProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check if user is authenticated
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw new Error('Authentication error. Please try logging in again.');
        }

        if (!session) {
          console.log('No active session, redirecting to login');
          router.push('/auth/login');
          return;
        }

        // Get the current user's ID
        const userId = session.user.id;
        console.log('User ID:', userId);

        // Set up real-time subscription for child_details changes
        const subscription = supabase
          .channel('child_details_changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'child_details'
            },
            (payload) => {
              console.log('Real-time update received:', payload);
              initializeProfile();
            }
          )
          .subscribe();

        // Get the user's account data
        const { data: userData, error: userError } = await supabase
          .from('user_account')
          .select('id, fullname, age')
          .eq('user_id', userId)
          .single();

        if (userError) {
          console.error('User account error:', userError);
          throw new Error('Failed to load user account information');
        }

        if (!userData) {
          throw new Error('User account not found');
        }

        // Add mutex to prevent concurrent updates
        const mutexKey = `child_update_${userData.id}`;
        if (localStorage.getItem(mutexKey)) {
          console.log('Another update in progress, waiting...');
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        localStorage.setItem(mutexKey, 'true');

        try {
          console.log('User data:', userData);

          // Get the child's profile data including favourite and blocked genres
          const { data: profileData, error: profileError } = await supabase
            .from('child_details')
            .select('favourite_genres, blocked_genres')
            .eq('child_id', userData.id)
            .single();

          if (profileError) {
            console.error('Child details error:', profileError);
            throw new Error('Failed to load child profile information');
          }

          console.log('Profile data:', profileData);

          // Set the profile data with existing values
          setProfileData({
            full_name: userData.fullname,
            age: userData.age,
            favourite_genres: profileData?.favourite_genres || [],
            blocked_genres: profileData?.blocked_genres || []
          });

          // Set selected genres
          setSelectedFavouriteGenres(profileData?.favourite_genres || []);
          setSelectedBlockedGenres(profileData?.blocked_genres || []);

          // Get available genres
          const { data: genres, error: genresError } = await supabase
            .from('temp_genre')
            .select('genrename');

          if (genresError) {
            console.error('Genres error:', genresError);
            throw new Error('Failed to load available genres');
          }

          setAvailableGenres(genres?.map(g => g.genrename) || []);
        } finally {
          localStorage.removeItem(mutexKey);
        }

        return () => {
          subscription.unsubscribe();
        };

      } catch (err) {
        console.error('Error in initializeProfile:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while loading your profile');
      } finally {
        setLoading(false);
      }
    };

    initializeProfile();
  }, [router]);

  const handleSave = async () => {
    const mutexKey = `child_update_${userProfile?.id}`;
    let mutexAcquired = false;
    
    try {
      setLoading(true);
      setSaveMessage(null);

      if (!profileData) return;

      // Try to acquire mutex with timeout
      let attempts = 0;
      while (!mutexAcquired && attempts < 5) {
        if (!localStorage.getItem(mutexKey)) {
          localStorage.setItem(mutexKey, Date.now().toString());
          mutexAcquired = true;
        } else {
          // Check if the mutex is stale (older than 10 seconds)
          const mutexTime = parseInt(localStorage.getItem(mutexKey) || '0');
          if (Date.now() - mutexTime > 10000) {
            localStorage.setItem(mutexKey, Date.now().toString());
            mutexAcquired = true;
          } else {
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
          }
        }
      }

      if (!mutexAcquired) {
        throw new Error('Unable to save changes - another update is in progress. Please try again.');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const userId = session.user.id;

      // Get latest data before updating
      const { data: latestData, error: latestDataError } = await supabase
        .from('child_details')
        .select('favourite_genres, blocked_genres')
        .eq('child_id', userProfile?.id)
        .single();

      if (latestDataError) throw latestDataError;

      // Check for concurrent modifications
      if (JSON.stringify(latestData?.favourite_genres) !== JSON.stringify(profileData.favourite_genres) ||
          JSON.stringify(latestData?.blocked_genres) !== JSON.stringify(profileData.blocked_genres)) {
        throw new Error('Profile was modified elsewhere. Please refresh and try again.');
      }

      // Update user_account table
      const { error: userError } = await supabase
        .from('user_account')
        .update({
          fullname: profileData.full_name,
          age: profileData.age
        })
        .eq('user_id', userId);

      if (userError) throw userError;

      // Get the user_account.id
      const { data: userData, error: userDataError } = await supabase
        .from('user_account')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (userDataError || !userData) throw new Error('Failed to retrieve user account');

      // Update child_details table
      const { error: profileError } = await supabase
        .from('child_details')
        .update({
          favourite_genres: selectedFavouriteGenres,
          blocked_genres: selectedBlockedGenres
        })
        .eq('child_id', userData.id);

      if (profileError) throw profileError;

      setSaveMessage({ type: 'success', text: 'Profile updated successfully!' });
      setHasChanges(false);
      setEditingField(null);
      setShowFavouriteGenreSelector(false);
      setShowBlockedGenreSelector(false);

      // Refresh the profile data after successful update
      const { data: refreshedData, error: refreshError } = await supabase
        .from('child_details')
        .select('favourite_genres, blocked_genres')
        .eq('child_id', userData.id)
        .single();

      if (!refreshError && refreshedData) {
        setProfileData(prev => ({
          ...prev!,
          favourite_genres: refreshedData.favourite_genres || [],
          blocked_genres: refreshedData.blocked_genres || []
        }));
      }

    } catch (err) {
      console.error('Error saving profile:', err);
      setSaveMessage({ 
        type: 'error', 
        text: err instanceof Error ? err.message : 'An error occurred while saving your profile'
      });
    } finally {
      if (mutexAcquired) {
        localStorage.removeItem(mutexKey);
      }
      setLoading(false);
    }
  };

  const handleFavouriteGenreClick = () => {
    setShowFavouriteGenreSelector(!showFavouriteGenreSelector);
  };

  const handleBlockedGenreClick = () => {
    setShowBlockedGenreSelector(!showBlockedGenreSelector);
  };

  const handleFavouriteGenreToggle = (genre: string) => {
    setSelectedFavouriteGenres(prev => {
      if (prev.includes(genre)) {
        return prev.filter(g => g !== genre);
      } else if (prev.length < 3) {
        return [...prev, genre];
      }
      return prev;
    });
    setHasChanges(true);
  };

  const handleBlockedGenreToggle = (genre: string) => {
    setSelectedBlockedGenres(prev => {
      if (prev.includes(genre)) {
        return prev.filter(g => g !== genre);
      } else {
        return [...prev, genre];
      }
    });
    setHasChanges(true);
  };

  const handleFieldChange = (field: string, value: string | number) => {
    setProfileData(prev => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
    setHasChanges(true);
  };

  const handleFieldClick = (field: string) => {
    setEditingField(field);
  };

  const handleFieldBlur = () => {
    setEditingField(null);
  };

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="flex h-screen bg-white overflow-hidden">
          <Navbar />
          <div className="flex-1 overflow-y-auto pt-16">
            <div className="flex items-center justify-center h-full">
              <div className="text-lg">Loading your profile...</div>
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
              <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
            </div>

            {saveMessage && (
              <div className={`mb-4 p-4 rounded-lg ${
                saveMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {saveMessage.text}
              </div>
            )}

            <div className="max-w-2xl">
              <div className="space-y-6">
                <div className="bg-white p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Full Name</label>
                      {editingField === 'full_name' ? (
                        <input
                          type="text"
                          value={profileData?.full_name || ''}
                          onChange={(e) => handleFieldChange('full_name', e.target.value)}
                          onBlur={handleFieldBlur}
                          autoFocus
                          className="mt-1 block w-full text-lg text-gray-900 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      ) : (
                        <div 
                          onClick={() => handleFieldClick('full_name')}
                          className="mt-1 text-lg text-gray-900 cursor-pointer hover:bg-gray-50 p-2 rounded"
                        >
                          {profileData?.full_name}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Age</label>
                      {editingField === 'age' ? (
                        <input
                          type="number"
                          value={profileData?.age || ''}
                          onChange={(e) => handleFieldChange('age', parseInt(e.target.value))}
                          onBlur={handleFieldBlur}
                          autoFocus
                          className="mt-1 block w-full text-lg text-gray-900 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      ) : (
                        <div 
                          onClick={() => handleFieldClick('age')}
                          className="mt-1 text-lg text-gray-900 cursor-pointer hover:bg-gray-50 p-2 rounded"
                        >
                          {profileData?.age}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Favorite Genres</label>
                      <div className="mt-2">
                        {!showFavouriteGenreSelector ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedFavouriteGenres.length === 0 ? (
                              <button
                                onClick={handleFavouriteGenreClick}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 cursor-pointer hover:bg-gray-200"
                              >
                                Add
                              </button>
                            ) : (
                              selectedFavouriteGenres.map((genre) => (
                                <button
                                  key={genre}
                                  onClick={handleFavouriteGenreClick}
                                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-rose-100 text-rose-800 cursor-pointer hover:bg-rose-200"
                                >
                                  {genre}
                                </button>
                              ))
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {availableGenres.map((genre) => (
                              <button
                                key={genre}
                                onClick={() => handleFavouriteGenreToggle(genre)}
                                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                  selectedFavouriteGenres.includes(genre)
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-gray-100 text-gray-800'
                                } cursor-pointer hover:bg-rose-200`}
                              >
                                {genre}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Blocked Genres</label>
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-2">
                          {profileData?.blocked_genres && profileData.blocked_genres.length > 0 ? (
                            profileData.blocked_genres.map((genre) => (
                              <div
                                key={genre}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800"
                              >
                                {genre}
                              </div>
                            ))
                          ) : (
                            <div className="text-gray-500">No blocked genres</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {hasChanges && (
                      <div className="mt-30 flex justify-end">
                        <button
                          onClick={handleSave}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          Save Changes
                        </button>
                      </div>
                    )}
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
