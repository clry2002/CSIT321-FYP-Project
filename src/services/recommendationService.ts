// services/recommendationService.tsx
import { supabase } from '@/lib/supabase';
import { Book } from '../types/database.types';

/**
 * Fetches recommended books for a user with a three-tier approach:
 * 1. Collaborative filtering based on user interactions
 * 2. Content-based filtering using user's favorite genres
 * 3. Default trending/popular books with randomization
 * 
 */
export const getRecommendedBooks = async (): Promise<Book[]> => {
  try {
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
    const userAge = userAccount.age;
    console.log('User ID:', uaid, 'Age:', userAge);

    // Get user interactions to check if they have any
    const { data: userInteractions, error: interactionsError } = await supabase
      .from('userInteractions')
      .select('uiid')
      .eq('uaid', uaid)
      .limit(1);
      
    if (interactionsError) {
      console.error('Error fetching user interactions:', interactionsError);
      // Continue with fallback recommendations
    }
    
    const hasInteractions = userInteractions && userInteractions.length > 0;
    console.log('Has interactions:', hasInteractions);
    
    // APPROACH 1: If user has interactions, use the collaborative filtering algorithm
    if (hasInteractions) {
      console.log('Using collaborative filtering for recommendations');
      // Get top 5 genres
      const { data: topGenres, error: genreError } = await supabase
        .from('userInteractions')
        .select('gid')
        .eq('uaid', uaid)
        .order('score', { ascending: false })
        .limit(5);
      if (genreError || !topGenres || topGenres.length === 0) {
        console.log('No top genres found, switching to fallback recommendation method');
        // Fall through to content-based or default recommendations
      } else {
        const topGenreIds = topGenres.map(g => g.gid);
        console.log('topGenreIds:', topGenreIds);

        // Get similar users
        const { data: similarUsers, error: similarUsersError } = await supabase
          .from('userInteractions')
          .select('uaid')
          .in('gid', topGenreIds)
          .neq('uaid', uaid);
        if (similarUsersError || !similarUsers || similarUsers.length === 0) {
          console.log('No similar users found, switching to fallback recommendation method');
          // Fall through to content-based or default recommendations
        } else {
          const similarUaidList = [...new Set(similarUsers.map(u => u.uaid))];
          console.log('similarUaidList:', similarUaidList);

          // Get similar user bookmarks
          const { data: similarBookmarks, error: bookmarksError } = await supabase
            .from('temp_bookmark')
            .select('cid')
            .in('uaid', similarUaidList);
          if (bookmarksError || !similarBookmarks || similarBookmarks.length === 0) {
            console.log('No similar bookmarks found, switching to fallback recommendation method');
            // Fall through to content-based or default recommendations
          } else {
            console.log('similarBookmarks:', similarBookmarks);

            // Age-based filtering
            const bookIds = similarBookmarks.map(b => b.cid);
            const { data: bookAges, error: bookAgesError } = await supabase
              .from('temp_content')
              .select('cid, minimumage')
              .in('cid', bookIds);
            if (bookAgesError) {
              console.error('Failed to fetch book minimum ages:', bookAgesError);
              // Fall through to content-based or default recommendations
            } else {
              const allowedBookIds = bookAges
                .filter(book => book.minimumage <= userAge)
                .map(book => book.cid);
              const ageFilteredBookmarks = similarBookmarks.filter(b =>
                allowedBookIds.includes(b.cid)
              );
              console.log('allowedBookIds:', allowedBookIds);

              // Get user bookmarks
              const { data: userBookmarks } = await supabase
                .from('temp_bookmark')
                .select('cid')
                .eq('uaid', uaid);
              const userCid = userBookmarks?.map(b => b.cid) || [];
              console.log('userCid:', userCid);

              // Filter out books the user already bookmarked
              const filteredCids = ageFilteredBookmarks
                .map(b => b.cid)
                .filter(bookId => !userCid.includes(bookId));
              console.log('filteredCids:', filteredCids);

              if (filteredCids.length === 0) {
                console.log('No filtered content IDs, switching to fallback recommendation method');
                // Fall through to content-based or default recommendations
              } else {
                // Rank by frequency
                const contentFrequency: Record<string, number> = {};
                filteredCids.forEach((bookId: string) => {
                  contentFrequency[bookId] = (contentFrequency[bookId] || 0) + 1;
                });
                const rankedContentIds = Object.entries(contentFrequency)
                  .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
                  .map(([bookId]) => bookId);
                console.log('rankedContentIds:', rankedContentIds);

                // Genre relevance filtering - won't include books from bookmark, if book genre is not in user's top 5
                const filteredRecommendedBooks = await Promise.all(
                  rankedContentIds.map(async (bookId) => {
                    const { data: bookGenres, error: genreError } = await supabase
                      .from('temp_contentgenres')
                      .select('gid')
                      .eq('cid', bookId);
                    if (genreError || !bookGenres) {
                      console.error('Error fetching genre(s) for content:', genreError);
                      return false;
                    }
                    return bookGenres.some(genre => topGenreIds.includes(genre.gid));
                  })
                );
                const finalFilteredContentIds = rankedContentIds.filter((bookId, index) => filteredRecommendedBooks[index]);
                console.log('finalFilteredContentIds:', finalFilteredContentIds);

                if (finalFilteredContentIds.length > 0) {
                  // Fetch content details with book filter (cfid = 2)
                  const { data: recommendedBooks, error: bookDetailsError } = await supabase
                    .from('temp_content')
                    .select('*')
                    .in('cid', finalFilteredContentIds)
                    .eq('cfid', 2) // Filter to only show books (cfid = 2)
                    .limit(10);
                    
                  if (!bookDetailsError && recommendedBooks && recommendedBooks.length > 0) {
                    console.log("recommendedBooks from collaborative filtering:", recommendedBooks);
                    return recommendedBooks;
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // APPROACH 2: Content-based recommendations using favorite genres
    // Check if the user has favorite genres set
    console.log('Trying content-based recommendations from favorite genres');
    const { data: childDetails, error: childDetailsError } = await supabase
      .from('child_details')
      .select('favourite_genres')
      .eq('child_id', uaid)
      .single();
      
    if (childDetailsError && childDetailsError.code !== 'PGRST116') {
      console.error('Error fetching child details:', childDetailsError);
      // Continue to random recommendations
    }
    
    const favoriteGenres = childDetails?.favourite_genres || [];
    
    if (favoriteGenres.length > 0) {
      console.log('User has favorite genres:', favoriteGenres);
      
      // Get genre IDs from names
      const { data: genres, error: genresError } = await supabase
        .from('temp_genre')
        .select('gid, genrename');
      if (genresError) {
        console.error('Error fetching genres:', genresError);
        // Continue to random recommendations
      } else {
        // Create maps to convert between genre names, IDs and string IDs
        const genreNameToId = new Map();
        genres?.forEach(genre => {
          genreNameToId.set(genre.genrename, genre.gid);
        });
        
        // Convert favorite genres to IDs
        const favoriteGenreIds = favoriteGenres
          .map((genre: string) => {
            // If genre is stored as a name
            if (genreNameToId.has(genre)) {
              return genreNameToId.get(genre);
            }
            // If genre is stored as a string ID
            return parseInt(genre, 10);
          })
          .filter((id: number | undefined) => id !== undefined && !isNaN(id));
          
        console.log('Favorite genre IDs:', favoriteGenreIds);
        
        if (favoriteGenreIds.length > 0) {
          // Get content IDs for these genres
          const { data: contentGenres, error: contentGenresError } = await supabase
            .from('temp_contentgenres')
            .select('cid')
            .in('gid', favoriteGenreIds);
            
          if (contentGenresError) {
            console.error('Error fetching content genres:', contentGenresError);
            // Continue to random recommendations
          } else if (contentGenres && contentGenres.length > 0) {
            // Get unique content IDs
            const contentIds = [...new Set(contentGenres.map(cg => cg.cid))];
            console.log('Content IDs from favorite genres:', contentIds);
            
            // Get user bookmarks to filter out
            const { data: userBookmarks } = await supabase
              .from('temp_bookmark')
              .select('cid')
              .eq('uaid', uaid);
            const userBookmarkIds = userBookmarks?.map(b => b.cid) || [];
            
            // Filter out already bookmarked content
            const filteredContentIds = contentIds.filter(cid => !userBookmarkIds.includes(cid));
            
            if (filteredContentIds.length > 0) {
              // Fetch book details with age filter
              const { data: genreRecommendedBooks, error: booksError } = await supabase
                .from('temp_content')
                .select('*')
                .in('cid', filteredContentIds)
                .eq('cfid', 2) // Filter to only show books (cfid = 2)
                .lte('minimumage', userAge) // Age-appropriate filter
                .order('cid', { ascending: false }) // Just to have a stable order
                .limit(10);
                
              if (!booksError && genreRecommendedBooks && genreRecommendedBooks.length > 0) {
                // Randomize the order for variety
                const shuffledBooks = [...genreRecommendedBooks].sort(() => Math.random() - 0.5);
                console.log('Found books based on favorite genres:', shuffledBooks);
                return shuffledBooks;
              }
            }
          }
        }
      }
    }
    
    // APPROACH 3: Default recommendations - popular or trending books
    console.log('Using default trending book recommendations');
    
    // Get popular books appropriate for the user's age
    const { data: trendingBooks, error: trendingError } = await supabase
      .from('temp_content')
      .select('*')
      .eq('cfid', 2) // Books only
      .lte('minimumage', userAge) // Age-appropriate
      .limit(15); // Get a few more for randomization
      
    if (trendingError) {
      console.error('Error fetching trending books:', trendingError);
      return [];
    }
    
    if (trendingBooks && trendingBooks.length > 0) {
      // Randomize selection to provide variety for different users
      const shuffledBooks = [...trendingBooks].sort(() => Math.random() - 0.5);
      const selectedBooks = shuffledBooks.slice(0, 8); // Take first 8 after randomization
      
      console.log('Default recommended books:', selectedBooks);
      return selectedBooks;
    }
    
    // If we got here, none of the methods worked
    console.log('No books found through any recommendation method');
    return [];

  } catch (error) {
    console.error('Error in getRecommendedBooks:', error);
    return [];
  }
};