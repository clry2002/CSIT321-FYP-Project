// services/trendingPopularService.tsx
import { supabase } from '@/lib/supabase';
import { Book } from '../types/database.types';

/**
 * Gets trending books from the past 30 days (newer content)
 * Sorted by view count, filtered by user age and blocked genres
 */
export const getTrendingBooks = async (): Promise<Book[]> => {
  try {
    console.log("Starting getTrendingBooks...");
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No authenticated user found');
      return [];
    }

    // Get uaid and user age
    const { data: userAccount, error: userAccountError } = await supabase
      .from('user_account')
      .select('id, age')
      .eq('user_id', user.id)
      .single();
      
    if (userAccountError || !userAccount) {
      console.error('Error fetching user account info:', userAccountError);
      return [];
    }
    
    const uaid = userAccount.id;
    const userAge = userAccount.age || 0;
    console.log(`User ID: ${uaid}, Age: ${userAge}`);
    
    // Calculate date 5 days ago for trending (recent) content
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const fiveDaysAgoStr = fiveDaysAgo.toISOString();
    console.log(`Filtering for books approved after: ${fiveDaysAgoStr}`);
    
    // Get trending books - RECENT CONTENT (approved in the last 30 days)
    const { data: trendingBooks, error: trendingError } = await supabase
      .from('temp_content')
      .select('*')
      .eq('cfid', 2) // Books only
      .eq('status', 'approved')
      .gte('decisiondate', fiveDaysAgoStr) // Only recent books (last 30 days) - using decisiondate
      .lte('minimumage', userAge) // Age-appropriate
      .order('viewCount', { ascending: false }) // Sort by view count
      .limit(20); // Get more for filtering
    
    if (trendingError) {
      console.error('Error fetching trending books:', trendingError);
      return [];
    }
    
    // FALLBACK: If not enough recent books, use the most recently created books
    if (!trendingBooks || trendingBooks.length < 5) {
      console.log('Not enough trending books found in the last 30 days, using fallback');
      
      const { data: recentBooks, error: recentError } = await supabase
        .from('temp_content')
        .select('*')
        .eq('cfid', 2) // Books only
        .eq('status', 'approved')
        .lte('minimumage', userAge) // Age-appropriate
        .order('decisiondate', { ascending: false }) // Sort by most recent approval date
        .limit(20);
        
      if (recentError) {
        console.error('Error fetching recent books fallback:', recentError);
        return [];
      }
      
      if (!recentBooks || recentBooks.length === 0) {
        console.log('No recent books found even with fallback');
        return [];
      }
      
      console.log(`Found ${recentBooks.length} recent books with fallback`);
      
      // Filter blocked genres using the fallback books
      return await filterBlockedGenres(recentBooks, uaid);
    }
    
    console.log(`Found ${trendingBooks.length} trending books from the last 30 days`);
    
    // Filter blocked genres using the trending books
    return await filterBlockedGenres(trendingBooks, uaid);
    
  } catch (error) {
    console.error('Error in getTrendingBooks:', error);
    return [];
  }
};

/**
 * Gets all-time popular books EXCEPT recent ones
 * Sorted by view count, filtered by user age and blocked genres
 */
export const getPopularBooks = async (): Promise<Book[]> => {
  try {
    console.log("Starting getPopularBooks...");
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No authenticated user found');
      return [];
    }

    // Get uaid and user age
    const { data: userAccount, error: userAccountError } = await supabase
      .from('user_account')
      .select('id, age')
      .eq('user_id', user.id)
      .single();
      
    if (userAccountError || !userAccount) {
      console.error('Error fetching user account info:', userAccountError);
      return [];
    }
    
    const uaid = userAccount.id;
    const userAge = userAccount.age || 0;
    console.log(`User ID: ${uaid}, Age: ${userAge}`);
    
    // Calculate date 15 days ago to exclude very recent books
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    const fifteenDaysAgoStr = fifteenDaysAgo.toISOString();
    console.log(`Excluding books approved after: ${fifteenDaysAgoStr}`);
    
    // Get popular books EXCLUDING recent ones (older than 15 days)
    const { data: popularBooks, error: popularError } = await supabase
      .from('temp_content')
      .select('*')
      .eq('cfid', 2) // Books only
      .eq('status', 'approved')
      .lt('decisiondate', fifteenDaysAgoStr) // Only books older than 15 days - using decisiondate
      .lte('minimumage', userAge) // Age-appropriate
      .order('viewCount', { ascending: false }) // Sort by view count
      .limit(20); // Get more for filtering
      
    if (popularError) {
      console.error('Error fetching popular books:', popularError);
      return [];
    }
    
    // FALLBACK: If not enough older books, use all books sorted by view count
    if (!popularBooks || popularBooks.length < 5) {
      console.log('Not enough popular older books, using fallback with all books');
      
      const { data: allTimeBooks, error: allTimeError } = await supabase
        .from('temp_content')
        .select('*')
        .eq('cfid', 2) // Books only
        .eq('status', 'approved')
        .lte('minimumage', userAge) // Age-appropriate
        .order('viewCount', { ascending: false }) // Sort by view count
        .limit(20);
        
      if (allTimeError) {
        console.error('Error fetching all-time popular books fallback:', allTimeError);
        return [];
      }
      
      if (!allTimeBooks || allTimeBooks.length === 0) {
        console.log('No books found even with fallback');
        return [];
      }
      
      console.log(`Found ${allTimeBooks.length} books with fallback`);
      
      // Filter blocked genres using the fallback books
      return await filterBlockedGenres(allTimeBooks, uaid);
    }
    
    console.log(`Found ${popularBooks.length} popular books older than 15 days`);
    
    // Filter blocked genres using the popular books
    return await filterBlockedGenres(popularBooks, uaid);
    
  } catch (error) {
    console.error('Error in getPopularBooks:', error);
    return [];
  }
};

/**
 * Helper function to filter out books with blocked genres
 */
async function filterBlockedGenres(books: Book[], uaid: string): Promise<Book[]> {
  // Get blocked genres for this user from blockedgenres table
  const { data: blockedGenresData, error: blockedGenresError } = await supabase
    .from('blockedgenres')
    .select('genreid')
    .eq('child_id', uaid);
    
  if (blockedGenresError) {
    console.error('Error fetching blocked genres:', blockedGenresError);
    // Continue with no blocked genres filter
    return books.slice(0, 10);
  }
  
  const blockedGenreIds = blockedGenresData?.map(item => item.genreid) || [];
  console.log(`Blocked genre IDs: ${blockedGenreIds.join(', ') || 'none'}`);
  
  // If no blocked genres, return books directly
  if (blockedGenreIds.length === 0) {
    console.log('No blocked genres found, returning all books');
    return books.slice(0, 10);
  }
  
  // Filter out books with blocked genres
  const filteredBooks = await Promise.all(
    books.map(async (book) => {
      // Get genres for this book
      const { data: bookGenres, error: genresError } = await supabase
        .from('temp_contentgenres')
        .select('gid')
        .eq('cid', book.cid);
        
      if (genresError || !bookGenres) {
        console.log(`Error fetching genres for book ${book.cid}:`, genresError);
        return true; // Include book by default if we can't get genres
      }
      
      // Check if book contains any blocked genre
      const bookGenreIds = bookGenres.map(g => g.gid);
      const hasBlockedGenre = bookGenreIds.some(gid => 
        blockedGenreIds.includes(gid)
      );
      
      // Keep book if it has no blocked genres
      return !hasBlockedGenre;
    })
  );
  
  // Return filtered books
  const finalBooks = books.filter((_, index) => filteredBooks[index]);
  console.log(`Returning ${finalBooks.length} books after filtering blocked genres`);
  return finalBooks.slice(0, 10);
}