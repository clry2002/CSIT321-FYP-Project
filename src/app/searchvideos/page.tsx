'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { supabase } from '@/lib/supabase';
import ChatBot from '../components/ChatBot';
import Link from 'next/link';

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
}

export default function SearchVideosPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(query);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarkedVideos, setBookmarkedVideos] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{ message: string; show: boolean }>({ message: '', show: false });
  const [blockedGenres, setBlockedGenres] = useState<Set<number>>(new Set());
  const [childId, setChildId] = useState<string | null>(null);
  const [isBlockedGenreSearch, setIsBlockedGenreSearch] = useState(false);
  const [isBlockedGenresFetched, setIsBlockedGenresFetched] = useState(false); // Track when blocked genres are fetched

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
      setIsBlockedGenresFetched(true); // Set this to true once blocked genres are fetched
    };

    fetchBlockedGenres();
  }, [childId]);

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
    const searchVideos = async () => {
      if (!query || !childId || !isBlockedGenresFetched) {
        setIsLoading(false);
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

        if (queryIncludesBlocked) {
          setVideos([]);
          setIsLoading(false);
          return;
        }

        const { data: rawVideos, error: videoError } = await supabase
          .rpc('search_videos', { searchquery: query });

        if (videoError) {
          console.error('Error from search_videos function:', videoError);
          setError(`Error: ${videoError.message}`);
          return;
        }

        if (!rawVideos) {
          setVideos([]);
          return;
        }

        const filteredVideos: Video[] = [];

        for (const video of rawVideos) {
          const { data: genreData, error: genreError } = await supabase
            .from('temp_contentgenres')
            .select('gid')
            .eq('cid', video.cid);

          if (genreError) {
            console.error(`Error fetching genres for cid ${video.cid}:`, genreError);
            continue;
          }

          const hasBlockedGenre = genreData?.some((g) => blockedGenres.has(g.gid));

          const titleLower = video.title.toLowerCase();
          const descLower = video.description?.toLowerCase() || '';
          const containsBlockedWord = Array.from(blockedGenreNames).some((genre) =>
            titleLower.includes(genre) || descLower.includes(genre)
          );

          if (!hasBlockedGenre && !containsBlockedWord) {
            filteredVideos.push(video);
          }
        }

        setVideos(filteredVideos);
      } catch (err) {
        console.error('Error searching videos:', err);
        setError('Failed to search videos');
      } finally {
        setIsLoading(false);
      }
    };

    searchVideos();
  }, [query, blockedGenres, childId, isBlockedGenresFetched]); // Added isBlockedGenresFetched as a dependency

  const handleBookmark = async (video: Video) => {
    if (!childId) {
      setNotification({ message: 'No child profile found', show: true });
      setTimeout(() => setNotification({ message: '', show: false }), 3000);
      return;
    }

    const cidStr = video.cid.toString();
    const isBookmarked = bookmarkedVideos.has(cidStr);
    const updatedBookmarks = new Set(bookmarkedVideos);

    if (isBookmarked) {
      const { error } = await supabase
        .from('temp_bookmark')
        .delete()
        .eq('uaid', childId)
        .eq('cid', video.cid);

      if (error) {
        console.error('Error deleting bookmark:', error);
        setNotification({ message: 'Failed to remove bookmark', show: true });
      } else {
        updatedBookmarks.delete(cidStr);
        setBookmarkedVideos(updatedBookmarks);
        setNotification({ message: 'Video removed from bookmarks', show: true });
      }
    } else {
      const { error } = await supabase
        .from('temp_bookmark')
        .upsert([{ uaid: childId, cid: video.cid }], { onConflict: 'uaid,cid' });

      if (error) {
        console.error('Error saving bookmark:', error);
        setNotification({ message: 'Failed to save bookmark', show: true });
      } else {
        updatedBookmarks.add(cidStr);
        setBookmarkedVideos(updatedBookmarks);
        setNotification({ message: 'You saved this video', show: true });
      }
    }

    setTimeout(() => setNotification({ message: '', show: false }), 3000);
  };

  const handleSearch = (type: 'books' | 'videos') => {
    if (!searchQuery.trim()) return;
    router.push(`/${type === 'books' ? 'searchbooks' : 'searchvideos'}?q=${encodeURIComponent(searchQuery.trim())}`);
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
    <div className="flex h-screen bg-white overflow-hidden">
      <Navbar />
      <div className="flex-1 overflow-y-auto pt-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mt-20 mb-8">
            <div className="max-w-2xl mx-auto">
              <div className="relative mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search books and videos..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm text-black"
                />
              </div>
              <div className="flex justify-center space-x-4">
                <button onClick={() => handleSearch('books')} className="px-6 py-2 bg-rose-500 text-white rounded-lg">Search Books</button>
                <button onClick={() => handleSearch('videos')} className="px-6 py-2 bg-rose-500 text-white rounded-lg">Search Videos</button>
              </div>
            </div>
          </div>

          <div className="text-2xl font-bold text-gray-900 mb-6">
            {query && `Search Results for "${query}"`}
          </div>

          {isBlockedGenreSearch && (
            <div className="text-center py-4 text-red-500">
              This genre has been blocked, please search another genre.
            </div>
          )}

          {notification.show && !isBlockedGenreSearch && (
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
                      <Link href={`/videodetail/${video.cid}`} passHref>
                        <h3 className="font-medium text-lg text-black cursor-pointer">{video.title}</h3>
                      </Link>
                      <p className="text-sm text-gray-600 mt-1">{video.description}</p>
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
            !isBlockedGenreSearch && (
              <div className="text-center py-8 text-gray-500">No videos found matching your search</div>
            )
          )}
        </div>
        <ChatBot />
      </div>
    </div>
  );
}