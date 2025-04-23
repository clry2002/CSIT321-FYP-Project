'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import SearchVideosClient from './SearchVideoClient';
import { useInteractions } from '../../../hooks/useInteractions';

interface Video {
  id: string;
  cid: number;
  title: string;
  description: string;
  embeddedLink: string;
  contenturl: string;
  thumbnail: string;
  views: number;
  timeAgo: string;
  genre: { temp_genre: { gid: number; genrename: string } }[];
  genreNames?: string[];
  viewCount?: number;
}

export default function SearchVideoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';

  const handleSearch = (searchQuery: string, type: 'books' | 'videos') => {
    if (!searchQuery.trim()) return;
    const path = type === 'books' ? '/searchbooks' : '/searchvideos';
    router.push(`${path}?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <>
      <SearchVideosClient onSearch={handleSearch} initialQuery={query} />
      <SearchResults query={query} />
    </>
  );
}

// Component to display search results
function SearchResults({ query }: { query: string }) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarkedVideos, setBookmarkedVideos] = useState<Set<string>>(new Set());
  const [blockedGenres, setBlockedGenres] = useState<Set<number>>(new Set());
  const [childId, setChildId] = useState<string | null>(null);
  const [isBlockedGenreSearch, setIsBlockedGenreSearch] = useState(false);
  const [searchInitiated, setSearchInitiated] = useState(false);
  const [isBlockedGenresFetched, setIsBlockedGenresFetched] = useState(false);
  const [notification, setNotification] = useState<{ message: string; show: boolean }>({ message: '', show: false });
  
  // Use the interactions hook
  const { toggleBookmark, recordBookView } = useInteractions();

  useEffect(() => {
    const fetchChildProfile = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Failed to get user:', userError);
        return;
      }

      const { data, error } = await supabase
        .from('user_account')
        .select('id')
        .eq('user_id', user.id)
        .eq('upid', 3)
        .single();

      if (error) {
        console.error('Child profile not found:', error);
        return;
      }

      setChildId(data.id);
    };

    fetchChildProfile();
  }, []);

  useEffect(() => {
    const fetchBlockedGenres = async () => {
      if (!childId) return;

      const { data, error } = await supabase
        .from('blockedgenres')
        .select('genreid')
        .eq('child_id', childId);

      if (error) {
        console.error('Error fetching blocked genres:', error);
        return;
      }

      const blockedGenresSet = new Set(data?.map((item) => item.genreid));
      setBlockedGenres(blockedGenresSet);
      setIsBlockedGenresFetched(true);
    };

    fetchBlockedGenres();
  }, [childId]);

  useEffect(() => {
    const checkBlockedGenreInQuery = async () => {
      if (!query || !isBlockedGenresFetched || blockedGenres.size === 0) {
        setIsBlockedGenreSearch(false);
        return;
      }

      try {
        const { data: genreNamesData, error: genreNameError } = await supabase
          .from('temp_genre')
          .select('genrename, gid')
          .in('gid', Array.from(blockedGenres));

        if (genreNameError) {
          console.error('Error fetching genre names:', genreNameError);
          setError(`Error: ${genreNameError.message}`);
          return;
        }

        const blockedGenreNames = new Set(
          genreNamesData?.map((g) => g.genrename.toLowerCase())
        );

        const normalize = (str: string) =>
          str.toLowerCase().replace(/[^a-z]/g, '').replace(/s$/, '');

        const normalizedQuery = normalize(query);

        const queryIncludesBlocked = Array.from(blockedGenreNames).some((genre) => {
          const normalizedGenre = normalize(genre);
          const lengthDifference = Math.abs(normalizedQuery.length - normalizedGenre.length);
          const isExactOrNearMatch =
            normalizedQuery === normalizedGenre ||
            (lengthDifference <= 2 && normalizedGenre.includes(normalizedQuery));
          return isExactOrNearMatch;
        });

        setIsBlockedGenreSearch(queryIncludesBlocked);
      } catch (error) {
        console.error('Error checking blocked genres in query:', error);
      }
    };

    checkBlockedGenreInQuery();
  }, [query, blockedGenres, isBlockedGenresFetched]);

  useEffect(() => {
    const fetchBookmarks = async () => {
      if (!childId) return;

      const { data, error } = await supabase
        .from('temp_bookmark')
        .select('cid')
        .eq('uaid', childId);

      if (error) {
        console.error('Error fetching bookmarks:', error);
        return;
      }

      const bookmarkedCids = new Set(data?.map((item) => item.cid.toString()));
      setBookmarkedVideos(bookmarkedCids);
    };

    fetchBookmarks();
  }, [childId]);

  useEffect(() => {
    const fetchVideos = async () => {
      if (!query || !childId || !isBlockedGenresFetched || isBlockedGenreSearch) {
        setIsLoading(false);
        setVideos([]); // Ensure no videos are displayed
        setError(null); // Clear any previous errors
        return;
      }

      setIsLoading(true);
      setSearchInitiated(true);
      setError(null); // Clear any previous errors

      try {
        const { data, error } = await supabase
          .from('temp_content')
          .select(`
            *,
            genre:temp_contentgenres(
              temp_genre(gid, genrename)
            )
          `)
          .eq('cfid', 1) // Videos only
          .eq('status', 'approved')
          .or(`title.ilike.%${query}%,description.ilike.%${query}%`);

        if (error) throw error;

        const filteredVideos: Video[] = [];

        for (const video of data) {
          const hasBlockedGenre = video.genre?.some(
            (g: { temp_genre: { gid: number; genrename: string } }) => blockedGenres.has(g.temp_genre.gid)
          );
          if (!hasBlockedGenre) {
            filteredVideos.push(video);
          }
        }

        const videosWithGenreNames = filteredVideos.map(video => ({
          ...video,
          genreNames: video.genre?.map(
            (g: { temp_genre: { gid: number; genrename: string } }) => g.temp_genre.genrename
          ).filter(Boolean),
        }));

        setVideos(videosWithGenreNames);
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to fetch videos');
        setVideos([]); // Ensure no videos are displayed on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, [query, blockedGenres, childId, isBlockedGenresFetched, isBlockedGenreSearch]);

  const handleBookmark = async (video: Video) => {
    if (!childId) {
      setNotification({ message: 'No child profile found', show: true });
      setTimeout(() => setNotification({ message: '', show: false }), 3000);
      return;
    }

    const cidStr = video.cid.toString();
    const isBookmarked = bookmarkedVideos.has(cidStr);
    
    // Use the toggleBookmark function from useInteractions hook
    const success = await toggleBookmark(cidStr, !isBookmarked);
    
    if (success) {
      const updatedBookmarks = new Set(bookmarkedVideos);
      
      if (isBookmarked) {
        updatedBookmarks.delete(cidStr);
        setNotification({ message: 'Video removed from bookmarks', show: true });
      } else {
        updatedBookmarks.add(cidStr);
        setNotification({ message: 'You saved this video', show: true });
      }
      
      setBookmarkedVideos(updatedBookmarks);
      setTimeout(() => setNotification({ message: '', show: false }), 3000);
    } else {
      setNotification({ message: 'Failed to update bookmark', show: true });
      setTimeout(() => setNotification({ message: '', show: false }), 3000);
    }
  };

  const handleVideoClick = async (videoId: number) => {
    // Record the video view using the interaction hook
    await recordBookView(videoId.toString());
  };

  const getVideoId = (contenturl: string) => {
    try {
      const url = new URL(contenturl);
      if (url.hostname.includes('youtube.com')) {
        return url.searchParams.get('v');
      } else if (url.hostname.includes('youtu.be')) {
        return url.pathname.slice(1);
      }
      return null;
    } catch {
      return null;
    }
  };

  return (
    <>
      <div className="text-2xl font-bold text-gray-900 mb-6">
        {query && `Search Results for "${query}"`}
      </div>

      {isBlockedGenreSearch ? (
        <div className="text-center py-4 text-red-500">
          This genre has been blocked, please search another genre.
        </div>
      ) : (
        <>
          {notification.show && (
            <div className="fixed top-4 right-4 z-50 bg-rose-500 text-white px-6 py-3 rounded-lg shadow-lg">
              {notification.message}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : videos.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {videos.map((video) => {
                const videoId = getVideoId(video.contenturl);
                const isBookmarked = bookmarkedVideos.has(video.cid.toString());

                return (
                  <div key={video.cid} className="border rounded-lg overflow-hidden">
                    <div className="aspect-video relative">
                      {videoId ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${videoId}`}
                          title={video.title}
                          className="absolute inset-0 w-full h-full"
                          allowFullScreen
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                          <p className="text-gray-500">Invalid video link</p>
                        </div>
                      )}
                    </div>
                    <div className="p-4 relative">
                      <Link 
                        href={`/videodetail/${video.cid}`}
                        onClick={() => handleVideoClick(video.cid)}
                      >
                        <h3 className="font-medium text-lg text-black cursor-pointer pr-12">{video.title}</h3>
                      </Link>
                      <p className="text-sm text-gray-600 mt-1">{video.description}</p>
                      {video.genreNames && (
                        <div className="text-xs text-gray-500 mt-1">
                          {video.genreNames.join(', ')}
                        </div>
                      )}
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <span>{video.timeAgo}</span>
                      </div>
                      <button
                        onClick={() => handleBookmark(video)}
                        className={`absolute top-4 right-4 p-2 rounded-full ${
                          isBookmarked ? 'text-rose-500' : 'text-gray-400'
                        } hover:bg-gray-100`}
                        aria-label="Toggle bookmark"
                      >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            searchInitiated && (
              <div className="text-center py-8 text-gray-500">No videos found matching your search</div>
            )
          )}
        </>
      )}
    </>
  );
}