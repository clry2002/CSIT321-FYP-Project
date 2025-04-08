'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Navbar from '../../components/Navbar';
import { supabase } from '@/lib/supabase';
import type { Video } from '@/types/database.types';
import ChatBot from '../../components/ChatBot';

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [video, setVideo] = useState<Video | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        ? genreData.flatMap((g: any) => {
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
    <div className="flex h-screen bg-white">
      <Navbar />
      <div className="flex-1 overflow-y-auto pt-16 px-6">
        <div className="max-w-4xl mx-auto mt-8">
          {/* Back Button */}
          <div className="flex justify-start">
            <button
              onClick={handleBackToSearch}
              className="mb-6 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
            >
              ← Back to Search
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-8">
            {/* Video Player */}
            <div className="w-full md:w-2/3">
              {video.contenturl && video.contenturl.includes('youtube.com') && (
                <div className="mt-8">
                  <iframe
                    className="w-full h-[400px] rounded-lg shadow-sm"
                    src={`https://www.youtube.com/embed/${video.contenturl.split('v=')[1]}`}
                    title={video.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              )}

              {/* If no YouTube video, show link to open in a new tab */}
              {video.contenturl && !video.contenturl.includes('youtube.com') && (
                <div className="mt-8">
                  <a
                    href={video.contenturl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center bg-rose-500 text-white py-2 rounded-lg hover:bg-rose-600 transition-colors"
                  >
                    Watch Video
                  </a>
                </div>
              )}
            </div>

            {/* Video Details */}
            <div className="w-full md:w-1/3">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{video.title}</h1>
              <div className="space-y-4">
                <div>
                  <h2 className="text-gray-600">Director</h2>
                  <p className="text-gray-900">{video.credit}</p>
                </div>
                {video.createddate && (
                  <div>
                    <h2 className="text-gray-600">Date Published</h2>
                    <p className="text-gray-900">
                      {new Date(video.createddate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                
                {/* Genres */}
                {genres.length > 0 && (
                  <div>
                    <h2 className="text-gray-600">Genres</h2>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {genres.map((genre, idx) => (
                        <span
                          key={idx}
                          className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h2 className="text-gray-600">Summary</h2>
                  <p className="text-gray-900">{video.description}</p>
                </div>
              </div>
            </div>
          </div>

          <ChatBot />
        </div>
      </div>
    </div>
  );
}
