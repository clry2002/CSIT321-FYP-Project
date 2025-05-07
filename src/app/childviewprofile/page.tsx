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
  const [accountSettingsDisabled, setAccountSettingsDisabled] = useState(false);

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

        // Get the user's account data including profile type (upid)
        const { data: userData, error: userError } = await supabase
          .from('user_account')
          .select('id, fullname, username, age, upid')
          .eq('user_id', userId)
          .single();

        if (userError) {
          throw userError;
        }

        // Check if this is a child profile (upid = 3)
        if (userData.upid === 3) {
          // Check for the 'disable_account_settings' permission for child profiles
          const { data: permissionData, error: permissionError } = await supabase
            .from('profile_permissions')
            .select('active')
            .eq('upid', 3)
            .eq('permission_key', 'disable_account_settings')
            .single();

          if (permissionError && permissionError.code !== 'PGRST116') { // PGRST116 is "not found" error
            console.error('Error fetching account settings permission:', permissionError);
          } else {
            // If the permission exists and is active, settings are disabled
            setAccountSettingsDisabled(permissionData?.active || false);
          }
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
      <div
          className="flex flex-col h-screen overflow-hidden"
          style={{
            backgroundImage: 'url("/stars.png")', // Replace with your image path in 'public'
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          }}
        >
        <Navbar />
        <div className="flex-1 overflow-y-auto pt-12 pb-8 px-6 sm:px-8 lg:px-16">
          <Link
            href="/childsettings"
            className="inline-flex items-center text-sm font-semibold text-yellow-400 hover:text-indigo-600 transition-colors duration-200 mb-6 mt-12"
          >
            <svg className="w-4 h-4 mr-1 -ml-0.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M7.707 14.707a1 1 0 01-1.414-1.414L10.586 10l-4.293-4.293a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5z" clipRule="evenodd" />
            </svg>
            Back to Settings
          </Link>
  
          <div className="bg-white shadow-lg rounded-2xl p-6 sm:p-8">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-6">My Awesome Profile</h2>
  
            {saveMessage && (
              <div className={`mb-6 p-4 rounded-md ${
                saveMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                <strong className="font-semibold">{saveMessage.type === 'success' ? 'Yay!' : 'Oops!'}</strong> {saveMessage.text}
              </div>
            )}
  
            <div className="space-y-6">
              {accountSettingsDisabled && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-700 text-sm">
                    Account settings are currently disabled by an administrator. Please contact your parent or guardian for assistance with account changes.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">My Name</label>
                {editingField === 'full_name' ? (
                  <input
                    type="text"
                    value={profileData?.full_name || ''}
                    onChange={(e) => handleFieldChange('full_name', e.target.value)}
                    onBlur={handleFieldBlur}
                    autoFocus
                    disabled={accountSettingsDisabled}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-lg text-black ${
                      accountSettingsDisabled ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                  />
                ) : (
                  <button
                    onClick={() => !accountSettingsDisabled && handleFieldClick('full_name')}
                    disabled={accountSettingsDisabled}
                    className={`mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 text-left text-lg text-gray-900 hover:bg-gray-50 transition-colors duration-200 ${
                      accountSettingsDisabled ? 'cursor-not-allowed opacity-75' : ''
                    }`}
                  >
                    {profileData?.full_name || <span className="text-gray-400">Tap to add name</span>}
                  </button>
                )}
              </div>
  
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">My Username</label>
                {editingField === 'username' ? (
                  <input
                    type="text"
                    value={profileData?.username || ''}
                    onChange={(e) => handleFieldChange('username', e.target.value)}
                    onBlur={handleFieldBlur}
                    autoFocus
                    disabled={accountSettingsDisabled}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-lg text-black ${
                      accountSettingsDisabled ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                  />
                ) : (
                  <button
                    onClick={() => !accountSettingsDisabled && handleFieldClick('username')}
                    disabled={accountSettingsDisabled}
                    className={`mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 text-left text-lg text-gray-900 hover:bg-gray-50 transition-colors duration-200 ${
                      accountSettingsDisabled ? 'cursor-not-allowed opacity-75' : ''
                    }`}
                  >
                    {profileData?.username || <span className="text-gray-400">Tap to add username</span>}
                  </button>
                )}
              </div>
  
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">My Age</label>
                {editingField === 'age' ? (
                  <input
                    type="number"
                    value={profileData?.age || ''}
                    onChange={(e) => handleFieldChange('age', parseInt(e.target.value))}
                    onBlur={handleFieldBlur}
                    autoFocus
                    disabled={accountSettingsDisabled}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-lg text-black ${
                      accountSettingsDisabled ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                  />
                ) : (
                  <button
                    onClick={() => !accountSettingsDisabled && handleFieldClick('age')}
                    disabled={accountSettingsDisabled}
                    className={`mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 text-left text-lg text-gray-900 hover:bg-gray-50 transition-colors duration-200 ${
                      accountSettingsDisabled ? 'cursor-not-allowed opacity-75' : ''
                    }`}
                  >
                    {profileData?.age !== undefined ? profileData.age : <span className="text-gray-400">Tap to add age</span>}
                  </button>
                )}
              </div>
  
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">My Favorites (Genres)</label>
                {!showGenreSelector ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedGenres.map((genre) => (
                      <span
                        key={genre}
                        className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700"
                      >
                        {genre}
                      </span>
                    ))}
                    <button
                      onClick={() => setShowGenreSelector(true)}
                      className="inline-flex items-center rounded-full bg-yellow-300 text-yellow-800 px-3 py-1 text-sm font-semibold hover:bg-yellow-400 transition-colors duration-200"
                    >
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>
                      Modify
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                    {availableGenres.map((genre) => (
                      <button
                        key={genre}
                        onClick={() => handleGenreToggle(genre)}
                        className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors duration-200 ${
                          selectedGenres.includes(genre)
                            ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                    <button
                      onClick={() => setShowGenreSelector(false)}
                      className="inline-flex items-center rounded-full bg-green-500 text-white px-4 py-2 text-sm font-semibold hover:bg-green-600 transition-colors duration-200"
                    >
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 000 2h3.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" /></svg>
                      Done!
                    </button>
                  </div>
                )}
              </div>
  
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blocked Genres</label>
                <div className="flex flex-wrap gap-2">
                  {profileData?.blocked_genres.map((genre) => (
                    <span
                      key={genre}
                      className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700"
                    >
                      {genre}
                    </span>
                  ))}
                  {profileData?.blocked_genres.length === 0 && (
                    <span className="text-sm text-gray-500">Nothing blocked yet!</span>
                  )}
                </div>
              </div>
  
              {hasChanges && (
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setSelectedGenres(profileData?.favourite_genres || []);
                      setHasChanges(false);
                      setEditingField(null);
                      setShowGenreSelector(false);
                    }}
                    className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    Save Profile
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}