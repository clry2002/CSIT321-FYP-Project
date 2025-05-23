'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import { supabase } from '@/lib/supabase';
import type { Video } from '@/types/database.types';
import ChatBot from '@/app/components/ChatBot';

interface GenreData {
  temp_genre: {
    genrename: string;
  } | {
    genrename: string;
  }[];
}

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [video, setVideo] = useState<Video | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [childId, setChildId] = useState<string | null>(null);
  const [bookmarkedVideos, setBookmarkedVideos] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{ message: string; show: boolean }>({ message: '', show: false });

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

  useEffect(() => {
    const fetchVideo = async () => {
      if (!params.id) {
        setError('Video ID is missing');
        setIsLoading(false);
        return;
      }

      try {
        // Fetch video details
        const { data: videoData, error: videoError } = await supabase
          .from('temp_content')
          .select('*')
          .eq('cid', params.id)
          .single();

        if (videoError) throw videoError;
        setVideo(videoData);

        // Fetch genres
        const { data: genreData, error: genreError } = await supabase
          .from('temp_contentgenres')
          .select('temp_genre(genrename)')
          .eq('cid', params.id);

        if (genreError) throw genreError;

        const genreNames = Array.isArray(genreData)
          ? genreData.flatMap((g: GenreData) => {
              const genreField = g.temp_genre;

              if (Array.isArray(genreField)) {
                return genreField.map((tg) => tg.genrename);
              } else if (genreField && typeof genreField === 'object') {
                return [genreField.genrename];
              } else {
                return [];
              }
            })
          : [];

        setGenres(genreNames);
      } catch (err) {
        console.error('Error fetching video or genres:', err);
        setError('Failed to load video details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideo();
  }, [params.id]);

  // Handle bookmark
  const handleBookmark = async () => {
    if (!childId) {
      console.warn('No child ID set — cannot bookmark');
      setNotification({ message: 'No child profile found', show: true });
      setTimeout(() => setNotification({ message: '', show: false }), 3000);
      return;
    }

    if (!video) return;

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
        setNotification({ message: 'Video saved to bookmarks', show: true });
        console.log('Bookmark saved');
      }
    }

    setTimeout(() => setNotification({ message: '', show: false }), 3000);
  };

  // Handle navigation back to search results
  const handleBackToSearch = () => {
    if (query) {
      router.push(`/searchvideos?q=${encodeURIComponent(query)}`);
    } else {
      router.back();
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="flex h-screen bg-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-500">{error || 'Video not found'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 to-indigo-900 text-white overflow-hidden">
      {/* Notification Toast */}
      {notification.show && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-md transition-opacity duration-300 ${
            notification.message.includes('Failed') ? 'bg-red-600' : 'bg-green-600'
          } text-white`}
        >
          {notification.message}
        </div>
      )}
  
      <Navbar />
      <div className="flex-1 overflow-y-auto pt-16 px-6">
        <div className="max-w-4xl mx-auto mt-8">
          {/* Back Button */}
          <div className="flex justify-start">
            <button
              onClick={handleBackToSearch}
              className="mb-6 px-4 py-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition"
            >
              ← Back
            </button>
          </div>
  
          <div className="flex flex-col md:flex-row gap-8">
            {/* Video Player */}
            <div className="w-full md:w-2/3 rounded-lg overflow-hidden">
              {video.contenturl && video.contenturl.includes('youtube.com') && (
                <div className="mt-8">
                  <iframe
                    className="w-full h-[400px] rounded-lg border-none"
                    src={`https://www.youtube.com/embed/${video.contenturl.split('v=')[1]}`}
                    title={video.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                </div>
              )}
  
              {video.contenturl && !video.contenturl.includes('youtube.com') && (
                <div className="mt-8">
                  <a
                    href={video.contenturl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center bg-indigo-500 text-white py-2 rounded-lg hover:bg-indigo-600 transition-colors"
                  >
                    Watch Video
                  </a>
                </div>
              )}
            </div>
  
            {/* Video Details */}
            <div className="w-full md:w-1/3 space-y-4">
              <h1 className="text-3xl font-bold text-yellow-400">{video.title}</h1>
              <div>
                <h2 className="text-gray-400">Director</h2>
                <p className="text-gray-100">{video.credit}</p>
              </div>
              {video.createddate && (
                <div>
                  <h2 className="text-gray-400">Date Published</h2>
                  <p className="text-gray-100">
                    {new Date(video.createddate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {genres.length > 0 && (
                <div>
                  <h2 className="text-gray-400">Genres</h2>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {genres.map((genre, idx) => (
                      <span
                        key={idx}
                        className="bg-indigo-100 text-indigo-800 text-sm font-medium px-2.5 py-0.5 rounded-full"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h2 className="text-gray-400">Summary</h2>
                <p className="text-gray-100">{video.description}</p>
              </div>
  
              <div className="mt-4">
                <button
                  onClick={handleBookmark}
                  className={`px-4 py-2 rounded-lg ${
                    bookmarkedVideos.has(video.cid.toString()) ? 'bg-rose-500 hover:bg-rose-600' : 'bg-yellow-300 hover:bg-yellow-400'
                  } text-white transition-colors`}
                >
                  {bookmarkedVideos.has(video.cid.toString()) ? 'Remove Bookmark' : 'Add to Bookmark'}
                </button>
              </div>
            </div>
          </div>
  
          <div className="mt-8">
            <ChatBot />
          </div>
        </div>
      </div>
    </div>
  );
}