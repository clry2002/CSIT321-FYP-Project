import { supabase } from '@/lib/supabase';

export interface Content {
  cid: number;
  title: string;
  coverimage?: string;
  contenturl?: string;
  credit?: string;
  description?: string;
  cfid: number;
}

export interface ContentWithGenres extends Content {
  genres: string[];
}

// Modify GenreItem interface to reflect that temp_genre is an array
interface GenreItem {
  cid: number;
  temp_genre: { genrename: string }[]; // temp_genre is an array of objects with genrename
}

export async function fetchBookmarkedContent(accountId: string) {
  try {
    // Get bookmarked content from temp_bookmark using the user_account.id
    const { data: bookmarks, error: bookmarksError } = await supabase
      .from('temp_bookmark')
      .select('cid')
      .eq('uaid', accountId);

    if (bookmarksError) throw bookmarksError;
    console.log('Bookmarks found:', bookmarks);

    // Get bookmarked books and videos
    let booksWithGenres: ContentWithGenres[] = [];
    let videosWithGenres: ContentWithGenres[] = [];
    
    if (bookmarks && bookmarks.length > 0) {
      const bookmarkedCids = bookmarks.map(b => b.cid);
      console.log('Bookmarked CIDs:', bookmarkedCids);

      // Fetch all content items first
      const { data: contentData, error: contentError } = await supabase
        .from('temp_content')
        .select('*')
        .in('cid', bookmarkedCids);

      if (contentError) throw contentError;
      if (!contentData) throw new Error('Failed to fetch bookmarked content');

      console.log('Content data fetched:', contentData.length, 'items');

      // Separate books and videos
      const books = contentData.filter(item => item.cfid === 2);
      const videos = contentData.filter(item => item.cfid === 1);

      console.log('Filtered books:', books.length, 'items');
      console.log('Filtered videos:', videos.length, 'items');

      // Fetch genres for all content
      const { data: genresData, error: genresError } = await supabase
        .from('temp_contentgenres')
        .select('cid, temp_genre(genrename)')
        .in('cid', bookmarkedCids);

      if (genresError) throw genresError;

      // Create a map of content ID to genres
      const genresMap: Record<number, string[]> = {};
      if (genresData && genresData.length > 0) {
        genresData.forEach((item: GenreItem) => {
          if (!genresMap[item.cid]) {
            genresMap[item.cid] = [];
          }
          // Now we loop over temp_genre array and push each genre name into the map
          item.temp_genre.forEach(genre => {
            if (genre.genrename) {
              genresMap[item.cid].push(genre.genrename);
            }
          });
        });
      }

      // Add genres to books and videos
      booksWithGenres = books.map(book => ({
        ...book,
        genres: genresMap[book.cid] || []
      }));

      videosWithGenres = videos.map(video => ({
        ...video,
        genres: genresMap[video.cid] || []
      }));
    }

    return {
      books: booksWithGenres,
      videos: videosWithGenres
    };
  } catch (error) {
    console.error('Error fetching bookmarked content:', error);
    throw error;
  }
}
