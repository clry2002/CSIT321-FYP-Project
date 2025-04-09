'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ViewChild() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [childProfile, setChildProfile] = useState<any>(null);
  const [childName, setChildName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);

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

      // Get child's full name from user_account
      const { data: userData, error: userError } = await supabase
        .from('user_account')
        .select('fullname')
        .eq('user_id', childId)
        .single();

      if (userError) throw userError;
      if (!userData) throw new Error('No user found');

      setChildName(userData.fullname);

      // Get child profile data with specific columns
      const { data: profileData, error: profileError } = await supabase
        .from('child_profile')
        .select('favourite_genres, blocked_genres, classrooms, books_bookmark, videos_bookmark')
        .eq('child_id', childId)
        .single();

      if (profileError) throw profileError;
      if (!profileData) throw new Error('No profile found');

      setChildProfile(profileData);
      setSelectedGenres(profileData.blocked_genres || []);
    } catch (err) {
      console.error('Error fetching child data:', err);
      setError(err instanceof Error ? err.message : 'Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBlockedGenres = async () => {
    try {
      const childId = searchParams.get('childId');
      if (!childId) return;

      // Get current favourite genres
      const { data: currentProfile } = await supabase
        .from('child_profile')
        .select('favourite_genres')
        .eq('child_id', childId)
        .single();

      if (!currentProfile) throw new Error('Profile not found');

      // Remove any blocked genres from favourite genres
      const updatedFavouriteGenres = (currentProfile.favourite_genres || []).filter(
        (genre: string) => !selectedGenres.includes(genre)
      );

      // Convert empty array to null for blocked_genres
      const blockedGenresToUpdate = selectedGenres.length === 0 ? null : selectedGenres;

      // Update both blocked and favourite genres in child_profile
      const { error } = await supabase
        .from('child_profile')
        .update({ 
          blocked_genres: blockedGenresToUpdate,
          favourite_genres: updatedFavouriteGenres
        })
        .eq('child_id', childId);

      if (error) throw error;

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
        .eq('child_id', childId);

      if (deleteError) throw deleteError;

      // Insert new blocked genres if there are any
      if (selectedGenres.length > 0) {
        const blockedGenreRecords = genreData.map(genre => ({
          child_id: childId,
          genreid: genre.gid,
          genrename: genre.genrename
        }));

        const { error: insertError } = await supabase
          .from('blockedgenres')
          .insert(blockedGenreRecords);

        if (insertError) throw insertError;

        // Update scores in userInteractions2 for blocked genres
        const { error: scoreError } = await supabase
          .from('userInteractions2')
          .update({ score: 0 })
          .eq('child_id', childId)
          .in('genreid', genreData.map(genre => genre.gid));

        if (scoreError) throw scoreError;
      }

      setShowGenreModal(false);
      // Refresh the data
      fetchChildData(childId);
    } catch (err) {
      console.error('Error updating genres:', err);
      setError('Failed to update genres');
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

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