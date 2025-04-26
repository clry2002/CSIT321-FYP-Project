'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface RawGenreData {
  temp_genre: {
    genrename: string;
  }[];
}

interface VideoDetail {
  title: string;
  description: string;
  credit: string;
  minimumage: number;
  contenturl: string;
  genre: Array<{
    temp_genre: {
      genrename: string;
    };
  }>;
}

const getYouTubeEmbedUrl = (url: string) => {
  try {
    // Handle different YouTube URL formats
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);

    if (match && match[2].length === 11) {
      // Return the embed URL
      return `https://www.youtube.com/embed/${match[2]}`;
    }

    // If no match found or URL is not a valid YouTube URL, return the original URL
    return url;
  } catch (error) {
    console.error('Error processing YouTube URL:', error);
    return url;
  }
};

export default function PublisherVideoDetail({ params }: { params: Promise<{ cid: string }> }) {
  const router = useRouter();
  const [videoDetails, setVideoDetails] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const resolvedParams = React.use(params);

  useEffect(() => {
    const fetchVideoDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('temp_content')
          .select(`
            title,
            description,
            credit,
            minimumage,
            contenturl,
            genre:temp_contentgenres(
              temp_genre(genrename)
            )
          `)
          .eq('cid', resolvedParams.cid)
          .single();

        if (error) throw error;

        if (data) {
          const formattedData: VideoDetail = {
            title: data.title,
            description: data.description,
            credit: data.credit,
            minimumage: data.minimumage,
            contenturl: data.contenturl,
            genre: data.genre.map((g: RawGenreData) => ({
              temp_genre: {
                genrename: g.temp_genre[0]?.genrename || 'Unknown'
              }
            }))
          };
          setVideoDetails(formattedData);
        }
      } catch (err) {
        console.error('Error fetching video details:', err);
        setError('Failed to load video details');
      } finally {
        setLoading(false);
      }
    };

    fetchVideoDetails();
  }, [resolvedParams.cid]);

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error) return <div className="text-center py-8 text-red-600">{error}</div>;
  if (!videoDetails) return <div className="text-center py-8">Video not found</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{videoDetails.title}</h1>
            <div className="mb-4">
              <span className="text-gray-600">By </span>
              <span className="text-gray-900 font-semibold">{videoDetails.credit}</span>
            </div>
            <div className="mb-4">
              <span className="text-gray-600">Genre: </span>
              <span className="text-gray-900">
                {videoDetails.genre[0]?.temp_genre?.genrename || 'Uncategorized'}
              </span>
            </div>
            <div className="mb-6">
              <span className="text-gray-600">Minimum Age: </span>
              <span className="text-gray-900">{videoDetails.minimumage}+</span>
            </div>
            <p className="text-gray-700 mb-6">{videoDetails.description}</p>
            
            <div className="aspect-w-16 aspect-h-9 mb-6">
              <iframe
                src={getYouTubeEmbedUrl(videoDetails.contenturl)}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-[500px] rounded-lg"
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 