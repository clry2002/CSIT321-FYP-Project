'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ViewChildBookmark from '../../components/parent/view_child_bookmark';
import { fetchBookmarkedContent, ContentWithGenres } from './fetchChildBookmark';

interface ChildProfile {
  favourite_genres: string[];
  classrooms: {
    crid: number;
    name: string;
    description: string;
    educatorFullName: string;
  }[];
  books_bookmark?: ContentWithGenres[];
  videos_bookmark?: ContentWithGenres[];
}

// Client Components
function ClientViewChild() {
  const router = useRouter();
  const [childProfile, setChildProfile] = useState<ChildProfile | null>(null);
  const [childName, setChildName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [accountId, setAccountId] = useState<string>('');
  const [bookmarkedBooks, setBookmarkedBooks] = useState<ContentWithGenres[]>([]);
  const [bookmarkedVideos, setBookmarkedVideos] = useState<ContentWithGenres[]>([]);
  const [blockedGenreNames, setBlockedGenreNames] = useState<string[]>([]);
  const [searchParams, setSearchParams] = useState<URLSearchParams>(new URLSearchParams(''));

  const fetchAvailableGenres = useCallback(async () => {
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
  }, []);

  const fetchChildData = useCallback(async (childId: string) => {
    try {
      setLoading(true);
      setError(null);

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

      // Get active classrooms for the child
      const { data: classroomStudents, error: classroomError } = await supabase
        .from('temp_classroomstudents')
        .select('crid')
        .eq('uaid_child', userData.id)
        .eq('invitation_status', 'accepted');

      if (classroomError) throw classroomError;

      let activeClassrooms: {
        crid: number;
        name: string;
        description: string;
        educatorFullName: string;
      }[] = [];

      if (classroomStudents && classroomStudents.length > 0) {
        const classroomIds = classroomStudents.map(cs => cs.crid);

        // Fetch classroom details
        const { data: classroomData, error: classDetailsError } = await supabase
          .from('temp_classroom')
          .select('crid, name, description, uaid_educator')
          .in('crid', classroomIds);

        if (classDetailsError) throw classDetailsError;

        if (classroomData) {
          // Fetch educator names for each classroom
          activeClassrooms = await Promise.all(classroomData.map(async (classroom) => {
            const { data: educatorData, error: educatorError } = await supabase
              .from('user_account')
              .select('fullname')
              .eq('id', classroom.uaid_educator)
              .single();

            if (educatorError) throw educatorError;

            return {
              crid: classroom.crid,
              name: classroom.name,
              description: classroom.description,
              educatorFullName: educatorData?.fullname || 'Unknown Educator'
            };
          }));
        }
      }

      // Get child's profile data from child_details
      const { data: profileData, error: profileError } = await supabase
        .from('child_details')
        .select('favourite_genres')
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
      let blockedGenreNames = [];
      if (blockedGenresData && blockedGenresData.length > 0) {
        const genreIds = blockedGenresData.map(item => item.genreid);
        const { data: genreData, error: genreError } = await supabase
          .from('temp_genre')
          .select('genrename')
          .in('gid', genreIds);

        if (genreError) throw genreError;
        blockedGenreNames = genreData?.map(item => item.genrename) || [];
        setBlockedGenreNames(blockedGenreNames);
      }

      // Initialize arrays if they're null
      const processedProfileData = {
        favourite_genres: profileData.favourite_genres || [],
        blocked_genres: blockedGenreNames,
        classrooms: activeClassrooms
      };

      const bookmarkedContent = await fetchBookmarkedContent(userData.id);
      setBookmarkedBooks(bookmarkedContent.books);
      setBookmarkedVideos(bookmarkedContent.videos);

      const combinedProfile = {
        ...processedProfileData,
        books_bookmark: bookmarkedContent.books,
        videos_bookmark: bookmarkedContent.videos
      };

      console.log('Combined Profile:', combinedProfile);
      setChildProfile(combinedProfile);
      setSelectedGenres(blockedGenreNames);

    } catch (err) {
      console.error('Error fetching child data:', err);
      setError(err instanceof Error ? err.message : 'Error fetching data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSearchParams(new URLSearchParams(window.location.search));
    }
  }, []);

  useEffect(() => {

    const childId = searchParams.get('childId');
    if (childId) {
      fetchChildData(childId);
      fetchAvailableGenres();
    } else {
      setError('No child ID provided');
      setLoading(false);
    }
  }, [searchParams, fetchChildData, fetchAvailableGenres]);


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
        console.warn('Warning: Could not delete existing blocked genres. This might be ok if none existed.');
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
          const { error: deleteInteractionError } = await supabase
            .from('userInteractions')
            .delete()
            .eq('uaid', accountId)
            .in('gid', genreData.map(genre => genre.gid));

          if (deleteInteractionError) {
            console.error('Error deleting from userInteractions:', deleteInteractionError);
            throw deleteInteractionError;
          }
        } catch (interactionErr) {
          console.error('Error updating userInteractions:', interactionErr);
          throw interactionErr;
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
          <h1 className="text-2xl font-bold mb-6 text-black">{childName}&apos;s Profile</h1>

          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <tbody className="divide-y divide-gray-200">
                {/* Favourite Genres Row */}
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                    Favourite Genres
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                    {childProfile?.favourite_genres?.length ?
                      childProfile.favourite_genres.join(', ') :
                      'Not set'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {/* Edit button removed */}
                  </td>
                </tr>

                {/* Blocked Genres Row */}
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                    Blocked Genres
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                    {blockedGenreNames.length ?
                      blockedGenreNames.join(', ') :
                      'Not set'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setShowGenreModal(true)}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                      Edit
                    </button>
                  </td>
                </tr>

                {/* Active Classrooms Row */}
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                    Active Classrooms
                  </td>
                  <td className="px-6 py-4 text-sm text-black">
                    {childProfile?.classrooms?.length ? (
                      <div className="space-y-2">
                        {childProfile.classrooms.map((classroom) => (
                          <div key={classroom.crid} className="border-b border-gray-100 pb-2 last:border-b-0 last:pb-0 flex justify-between items-center">
                            <div>
                              <div className="font-medium">{classroom.name}</div>
                              <div className="text-gray-600 text-xs">Description: {classroom.description}</div>
                              <div className="text-gray-600 text-xs">Managed by: {classroom.educatorFullName}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      'No active classrooms'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {/* No edit button for classrooms */}
                  </td>
                </tr>
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

          {/* Favorite Genre Selection Modal - REMOVED */}

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

// Loading component
function LoadingFallback() {
  return <div className="flex items-center justify-center h-screen">Loading page...</div>;
}

// Main component with Suspense
export default function ViewChild() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ClientViewChild />
    </Suspense>
  );
}