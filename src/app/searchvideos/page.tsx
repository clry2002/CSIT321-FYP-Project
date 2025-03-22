'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { supabase } from '@/lib/supabase';

interface Video {
  id: string;
  title: string;
  description: string;
  embeddedLink: string;
  link: string;
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

  useEffect(() => {
    const searchVideos = async () => {
      if (!query) {
        setIsLoading(false);
        return;
      }

      try {
        // First, try to get the user profile without throwing an error
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        // Log user error but don't let it affect video search
        if (userError) {
          console.warn('User profile fetch warning:', userError);
        }

        // Perform video search
        const { data: videoData, error: videoError } = await supabase
          .from('videos')
          .select('*')
          .ilike('title', `%${query}%`);

        if (videoError) {
          throw videoError;
        }

        setVideos(videoData || []);
      } catch (err) {
        console.error('Error searching videos:', err);
        setError('Failed to search videos');
      } finally {
        setIsLoading(false);
      }
    };

    searchVideos();
  }, [query]);

  const handleSearch = (type: 'books' | 'videos') => {
    if (!searchQuery.trim()) return;
    if (type === 'books') {
      router.push(`/searchbooks?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push(`/searchvideos?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Function to extract video ID from link
  const getVideoId = (link: string) => {
    try {
      const url = new URL(link);
      if (url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com') {
        return url.searchParams.get('v');
      } else if (url.hostname === 'youtu.be') {
        return url.pathname.slice(1);
      }
      return null;
    } catch (error) {
      console.error('Error parsing video URL:', error);
      return null;
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Navbar />
      <div className="flex-1 overflow-y-auto pt-16 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Search Interface */}
          <div className="mt-20 mb-8">
            <div className="max-w-2xl mx-auto">
              <div className="relative mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search books and videos..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-black"
                />
              </div>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => handleSearch('books')}
                  className="px-6 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
                >
                  Search Books
                </button>
                <button
                  onClick={() => handleSearch('videos')}
                  className="px-6 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
                >
                  Search Videos
                </button>
              </div>
            </div>
          </div>

          {query && (
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Search Results for "{query}"
            </h1>
          )}

          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : query && videos.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {videos.map((video) => {
                const videoId = getVideoId(video.link);
                return (
                  <div key={`video-${video.id}`} className="border rounded-lg overflow-hidden">
                    <div className="aspect-video relative">
                      {videoId ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${videoId}`}
                          title={video.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="absolute inset-0 w-full h-full"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                          <p className="text-gray-500">Invalid video link</p>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-lg text-black">{video.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{video.description}</p>
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <span>{video.views} views</span>
                        <span className="mx-2">•</span>
                        <span>{video.timeAgo}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : query && (
            <div className="text-center py-8 text-gray-500">
              No videos found matching your search
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 