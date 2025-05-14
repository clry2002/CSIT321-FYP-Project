// services/userInteractionsService.ts
import { supabase } from '@/lib/supabase';

// Score constants
const BOOKMARK_ADD_SCORE = 5;
const BOOKMARK_REMOVE_SCORE = -5;
const SEARCH_SCORE = 1;
const VIEW_SCORE = 1;
const FAVORITE_GENRE_ADD_SCORE = 50;
const FAVORITE_GENRE_REMOVE_SCORE = -50;
const PARENT_BLOCKED_GENRE_SCORE = 0;

/**
 * Updates or creates a user interaction record for a genre
 */
export const updateGenreInteraction = async (
    uaid: string, 
    gid: number, 
    scoreChange: number
  ): Promise<boolean> => {
    try {
      // IMPORTANT: First clean up ANY existing duplicates
      await cleanupDuplicateInteractions(uaid);
      
      // Now fetch the interaction (there should only be one or none)
      const { data: existingInteraction, error: fetchError } = await supabase
        .from('userInteractions')
        .select('uiid, score')
        .eq('uaid', uaid)
        .eq('gid', gid)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        return false;
      }
      
      // Handle case with single existing entry
      if (existingInteraction) {
        // Update existing interaction
        const newScore = existingInteraction.score + scoreChange;
        
        // For negative scores, ensure we don't go below 0
        const finalScore = Math.max(0, newScore);
        
        const { error: updateError } = await supabase
          .from('userInteractions')
          .update({ score: finalScore })
          .eq('uiid', existingInteraction.uiid);
          
        if (updateError) {
          return false;
        }
      } 
      // Handle case with no existing entries
      else {
        // Create new interaction, ensuring score is at least 0
        const initialScore = Math.max(0, scoreChange);
        
        const { error: insertError } = await supabase
          .from('userInteractions')
          .insert({
            uaid,
            gid,
            score: initialScore
          });
          
        if (insertError) {
          return false;
        }
      }
      
      return true;
    } catch {
      return false;
    }
  };

/**
 * Updates user interactions when bookmarking or removing a content bookmark
 * Works for both books (cfid = 2) and videos (cfid = 1)
 */
export const handleBookmarkAction = async (
    uaid: string,
    cid: string,
    isAdding: boolean
  ): Promise<boolean> => {
    try {
      // Get genres for the content (both books and videos)
      const { data: contentGenres, error: genresError } = await supabase
        .from('temp_contentgenres')
        .select('gid')
        .eq('cid', cid);
        
      if (genresError) {
        return false;
      }
      
      const scoreChange = isAdding ? BOOKMARK_ADD_SCORE : BOOKMARK_REMOVE_SCORE;
      
      // Update interaction for each genre
      if (contentGenres && contentGenres.length > 0) {
        const updatePromises = contentGenres.map(({ gid }) => 
          updateGenreInteraction(uaid, gid, scoreChange)
        );
        
        await Promise.all(updatePromises);
      }
      
      return true;
    } catch {
      return false;
    }
  };

/**
 * Updates user interactions when viewing content (both books and videos)
 */
export const handleBookView = async (
  uaid: string,
  cid: string
): Promise<boolean> => {
  try {
    // Get genres for the content
    const { data: contentGenres, error: genresError } = await supabase
      .from('temp_contentgenres')
      .select('gid')
      .eq('cid', cid);
      
    if (genresError) {
      return false;
    }
    
    // Update interaction for each genre
    if (contentGenres && contentGenres.length > 0) {
      const updatePromises = contentGenres.map(({ gid }) => 
        updateGenreInteraction(uaid, gid, VIEW_SCORE)
      );
      
      await Promise.all(updatePromises);
    }
    
    return true;
  } catch {
    return false;
  }
};

/**
 * Updates user interactions when searching for content (both books and videos)
 */
export const handleBookSearch = async (
  uaid: string,
  cid: string
): Promise<boolean> => {
  try {
    // Get genres for the content
    const { data: contentGenres, error: genresError } = await supabase
      .from('temp_contentgenres')
      .select('gid')
      .eq('cid', cid);
      
    if (genresError) {
      return false;
    }
    
    // Update interaction for each genre
    if (contentGenres && contentGenres.length > 0) {
      const updatePromises = contentGenres.map(({ gid }) => 
        updateGenreInteraction(uaid, gid, SEARCH_SCORE)
      );
      
      await Promise.all(updatePromises);
    }
    
    return true;
  } catch {
    return false;
  }
};

/**
 * Updates user interactions when adding/removing favorite genre
 * Preserves existing points from bookmarks, views, searches
 */
export const handleFavoriteGenre = async (
    uaid: string,
    gid: number,
    isAdding: boolean
  ): Promise<boolean> => {
    try {
      // First, clean up any duplicate entries
      await cleanupDuplicateInteractions(uaid);
      
      // Get current interaction for this genre
      const { data: existingInteraction, error: fetchError } = await supabase
        .from('userInteractions')
        .select('uiid, score')
        .eq('uaid', uaid)
        .eq('gid', gid)
        .single();
        
      if (fetchError && fetchError.code !== 'PGRST116') {
        return false;
      }
  
      // Adding a favorite genre
      if (isAdding) {
        if (existingInteraction) {
          const currentScore = existingInteraction.score;
          const uiid = existingInteraction.uiid;
          
          // Check if it already has the bonus
          const hasBonus = currentScore >= FAVORITE_GENRE_ADD_SCORE;
          
          // If it already has the bonus, don't add more
          if (hasBonus) {
            return true;
          }
  
          // Add the favorite bonus to existing activity score
          const newScore = currentScore + FAVORITE_GENRE_ADD_SCORE;
          
          const { error: updateError } = await supabase
            .from('userInteractions')
            .update({ score: newScore })
            .eq('uiid', uiid);
            
          if (updateError) {
            return false;
          }
          
          return true;
        } else {
          // No existing interaction, create a new one with just the favorite score
          const { error: insertError } = await supabase
            .from('userInteractions')
            .insert({
              uaid,
              gid,
              score: FAVORITE_GENRE_ADD_SCORE
            });
            
          if (insertError) {
            return false;
          }
          
          return true;
        }
      } 
      // Removing a favorite genre
      else {
        if (existingInteraction) {
          const currentScore = existingInteraction.score;
          const uiid = existingInteraction.uiid;
          
          // Only remove the favorite bonus if the score is high enough to have it
          if (currentScore >= FAVORITE_GENRE_ADD_SCORE) {
            const newScore = currentScore - FAVORITE_GENRE_ADD_SCORE;
            
            const { error: updateError } = await supabase
              .from('userInteractions')
              .update({ score: newScore })
              .eq('uiid', uiid);
              
            if (updateError) {
              return false;
            }
          }
          
          return true;
        } else {
          // No existing interaction (shouldn't happen, but just in case)
          return true;
        }
      }
    } catch {
      return false;
    }
  };

/**
 * Sets a genre score to 0 when blocked by parent
 */
export const handleParentBlockGenre = async (
  uaid: string,
  gid: number
): Promise<boolean> => {
  try {
    // Check if interaction exists
    const { data: existingInteractions, error: fetchError } = await supabase
      .from('userInteractions')
      .select('uiid, score')
      .eq('uaid', uaid)
      .eq('gid', gid);
    
    if (fetchError) {
      return false;
    }
    
    if (existingInteractions && existingInteractions.length > 0) {
      // Set score to 0 for the first entry
      const firstEntry = existingInteractions[0];
      
      const { error: updateError } = await supabase
        .from('userInteractions')
        .update({ score: PARENT_BLOCKED_GENRE_SCORE })
        .eq('uiid', firstEntry.uiid);
        
      if (updateError) {
        return false;
      }
      
      // If there are duplicates, delete them
      if (existingInteractions.length > 1) {
        const duplicateIds = existingInteractions.slice(1).map(entry => entry.uiid);
        const { error: deleteError } = await supabase
          .from('userInteractions')
          .delete()
          .in('uiid', duplicateIds);
          
        if (deleteError) {
          // Continue despite error
        }
      }
    } else {
      // Create new interaction with score 0
      const { error: insertError } = await supabase
        .from('userInteractions')
        .insert({
          uaid,
          gid,
          score: PARENT_BLOCKED_GENRE_SCORE
        });
        
      if (insertError) {
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
};

/**
 * Cleans up duplicate user interactions for a user
 * Use this to fix existing duplicates in the database
 */
export const cleanupDuplicateInteractions = async (uaid: string): Promise<boolean> => {
  try {
    // Get all user interactions for this user
    const { data: allInteractions, error: fetchError } = await supabase
      .from('userInteractions')
      .select('*')
      .eq('uaid', uaid);
      
    if (fetchError) {
      return false;
    }
    
    if (!allInteractions || allInteractions.length === 0) {
      return true;
    }
    
    // Group interactions by genre ID
    const interactionsByGenre: Record<number, { gid: number; uiid: string; score: number }[]> = {};
    allInteractions.forEach(interaction => {
      const gid = interaction.gid;
      if (!interactionsByGenre[gid]) {
        interactionsByGenre[gid] = [];
      }
      interactionsByGenre[gid].push(interaction);
    });
    
    // Find genres with duplicate entries
    const genresWithDuplicates = Object.keys(interactionsByGenre)
      .map(gid => parseInt(gid))
      .filter(gid => interactionsByGenre[gid].length > 1);
    
    // Process each genre with duplicates
    for (const gid of genresWithDuplicates) {
      const duplicates = interactionsByGenre[gid];
      
      // Keep the entry with the highest score
      duplicates.sort((a, b) => {
        // First sort by score (higher first)
        if (b.score !== a.score) return b.score - a.score;
        return String(a.uiid).localeCompare(String(b.uiid));
      });
      
      const removeEntries = duplicates.slice(1);

      // Get IDs to remove
      const idsToRemove = removeEntries.map(entry => entry.uiid);
      
      // Delete duplicate entries
      const { error: deleteError } = await supabase
        .from('userInteractions')
        .delete()
        .in('uiid', idsToRemove);
        
      if (deleteError) {
        // Continue with other genres
      }
    }
    
    return true;
  } catch {
    return false;
  }
};

/**
 * Synchronizes favorite genres with userInteractions scores
 * Call this when loading user profile or after changes to ensure all favorites have proper scores
 * Preserves existing points from bookmarks, views, searches
 */
export const syncFavoriteGenres = async (uaid: string): Promise<boolean> => {
    try {
      // First, clean up any duplicate interactions
      await cleanupDuplicateInteractions(uaid);
  
      // Get child's favorite genres
      const { data: childDetails, error: childDetailsError } = await supabase
        .from('child_details')
        .select('favourite_genres')
        .eq('child_id', uaid)
        .single();
  
      if (childDetailsError) {
        return false;
      }
  
      // Get current user interactions
      const { data: userInteractions, error: interactionsError } = await supabase
        .from('userInteractions')
        .select('gid, score, uiid')
        .eq('uaid', uaid);
  
      if (interactionsError) {
        return false;
      }
  
      // Create maps of existing interactions
      const interactionsMap = new Map<number, number>();
      const interactionUiidMap = new Map<number, string>();
      userInteractions?.forEach(interaction => {
        interactionsMap.set(interaction.gid, interaction.score);
        interactionUiidMap.set(interaction.gid, interaction.uiid);
      });
  
      // Process favorite genres
      const favoriteGenres = childDetails?.favourite_genres || [];
  
      // Map string genre names to IDs
      const { data: genres, error: genresError } = await supabase
        .from('temp_genre')
        .select('gid, genrename');
  
      if (genresError) {
        return false;
      }
  
      // Create a map of genre names to IDs
      const genreNameToId = new Map<string, number>();
      const genreIdToName = new Map<number, string>();
      genres?.forEach(genre => {
        genreNameToId.set(genre.genrename, genre.gid);
        genreIdToName.set(genre.gid, genre.genrename);
      });
  
      // Convert favorite genres from names or string IDs to numeric IDs
      const favoriteGenreIds = favoriteGenres.map((genre: string): number | undefined => {
        // If genre is stored as a name
        if (genreNameToId.has(genre)) {
          return genreNameToId.get(genre);
        }
        // If genre is stored as a string ID
        return parseInt(genre, 10);
      }).filter((id: number | undefined): id is number => id !== undefined && !isNaN(id)) as number[];
  
      // Find genres with favorite-level scores (>= 50) that aren't in the favorites list
      // These are genres that need to have their favorite bonus removed
      const genresWithFavoriteScore = Array.from(interactionsMap.entries())
        .filter(entry => entry[1] >= FAVORITE_GENRE_ADD_SCORE)
        .map(entry => entry[0]);
  
      // Process genres that have favorite-level scores but are no longer in favorites
      for (const gid of genresWithFavoriteScore) {
        if (!favoriteGenreIds.includes(gid)) {
          const uiid = interactionUiidMap.get(gid);
          if (uiid) {
            const currentScore = interactionsMap.get(gid) || 0;
            
            // Use FAVORITE_GENRE_REMOVE_SCORE to remove favorite bonus points
            // But ensure we don't go below 0
            const newScore = Math.max(0, currentScore + FAVORITE_GENRE_REMOVE_SCORE);
            
            const { error: updateError } = await supabase
              .from('userInteractions')
              .update({ score: newScore })
              .eq('uiid', uiid);
              
            if (updateError) {
              // Continue with other genres
            }
          }
        }
      }
  
      // For each favorite genre, ensure it has AT LEAST the favorite score (preserve other points)
      for (const genreId of favoriteGenreIds) {
        const currentScore = interactionsMap.get(genreId) || 0;
  
        // Ensure the score is at least FAVORITE_GENRE_ADD_SCORE
        if (currentScore < FAVORITE_GENRE_ADD_SCORE) {
          const pointsToAdd = FAVORITE_GENRE_ADD_SCORE - currentScore;
          const newScore = currentScore + pointsToAdd;
  
          // If there's an existing interaction, update it
          if (interactionsMap.has(genreId)) {
            const uiid = interactionUiidMap.get(genreId);
  
            if (uiid) {
              await supabase
                .from('userInteractions')
                .update({ score: newScore })
                .eq('uiid', uiid);
            }
          } else {
            // No existing interaction, create new one with favorite score
            await supabase
              .from('userInteractions')
              .insert({
                uaid,
                gid: genreId,
                score: FAVORITE_GENRE_ADD_SCORE
              });
          }
        }
      }
  
      return true;
    } catch {
      return false;
    }
  };

/**
 * Syncs user interaction scores for all existing content bookmarks
 * Works for both books (cfid = 2) and videos (cfid = 1)
 */
export const syncExistingBookmarks = async (uaid: string): Promise<boolean> => {
    try {
      // Get all current bookmarks for the user
      const { data: bookmarks, error: bookmarksError } = await supabase
        .from('temp_bookmark')
        .select('cid')
        .eq('uaid', uaid);
        
      if (bookmarksError) {
        return false;
      }
      
      if (!bookmarks || bookmarks.length === 0) {
        return true;
      }
      
      const bookmarkCids = bookmarks.map(b => b.cid);
      
      // Get all genres for these bookmarks
      const { data: contentGenres, error: genresError } = await supabase
        .from('temp_contentgenres')
        .select('cid, gid')
        .in('cid', bookmarkCids);
        
      if (genresError) {
        return false;
      }
      
      if (!contentGenres || contentGenres.length === 0) {
        return true;
      }
      
      // Get current user interactions for these genres
      const genreIds = [...new Set(contentGenres.map(cg => cg.gid))];
      const { data: existingInteractions, error: interactionsError } = await supabase
        .from('userInteractions')
        .select('gid, score')
        .eq('uaid', uaid)
        .in('gid', genreIds);
        
      if (interactionsError) {
        return false;
      }
      
      // Create a map of genre IDs to scores
      const interactionScoreMap = new Map<number, number>();
      if (existingInteractions) {
        existingInteractions.forEach(interaction => {
          interactionScoreMap.set(interaction.gid, interaction.score);
        });
      }
      
      // Organize content genres by cid
      const genresByCid: Record<string, number[]> = {};
      contentGenres.forEach(cg => {
        if (!genresByCid[cg.cid]) {
          genresByCid[cg.cid] = [];
        }
        genresByCid[cg.cid].push(cg.gid);
      });
      
      // Check and sync scores for each bookmark
      const BOOKMARK_SCORE = 5;  // Score for a bookmark
      
      for (const cid of bookmarkCids) {
        const genres = genresByCid[cid] || [];
        
        for (const gid of genres) {
          const currentScore = interactionScoreMap.get(gid) || 0;
          const hasBookmarkScore = currentScore >= BOOKMARK_SCORE;
          
          if (!hasBookmarkScore) {
            await updateGenreInteraction(uaid, gid, BOOKMARK_SCORE);
          }
        }
      }
      
      return true;
    } catch {
      return false;
    }
  };

/**
 * Debug function to check current interaction scores
 */
export const debugUserInteractions = async (uaid: string): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('userInteractions')
      .select('gid, score')
      .eq('uaid', uaid)
      .order('score', { ascending: false });
      
    if (error) {
      return;
    }
    
    // Get genre names for better logging
    const gids = data?.map(interaction => interaction.gid) || [];
    const { data: genres } = await supabase
      .from('temp_genre')
      .select('gid, genrename')
      .in('gid', gids);
      
    const genreMap: Record<number, string> = {};
    if (genres) {
      genres.forEach(genre => {
        genreMap[genre.gid] = genre.genrename;
      });
    }
    
    // Log interactions with genre names for debugging
    console.log('User Interactions:');
    data?.forEach(interaction => {
      console.log(`Genre: ${genreMap[interaction.gid] || interaction.gid}, Score: ${interaction.score}`);
    });
    
  } catch {
    // No error handling needed for debug function
  }
};