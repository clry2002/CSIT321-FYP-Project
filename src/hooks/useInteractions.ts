// hooks/useInteractions.ts
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  handleBookmarkAction, 
  handleBookView, 
  handleBookSearch, 
  handleFavoriteGenre, 
  handleParentBlockGenre,
  syncFavoriteGenres,
  debugUserInteractions,
  cleanupDuplicateInteractions,
  syncExistingBookmarks
} from '../services/userInteractionsService';
import { incrementViewCount, getViewCount } from '../services/viewCountService';

// Define types for our function parameters
type UaidType = string;
type CidType = string;
type GidType = number;

export const useInteractions = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Add or remove a bookmark and update interactions
   */
  const toggleBookmark = async (cid: CidType, isAdding: boolean) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return false;
      }
      
      // Get user account ID
      const { data: userAccount, error: userError } = await supabase
        .from('user_account')
        .select('id')
        .eq('user_id', user.id)
        .single();
        
      if (userError || !userAccount) {
        setError('Failed to get user account');
        return false;
      }
      
      const uaid = userAccount.id;
      
      // Update bookmark in database
      if (isAdding) {
        const { error: bookmarkError } = await supabase
          .from('temp_bookmark')
          .insert({ uaid, cid });
          
        if (bookmarkError) {
          setError('Failed to add bookmark');
          return false;
        }
      } else {
        const { error: bookmarkError } = await supabase
          .from('temp_bookmark')
          .delete()
          .eq('uaid', uaid)
          .eq('cid', cid);
          
        if (bookmarkError) {
          setError('Failed to remove bookmark');
          return false;
        }
      }
      
      // Update interactions
      const success = await handleBookmarkAction(uaid, cid, isAdding);
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Record a book view, update interactions, and increment view count
   */
  const recordBookView = async (cid: CidType) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Get user account ID
        const { data: userAccount, error: userError } = await supabase
          .from('user_account')
          .select('id')
          .eq('user_id', user.id)
          .single();
          
        if (userError || !userAccount) {
          setError('Failed to get user account');
          // Still continue to increment view count even if user account retrieval fails
        } else {
          const uaid = userAccount.id;
          // Update interactions
          await handleBookView(uaid, cid);
        }
        
        // Increment view count with user ID
        await incrementViewCount(cid, user.id);
      } else {
        // Increment view count anonymously
        await incrementViewCount(cid);
      }
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get the current view count for a content item
   */
  const getContentViewCount = async (cid: CidType) => {
    try {
      return await getViewCount(cid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return 0;
    }
  };

  /**
   * Record a book search and update interactions
   */
  const recordBookSearch = async (cid: CidType) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return false;
      }
      
      // Get user account ID
      const { data: userAccount, error: userError } = await supabase
        .from('user_account')
        .select('id')
        .eq('user_id', user.id)
        .single();
        
      if (userError || !userAccount) {
        setError('Failed to get user account');
        return false;
      }
      
      const uaid = userAccount.id;
      
      // Update interactions
      const success = await handleBookSearch(uaid, cid);
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  };

 /**
 * Add or remove a favorite genre and update interactions
 */
 const toggleFavoriteGenre = async (gid: GidType, isAdding: boolean) => {
    console.log(`[DEBUG] ========== TOGGLING FAVORITE GENRE ==========`);
    console.log(`[DEBUG] Action: ${isAdding ? 'Adding' : 'Removing'} genre ${gid} to favorites`);
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`[DEBUG] Step 1: Authenticating user`);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log(`[DEBUG] Error: User not authenticated`);
        setError('User not authenticated');
        return false;
      }
      
      // Get user account ID
      console.log(`[DEBUG] Step 2: Getting user account ID`);
      const { data: userAccount, error: userError } = await supabase
        .from('user_account')
        .select('id')
        .eq('user_id', user.id)
        .single();
        
      if (userError || !userAccount) {
        console.log(`[DEBUG] Error: Failed to get user account`, userError);
        setError('Failed to get user account');
        return false;
      }
      
      const uaid = userAccount.id;
      console.log(`[DEBUG] User account ID: ${uaid}`);
      
      // Clean up any duplicates first
      await cleanupDuplicateInteractions(uaid);
      
      // Get child details from child_details table
      console.log(`[DEBUG] Step 3: Getting child details`);
      const { data: childDetails, error: childDetailsError } = await supabase
        .from('child_details')
        .select('id, favourite_genres')
        .eq('child_id', uaid)
        .single();
        
      if (childDetailsError && childDetailsError.code !== 'PGRST116') {
        console.log(`[DEBUG] Error: Failed to get child details`, childDetailsError);
        setError('Failed to get child details');
        return false;
      }
      
      // Convert genre ID to string for compatibility with text[] database type
      const gidAsString = gid.toString();
      console.log(`[DEBUG] Genre ID as string: ${gidAsString}`);
      
      // Child details not found - create new record
      if (!childDetails) {
        console.log(`[DEBUG] Step 4: Child details not found, creating new record`);
        const newFavoriteGenres = isAdding ? [gidAsString] : [];
        console.log(`[DEBUG] New favorite genres: ${JSON.stringify(newFavoriteGenres)}`);
        
        const { error: insertError } = await supabase
          .from('child_details')
          .insert({
            child_id: uaid,
            favourite_genres: newFavoriteGenres
          });
          
        if (insertError) {
          console.log(`[DEBUG] Error: Failed to create child details`, insertError);
          setError('Failed to create child details');
          return false;
        }
      } else {
        console.log(`[DEBUG] Step 4: Found existing child details, updating favorites`);
        // Get current favorite genres
        let favoriteGenres = childDetails.favourite_genres || [];
        console.log(`[DEBUG] Current favorite genres: ${JSON.stringify(favoriteGenres)}`);
        
        // Check if genre is already a favorite
        const isAlreadyFavorite = favoriteGenres.includes(gidAsString);
        console.log(`[DEBUG] Is genre ${gid} already a favorite? ${isAlreadyFavorite}`);
        
        if (isAdding && !isAlreadyFavorite) {
          // Only add if not already a favorite
          console.log(`[DEBUG] Adding genre ${gid} to favorites list`);
          favoriteGenres = [...favoriteGenres, gidAsString];
        } else if (!isAdding && isAlreadyFavorite) {
          // Only remove if it is a favorite
          console.log(`[DEBUG] Removing genre ${gid} from favorites list`);
          favoriteGenres = favoriteGenres.filter((id: string) => id !== gidAsString);
        } else {
          // No change needed to the favorites list
          console.log(`[DEBUG] No change needed to favorites list`);
          if (isAdding) {
            // But still make sure the score is correct
            console.log(`[DEBUG] Still handling favorite genre to ensure score is correct`);
            await handleFavoriteGenre(uaid, gid, true);
            return true;
          }
          return true;
        }
        
        // Update child details
        console.log(`[DEBUG] Step 5: Updating child details with new favorites list`);
        console.log(`[DEBUG] New favorite genres: ${JSON.stringify(favoriteGenres)}`);
        
        const { error: updateError } = await supabase
          .from('child_details')
          .update({ favourite_genres: favoriteGenres })
          .eq('id', childDetails.id);
          
        if (updateError) {
          console.log(`[DEBUG] Error: Failed to update favorite genres`, updateError);
          setError('Failed to update favorite genres');
          return false;
        }
      }
      
      // Update interactions using the service function
      console.log(`[DEBUG] Step 6: Updating interaction scores for genre ${gid}`);
      console.log(`[DEBUG] Before handleFavoriteGenre - Getting current scores:`);
      await debugUserInteractions(uaid);
      
      // Update the score with the modified handleFavoriteGenre function
      await handleFavoriteGenre(uaid, gid, isAdding);
      
      console.log(`[DEBUG] After handleFavoriteGenre - Updated scores:`);
      await debugUserInteractions(uaid);
      
      return true;
    } catch (err) {
      console.log(`[DEBUG] Error in toggleFavoriteGenre:`, err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      console.log(`[DEBUG] ========== TOGGLE FAVORITE GENRE COMPLETED ==========`);
      setLoading(false);
    }
  };
  /**
   * Set a genre as blocked by parent
   */
  const blockGenreByParent = async (uaid: UaidType, gid: GidType) => {
    setLoading(true);
    setError(null);
    
    try {
      // Update interactions
      const success = await handleParentBlockGenre(uaid, gid);
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sync favorite genres with interaction scores
   */
  const syncFavoriteGenresForUser = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return false;
      }
      
      // Get user account ID
      const { data: userAccount, error: userError } = await supabase
        .from('user_account')
        .select('id')
        .eq('user_id', user.id)
        .single();
        
      if (userError || !userAccount) {
        setError('Failed to get user account');
        return false;
      }
      
      const uaid = userAccount.id;
      return await syncFavoriteGenres(uaid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const syncExistingBookmark = async (uaid: UaidType): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return false;
      }
      
      // Get user account ID
      const { data: userAccount, error: userError } = await supabase
        .from('user_account')
        .select('id')
        .eq('user_id', user.id)
        .single();
        
      if (userError || !userAccount) {
        setError('Failed to get user account');
        return false;
      }
      
      uaid = userAccount.id;
      return await syncExistingBookmarks(uaid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Debug user interaction scores - useful for development
   */
  const debugUserScores = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: userAccount } = await supabase
        .from('user_account')
        .select('id')
        .eq('user_id', user.id)
        .single();
        
      if (!userAccount) return;
      
      await debugUserInteractions(userAccount.id);
    } catch (err) {
      console.error('Error in debugUserScores:', err);
    }
  };

  return {
    loading,
    error,
    toggleBookmark,
    recordBookView,
    recordBookSearch,
    toggleFavoriteGenre,
    blockGenreByParent,
    syncFavoriteGenresForUser,
    debugUserScores,
    syncExistingBookmark,
    getContentViewCount 
  };
};