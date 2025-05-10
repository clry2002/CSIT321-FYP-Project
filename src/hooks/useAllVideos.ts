'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Video } from '../types/database.types';

// Type for the genre relation
interface GenreRelation {
  gid: number;
  temp_genre: {
    genrename: string;
  };
}

// Type for the raw video data from the database
interface RawVideoData {
  cid: number;
  title: string;
  credit: string;
  coverimage: string | null;
  minimumage: number;
  description: string;
  contenturl: string | null;
  cfid: number;
  createddate: string | null;
  decisiondate: string | null;
  temp_contentgenres: GenreRelation[];
}

// Function to fetch all videos with genre information
const fetchAllVideos = async (): Promise<Video[]> => {
  // Make sure to include coverimage in the select
  const { data: videos, error } = await supabase
    .from('temp_content')
    .select(`
      cid,
      title,
      credit,
      coverimage,
      minimumage,
      description,
      contenturl,
      cfid,
      createddate,
      decisiondate,
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

  // Transform the data to include genre names as an array and exclude temp_contentgenres
  const videosWithGenres = (videos as unknown as RawVideoData[])?.map((video): Video => {
     
    const { temp_contentgenres, ...videoWithoutRelations } = video;
    
    return {
      ...videoWithoutRelations,
      coverimage: video.coverimage || null, // This should now have the thumbnail URLs
      genre: temp_contentgenres?.map((cg) => cg.temp_genre.genrename) || []
    };
  }) || [];

  // Log the first video to see if coverimage is populated
  if (videosWithGenres.length > 0) {
    console.log('Sample video data:', videosWithGenres[0]);
  }

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