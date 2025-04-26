// userInteractionsService.ts
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
      console.log(`[Score Log] Updating genre interaction: User ${uaid}, Genre ${gid}, Score change: ${scoreChange}`);
      
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
        console.error('Error fetching interaction:', fetchError);
        return false;
      }
      
      // Handle case with single existing entry
      if (existingInteraction) {
        // Update existing interaction
        const newScore = existingInteraction.score + scoreChange;
        
        // For negative scores, ensure we don't go below 0
        const finalScore = Math.max(0, newScore);
        
        console.log(`[Score Log] Updating existing interaction: Previous score ${existingInteraction.score}, New score calculation ${newScore}, Final stored score ${finalScore}`);
        
        const { error: updateError } = await supabase
          .from('userInteractions')
          .update({ score: finalScore })
          .eq('uiid', existingInteraction.uiid);
          
        if (updateError) {
          console.error('Error updating interaction:', updateError);
          return false;
        }
      } 
      // Handle case with no existing entries
      else {
        // Create new interaction, ensuring score is at least 0
        const initialScore = Math.max(0, scoreChange);
        console.log(`[Score Log] Creating new interaction with initial score ${initialScore}`);
        
        const { error: insertError } = await supabase
          .from('userInteractions')
          .insert({
            uaid,
            gid,
            score: initialScore
          });
          
        if (insertError) {
          console.error('Error creating interaction:', insertError);
          return false;
        }
      }
      
      console.log(`[Score Log] Successfully updated genre interaction`);
      return true;
    } catch (error) {
      console.error('Error in updateGenreInteraction:', error);
      return false;
    }
  };
/**
 * Updates user interactions when bookmarking or removing a book bookmark
 * Will only update scores for books (cfid = 2) and not videos
 */
export const handleBookmarkAction = async (
    uaid: string,
    cid: string,
    isAdding: boolean
  ): Promise<boolean> => {
    try {
      console.log(`[Score Log] ${isAdding ? 'Adding' : 'Removing'} bookmark: User ${uaid}, Content ${cid}`);
      
      // First, check if the content is a book (cfid = 2)
      const { data: content, error: contentError } = await supabase
        .from('temp_content')
        .select('cfid')
        .eq('cid', cid)
        .single();
        
      if (contentError) {
        console.error('Error fetching content type:', contentError);
        return false;
      }
      
      // Skip score update if not a book
      if (content.cfid !== 2) {
        console.log(`[Score Log] Content ${cid} is not a book (cfid=${content.cfid}). Skipping score update.`);
        return true;
      }
      
      // Get genres for the book
      const { data: contentGenres, error: genresError } = await supabase
        .from('temp_contentgenres')
        .select('gid')
        .eq('cid', cid);
        
      if (genresError) {
        console.error('Error fetching content genres:', genresError);
        return false;
      }
      
      const scoreChange = isAdding ? BOOKMARK_ADD_SCORE : BOOKMARK_REMOVE_SCORE;
      console.log(`[Score Log] Book bookmark action score change: ${scoreChange}, Affecting ${contentGenres?.length || 0} genres`);
      
      // Update interaction for each genre
      if (contentGenres && contentGenres.length > 0) {
        const updatePromises = contentGenres.map(({ gid }) => 
          updateGenreInteraction(uaid, gid, scoreChange)
        );
        
        await Promise.all(updatePromises);
      }
      
      console.log(`[Score Log] Book bookmark action completed`);
      return true;
    } catch (error) {
      console.error('Error in handleBookmarkAction:', error);
      return false;
    }
  };

/**
 * Updates user interactions when viewing a book (without incrementing views)
 */
export const handleBookView = async (
  uaid: string,
  cid: string
): Promise<boolean> => {
  try {
    console.log(`[Score Log] Recording book view: User ${uaid}, Content ${cid}`);
    
    // Get genres for the content
    const { data: contentGenres, error: genresError } = await supabase
      .from('temp_contentgenres')
      .select('gid')
      .eq('cid', cid);
      
    if (genresError) {
      console.error('Error fetching content genres:', genresError);
      return false;
    }
    
    console.log(`[Score Log] View action score change: ${VIEW_SCORE}, Affecting ${contentGenres?.length || 0} genres`);
    
    // Update interaction for each genre
    if (contentGenres && contentGenres.length > 0) {
      const updatePromises = contentGenres.map(({ gid }) => 
        updateGenreInteraction(uaid, gid, VIEW_SCORE)
      );
      
      await Promise.all(updatePromises);
    }
    
    // Skip the view count increment since views column doesn't exist
    console.log(`[Score Log] View action completed (view count not incremented - column not in database)`);
    return true;
  } catch (error) {
    console.error('Error in handleBookView:', error);
    return false;
  }
};

/**
 * Updates user interactions when searching for a book
 */
export const handleBookSearch = async (
  uaid: string,
  cid: string
): Promise<boolean> => {
  try {
    console.log(`[Score Log] Recording book search: User ${uaid}, Content ${cid}`);
    
    // Get genres for the content
    const { data: contentGenres, error: genresError } = await supabase
      .from('temp_contentgenres')
      .select('gid')
      .eq('cid', cid);
      
    if (genresError) {
      console.error('Error fetching content genres:', genresError);
      return false;
    }
    
    console.log(`[Score Log] Search action score change: ${SEARCH_SCORE}, Affecting ${contentGenres?.length || 0} genres`);
    
    // Update interaction for each genre
    if (contentGenres && contentGenres.length > 0) {
      const updatePromises = contentGenres.map(({ gid }) => 
        updateGenreInteraction(uaid, gid, SEARCH_SCORE)
      );
      
      await Promise.all(updatePromises);
    }
    
    console.log(`[Score Log] Search action completed`);
    return true;
  } catch (error) {
    console.error('Error in handleBookSearch:', error);
    return false;
  }
};

/**
 * Updates user interactions when adding/removing favorite genre
 * Preserves existing points from bookmarks, views, searches
 */
// Fixed handleFavoriteGenre function
// Fixed handleFavoriteGenre function - focused on preserving activity scores
// handleFavoriteGenre with detailed debugging logs
export const handleFavoriteGenre = async (
    uaid: string,
    gid: number,
    isAdding: boolean
  ): Promise<boolean> => {
    console.log(`[Score Log] ========== ${isAdding ? 'ADDING' : 'REMOVING'} FAVORITE GENRE ==========`);
    console.log(`[Score Log] User: ${uaid}, Genre: ${gid}`);
    
    try {
      // First, clean up any duplicate entries
      await cleanupDuplicateInteractions(uaid);
      
      // Get current interaction for this genre
      console.log(`[Score Log] Step 1: Fetching current interaction for genre ${gid}`);
      const { data: existingInteraction, error: fetchError } = await supabase
        .from('userInteractions')
        .select('uiid, score')
        .eq('uaid', uaid)
        .eq('gid', gid)
        .single();
        
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('[Score Log] Error fetching interaction:', fetchError);
        return false;
      }
  
      console.log(`[Score Log] Step 2: ${existingInteraction ? 'Found existing interaction' : 'No existing interaction found'}`);
      
      // Adding a favorite genre
      if (isAdding) {
        console.log(`[Score Log] Step 3: Processing ADD favorite genre action`);
        
        if (existingInteraction) {
          const currentScore = existingInteraction.score;
          const uiid = existingInteraction.uiid;
          
          console.log(`[Score Log] Step 3.1: Found existing interaction with score ${currentScore}`);
          
          // Check if it already has the bonus
          const hasBonus = currentScore >= FAVORITE_GENRE_ADD_SCORE;
          console.log(`[Score Log] Step 3.2: Checking if genre already has favorite bonus (${FAVORITE_GENRE_ADD_SCORE} points)`);
          console.log(`[Score Log] Current score: ${currentScore}, Has bonus already? ${hasBonus}`);
          
          // If it already has the bonus, don't add more
          if (hasBonus) {
            console.log(`[Score Log] Step 3.3: Genre already has favorite bonus, no change needed`);
            return true;
          }
  
          // Add the favorite bonus to existing activity score
          const newScore = currentScore + FAVORITE_GENRE_ADD_SCORE;
          console.log(`[Score Log] Step 3.4: Adding favorite bonus to existing score`);
          console.log(`[Score Log] Calculation: ${currentScore} (existing) + ${FAVORITE_GENRE_ADD_SCORE} (bonus) = ${newScore} (new score)`);
          
          console.log(`[Score Log] Step 3.5: Updating database with new score ${newScore}`);
          const { error: updateError } = await supabase
            .from('userInteractions')
            .update({ score: newScore })
            .eq('uiid', uiid);
            
          if (updateError) {
            console.error('[Score Log] Error updating interaction:', updateError);
            return false;
          }
          
          console.log(`[Score Log] Step 3.6: Successfully updated score to ${newScore}`);
          return true;
        } else {
          // No existing interaction, create a new one with just the favorite score
          console.log(`[Score Log] Step 3.1: No existing interaction found, creating new one`);
          console.log(`[Score Log] Step 3.2: Using initial score of ${FAVORITE_GENRE_ADD_SCORE}`);
          
          const { error: insertError } = await supabase
            .from('userInteractions')
            .insert({
              uaid,
              gid,
              score: FAVORITE_GENRE_ADD_SCORE
            });
            
          if (insertError) {
            console.error('[Score Log] Error creating interaction:', insertError);
            return false;
          }
          
          console.log(`[Score Log] Step 3.3: Successfully created new interaction with score ${FAVORITE_GENRE_ADD_SCORE}`);
          return true;
        }
      } 
      // Removing a favorite genre
      else {
        console.log(`[Score Log] Step 3: Processing REMOVE favorite genre action`);
        
        if (existingInteraction) {
          const currentScore = existingInteraction.score;
          const uiid = existingInteraction.uiid;
          
          console.log(`[Score Log] Step 3.1: Found existing interaction with score ${currentScore}`);
          
          // Only remove the favorite bonus if the score is high enough to have it
          if (currentScore >= FAVORITE_GENRE_ADD_SCORE) {
            const newScore = currentScore - FAVORITE_GENRE_ADD_SCORE;
            console.log(`[Score Log] Step 3.2: Score is high enough to remove favorite bonus`);
            console.log(`[Score Log] Calculation: ${currentScore} (current) - ${FAVORITE_GENRE_ADD_SCORE} (bonus) = ${newScore} (new score)`);
            
            console.log(`[Score Log] Step 3.3: Updating database with new score ${newScore}`);
            const { error: updateError } = await supabase
              .from('userInteractions')
              .update({ score: newScore })
              .eq('uiid', uiid);
              
            if (updateError) {
              console.error('[Score Log] Error updating interaction:', updateError);
              return false;
            }
            
            console.log(`[Score Log] Step 3.4: Successfully updated score to ${newScore}`);
          } else {
            console.log(`[Score Log] Step 3.2: Score ${currentScore} not high enough to have favorite bonus`);
            console.log(`[Score Log] Step 3.3: No change needed to score`);
          }
          
          return true;
        } else {
          // No existing interaction (shouldn't happen, but just in case)
          console.log(`[Score Log] Step 3.1: No existing interaction found for genre ${gid}`);
          console.log(`[Score Log] Step 3.2: No action needed`);
          return true;
        }
      }
    } catch (error) {
      console.error('[Score Log] Error in handleFavoriteGenre:', error);
      return false;
    } finally {
      console.log(`[Score Log] ========== FAVORITE GENRE OPERATION COMPLETED ==========`);
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
    console.log(`[Score Log] Blocking genre for child: User ${uaid}, Genre ${gid}`);
    
    // Check if interaction exists
    const { data: existingInteractions, error: fetchError } = await supabase
      .from('userInteractions')
      .select('uiid, score')
      .eq('uaid', uaid)
      .eq('gid', gid);
    
    if (fetchError) {
      console.error('Error fetching interaction:', fetchError);
      return false;
    }
    
    if (existingInteractions && existingInteractions.length > 0) {
      // Set score to 0 for the first entry
      const firstEntry = existingInteractions[0];
      console.log(`[Score Log] Resetting existing score ${firstEntry.score} to ${PARENT_BLOCKED_GENRE_SCORE}`);
      
      const { error: updateError } = await supabase
        .from('userInteractions')
        .update({ score: PARENT_BLOCKED_GENRE_SCORE })
        .eq('uiid', firstEntry.uiid);
        
      if (updateError) {
        console.error('Error updating interaction:', updateError);
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
          console.error('Error deleting duplicate interactions:', deleteError);
          // Continue anyway, we've at least updated the score correctly
        }
      }
    } else {
      // Create new interaction with score 0
      console.log(`[Score Log] Creating new blocked genre interaction with score ${PARENT_BLOCKED_GENRE_SCORE}`);
      
      const { error: insertError } = await supabase
        .from('userInteractions')
        .insert({
          uaid,
          gid,
          score: PARENT_BLOCKED_GENRE_SCORE
        });
        
      if (insertError) {
        console.error('Error creating interaction:', insertError);
        return false;
      }
    }
    
    console.log(`[Score Log] Genre blocking completed`);
    return true;
  } catch (error) {
    console.error('Error in handleParentBlockGenre:', error);
    return false;
  }
};

/**
 * Cleans up duplicate user interactions for a user
 * Use this to fix existing duplicates in the database
 */
export const cleanupDuplicateInteractions = async (uaid: string): Promise<boolean> => {
  try {
    console.log(`[Score Log] Starting cleanup of duplicate interactions for user ${uaid}`);
    
    // Get all user interactions for this user
    const { data: allInteractions, error: fetchError } = await supabase
      .from('userInteractions')
      .select('*')
      .eq('uaid', uaid);
      
    if (fetchError) {
      console.error('Error fetching interactions:', fetchError);
      return false;
    }
    
    if (!allInteractions || allInteractions.length === 0) {
      console.log('[Score Log] No interactions found for this user');
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
      
    console.log(`[Score Log] Found ${genresWithDuplicates.length} genres with duplicate entries`);
    
    // Process each genre with duplicates
    for (const gid of genresWithDuplicates) {
      const duplicates = interactionsByGenre[gid];
      console.log(`[Score Log] Processing ${duplicates.length} duplicates for genre ${gid}`);
      
      // Keep the entry with the highest score
      duplicates.sort((a, b) => {
        // First sort by score (higher first)
        if (b.score !== a.score) return b.score - a.score;
        return String(a.uiid).localeCompare(String(b.uiid));
      });
      
      const keepEntry = duplicates[0];
      const removeEntries = duplicates.slice(1);
      
      console.log(`[Score Log] Keeping entry with score ${keepEntry.score}, removing ${removeEntries.length} duplicates`);

      // Get IDs to remove
      const idsToRemove = removeEntries.map(entry => entry.uiid);
      
      // Delete duplicate entries
      const { error: deleteError } = await supabase
        .from('userInteractions')
        .delete()
        .in('uiid', idsToRemove);
        
      if (deleteError) {
        console.error(`Error deleting duplicates for genre ${gid}:`, deleteError);
        // Continue with other genres
      } else {
        console.log(`[Score Log] Successfully removed ${idsToRemove.length} duplicates for genre ${gid}`);
      }
    }
    
    console.log('[Score Log] Duplicate cleanup completed');
    return true;
  } catch (error) {
    console.error('Error in cleanupDuplicateInteractions:', error);
    return false;
  }
};

/**
 * Synchronizes favorite genres with userInteractions scores
 * Call this when loading user profile or after changes to ensure all favorites have proper scores
 * Preserves existing points from bookmarks, views, searches
 */
/**
 * Synchronizes favorite genres with userInteractions scores
 * Call this when loading user profile or after changes to ensure all favorites have proper scores
 * Preserves existing points from bookmarks, views, searches
 */
export const syncFavoriteGenres = async (uaid: string): Promise<boolean> => {
    try {
      console.log(`[Score Log] Syncing favorite genres for user ${uaid}`);
  
      // First, clean up any duplicate interactions
      await cleanupDuplicateInteractions(uaid);
  
      // Get child's favorite genres
      const { data: childDetails, error: childDetailsError } = await supabase
        .from('child_details')
        .select('favourite_genres')
        .eq('child_id', uaid)
        .single();
  
      if (childDetailsError) {
        console.error('Error fetching child details:', childDetailsError);
        return false;
      }
  
      // Get current user interactions
      const { data: userInteractions, error: interactionsError } = await supabase
        .from('userInteractions')
        .select('gid, score, uiid')
        .eq('uaid', uaid);
  
      if (interactionsError) {
        console.error('Error fetching user interactions:', interactionsError);
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
        console.error('Error fetching genres:', genresError);
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
  
      console.log(`[Score Log] Found ${favoriteGenreIds.length} favorite genres to sync`);
  
      // Find genres with favorite-level scores (>= 50) that aren't in the favorites list
      // These are genres that need to have their favorite bonus removed
      const genresWithFavoriteScore = Array.from(interactionsMap.entries())
        .filter(entry => entry[1] >= FAVORITE_GENRE_ADD_SCORE)
        .map(entry => entry[0]);
  
      console.log(`[Score Log] Found ${genresWithFavoriteScore.length} genres with favorite-level scores`);
  
      // Process genres that have favorite-level scores but are no longer in favorites
      for (const gid of genresWithFavoriteScore) {
        if (!favoriteGenreIds.includes(gid)) {
          console.log(`[Score Log] Genre ${genreIdToName.get(gid) || gid} has favorite-level score but is no longer a favorite`);
          
          const uiid = interactionUiidMap.get(gid);
          if (uiid) {
            const currentScore = interactionsMap.get(gid) || 0;
            
            // Use FAVORITE_GENRE_REMOVE_SCORE to remove favorite bonus points
            // But ensure we don't go below 0
            const newScore = Math.max(0, currentScore + FAVORITE_GENRE_REMOVE_SCORE);
            
            console.log(`[Score Log] Removing favorite bonus: ${currentScore} + (${FAVORITE_GENRE_REMOVE_SCORE}) = ${newScore}`);
            
            const { error: updateError } = await supabase
              .from('userInteractions')
              .update({ score: newScore })
              .eq('uiid', uiid);
              
            if (updateError) {
              console.error(`Error updating score for genre ${gid}:`, updateError);
              // Continue with other genres
            }
          }
        }
      }
  
      // For each favorite genre, ensure it has AT LEAST the favorite score (preserve other points)
      for (const genreId of favoriteGenreIds) {
        const currentScore = interactionsMap.get(genreId) || 0;
        console.log(`[Score Log] Checking genre ${genreIdToName.get(genreId) || genreId}: Current score = ${currentScore}`);
  
        // Ensure the score is at least FAVORITE_GENRE_ADD_SCORE
        if (currentScore < FAVORITE_GENRE_ADD_SCORE) {
          const pointsToAdd = FAVORITE_GENRE_ADD_SCORE - currentScore;
          const newScore = currentScore + pointsToAdd;
  
          console.log(`[Score Log] Adding ${pointsToAdd} points to genre ${genreIdToName.get(genreId) || genreId} to reach favorite score`);
  
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
        } else {
          console.log(`[Score Log] Genre ${genreIdToName.get(genreId) || genreId} already has sufficient score (${currentScore})`);
        }
      }
  
      console.log('[Score Log] Favorite genre sync completed');
      return true;
    } catch (error) {
      console.error('Error in syncFavoriteGenres:', error);
      return false;
    }
  };
/**
 * Syncs user interaction scores for all existing book bookmarks (content id = 2 only)
 * Call this to ensure all book bookmarks have proper scores in the interactions table
 */
export const syncExistingBookmarks = async (uaid: string): Promise<boolean> => {
    try {
      console.log(`[Score Log] Syncing scores for existing book bookmarks for user ${uaid}`);
      
      // Get all current bookmarks for the user
      const { data: bookmarks, error: bookmarksError } = await supabase
        .from('temp_bookmark')
        .select('cid')
        .eq('uaid', uaid);
        
      if (bookmarksError) {
        console.error('Error fetching bookmarks:', bookmarksError);
        return false;
      }
      
      if (!bookmarks || bookmarks.length === 0) {
        console.log('[Score Log] No bookmarks found to sync');
        return true;
      }
      
      // Get the content types for these bookmarks to filter for books only (cfid = 2)
      const bookmarkCids = bookmarks.map(b => b.cid);
      const { data: contentTypes, error: contentTypesError } = await supabase
        .from('temp_content')
        .select('cid, cfid')
        .in('cid', bookmarkCids);
        
      if (contentTypesError) {
        console.error('Error fetching content types:', contentTypesError);
        return false;
      }
      
      // Filter to only include books (cfid = 2)
      const bookCids = contentTypes
        .filter(content => content.cfid === 2)
        .map(content => content.cid);
        
      console.log(`[Score Log] Found ${bookCids.length} book bookmarks out of ${bookmarks.length} total bookmarks`);
      
      if (bookCids.length === 0) {
        console.log('[Score Log] No book bookmarks found to sync');
        return true;
      }
      
      // Get all genres for these book bookmarks
      const { data: contentGenres, error: genresError } = await supabase
        .from('temp_contentgenres')
        .select('cid, gid')
        .in('cid', bookCids);
        
      if (genresError) {
        console.error('Error fetching content genres:', genresError);
        return false;
      }
      
      if (!contentGenres || contentGenres.length === 0) {
        console.log('[Score Log] No genres found for book bookmarks');
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
        console.error('Error fetching interactions:', interactionsError);
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
      
      // Check and sync scores for each book bookmark
      const BOOKMARK_SCORE = 5;  // Score for a bookmark
      
      for (const cid of bookCids) {
        const genres = genresByCid[cid] || [];
        console.log(`[Score Log] Checking book bookmark ${cid} with ${genres.length} genres`);
        
        for (const gid of genres) {
          const currentScore = interactionScoreMap.get(gid) || 0;
          const hasBookmarkScore = currentScore >= BOOKMARK_SCORE;
          
          if (!hasBookmarkScore) {
            console.log(`[Score Log] Adding bookmark score to genre ${gid} for book bookmark ${cid}`);
            await updateGenreInteraction(uaid, gid, BOOKMARK_SCORE);
          } else {
            console.log(`[Score Log] Genre ${gid} already has sufficient score (${currentScore})`);
          }
        }
      }
      
      console.log('[Score Log] Book bookmark sync completed');
      return true;
    } catch (error) {
      console.error('Error in syncExistingBookmarks:', error);
      return false;
    }
  };

/**
 * Debug function to check current interaction scores
 */
export const debugUserInteractions = async (uaid: string): Promise<void> => {
  try {
    console.log(`[Score Debug] Fetching all interaction scores for user ${uaid}`);
    
    const { data, error } = await supabase
      .from('userInteractions')
      .select('gid, score')
      .eq('uaid', uaid)
      .order('score', { ascending: false });
      
    if (error) {
      console.error('Error fetching user interactions:', error);
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
    
    console.log('[Score Debug] Current User Interaction Scores:');
    console.table((data || []).map(interaction => ({
      Genre: genreMap[interaction.gid] || `Genre ID: ${interaction.gid}`,
      Score: interaction.score,
      GenreID: interaction.gid
    })));
    
  } catch (error) {
    console.error('Error in debugUserInteractions:', error);
  }
};