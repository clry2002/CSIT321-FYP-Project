'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { syncFavoriteGenres } from '@/services/userInteractionsService';

export default function FirstTimeLoginSetup() {
  const router = useRouter();
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [genres, setGenres] = useState<{ gid: number; genrename: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userAccountId, setUserAccountId] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [blockedGenres, setBlockedGenres] = useState<string[]>([]);

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        setLoading(true);
        
        // Check if the user is authenticated
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          router.push('/auth/login');
          return;
        }
        
        // Get user account details
        const { data: userData, error: accountError } = await supabase
          .from('user_account')
          .select('id, username, fullname, upid')
          .eq('user_id', user.id)
          .single();
          
        if (accountError || !userData) {
          setError('Failed to fetch user account. Please try again.');
          return;
        }
        
        // Verify this is a child account
        if (userData.upid !== 3) {
          router.push('/'); // Redirect non-child users
          return;
        }
        
        setUserAccountId(userData.id);
        setUserName(userData.fullname.split(' ')[0] || userData.username);
        
        // Check if user already has set up favorite genres
        const { data: childDetails, error: childDetailsError } = await supabase
          .from('child_details')
          .select('favourite_genres')
          .eq('child_id', userData.id)
          .single();
          
        if (!childDetailsError && childDetails && childDetails?.favourite_genres 
          && childDetails.favourite_genres.length > 0) {
          // User already has genres set up, redirect to main page
          router.push('/child/childpage');
          return;
        }

        // Check for blocked genres set by parent
        const { data: blockedGenresData, error: blockedGenresError } = await supabase
          .from('blockedgenres')
          .select('genreid')
          .eq('child_id', userData.id);
          
          if (blockedGenresError) {
            console.error('Error checking blocked genres:', blockedGenresError);
          } else {
            // Get genre names for the blocked genres
          if (blockedGenresData && blockedGenresData.length > 0) {
            const genreIds = blockedGenresData.map(item => item.genreid);
            
            const { data: blockedGenreNames, error: genreNamesError } = await supabase
              .from('temp_genre')
              .select('genrename')
              .in('gid', genreIds);

              if (genreNamesError) {
                console.error('Error fetching blocked genre names:', genreNamesError);
              } else {
                // Store the blocked genre names
                setBlockedGenres(blockedGenreNames.map(g => g.genrename) || []);
              }
            }
          }
  
        // Fetch available genres
        const { data: genresData, error: genresError } = await supabase
          .from('temp_genre')
          .select('gid, genrename');
          
        if (genresError) {
          setError('Failed to load genres. Please try again.');
          return;
        }
        
        setGenres(genresData || []);
      } catch (err) {
        console.error('Error in first-time setup:', err);
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    checkUserStatus();
  }, [router]);

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres(prev => {
      if (prev.includes(genre)) {
        return prev.filter(g => g !== genre);
      } else if (prev.length < 3) {
        return [...prev, genre];
      }
      return prev;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedGenres.length === 0) {
      setError('Please select at least one favorite genre.');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      if (!userAccountId) {
        throw new Error('User account not found');
      }
      
      console.log('Saving favorite genres:', selectedGenres);
      
      // Update child_details with favorite genres
      const { error: updateError } = await supabase
        .from('child_details')
        .update({ favourite_genres: selectedGenres })
        .eq('child_id', userAccountId);
        
      if (updateError) throw updateError;
      
      // Sync favorite genres with interactions system
      console.log('Syncing favorite genres with interaction scores...');
      const syncResult = await syncFavoriteGenres(userAccountId.toString());
      
      if (!syncResult) {
        console.error('Failed to sync favorite genres with interaction scores');
      }
  
      // Redirect to child home page after a short delay to ensure sync completes
      setTimeout(() => {
        router.push('/child/childpage');
      }, 500);
      
    } catch (err) {
      console.error('Error saving favorite genres:', err);
      setError(err instanceof Error ? err.message : 'Failed to save your preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle back button click
  const handleBackClick = () => {
    router.push('/auth/login');
  };

  // Filter out blocked genres from available genres
  const availableGenres = genres
    .filter(genre => !blockedGenres.includes(genre.genrename))
    .map(genre => genre.genrename);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your setup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 py-10 px-6">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-8">
          {/* Back button */}
          <div className="mb-6">
            <button
              onClick={handleBackClick}
              className="flex items-center text-gray-600 hover:text-rose-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back to Login
            </button>
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Welcome, {userName}!</h1>
            <p className="mt-2 text-gray-600">Let&apos;s personalize your reading experience</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg">
              {error}
            </div>
          )}

          {blockedGenres.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 text-yellow-800 rounded-lg">
              <p className="font-medium">Note:</p>
              <p>Some genres are not available for selection because they have been blocked by your parent/guardian.</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">What types of books do you enjoy?</h2>
              <p className="text-gray-600 mb-6">Select up to 3 favorite genres to help us recommend books you&apos;ll love!</p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableGenres.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => handleGenreToggle(genre)}
                    className={`p-4 rounded-lg text-center transition-colors ${
                      selectedGenres.includes(genre)
                        ? 'bg-rose-500 text-white font-medium shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
              
              <div className="mt-2 text-sm text-gray-500">
                {selectedGenres.length === 0 
                  ? 'Select at least one genre' 
                  : `Selected: ${selectedGenres.length}/3`}
              </div>
            </div>

            <div className="text-center">
              <button
                type="submit"
                disabled={saving || selectedGenres.length === 0}
                className="px-8 py-3 bg-rose-600 text-white font-medium rounded-lg shadow-md hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-opacity-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Start Reading!'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}