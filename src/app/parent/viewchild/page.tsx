'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ViewChildBookmark from '../../components/parent/view_child_bookmark';
import { fetchBookmarkedContent, ContentWithGenres } from './fetchChildBookmark';

interface ChildProfile {
  favourite_genres: string[];
  blocked_genres: string[];
  classrooms: string[];
  books_bookmark?: ContentWithGenres[];
  videos_bookmark?: ContentWithGenres[];
}

export default function ViewChild() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [childProfile, setChildProfile] = useState<ChildProfile | null>(null);
  const [childName, setChildName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [showFavoriteGenreModal, setShowFavoriteGenreModal] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedFavoriteGenres, setSelectedFavoriteGenres] = useState<string[]>([]);
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [accountId, setAccountId] = useState<string>('');
  const [bookmarkedBooks, setBookmarkedBooks] = useState<ContentWithGenres[]>([]);
  const [bookmarkedVideos, setBookmarkedVideos] = useState<ContentWithGenres[]>([]);

  useEffect(() => {
    const childId = searchParams.get('childId');
    if (childId) {
      fetchChildData(childId);
      fetchAvailableGenres();

      // Set up real-time subscription for child_details changes
      const subscription = supabase
        .channel('child_details_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'child_details',
            filter: `child_id=eq.${childId}`
          },
          (payload) => {
            console.log('Real-time update received:', payload);
            fetchChildData(childId);
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    } else {
      setError('No child ID provided');
      setLoading(false);
    }
  }, [searchParams]);

  const fetchAvailableGenres = async () => {
    try {
      const { data, error } = await supabase
        .from('temp_genre')
        .select('genrename');

      if (error) throw error;
      if (!data) throw new Error('No genres found');

      setAvailableGenres(data.map(item => item.genrename));
    } catch (err) {
      console.error('Error fetching genres:', err);
      setError('Failed to fetch available genres');
    }
  };

  const fetchChildData = async (childId: string) => {
    try {
      setLoading(true);
      setError(null);
  
      // Add mutex to prevent concurrent updates
      const mutexKey = `child_update_${childId}`;
      if (localStorage.getItem(mutexKey)) {
        console.log('Another update in progress, waiting...');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      localStorage.setItem(mutexKey, 'true');
  
      console.log('Fetching data for child ID:', childId);
  
      // Get child's account details from user_account
      const { data: userData, error: userError } = await supabase
        .from('user_account')
        .select('fullname, id')
        .eq('id', childId)
        .single();
  
      if (userError) throw userError;
      if (!userData) throw new Error('No user found with that ID');
  
      console.log('User account data:', userData);
      setChildName(userData.fullname);
      setAccountId(userData.id);
  
      // Get the profile from child_details
      const { data: profileExists, error: existsError } = await supabase
        .from('child_details')
        .select('child_id')
        .eq('child_id', userData.id);
  
      if (existsError) throw existsError;
  
      // If profile doesn't exist, create it using the account ID
      if (!profileExists || profileExists.length === 0) {
        console.log('Creating new child profile for account ID:', userData.id);
        const { error: createError } = await supabase
          .from('child_details')
          .insert({
            child_id: userData.id, 
            favourite_genres: [],
            blocked_genres: [],
            classrooms: []
          });
  
        if (createError) throw createError;
      }
  
      // Get child's profile data from child_details
      const { data: profileData, error: profileError } = await supabase
        .from('child_details')
        .select('favourite_genres, blocked_genres, classrooms')
        .eq('child_id', userData.id)
        .single();
  
      if (profileError) throw profileError;
      if (!profileData) throw new Error('No profile found');
  
      // Initialize arrays if they're null
      const processedProfileData = {
        favourite_genres: profileData.favourite_genres || [],
        blocked_genres: profileData.blocked_genres || [],
        classrooms: profileData.classrooms || []
      };
  
      const bookmarkedContent = await fetchBookmarkedContent(userData.id);
      setBookmarkedBooks(bookmarkedContent.books);
      setBookmarkedVideos(bookmarkedContent.videos);
  
      const combinedProfile: ChildProfile = {
        ...processedProfileData,
        books_bookmark: bookmarkedContent.books,
        videos_bookmark: bookmarkedContent.videos
      };
      
      console.log('Combined Profile:', combinedProfile);
      setChildProfile(combinedProfile);
      setSelectedGenres(processedProfileData.blocked_genres);
      setSelectedFavoriteGenres(processedProfileData.favourite_genres);
  
    } catch (err) {
      console.error('Error fetching child data:', err);
      setError(err instanceof Error ? err.message : 'Error fetching data');
    } finally {
      setLoading(false);
      localStorage.removeItem(`child_update_${childId}`);
    }
  };

  const handleAddFavoriteGenres = async () => {
    const mutexKey = `child_update_${accountId}`;
    let mutexAcquired = false;

    try {
      const childId = searchParams.get('childId');
      if (!childId || !accountId) return;

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

      // Get latest data before updating
      const { data: latestProfile } = await supabase
        .from('child_details')
        .select('blocked_genres, favourite_genres')
        .eq('child_id', accountId)
        .single();

      if (!latestProfile) throw new Error('Profile not found');

      // Check for concurrent modifications
      if (JSON.stringify(latestProfile.favourite_genres) !== JSON.stringify(childProfile?.favourite_genres)) {
        throw new Error('Profile was modified elsewhere. Please refresh and try again.');
      }

      // Remove any favorite genres that are in blocked genres
      const filteredFavoriteGenres = selectedFavoriteGenres.filter(
        (genre) => !(latestProfile.blocked_genres || []).includes(genre)
      );

      // Update favorite genres in child_details
      const { error } = await supabase
        .from('child_details')
        .update({ favourite_genres: filteredFavoriteGenres })
        .eq('child_id', accountId);

      if (error) throw error;

      setShowFavoriteGenreModal(false);
      // Refresh the data
      await fetchChildData(childId);
    } catch (err) {
      console.error('Error updating favorite genres:', err);
      setError('Failed to update favorite genres: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      if (mutexAcquired) {
        localStorage.removeItem(mutexKey);
      }
    }
  };

  const handleAddBlockedGenres = async () => {
    const mutexKey = `child_update_${accountId}`;
    let mutexAcquired = false;

    try {
      const childId = searchParams.get('childId');
      if (!childId || !accountId) return;

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

      // Get latest data before updating
      const { data: latestProfile } = await supabase
        .from('child_details')
        .select('favourite_genres, blocked_genres')
        .eq('child_id', accountId)
        .single();

      if (!latestProfile) throw new Error('Profile not found');

      // Check for concurrent modifications
      if (JSON.stringify(latestProfile.blocked_genres) !== JSON.stringify(selectedGenres)) {
        throw new Error('Profile was modified elsewhere. Please refresh and try again.');
      }

      // Remove any blocked genres from favourite genres
      const updatedFavouriteGenres = (latestProfile.favourite_genres || []).filter(
        (genre: string) => !selectedGenres.includes(genre)
      );

      // Update child_details with both favourite and blocked genres
      const { error: updateError } = await supabase
        .from('child_details')
        .update({ 
          favourite_genres: updatedFavouriteGenres,
          blocked_genres: selectedGenres
        })
        .eq('child_id', accountId);

      if (updateError) throw updateError;

      setShowGenreModal(false);
      // Refresh the data
      await fetchChildData(childId);
    } catch (err) {
      console.error('Error updating genres:', err);
      setError('Failed to update genres: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      if (mutexAcquired) {
        localStorage.removeItem(mutexKey);
      }
    }
  };

  const handleBack = () => {
    router.push('/parentpage');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={() => {
            setError(null);
            const childId = searchParams.get('childId');
            if (childId) {
              fetchChildData(childId);
            }
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-6 text-black">{childName}'s Profile</h1>
          
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <tbody className="divide-y divide-gray-200">
                {childProfile && Object.entries(childProfile).map(([key, value]) => {
                  // Skip books_bookmark and videos_bookmark from the table
                  if (key === 'books_bookmark' || key === 'videos_bookmark') {
                    return null;
                  }

                  // Customize the display name for certain fields
                  let displayName = key;
                  if (key === 'books_bookmark') displayName = 'Books Bookmarked';
                  if (key === 'videos_bookmark') displayName = 'Videos Bookmarked';
                  
                  // Handle empty arrays and null values
                  let displayValue: string;
                  if (value === null || (Array.isArray(value) && value.length === 0)) {
                    displayValue = 'Not set';
                  } else if (Array.isArray(value)) {
                    displayValue = value.join(', ');
                  } else {
                    displayValue = String(value);
                  }
                  
                  return (
                    <tr key={key}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                        {displayName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        {displayValue}
                      </td>
                      {key === 'blocked_genres' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => setShowGenreModal(true)}
                            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                          >
                            Edit
                          </button>
                        </td>
                      )}
                      {key === 'favourite_genres' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => setShowFavoriteGenreModal(true)}
                            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                          >
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ViewChildBookmark Component */}
          <ViewChildBookmark 
            books={bookmarkedBooks} 
            videos={bookmarkedVideos} 
          />

          {/* Genre Selection Modal */}
          {showGenreModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4 text-black">Select Genres to Block</h3>
                <div className="space-y-2 mb-4">
                  {availableGenres.map((genre) => (
                    <label key={genre} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedGenres.includes(genre)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedGenres([...selectedGenres, genre]);
                          } else {
                            setSelectedGenres(selectedGenres.filter(g => g !== genre));
                          }
                        }}
                        className="rounded text-blue-500"
                      />
                      <span className="text-black">{genre}</span>
                    </label>
                  ))}
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setShowGenreModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddBlockedGenres}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Favorite Genre Selection Modal */}
          {showFavoriteGenreModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4 text-black">Select Favorite Genres</h3>
                <div className="space-y-2 mb-4">
                  {availableGenres
                    .filter(genre => !childProfile?.blocked_genres.includes(genre))
                    .map((genre) => (
                    <label key={genre} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedFavoriteGenres.includes(genre)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFavoriteGenres([...selectedFavoriteGenres, genre]);
                          } else {
                            setSelectedFavoriteGenres(selectedFavoriteGenres.filter(g => g !== genre));
                          }
                        }}
                        className="rounded text-green-500"
                      />
                      <span className="text-black">{genre}</span>
                    </label>
                  ))}
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setShowFavoriteGenreModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddFavoriteGenres}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={handleBack}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}