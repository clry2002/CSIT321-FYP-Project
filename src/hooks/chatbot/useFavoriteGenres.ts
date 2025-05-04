import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Custom hook to fetch and manage a child's favorite genres
export const useFavoriteGenres = () => {
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFavoriteGenres = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          setError('User not authenticated');
          return;
        }

        // First get the child_id (which is the user_account.id)
        const { data: userData, error: userError } = await supabase
          .from('user_account')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (userError || !userData) {
          console.error('Error fetching user account details:', userError);
          setError('Error fetching user details');
          setIsLoading(false);
          return;
        }

        // Then get the favorite genres using the child_id
        const { data, error } = await supabase
          .from('child_details')
          .select('favourite_genres')
          .eq('child_id', userData.id)
          .single();

        if (error) {
          console.error('Error fetching favorite genres:', error);
          setError('Error fetching favorite genres');
          setIsLoading(false);
          return;
        }

        // Handle the text[] array type from Supabase
        if (data && data.favourite_genres) {
          let genres: string[] = [];
          
          // Check if favourite_genres is already an array
          if (Array.isArray(data.favourite_genres)) {
            genres = data.favourite_genres;
          } else if (typeof data.favourite_genres === 'string') {
            // If it's a string, try to parse it
            try {
              // Try parsing as JSON first
              genres = JSON.parse(data.favourite_genres);
            } catch {
              // If not valid JSON and it's a string, use it as a single genre
              genres = [data.favourite_genres];
            }
          }
          
          setFavoriteGenres(genres);
        }
      } catch (err) {
        console.error('Error in fetchFavoriteGenres:', err);
        setError('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFavoriteGenres();
  }, []);

  return { favoriteGenres, isLoading, error };
};

export default useFavoriteGenres;