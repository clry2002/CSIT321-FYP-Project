import { supabase } from '@/lib/supabase';
import { Video, Book } from '../types/database.types';

// Define type for the nested genre response from Supabase
interface GenreMapping {
  cid: number;
  gid: number;
  temp_genre: {
    genrename: string;
  } | null;
}

/**
 * Filter out content with blocked genres and add genre names
 * Works for both books and videos
 */
export const filterBlockedGenreContent = async <T extends (Book | Video)>(
  contentItems: T[],
  blockedGenreIds: number[]
): Promise<T[]> => {
  if (!contentItems || contentItems.length === 0 || !blockedGenreIds || blockedGenreIds.length === 0) {
    // If no content or no blocked genres, just add genre names and return all content
    return await addGenreNames(contentItems);
  }

  try {
    // Filter out content with blocked genres
    const filteredContent = await Promise.all(
      contentItems.map(async (item) => {
        // Get genres for this content item
        const { data: contentGenres, error: genresError } = await supabase
          .from('temp_contentgenres')
          .select('gid')
          .eq('cid', item.cid);
          
        if (genresError || !contentGenres) {
          console.error(`Error fetching genres for content ${item.cid}:`, genresError);
          return null; // Skip this item if we can't get genres
        }
        
        // Check if content has any blocked genre
        const itemGenreIds = contentGenres.map(g => g.gid);
        const hasBlockedGenre = itemGenreIds.some(gid => 
          blockedGenreIds.includes(gid)
        );
        
        // Return item if it has no blocked genres
        return hasBlockedGenre ? null : item;
      })
    );
    
    // Filter out nulls and add genre names
    // Fixed type predicate issue by correcting the type filtering
    const nonNullContent = filteredContent.filter(Boolean) as T[];
    return await addGenreNames(nonNullContent);
  } catch (error) {
    console.error('Error in filterBlockedGenreContent:', error);
    return [];
  }
};

/**
 * Add genre names to content items
 */
export const addGenreNames = async <T extends (Book | Video)>(contentItems: T[]): Promise<T[]> => {
  if (!contentItems || contentItems.length === 0) {
    return [];
  }

  try {
    // Get all content IDs
    const contentIds = contentItems.map(item => item.cid);
    
    // Fetch all genre mappings for these content items
    const { data: genreMappings, error: mappingsError } = await supabase
      .from('temp_contentgenres')
      .select('cid, gid, temp_genre(genrename)')
      .in('cid', contentIds);
      
    if (mappingsError) {
      console.error('Error fetching genre mappings:', mappingsError);
      return contentItems; // Return original items if we can't get genre names
    }
    
    // Group genres by content ID
    const genresByContent: Record<number | string, string[]> = {};
    
    // Process each mapping with proper typing
    genreMappings?.forEach(mapping => {
      // Cast the mapping to the proper type
      const typedMapping = mapping as unknown as GenreMapping;
      const cid = typedMapping.cid;
      const genreName = typedMapping.temp_genre?.genrename;
      
      if (!genreName) return;
      
      if (!genresByContent[cid]) {
        genresByContent[cid] = [];
      }
      
      genresByContent[cid].push(genreName);
    });
    
    // Add genre names to content items
    return contentItems.map(item => {
      return {
        ...item,
        genre: genresByContent[item.cid] || []
      };
    });
  } catch (error) {
    console.error('Error in addGenreNames:', error);
    return contentItems;
  }
};