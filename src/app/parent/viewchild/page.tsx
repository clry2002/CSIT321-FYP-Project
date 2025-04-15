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
  
      console.log('Fetching data for child ID:', childId);
  
      // Get child's account details from user_account
      const { data: userData, error: userError } = await supabase
        .from('user_account')
        .select('fullname, id')

        
        //.eq('user_id', childId)
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
  
      // Fetch blocked genres from blockedgenres table
      const { data: blockedGenresData, error: blockedGenresError } = await supabase
        .from('blockedgenres')
        .select('genreid')
        .eq('child_id', userData.id);
  
      if (blockedGenresError) throw blockedGenresError;
  

      // Extract genre names from blockedgenres.id
      let blockedGenreNames: string[] = [];
      if (blockedGenresData && blockedGenresData.length > 0) {
        const genreIds = blockedGenresData.map(item => item.genreid);
        const { data: genreData, error: genreError } = await supabase
        .from('temp_genre')
        .select('genrename')
        .in('gid', genreIds);

        if (genreError) throw genreError;
        blockedGenreNames = genreData?.map(item => item.genrename) || [];
      }
      

      // Initialize arrays if they're null
      const processedProfileData = {
        favourite_genres: profileData.favourite_genres || [],
        // Replace blocked_genres from child_details with what we got from blockedgenres table
        blocked_genres: blockedGenreNames,
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
      setSelectedGenres(blockedGenreNames);
      setSelectedFavoriteGenres(processedProfileData.favourite_genres || []);
  
    } catch (err) {
      console.error('Error fetching child data:', err);
      setError(err instanceof Error ? err.message : 'Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFavoriteGenres = async () => {
    try {
      const childId = searchParams.get('childId');
      if (!childId || !accountId) return;
  
      // Get current blocked genres using account ID
      const { data: currentProfile } = await supabase
        .from('child_details')
        .select('blocked_genres')
        .eq('child_id', accountId)
        .single();
  
      if (!currentProfile) throw new Error('Profile not found');
  
      // Remove any favorite genres that are in blocked genres
      const filteredFavoriteGenres = selectedFavoriteGenres.filter(
        (genre) => !(currentProfile.blocked_genres || []).includes(genre)
      );
  
      // Update favorite genres in child_details
      const { error } = await supabase
        .from('child_details')
        .update({ favourite_genres: filteredFavoriteGenres })
        .eq('child_id', accountId);
  
      if (error) throw error;

      // Get current genres from userInteractions
      const { data: currentInteractions, error: currentError } = await supabase
        .from('userInteractions')
        .select('gid, score')
        .eq('uaid', accountId);

      if (currentError) {
        console.error('Error fetching current interactions:', currentError);
        throw currentError;
      }

      const currentGenreIds = currentInteractions?.map(interaction => interaction.gid) || [];

      // Get all genre IDs and names
      const { data: allGenres, error: genresError } = await supabase
        .from('temp_genre')
        .select('gid, genrename');

      if (genresError) {
        console.error('Error fetching genres:', genresError);
        throw genresError;
      }

      // Find genres to update (subtract 20 from score)
      const genresToUpdate = currentGenreIds.filter(id => 
        !filteredFavoriteGenres.includes(allGenres.find(g => g.gid === id)?.genrename || '')
      );

      // Find genres to add (set score to 20)
      const genresToAdd = filteredFavoriteGenres.filter(genre => 
        !currentGenreIds.includes(allGenres.find(g => g.genrename === genre)?.gid || 0)
      );

      // Update removed genres by subtracting 20 from score
      if (genresToUpdate.length > 0) {
        for (const gid of genresToUpdate) {
          const currentScore = currentInteractions?.find(i => i.gid === gid)?.score || 0;
          const { error: updateError } = await supabase
            .from('userInteractions')
            .update({ score: Math.max(0, currentScore - 20) })
            .eq('uaid', accountId)
            .eq('gid', gid);

          if (updateError) {
            console.error('Error updating genre score:', updateError);
            throw updateError;
          }
        }
      }

      // Add new genres with score 20
      if (genresToAdd.length > 0) {
        const newInteractions = genresToAdd.map(genre => {
          const genreId = allGenres.find(g => g.genrename === genre)?.gid;
          if (!genreId) {
            throw new Error(`Could not find genre ID for genre: ${genre}`);
          }
          return {
            uaid: accountId,
            gid: genreId,
            score: 20
          };
        });

        const { error: addError } = await supabase
          .from('userInteractions')
          .insert(newInteractions);

        if (addError) {
          console.error('Error inserting new interactions:', addError);
          throw addError;
        }
      }
  
      setShowFavoriteGenreModal(false);
      // Refresh the data
      fetchChildData(childId);
    } catch (err) {
      console.error('Error updating favorite genres:', err);
      setError('Failed to update favorite genres: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleAddBlockedGenres = async () => {
    try {
      const childId = searchParams.get('childId');
      if (!childId || !accountId) return;
  
      // Get current favourite genres using account ID
      const { data: currentProfile } = await supabase
        .from('child_details')
        .select('favourite_genres')
        .eq('child_id', accountId)
        .single();
  
      if (!currentProfile) throw new Error('Profile not found');
  
      // Remove any blocked genres from favourite genres
      const updatedFavouriteGenres = (currentProfile.favourite_genres || []).filter(
        (genre: string) => !selectedGenres.includes(genre)
      );
  
      // Update favourite genres in child_details
      const { error: updateFavoritesError } = await supabase
        .from('child_details')
        .update({ 
          favourite_genres: updatedFavouriteGenres
        })
        .eq('child_id', accountId);
  
      if (updateFavoritesError) throw updateFavoritesError;
  
      // Get genre IDs for selected blocked genres
      const { data: genreData, error: genreError } = await supabase
        .from('temp_genre')
        .select('gid, genrename')
        .in('genrename', selectedGenres);
  
      if (genreError) throw genreError;
  
      // Delete existing blocked genres for this child
      const { error: deleteError } = await supabase
        .from('blockedgenres')
        .delete()
        .eq('child_id', accountId);
  
      if (deleteError) {
        console.warn('Warning: Could not delete existing blockedgenres. This might be ok if none existed.');
      }
  
      // Insert new blocked genres if there are any
      if (selectedGenres.length > 0 && genreData && genreData.length > 0) {
        const blockedGenreRecords = genreData.map(genre => ({
          child_id: accountId,
          genreid: genre.gid,
        }));
        
        const { error: insertError } = await supabase
          .from('blockedgenres')
          .insert(blockedGenreRecords);
  
        if (insertError) throw insertError;
  
        // Delete rows from userInteractions for blocked genres
        try {
          const { error: deleteError } = await supabase
            .from('userInteractions')
            .delete()
            .eq('uaid', accountId)
            .in('gid', genreData.map(genre => genre.gid));

          if (deleteError) {
            console.error('Error deleting from userInteractions:', deleteError);
            throw deleteError;
          }
        } catch (err) {
          console.error('Error updating userInteractions:', err);
          throw err;
        }
      }
  
      setShowGenreModal(false);
  
      // Refresh the data
      fetchChildData(childId);
    } catch (err) {
      console.error('Error updating genres:', err);
      setError('Failed to update genres: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">{error}</div>
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
              onClick={() => router.push('/parentpage')}
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

//ignorethis