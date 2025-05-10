'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Video } from '../types/database.types';

// Function to fetch all videos
const fetchAllVideos = async (): Promise<Video[]> => {
  const { data, error } = await supabase
    .from('temp_content')
    .select('*')
    .eq('cfid', '1')
    .eq('status', 'approved');

  if (error) {
    console.error('Error fetching all videos:', error);
    throw error;
  }

  return data || [];
};

export const useAllVideos = (): UseQueryResult<Video[], Error> => {
  return useQuery({
    queryKey: ['videos', 'all', 'approved'],
    queryFn: fetchAllVideos,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};