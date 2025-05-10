'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Video } from '../types/database.types';

// Function to fetch all videos with genre information
const fetchAllVideos = async (): Promise<Video[]> => {
  // Fetch videos (cfid = 1) with genre information
  const { data: videos, error } = await supabase
    .from('temp_content')
    .select(`
      *,
      temp_contentgenres!inner(
        gid,
        temp_genre(genrename)
      )
    `)
    .eq('cfid', 1)
    .eq('status', 'approved');

  if (error) {
    console.error('Error fetching all videos:', error);
    throw error;
  }

  // Transform the data to include genre names as an array
  const videosWithGenres = videos?.map(video => ({
    ...video,
    genre: video.temp_contentgenres?.map((cg: { temp_genre: { genrename: string } }) => cg.temp_genre.genrename) || []
  })) || [];

  return videosWithGenres;
};

export const useAllVideos = (): UseQueryResult<Video[], Error> => {
  return useQuery({
    queryKey: ['videos', 'all', 'approved', 'with-genres'],
    queryFn: fetchAllVideos,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};