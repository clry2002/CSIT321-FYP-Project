'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Video {
  title: string;
  contenturl: string;
  coverimage: string;
}

export const useVideos = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        // Fetch videos from Temp_content where cfid = 1 (videos)
        const { data, error } = await supabase
          .from('temp_content')
          .select('title, contenturl, coverimage')
          .eq('cfid', 1)
          .eq('status', 'approved');

        if (error) throw error;

        // Shuffle and pick 4 random videos
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
