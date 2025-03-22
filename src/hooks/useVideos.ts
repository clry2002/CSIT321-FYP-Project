'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Video {
  title: string;
  embeddedLink: string;
  link: string;
}

export const useVideos = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        // Fetch all videos and randomly select 4
        const { data, error } = await supabase
          .from('videos')
          .select('title, embeddedLink, link');

        if (error) throw error;

        // Randomly select 4 videos
        const shuffled = data.sort(() => 0.5 - Math.random());
        const selectedVideos = shuffled.slice(0, 4);

        setVideos(selectedVideos);
      } catch (error) {
        console.error('Error fetching videos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  return {
    videos,
    loading
  };
}; 