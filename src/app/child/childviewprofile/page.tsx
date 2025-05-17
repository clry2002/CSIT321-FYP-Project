'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/app/components/Navbar';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { syncFavoriteGenres } from '@/services/userInteractionsService';
import ChatBot from '@/app/components/ChatBot';

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
  const [originalProfileData, setOriginalProfileData] = useState<{
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
  const [originalSelectedGenres, setOriginalSelectedGenres] = useState<string[]>([]);
  const [showGenreSelector, setShowGenreSelector] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [accountSettingsDisabled, setAccountSettingsDisabled] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameTimer, setUsernameTimer] = useState<NodeJS.Timeout | null>(null);

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

            const newProfileData = {
              full_name: userData.fullname,
              username: userData.username,
              age: userData.age,
              favourite_genres: [],
              blocked_genres: []
            };

            setProfileData(newProfileData);
            setOriginalProfileData(JSON.parse(JSON.stringify(newProfileData)));
            setSelectedGenres([]);
            setOriginalSelectedGenres([]);

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
            const newProfileData = {
              full_name: userData.fullname,
              username: userData.username,
              age: userData.age,
              favourite_genres: profileData.favourite_genres || [],
              blocked_genres: blockedGenreNames
            };
            
            setProfileData(newProfileData);
            setOriginalProfileData(JSON.parse(JSON.stringify(newProfileData)));
            
            // Set initial selected genres
            setSelectedGenres(profileData.favourite_genres || []);
            setOriginalSelectedGenres(profileData.favourite_genres || []);
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

  const validateField = (field: string, value: string | number) => {
    if (field === 'full_name') {
      if (!value || String(value).trim() === '') {
        setNameError("Your name cannot be empty.");
        return false;
      } else {
        setNameError(null);
        return true;
      }
    }
    
    if (field === 'username') {
      if (!value || String(value).trim() === '') {
        setUsernameError("Your username cannot be empty.");
        return false;
      }
      // Username is valid format, now check availability
      return true; // We check availability separately
    }
    
    return true;
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.trim() === '') {
      setUsernameError("Your username cannot be empty.");
      return false;
    }
    
    if (username === originalProfileData?.username) {
      setUsernameError(null);
      return true;
    }

    try {
      setCheckingUsername(true);
      const { data, error } = await supabase
        .from('user_account')
        .select('username')
        .eq('username', username)
        .not('user_id', 'eq', (await supabase.auth.getSession()).data.session?.user.id);

      if (error) throw error;

      if (data && data.length > 0) {
        setUsernameError("This username is already taken. Please choose another one.");
        return false;
      } else {
        setUsernameError(null);
        return true;
      }
    } catch (err) {
      console.error('Error checking username:', err);
      setUsernameError("Couldn't check username availability. Please try again.");
      return false;
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setSaveMessage(null);

      if (!profileData) return;

      // Validate name and username
      const isNameValid = validateField('full_name', profileData.full_name);
      if (!isNameValid) {
        setLoading(false);
        return;
      }
      
      // Check username validity and availability
      if (!validateField('username', profileData.username)) {
        setLoading(false);
        return;
      }
      
      // If username was changed, check availability
      if (profileData.username !== originalProfileData?.username) {
        const isUsernameAvailable = await checkUsernameAvailability(profileData.username);
        if (!isUsernameAvailable) {
          setLoading(false);
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const userId = session.user.id;

      // Only update user_account if account settings are not disabled
      if (!accountSettingsDisabled) {
        const { error: userError } = await supabase
          .from('user_account')
          .update({
            fullname: profileData.full_name,
            username: profileData.username
            // age is not included in the update
          })
          .eq('user_id', userId);

        if (userError) {
          if (userError.code === '23505') { // PostgreSQL unique violation error
            throw new Error('Username is already taken. Please choose a different one.');
          }
          throw userError;
        }
      }

      // Get the user_account.id first
      const { data: userData, error: userDataError } = await supabase
        .from('user_account')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (userDataError) throw new Error('Failed to retrieve user account');
      const userAccountId = userData.id;

      // Update child_details table (genres are always updateable)
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

      // Update the original data after successful save
      setOriginalProfileData(JSON.parse(JSON.stringify(profileData)));
      setOriginalSelectedGenres([...selectedGenres]);

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
    // Validate the field
    validateField(field, value);
    
    // Check username availability when typing with debounce
    if (field === 'username' && typeof value === 'string') {
      if (usernameTimer) {
        clearTimeout(usernameTimer);
      }
      
      const newTimer = setTimeout(() => {
        checkUsernameAvailability(value);
      }, 500); // Wait for 500ms after typing stops
      
      setUsernameTimer(newTimer);
    }
    
    setProfileData(prev => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
    setHasChanges(true);
  };

  const handleFieldClick = (field: string) => {
    // Do not allow editing the age field
    if (field !== 'age') {
      setEditingField(field);
    }
  };

  const handleFieldBlur = () => {
    // Validate field on blur
    if (editingField === 'full_name' && profileData) {
      validateField('full_name', profileData.full_name);
    } else if (editingField === 'username' && profileData) {
      checkUsernameAvailability(profileData.username);
    }
    
    setEditingField(null);
  };

  const handleCancel = () => {
    // Revert all changes
    if (originalProfileData) {
      setProfileData(JSON.parse(JSON.stringify(originalProfileData)));
    }
    setSelectedGenres([...originalSelectedGenres]);
    setHasChanges(false);
    setEditingField(null);
    setShowGenreSelector(false);
    setUsernameError(null);
    setNameError(null);
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
            href="/child/childsettings"
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
                saveMessage.type === 'success' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <strong className={`font-bold ${
                  saveMessage.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {saveMessage.type === 'success' ? 'Yay!' : 'Oops!'}
                </strong>{' '}
                <span className={`${
                  saveMessage.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {saveMessage.text}
                </span>
              </div>
            )}
            <div className="space-y-6">
              {accountSettingsDisabled && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-700 text-sm">
                    Some account settings need a grown-up to change. <span className="font-bold">But you can still choose your favorite types of books and stories!</span>
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">My Name</label>
                {editingField === 'full_name' ? (
                  <div>
                    <input
                      type="text"
                      value={profileData?.full_name || ''}
                      onChange={(e) => handleFieldChange('full_name', e.target.value)}
                      onBlur={handleFieldBlur}
                      autoFocus
                      disabled={accountSettingsDisabled}
                      className={`mt-1 block w-full rounded-md ${nameError ? 'border-red-300' : 'border-gray-300'} shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-lg ${
                        accountSettingsDisabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'text-black'
                      }`}
                    />
                    {nameError && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{nameError}</p>
                    )}
                  </div>
                ) : (
                  <div
                    className={`mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm text-left text-lg ${
                      accountSettingsDisabled 
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                        : 'bg-white text-gray-900 hover:bg-gray-50 transition-colors duration-200 cursor-pointer'
                    }`}
                    onClick={() => !accountSettingsDisabled && handleFieldClick('full_name')}
                  >
                    {profileData?.full_name || <span className="text-gray-400">Your name will appear here</span>}
                  </div>
                )}
              </div>
  
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">My Username</label>
                {editingField === 'username' ? (
                  <div>
                    <input
                      type="text"
                      value={profileData?.username || ''}
                      onChange={(e) => handleFieldChange('username', e.target.value)}
                      onBlur={handleFieldBlur}
                      autoFocus
                      disabled={accountSettingsDisabled}
                      className={`mt-1 block w-full rounded-md ${usernameError ? 'border-red-300' : 'border-gray-300'} shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-lg ${
                        accountSettingsDisabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'text-black'
                      }`}
                    />
                    {checkingUsername && (
                      <p className="mt-1 text-xs text-blue-600 font-medium">Checking if username is available...</p>
                    )}
                    {usernameError && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{usernameError}</p>
                    )}
                  </div>
                ) : (
                  <div
                    className={`mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm text-left text-lg ${
                      accountSettingsDisabled 
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                        : 'bg-white text-gray-900 hover:bg-gray-50 transition-colors duration-200 cursor-pointer'
                    }`}
                    onClick={() => !accountSettingsDisabled && handleFieldClick('username')}
                  >
                    {profileData?.username || <span className="text-gray-400">Your username will appear here</span>}
                  </div>
                )}
              </div>
  
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">My Age</label>
                <div className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 py-2 px-3 shadow-sm text-left text-lg text-gray-900">
                  {profileData?.age !== undefined ? profileData.age : <span className="text-gray-400">Not set</span>}
                </div>
                <p className="mt-1 text-xs text-gray-500">Age cannot be changed. Ask a grown-up for help if needed.</p>
              </div>
  
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  My Favorites (Genres)
                  {accountSettingsDisabled && (
                    <span className="ml-2 inline-block px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      You can change these! 😃
                    </span>
                  )}
                </label>
                
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
                    {selectedGenres.length === 0 && (
                      <span className="text-sm text-gray-500">Pick your favorite types of stories!</span>
                    )}
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
                <p className="mt-1 text-xs text-gray-500">Only a grown-up can change these.</p>
              </div>
  
              {hasChanges && (
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={handleCancel}
                    className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!!usernameError || !!nameError || checkingUsername}
                    className={`inline-flex items-center rounded-md border border-transparent ${
                      usernameError || nameError || checkingUsername 
                        ? 'bg-indigo-300 cursor-not-allowed' 
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    } py-2 px-4 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
                  >
                    Save Profile
                  </button>
                </div>
              )}
            </div>
          </div>
          {/* ChatBot Section */}
          <div className="mb-8">
            <ChatBot />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}