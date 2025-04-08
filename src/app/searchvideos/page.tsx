'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { supabase } from '@/lib/supabase';
import ChatBot from '../components/ChatBot';

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
  const [childId, setChildId] = useState<string | null>(null);

  // Get child ID (uaid)
  useEffect(() => {
    const fetchChildProfile = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log("Auth User:", user);

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

      console.log("Fetched childId (uaid):", data.id);
      setChildId(data.id);
    };

    fetchChildProfile();
  }, []);

  // Load bookmarks
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

      console.log("Fetched bookmarks for childId:", childId, data);
      const bookmarkedCids = new Set(data?.map((item) => item.cid.toString()));
      setBookmarkedVideos(bookmarkedCids);
    };

    fetchBookmarks();
  }, [childId]);

  // Run search query
  useEffect(() => {
    const searchVideos = async () => {
      if (!query) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: videoError } = await supabase.rpc('search_videos', { searchquery: query });

        if (videoError) {
          console.error('Error from search_videos function:', videoError);
          setError(`Error: ${videoError.message}`);
          return;
        }

        console.log("Search results:", data);
        setVideos(data || []);
      } catch (err) {
        console.error('Error searching videos:', err);
        setError('Failed to search videos');
      } finally {
        setIsLoading(false);
      }
    };

    searchVideos();
  }, [query]);

  // Handle Bookmark
  const handleBookmark = async (video: Video) => {
    if (!childId) {
      console.warn('No child ID set — cannot bookmark');
      setNotification({ message: 'No child profile found', show: true });
      setTimeout(() => setNotification({ message: '', show: false }), 3000);
      return;
    }

    const cidStr = video.cid.toString();
    const isBookmarked = bookmarkedVideos.has(cidStr);
    const updatedBookmarks = new Set(bookmarkedVideos);

    if (isBookmarked) {
      // DELETE bookmark
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
        console.log('Bookmark removed');
      }
    } else {
      // UPSERT bookmark
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
        console.log('Bookmark saved');
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
          {/* Search box */}
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

          {/* Notification */}
          {notification.show && (
            <div className="fixed top-4 right-4 z-50 bg-rose-500 text-white px-6 py-3 rounded-lg shadow-lg">
              {notification.message}
            </div>
          )}

          {/* Results */}
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
                      <h3 className="font-medium text-lg text-black">{video.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{video.description}</p>
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <span>{video.views} views</span>
                        <span className="mx-2">•</span>
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
            <div className="text-center py-8 text-gray-500">No videos found matching your search</div>
          )}
        </div>
        <ChatBot />
      </div>
    </div>
  );
}
