/**
 * Utility functions for genre recommendations and filtering
 * This helps suggest appropriate genres to children based on their preferences
 */

import { supabase } from '@/lib/supabase';
import UncertaintyTracker from './uncertaintyTracker';

interface Genre {
  gid: number;
  genrename: string;
}

interface BlockedGenre {
  genreid: number;
  genrename: string;
}

// Get all available genres from the database
export const getAllGenres = async (): Promise<Genre[]> => {
  try {
    const { data, error } = await supabase
      .from('temp_genre')
      .select('gid, genrename');
    
    if (error) {
      console.error('Error fetching genres:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getAllGenres:', error);
    return [];
  }
};

// Get blocked genres for a specific child
export const getBlockedGenres = async (childId: string): Promise<BlockedGenre[]> => {
    try {
      console.log(`Using child_id: ${childId}`);
      
      const { data, error } = await supabase
        .from('blockedgenres')
        .select('genreid')
        .eq('child_id', childId);
      
      if (error) {
        console.error('Error fetching blocked genres:', error);
        return [];
      }
      
      if (!data || data.length === 0) {
        console.log('No blocked genres found for this child');
        return [];
      }
      
      console.log('Blocked genres found:', data);
      
    
      return data.map(item => ({
        genreid: item.genreid,
        genrename: '' 
      }));
    } catch (error) {
      console.error('Error in getBlockedGenres:', error);
      return [];
    }
  };

export const getChildId = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_account')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    if (error || !data) {
      console.error('Error fetching child ID:', error);
      return null;
    }
    
    return data.id;
  } catch (error) {
    console.error('Error in getChildId:', error);
    return null;
  }
};

// Recommend random genres that are not blocked for the child
export const getRandomGenres = async (
  count: number = 3, 
  excludedGenres: string[] = []
): Promise<string[]> => {
  try {
    const childId = await getChildId();
    if (!childId) {
      console.log("No child ID found");
      return [];
    }
    
    console.log("Getting random genres for child:", childId);
    
    // Get all genres and blocked genres
    const allGenres = await getAllGenres();
    const blockedGenres = await getBlockedGenres(childId);
    
    console.log(`Found ${allGenres.length} total genres`);
    console.log(`Found ${blockedGenres.length} blocked genres`);
    console.log(`Excluding ${excludedGenres.length} favorite genres`);
    
    // Create sets for faster lookup
    const blockedGenreIds = new Set(blockedGenres.map(genre => genre.genreid));
    const excludedGenreNames = new Set(excludedGenres.map(name => name.toLowerCase()));
    
    // Filter out blocked and excluded genres
    const availableGenres = allGenres.filter(genre => 
      !blockedGenreIds.has(genre.gid) && 
      !excludedGenreNames.has(genre.genrename.toLowerCase())
    );
    
    console.log(`After filtering, ${availableGenres.length} genres are available`);
    
    if (availableGenres.length === 0) {
      console.log("No available genres after filtering");
      return [];
    }
    
    // Randomly select genres
    const shuffled = [...availableGenres].sort(() => 0.5 - Math.random());
    const selectedGenres = shuffled.slice(0, Math.min(count, shuffled.length));
    
    const recommendedGenres = selectedGenres.map(genre => genre.genrename);
    console.log("Recommending genres:", recommendedGenres);
    
    return recommendedGenres;
  } catch (error) {
    console.error('Error in getRandomGenres:', error);
    return [];
  }
};

export { UncertaintyTracker };

const genreRecommender = {
  getAllGenres,
  getBlockedGenres,
  getRandomGenres,
  getChildId,
  UncertaintyTracker
};

export default genreRecommender;