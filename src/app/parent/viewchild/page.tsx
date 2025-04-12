// parent / viewchild.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

// Define interfaces for proper typing
interface Content {
  cid: number;
  title: string;
  coverimage?: string;
  contenturl?: string;
  credit?: string;
  description?: string;
  cfid: number;
  // Add other fields as needed
}

interface ContentWithGenres extends Content {
  genres: string[];
}

interface ChildProfile {
  favourite_genres: string[];
  blocked_genres: string[];
  classrooms: string[];
  books_bookmark?: ContentWithGenres[];
  videos_bookmark?: ContentWithGenres[];
}

interface UserAccount {
  fullname: string;
  id: string;
}

// Define PostgrestResponse types
interface PostgrestResponse<T> {
  data: T | null;
  error: any;
}

export default function ViewChild() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [childProfile, setChildProfile] = useState<ChildProfile | null>(null);
  const [childName, setChildName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [accountId, setAccountId] = useState<string>('');

  // Add this state variable at the top with your other state variables
const [showFavoriteGenreModal, setShowFavoriteGenreModal] = useState(false);
const [selectedFavoriteGenres, setSelectedFavoriteGenres] = useState<string[]>([]);

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
        .eq('user_id', childId)
        .single();

      if (userError) throw userError;
      if (!userData) throw new Error('No user found with that ID');

      console.log('User account data:', userData);
      setChildName(userData.fullname);
      //setAccountId(userData.id);
      setAccountId(childId);

      // Get child profile data with specific columns
      // First check if the child profile exists using the account ID (not user_id)
      const { data: profileExists, error: existsError } = await supabase
        .from('child_profile')
        .select('child_id')
        //.eq('child_id', userData.id);
        .eq('child_id', childId);

      if (existsError) throw existsError;

      // If profile doesn't exist, create it using the account ID
      if (!profileExists || profileExists.length === 0) {
        //console.log('Creating new child profile for account ID:', userData.id);
        console.log('Creating new child profile for account ID:', childId);
        const { error: createError } = await supabase
          .from('child_profile')
          .insert({
           // child_id: userData.id, // Use the account ID, not the auth user_id
           child_id: childId,
            favourite_genres: [],
            blocked_genres: [],
            classrooms: []
          });

        if (createError) throw createError;
      }

      // Now fetch the profile data using the account ID
      const { data: profileData, error: profileError } = await supabase
        .from('child_profile')
        .select('favourite_genres, blocked_genres, classrooms')
        //.eq('child_id', userData.id)
        .eq('child_id', childId)
        .single();

      if (profileError) throw profileError;
      if (!profileData) throw new Error('No profile found');

      // Initialize arrays if they're null
      const processedProfileData = {
        favourite_genres: profileData.favourite_genres || [],
        blocked_genres: profileData.blocked_genres || [],
        classrooms: profileData.classrooms || []
      };

      // Get bookmarked content from temp_bookmark using the user_account.id
      const { data: bookmarks, error: bookmarksError } = await supabase
        .from('temp_bookmark')
        .select('cid')
        //.eq('uaid', userData.id);
        .eq('uaid', childId);

      if (bookmarksError) throw bookmarksError;
      console.log('Bookmarks found:', bookmarks);

      // Get bookmarked books and videos
      const bookmarkedCids = bookmarks?.map(b => b.cid) || [];
      console.log('Bookmarked CIDs:', bookmarkedCids);
      
      let booksRes: PostgrestResponse<Content[]> = { data: [], error: null };
      let videosRes: PostgrestResponse<Content[]> = { data: [], error: null };

      if (bookmarkedCids.length > 0) {
        booksRes = await supabase
          .from('temp_content')
          .select('*')
          .in('cid', bookmarkedCids)
          .eq('cfid', 2); // Books (cfid = 2)
          
        videosRes = await supabase
          .from('temp_content')
          .select('*')
          .in('cid', bookmarkedCids)
          .eq('cfid', 1); // Videos (cfid = 1)

        if (booksRes.error) throw booksRes.error;
        if (videosRes.error) throw videosRes.error;
        console.log('Bookmarked Books:', booksRes.data);
        console.log('Bookmarked Videos:', videosRes.data);
      }

      // Fetch genres for all bookmarked content
      let genresData: any[] = [];
      let genresError = null;

      if (bookmarkedCids.length > 0) {
        const genresResponse = await supabase
          .from('temp_contentgenres')
          .select('cid, temp_genre(genrename)')
          .in('cid', bookmarkedCids);
        
        genresData = genresResponse.data || [];
        genresError = genresResponse.error;
      }

      if (genresError) throw genresError;

      // Process genres into a map
      const genresMap: Record<number, string[]> = {};
      if (genresData && genresData.length > 0) {
        genresData.forEach((item: any) => {
          if (!genresMap[item.cid]) {
            genresMap[item.cid] = [];
          }
          const genreField = item.temp_genre;
          if (Array.isArray(genreField)) {
            genreField.forEach((g: any) => {
              if (g && g.genrename) {
                genresMap[item.cid].push(g.genrename);
              }
            });
          } else if (genreField && genreField.genrename) {
            genresMap[item.cid].push(genreField.genrename);
          }
        });
      }

      // Add genres to books and videos
      const booksWithGenres = (booksRes.data || []).map(book => ({
        ...book,
        genres: genresMap[book.cid] || []
      }));

      const videosWithGenres = (videosRes.data || []).map(video => ({
        ...video,
        genres: genresMap[video.cid] || []
      }));

      // Combine all the data
      const combinedProfile: ChildProfile = {
        ...processedProfileData,
        books_bookmark: booksWithGenres,
        videos_bookmark: videosWithGenres
      };
      console.log('Combined Profile:', combinedProfile);

      setChildProfile(combinedProfile);
    

      setSelectedGenres(processedProfileData.blocked_genres || []);
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
        .from('child_profile')
        .select('blocked_genres')
        .eq('child_id', accountId)
        .single();
  
      if (!currentProfile) throw new Error('Profile not found');
  
      // Remove any favorite genres that are in blocked genres
      const filteredFavoriteGenres = selectedFavoriteGenres.filter(
        (genre) => !(currentProfile.blocked_genres || []).includes(genre)
      );
  
      // Update favorite genres in child_profile
      const { error } = await supabase
        .from('child_profile')
        .update({ favourite_genres: filteredFavoriteGenres })
        .eq('child_id', accountId);
  
      if (error) throw error;
  
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
        .from('child_profile')
        .select('favourite_genres')
        .eq('child_id', accountId)
        .single();

      if (!currentProfile) throw new Error('Profile not found');

      // Remove any blocked genres from favourite genres
      const updatedFavouriteGenres = (currentProfile.favourite_genres || []).filter(
        (genre: string) => !selectedGenres.includes(genre)
      );

      // Update both blocked and favourite genres in child_profile
      const { error } = await supabase
        .from('child_profile')
        .update({ 
          blocked_genres: selectedGenres,
          favourite_genres: updatedFavouriteGenres
        })
        .eq('child_id', accountId);

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

      if (deleteError) {
        console.warn('Warning: Could not delete existing blockedgenres. This might be ok if none existed.');
      }

      // Insert new blocked genres if there are any
      if (selectedGenres.length > 0 && genreData && genreData.length > 0) {
        const blockedGenreRecords = genreData.map(genre => ({
          child_id: childId,
          genreid: genre.gid,
          genrename: genre.genrename
        }));

        const { error: insertError } = await supabase
          .from('blockedgenres')
          .insert(blockedGenreRecords);

        if (insertError) throw insertError;

        // Try to update scores in userInteractions2 for blocked genres
        try {
          const { error: scoreError } = await supabase
            .from('userInteractions2')
            .update({ score: 0 })
            .eq('child_id', childId)
            .in('genreid', genreData.map(genre => genre.gid));

          if (scoreError) console.warn('Could not update userInteractions2 scores:', scoreError.message);
        } catch (err) {
          // Gracefully handle if userInteractions2 table doesn't exist or other errors
          console.warn('Note: userInteractions2 table might not exist or other issue updating scores');
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bookmarked Content Section */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6 text-black">Bookmarked Content</h2>
            
            {/* Bookmarked Books */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-blue-900">Books</h3>
              {childProfile?.books_bookmark?.length ? (
                childProfile.books_bookmark.map((book) => (
                  <div key={book.cid} className="flex items-start space-x-6 p-6 bg-white rounded-lg shadow-md hover:bg-gray-50">
                    <div className="flex-shrink-0 w-32 h-48 relative">
                      {book.coverimage ? (
                        <Image src={book.coverimage} alt={book.title} fill className="object-cover rounded-md" />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-md">
                          <span className="text-gray-400">No cover</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                        <a href={`/bookdetail/${book.cid}`} className="hover:text-rose-500">
                          {book.title}
                        </a>
                      </h3>
                      <p className="text-md text-gray-600 mb-2">{book.credit}</p>
                      {book.genres && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {book.genres.map((genre: string) => (
                            <span key={genre} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                              {genre}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-gray-500">No books bookmarked</div>
              )}
            </div>

            {/* Bookmarked Videos */}
            <div className="space-y-6 mt-12">
              <h3 className="text-xl font-semibold text-blue-900">Videos</h3>
              {childProfile?.videos_bookmark?.length ? (
                childProfile.videos_bookmark.map((video) => (
                  <div key={video.cid} className="flex items-start space-x-6 p-6 bg-white rounded-lg shadow-md hover:bg-gray-50">
                    <div className="flex-shrink-0" style={{ width: '300px', height: '170px' }}>
                      {video.contenturl && (
                        <div className="relative" style={{ width: '300px', height: '170px' }}>
                          <iframe
                            className="absolute top-0 left-0 w-full h-full"
                            src={`https://www.youtube.com/embed/${video.contenturl.match(/(?:youtube\.com\/(?:[^/]+\/[^/]+|(?:v|e(?:mbed)?)\/|.*[?&]v=)([\w-]+))|(?:youtu\.be\/([\w-]+))/i)?.[1] || ''}`}
                            frameBorder="0"
                            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                        <a href={`/videodetail/${video.cid}`} className="hover:text-rose-500">
                          {video.title}
                        </a>
                      </h3>
                      <p className="text-md text-gray-600 mb-2">{video.description}</p>
                      {video.genres && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {video.genres.map((genre: string) => (
                            <span key={genre} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                              {genre}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-gray-500">No videos bookmarked</div>
              )}
            </div>
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