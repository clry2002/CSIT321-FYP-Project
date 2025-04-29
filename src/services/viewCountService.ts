// services/viewCountService.ts
import { supabase } from '@/lib/supabase';
import { handleBookView } from './userInteractionsService';

/**
 * Updates view count for a specific content item
 * Also updates user interactions if user is logged in
 */
export const incrementViewCount = async (
  contentId: string,
  userId?: string
): Promise<boolean> => {
  try {
    console.log(`Incrementing view count for content ID: ${contentId}`);
    
    // 1. Get current content info
    const { data: content, error: contentError } = await supabase
      .from('temp_content')
      .select('viewCount, cfid')
      .eq('cid', contentId)
      .single();
      
    if (contentError) {
      console.error('Error fetching content:', contentError);
      return false;
    }
    
    // Set default viewCount to 0 if it's null
    const currentViewCount = content.viewCount || 0;
    
    // 2. Update the view count
    const { error: updateError } = await supabase
      .from('temp_content')
      .update({ viewCount: currentViewCount + 1 })
      .eq('cid', contentId);
      
    if (updateError) {
      console.error('Error updating view count:', updateError);
      return false;
    }
    
    // 3. If user is logged in, update user interactions
    if (userId) {
      // Get user account ID for the child profile
      const { data: userAccount, error: userError } = await supabase
        .from('user_account')
        .select('id')
        .eq('user_id', userId)
        .eq('upid', 3) // Child profile
        .single();
        
      if (userError) {
        console.error('Error fetching user account:', userError);
        // Continue even if user account not found - view count was updated
      } else if (userAccount) {
        // Record the view in user interactions
        await handleBookView(userAccount.id.toString(), contentId);
      }
    }
    
    console.log(`View count successfully updated for content ${contentId} to ${currentViewCount + 1}`);
    return true;
  } catch (error) {
    console.error('Error in incrementViewCount:', error);
    return false;
  }
};

/**
 * Gets the current view count for a content item
 */
export const getViewCount = async (contentId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('temp_content')
      .select('viewCount')
      .eq('cid', contentId)
      .maybeSingle();
      
    if (error) {
      console.error('Error fetching view count:', error);
      return 0;
    }
    
    return data?.viewCount || 0;
  } catch (error) {
    console.error('Error in getViewCount:', error);
    return 0;
  }
};