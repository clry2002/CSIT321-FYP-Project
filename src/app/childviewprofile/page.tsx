// child / viewprofile.tsx
'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { syncFavoriteGenres } from '../../services/userInteractionsService';

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
  const [profileData, setProfileData] = useState<{
    full_name: string;
    username: string;
    age: number;
    favourite_genres: string[];
    blocked_genres: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [showGenreSelector, setShowGenreSelector] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const initializeProfile = async () => {
      try {
        setLoading(true);
        
        // Check if user is authenticated
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          router.push('/auth/login');
          return;
        }

        // Get the current user's ID
        const userId = session.user.id;

        // Get the user's account data
        const { data: userData, error: userError } = await supabase
          .from('user_account')
          .select('id, fullname, username, age')
          .eq('user_id', userId)
          .single();

        if (userError) {
          throw userError;
        }

        // Get the child's profile data including favourite genres
        const { data: profileData, error: profileError } = await supabase
          .from('child_details')
          .select('favourite_genres')
          .eq('child_id', userData.id)
          .single();

          // If child_details doesn't exist yet, create it with empty values
          if (profileError && profileError.code === 'PGRST116') { // Not found error
            const { error: insertError } = await supabase
              .from('child_details')
              .insert({
                child_id: userData.id,
                favourite_genres: []
              });
              
            if (insertError) throw insertError;

            setProfileData({
              full_name: userData.fullname,
              username: userData.username,
              age: userData.age,
              favourite_genres: [],
              blocked_genres: []
            });

            setSelectedGenres([]);
          } else if (profileError) {
            throw profileError;
          } else {
            // Fetch blocked genres from blockedgenres table
            const { data: blockedGenresData, error: blockedGenresError } = await supabase
              .from('blockedgenres')
              .select('genreid')
              .eq('child_id', userData.id);
  
            if (blockedGenresError) throw blockedGenresError;
  
            // Get genre names for blocked genres
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
        
        // Set the profile data
        setProfileData({
          full_name: userData.fullname,
          username: userData.username,
          age: userData.age,
          favourite_genres: profileData.favourite_genres || [],
          blocked_genres: blockedGenreNames
        });
        
        // Set initial selected genres
        setSelectedGenres(profileData.favourite_genres || []);
      }

       // Get available genres
       const { data: genres, error: genresError } = await supabase
       .from('temp_genre')
       .select('genrename');

       if (genresError) {
        throw genresError;
      }

       const { data: blockedGenresData, error: blockedGenresError } = await supabase
       .from('blockedgenres')
       .select('genreid')
       .eq('child_id', userData.id);

      if (blockedGenresError) throw blockedGenresError;

       // Get genre names for blocked genres
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
       
       // Show all genres except blocked ones
        const allAvailableGenres = genres.map(g => g.genrename)
        .filter(genre => !blockedGenreNames.includes(genre));
        setAvailableGenres(allAvailableGenres);  
      } catch (err) {
        console.error('Error loading profile:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while loading your profile');
      } finally {
        setLoading(false);
      }
    };

    initializeProfile();
  }, [router]);

  const handleSave = async () => {
    try {
      setLoading(true);
      setSaveMessage(null);

      if (!profileData) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const userId = session.user.id;

      // Update user_account table
      const { error: userError } = await supabase
        .from('user_account')
        .update({
          fullname: profileData.full_name,
          username: profileData.username,
          age: profileData.age
        })
        .eq('user_id', userId);

      if (userError) throw userError;

      // Get the user_account.id first
      const { data: userData, error: userDataError } = await supabase
        .from('user_account')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (userDataError) throw new Error('Failed to retrieve user account');
      const userAccountId = userData.id;

      // Update child_details table
      const { error: profileError } = await supabase
        .from('child_details')
        .update({
          favourite_genres: selectedGenres
        })
        .eq('child_id', userAccountId);

      if (profileError) throw profileError;

      console.log('[Profile] Syncing favorite genres to update scores...');
      await syncFavoriteGenres(userAccountId);
      console.log('[Profile] Favorite genres synced successfully');

      // // Get currently blocked genres
      // const { data: currentlyBlocked, error: blockedError } = await supabase
      //   .from('blockedgenres')
      //   .select('genreid')
      //   .eq('child_id', userAccountId);

      // if (blockedError) throw blockedError;
      // const currentlyBlockedIds = currentlyBlocked?.map(item => item.genreid) || [];

      // // Get all genre IDs and names
      // const { data: allGenres, error: genresError } = await supabase
      //   .from('temp_genre')
      //   .select('gid, genrename');

      // if (genresError) {
      //   console.error('Error fetching genres:', genresError);
      //   throw genresError;
      // }

      // // Get current interactions
      // const { data: currentInteractions, error: currentError } = await supabase
      //   .from('userInteractions')
      //   .select('gid, score')
      //   .eq('uaid', userAccountId);

      // if (currentError) {
      //   console.error('Error fetching current interactions:', currentError);
      //   throw currentError;
      // }

      // // Process each genre in the selected favorites
      // for (const genre of selectedGenres) {
      //   const genreId = allGenres.find(g => g.genrename === genre)?.gid;
      //   if (!genreId) {
      //     throw new Error(`Could not find genre ID for genre: ${genre}`);
      //   }

      //   // Skip if genre is currently blocked
      //   if (currentlyBlockedIds.includes(genreId)) continue;

      //   // Add new row with score 20 if it doesn't exist
      //   const { error: insertError } = await supabase
      //     .from('userInteractions')
      //     .insert({
      //       uaid: userAccountId,
      //       gid: genreId,
      //       score: 20
      //     })
      //     .select();

      //   // If row already exists, update it
      //   if (insertError && insertError.code === '23505') { // Unique violation error code
      //     const { error: updateError } = await supabase
      //       .from('userInteractions')
      //       .update({ score: 20 })
      //       .eq('uaid', userAccountId)
      //       .eq('gid', genreId);

      //     if (updateError) {
      //       console.error('Error updating genre score:', updateError);
      //       throw updateError;
      //     }
      //   } else if (insertError) {
      //     console.error('Error inserting new interaction:', insertError);
      //     throw insertError;
      //   }
      // }

      // // For genres that are no longer favorites, remove their rows
      // const selectedGenreIds = selectedGenres.map(genre => 
      //   allGenres.find(g => g.genrename === genre)?.gid
      // ).filter(id => id !== undefined) as number[];

      // const genresToRemove = (currentInteractions || [])
      //   .filter(interaction => !selectedGenreIds.includes(interaction.gid))
      //   .map(interaction => interaction.gid);

      // if (genresToRemove.length > 0) {
      //   const { error: deleteError } = await supabase
      //     .from('userInteractions')
      //     .delete()
      //     .eq('uaid', userAccountId)
      //     .in('gid', genresToRemove);

      //   if (deleteError) {
      //     console.error('Error removing genre interactions:', deleteError);
      //     throw deleteError;
      //   }
      // }

      setSaveMessage({ type: 'success', text: 'Profile updated successfully!' });
      setHasChanges(false);
      setEditingField(null);
      setShowGenreSelector(false);
    } catch (err) {
      console.error('Error saving profile:', err);
      setSaveMessage({ 
        type: 'error', 
        text: err instanceof Error ? err.message : 'An error occurred while saving your profile'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenreClick = () => {
    setShowGenreSelector(!showGenreSelector);
  };

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres(prev => {
      if (prev.includes(genre)) {
        return prev.filter(g => g !== genre);
      } else if (prev.length < 3) {
        return [...prev, genre];
      }
      return prev;
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
                      <label className="block text-sm font-medium text-gray-700">Username</label>
                      {editingField === 'username' ? (
                        <input
                          type="text"
                          value={profileData?.username || ''}
                          onChange={(e) => handleFieldChange('username', e.target.value)}
                          onBlur={handleFieldBlur}
                          autoFocus
                          className="mt-1 block w-full text-lg text-gray-900 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      ) : (
                        <div 
                          onClick={() => handleFieldClick('username')}
                          className="mt-1 text-lg text-gray-900 cursor-pointer hover:bg-gray-50 p-2 rounded"
                        >
                          {profileData?.username}
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
                        {!showGenreSelector ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedGenres.length === 0 ? (
                              <button
                                onClick={handleGenreClick}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 cursor-pointer hover:bg-gray-200"
                              >
                                Add
                              </button>
                            ) : (
                              selectedGenres.map((genre) => (
                                <button
                                  key={genre}
                                  onClick={handleGenreClick}
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
                                onClick={() => handleGenreToggle(genre)}
                                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                  selectedGenres.includes(genre)
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

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700">Blocked Genres</label>
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-2">
                          {profileData?.blocked_genres.length === 0 ? (
                            <span className="text-sm text-gray-500">No blocked genres</span>
                          ) : (
                            profileData?.blocked_genres.map((genre) => (
                              <span
                                key={genre}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800"
                              >
                                {genre}
                              </span>
                            ))
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