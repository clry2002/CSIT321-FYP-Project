'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import SearchVideosClient from './SearchVideoClient';

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
  const [notification, setNotification] = useState<{ message: string; show: boolean }>({ message: '', show: false });
  const [blockedGenres, setBlockedGenres] = useState<Set<number>>(new Set());
  const [childId, setChildId] = useState<string | null>(null);
  const [isBlockedGenreSearch, setIsBlockedGenreSearch] = useState(false);
  const [isBlockedGenresFetched, setIsBlockedGenresFetched] = useState(false);
  const [searchInitiated, setSearchInitiated] = useState(false);

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
      if (!query || !childId || !isBlockedGenresFetched) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setSearchInitiated(true);

      try {
        const { data, error } = await supabase
          .from('temp_content')
          .select(`
            *,
            genre:temp_contentgenres(
              temp_genre(genrename)
            )
          `)
          .eq('cfid', 1) // Videos only
          .eq('status', 'approved'); // Only approved content

        if (error) throw error;

        const filteredVideos: Video[] = [];

        for (const video of data) {
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
          const containsBlockedWord = Array.from(blockedGenres).some((genre) =>
            titleLower.includes(genre.toString()) || descLower.includes(genre.toString())
          );

          if (!hasBlockedGenre && !containsBlockedWord) {
            filteredVideos.push(video);
          }
        }

        setVideos(filteredVideos);
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to fetch videos');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, [query, blockedGenres, childId, isBlockedGenresFetched]);

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
                  <Link href={`/videodetail/${video.cid}`}>
                    <h3 className="font-medium text-lg text-black cursor-pointer pr-12">{video.title}</h3>
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
        !isBlockedGenreSearch && searchInitiated && (
          <div className="text-center py-8 text-gray-500">No videos found matching your search</div>
        )
      )}
    </>
  );
}