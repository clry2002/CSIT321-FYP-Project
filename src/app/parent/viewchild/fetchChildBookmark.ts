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

export async function fetchBookmarkedContent(accountId: string): Promise<{ books: ContentWithGenres[]; videos: ContentWithGenres[] }> {
  try {
    // Get bookmarked content IDs
    const { data: bookmarks, error: bookmarksError } = await supabase
      .from('temp_bookmark')
      .select('cid')
      .eq('uaid', accountId);

    if (bookmarksError) {
      console.error('Bookmarks fetch error:', bookmarksError);
      throw bookmarksError;
    }
    console.log('Bookmarks found:', bookmarks);

    const bookmarkedCids = bookmarks ? bookmarks.map((b) => b.cid) : [];
    if (bookmarkedCids.length === 0) {
      return { books: [], videos: [] };
    }
    console.log('Bookmarked CIDs:', bookmarkedCids);

    // Fetch blocked genre IDs and names for the child account
    const { data: blockedGenresData, error: blockedGenresError } = await supabase
      .from('blockedgenres')
      .select('genreid, temp_genre(genrename)')
      .eq('child_id', accountId);

    if (blockedGenresError) {
      console.error('Blocked genres fetch error:', blockedGenresError);
      // Proceed without filtering based on blocked genres if fetch fails
    }

    const blockedGenreIds = blockedGenresData ? blockedGenresData.map((bg) => bg.genreid) : [];
    // Corrected mapping for blockedGenreNames
    const blockedGenreNames = (blockedGenresData?.map((bg) => {
      const tempGenre = bg.temp_genre as { genrename?: string };
      return tempGenre?.genrename || null;
    }) || []).filter((name): name is string => !!name);

    console.log('Blocked Genre IDs for child:', blockedGenreIds);
    console.log('Blocked Genre Names for child:', blockedGenreNames);

    // Fetch content items for the bookmarked CIDs
    const { data: contentData, error: contentError } = await supabase
      .from('temp_content')
      .select('*')
      .in('cid', bookmarkedCids);

    if (contentError) {
      console.error('Content fetch error:', contentError);
      throw contentError;
    }
    if (!contentData) {
      console.error('No content data fetched for bookmarked items.');
      return { books: [], videos: [] };
    }
    console.log('Content data fetched:', contentData.length, 'items');

    // Fetch content genres for the bookmarked CIDs (only cid and gid)
    const { data: contentGenresData, error: contentGenresError } = await supabase
      .from('temp_contentgenres')
      .select('cid, gid')
      .in('cid', bookmarkedCids);

    if (contentGenresError) {
      console.error('Content genres fetch error:', contentGenresError);
      throw contentGenresError;
    }
    console.log('Content genres data fetched:', contentGenresData);

    // Fetch all genres to map gid to genrename
    const { data: allGenres, error: allGenresError } = await supabase
      .from('temp_genre')
      .select('gid, genrename');

    const genreNameMap: Record<number, string> = {};
    if (allGenresError) {
      console.error('Error fetching all genres:', allGenresError);
    } else if (allGenres) {
      allGenres.forEach((genre) => {
        genreNameMap[genre.gid] = genre.genrename;
      });
    }

    // Create a map of content ID to arrays of genre IDs and names
    const contentGenresMap: Record<number, { id: number; name: string }[]> = {};
    if (contentGenresData) {
      contentGenresData.forEach((item) => {
        if (!contentGenresMap[item.cid]) {
          contentGenresMap[item.cid] = [];
        }
        const genreName = genreNameMap[item.gid];
        if (genreName) {
          contentGenresMap[item.cid].push({ id: item.gid, name: genreName });
        }
      });
    }
    console.log('Content Genres Map:', contentGenresMap);

    const books = contentData.filter((item) => item.cfid === 2);
    const videos = contentData.filter((item) => item.cfid === 1);

    console.log('Filtered books (initial):', books.length, 'items');
    console.log('Filtered videos (initial):', videos.length, 'items');

    // Filter books based on blocked genre IDs OR keywords in title/description
    const filteredBooks = books.filter((book) => {
      const bookGenres = contentGenresMap[book.cid] || [];
      const hasBlockedGenre = bookGenres.some((genre) => blockedGenreIds.includes(genre.id));
      const hasBlockedKeyword = blockedGenreNames.some((keyword) =>
        book.title?.toLowerCase().includes(keyword.toLowerCase()) ||
        book.description?.toLowerCase().includes(keyword.toLowerCase())
      );
      const shouldExclude = hasBlockedGenre || hasBlockedKeyword;
      return !shouldExclude;
    });

    // Filter videos based on blocked genre IDs OR keywords in title/description
    const filteredVideos = videos.filter((video) => {
      const videoGenres = contentGenresMap[video.cid] || [];
      const hasBlockedGenre = videoGenres.some((genre) => blockedGenreIds.includes(genre.id));
      const hasBlockedKeyword = blockedGenreNames.some((keyword) =>
        video.title?.toLowerCase().includes(keyword.toLowerCase()) ||
        video.description?.toLowerCase().includes(keyword.toLowerCase())
      );
      const shouldExclude = hasBlockedGenre || hasBlockedKeyword;
      return !shouldExclude;
    });

    const booksWithGenres: ContentWithGenres[] = filteredBooks.map((book) => ({
      ...book,
      genres: contentGenresMap[book.cid]?.map((g) => g.name) || [],
    }));

    const videosWithGenres: ContentWithGenres[] = filteredVideos.map((video) => ({
      ...video,
      genres: contentGenresMap[video.cid]?.map((g) => g.name) || [],
    }));

    console.log('Filtered books (final):', booksWithGenres.length, 'items');
    console.log('Final videos:', videosWithGenres.length, 'items');

    return {
      books: booksWithGenres,
      videos: videosWithGenres,
    };
  } catch (error) {
    console.error('Error fetching bookmarked content:', error);
    throw error;
  }
}