// hooks/useVideos.ts - Fixed TypeScript errors without any
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Video } from '../types/database.types';

// Define types for the Supabase response data structures
interface GenreNameResponse {
  temp_genre: {
    genrename: string;
  } | null;
}

// Define interface for videos with recommendation score
interface VideoWithScore extends Video {
  recommendationScore: number;
}

export const useVideos = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [recommendedVideos, setRecommendedVideos] = useState<Video[]>([]);
  const [trendingVideos, setTrendingVideos] = useState<Video[]>([]);
  const [popularVideos, setPopularVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);

  // Main videos fetch
  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      try {
        // Get the current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Get user account ID and age for filtering
        const { data: userAccount, error: userAccountError } = await supabase
          .from('user_account')
          .select('id, age')
          .eq('user_id', user.id)
          .single();

        if (userAccountError || !userAccount) {
          console.error('Error fetching user account:', userAccountError);
          setLoading(false);
          return;
        }

        const userAge = userAccount.age || 0;
        const uaid = userAccount.id;

        // Get blocked genres for this user
        const { data: blockedGenres, error: blockedGenresError } = await supabase
          .from('blockedgenres')
          .select('genreid')
          .eq('child_id', uaid);

        if (blockedGenresError) {
          console.error('Error fetching blocked genres:', blockedGenresError);
          // Continue with no blocked genres
        }

        const blockedGenreIds = blockedGenres?.map(item => item.genreid) || [];

        // Fetch videos appropriate for user's age
        const { data: videoData, error: videosError } = await supabase
          .from('temp_content')
          .select('*')
          .eq('cfid', 1) // Videos only (cfid = 1)
          .eq('status', 'approved')
          .lte('minimumage', userAge)
          .order('viewCount', { ascending: false })
          .limit(12);

        if (videosError) {
          console.error('Error fetching videos:', videosError);
          setLoading(false);
          return;
        }

        if (!videoData || videoData.length === 0) {
          setVideos([]);
          setLoading(false);
          return;
        }

        // Filter out videos with blocked genres
        const filteredVideos = await Promise.all(
          videoData.map(async (video) => {
            // Get genres for this video
            const { data: videoGenres, error: genresError } = await supabase
              .from('temp_contentgenres')
              .select('gid')
              .eq('cid', video.cid);
              
            if (genresError || !videoGenres) {
              // If we can't get genres, assume it's safe (default to including)
              return { ...video, genre: [] };
            }
            
            // Check if any genre is blocked
            const videoGenreIds = videoGenres.map(g => g.gid);
            const hasBlockedGenre = videoGenreIds.some(gid => 
              blockedGenreIds.includes(gid)
            );
            
            // If no blocked genres, include this video
            if (!hasBlockedGenre) {
              // Get genre names for display
              const { data: genreData } = await supabase
                .from('temp_contentgenres')
                .select('temp_genre(genrename)')
                .eq('cid', video.cid);
              
              // Fixed: properly extract genre names from nested response
              const genreNames = genreData?.map(item => {
                const genreObj = item as unknown as GenreNameResponse;
                return genreObj.temp_genre?.genrename || null;
              }).filter(Boolean) || [];
              
              return {
                ...video,
                genre: genreNames as string[]
              };
            }
            
            // Has blocked genre, don't include
            return null;
          })
        );
        
        // Filter out null entries (videos with blocked genres)
        const safeVideos = filteredVideos.filter(Boolean) as Video[];
        
        setVideos(safeVideos);

        // Now fetch recommended videos based on user interaction scores
        await fetchRecommendedVideos(uaid, userAge, blockedGenreIds);
        
        // Fetch trending videos (recently added with high views)
        await fetchTrendingVideos(userAge, blockedGenreIds);
        
        // Fetch popular videos (all time high views)
        await fetchPopularVideos(userAge, blockedGenreIds);
        
      } catch (error) {
        console.error('Error in fetchVideos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  // Helper function to fetch recommended videos based on user interactions
  const fetchRecommendedVideos = async (uaid: string, userAge: number, blockedGenreIds: number[]) => {
    try {
      // First, get top genres for this user based on interaction scores
      const { data: topGenres, error: genresError } = await supabase
        .from('userInteractions')
        .select('gid, score')
        .eq('uaid', uaid)
        .order('score', { ascending: false })
        .limit(5);
      
      if (genresError || !topGenres || topGenres.length === 0) {
        console.log('No interaction scores found, using random videos instead');
        // Fallback to random videos
        fetchRandomVideos(userAge, blockedGenreIds, setRecommendedVideos);
        return;
      }
      
      // Get content with these genres
      const topGenreIds = topGenres.map(g => g.gid);
      const { data: contentGenres, error: contentError } = await supabase
        .from('temp_contentgenres')
        .select('cid')
        .in('gid', topGenreIds);
        
      if (contentError || !contentGenres || contentGenres.length === 0) {
        console.log('No content found for top genres, using random videos');
        fetchRandomVideos(userAge, blockedGenreIds, setRecommendedVideos);
        return;
      }
      
      // Get unique content IDs
      const contentIds = [...new Set(contentGenres.map(c => c.cid))];
      
      // Fetch videos for these content IDs
      const { data: videos, error: videosError } = await supabase
        .from('temp_content')
        .select('*')
        .in('cid', contentIds)
        .eq('cfid', 1) // Videos only
        .eq('status', 'approved')
        .lte('minimumage', userAge)
        .limit(15);
        
      if (videosError || !videos || videos.length === 0) {
        console.log('No videos found for recommended genres, using random videos');
        fetchRandomVideos(userAge, blockedGenreIds, setRecommendedVideos);
        return;
      }
      
      // Filter out videos with blocked genres
      const filteredVideos = await filterBlockedGenreVideos(videos, blockedGenreIds);
      
      // Sort videos by user's genre preferences
      const genreScores = new Map<number, number>();
      topGenres.forEach(g => genreScores.set(g.gid, g.score));
      
      // Calculate score for each video based on its genres
      const scoredVideos = await Promise.all(
        filteredVideos.map(async (video) => {
          // Get genres for this video
          const { data: videoGenres } = await supabase
            .from('temp_contentgenres')
            .select('gid')
            .eq('cid', video.cid);
            
          let score = 0;
          if (videoGenres) {
            // Sum up scores for each matching genre
            videoGenres.forEach(g => {
              score += genreScores.get(g.gid) || 0;
            });
          }
          
          return {
            ...video,
            recommendationScore: score
          } as VideoWithScore;
        })
      );
      
      // Sort by recommendation score and take top 10
      scoredVideos.sort((a, b) => b.recommendationScore - a.recommendationScore);
      const finalVideos = scoredVideos.slice(0, 10);
      
      // Fetch genre names for display
      const enrichedVideos = await addGenreNames(finalVideos);
      
      setRecommendedVideos(enrichedVideos);
    } catch (error) {
      console.error('Error fetching recommended videos:', error);
      // Fallback to random videos
      fetchRandomVideos(userAge, blockedGenreIds, setRecommendedVideos);
    }
  };

  // Helper to fetch trending videos (recent with high views)
  const fetchTrendingVideos = async (userAge: number, blockedGenreIds: number[]) => {
    try {
      // Get date from 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();
      
      // Get recent videos with high view counts
      const { data: videos, error: videosError } = await supabase
        .from('temp_content')
        .select('*')
        .eq('cfid', 1) // Videos only
        .eq('status', 'approved')
        .gte('decisiondate', thirtyDaysAgoStr) // Recent videos
        .lte('minimumage', userAge)
        .order('viewCount', { ascending: false })
        .limit(15);
        
      if (videosError || !videos || videos.length === 0) {
        console.log('No trending videos found, using random videos');
        fetchRandomVideos(userAge, blockedGenreIds, setTrendingVideos);
        return;
      }
      
      // Filter out videos with blocked genres
      const filteredVideos = await filterBlockedGenreVideos(videos, blockedGenreIds);
      
      // Add genre names for display
      const enrichedVideos = await addGenreNames(filteredVideos.slice(0, 10));
      
      setTrendingVideos(enrichedVideos);
    } catch (error) {
      console.error('Error fetching trending videos:', error);
      fetchRandomVideos(userAge, blockedGenreIds, setTrendingVideos);
    }
  };

  // Helper to fetch all-time popular videos
  const fetchPopularVideos = async (userAge: number, blockedGenreIds: number[]) => {
    try {
      // Get videos with highest view counts of all time
      const { data: videos, error: videosError } = await supabase
        .from('temp_content')
        .select('*')
        .eq('cfid', 1) // Videos only
        .eq('status', 'approved')
        .lte('minimumage', userAge)
        .order('viewCount', { ascending: false })
        .limit(15);
        
      if (videosError || !videos || videos.length === 0) {
        console.log('No popular videos found, using random videos');
        fetchRandomVideos(userAge, blockedGenreIds, setPopularVideos);
        return;
      }
      
      // Filter out videos with blocked genres
      const filteredVideos = await filterBlockedGenreVideos(videos, blockedGenreIds);
      
      // Add genre names for display
      const enrichedVideos = await addGenreNames(filteredVideos.slice(0, 10));
      
      setPopularVideos(enrichedVideos);
    } catch (error) {
      console.error('Error fetching popular videos:', error);
      fetchRandomVideos(userAge, blockedGenreIds, setPopularVideos);
    }
  };

  // Helper for random videos (fallback)
  const fetchRandomVideos = async (
    userAge: number, 
    blockedGenreIds: number[], 
    setStateFunction: React.Dispatch<React.SetStateAction<Video[]>>
  ) => {
    try {
      const { data: videos, error: videosError } = await supabase
        .from('temp_content')
        .select('*')
        .eq('cfid', 1) // Videos only
        .eq('status', 'approved')
        .lte('minimumage', userAge)
        .limit(20);
        
      if (videosError || !videos || videos.length === 0) {
        setStateFunction([]);
        return;
      }
      
      // Filter blocked genres
      const filteredVideos = await filterBlockedGenreVideos(videos, blockedGenreIds);
      
      // Shuffle and take 10
      const shuffledVideos = [...filteredVideos].sort(() => Math.random() - 0.5).slice(0, 10);
      
      // Add genre names
      const enrichedVideos = await addGenreNames(shuffledVideos);
      
      setStateFunction(enrichedVideos);
    } catch (error) {
      console.error('Error fetching random videos:', error);
      setStateFunction([]);
    }
  };

  // Helper to filter videos by blocked genres
  const filterBlockedGenreVideos = async (videos: Video[], blockedGenreIds: number[]): Promise<Video[]> => {
    if (blockedGenreIds.length === 0) return videos;
    
    const filteredVideos = await Promise.all(
      videos.map(async (video) => {
        // Get genres for this video
        const { data: videoGenres, error: genresError } = await supabase
          .from('temp_contentgenres')
          .select('gid')
          .eq('cid', video.cid);
          
        if (genresError || !videoGenres) {
          // If we can't get genres, assume it's safe
          return video;
        }
        
        // Check if any genre is blocked
        const videoGenreIds = videoGenres.map(g => g.gid);
        const hasBlockedGenre = videoGenreIds.some(gid => 
          blockedGenreIds.includes(gid)
        );
        
        // Return video if no blocked genres
        return hasBlockedGenre ? null : video;
      })
    );
    
    // Filter out nulls
    return filteredVideos.filter(Boolean) as Video[];
  };

  // Helper to add genre names to videos
  const addGenreNames = async (videos: Video[]): Promise<Video[]> => {
    return await Promise.all(
      videos.map(async (video) => {
        // Get genres for this video
        const { data: genreData } = await supabase
          .from('temp_contentgenres')
          .select('temp_genre(genrename)')
          .eq('cid', video.cid);
        
        // Fixed: properly extract genre names from nested response
        const genreNames = genreData?.map(item => {
          const genreObj = item as unknown as GenreNameResponse;
          return genreObj.temp_genre?.genrename || null;
        }).filter(Boolean) || [];
        
        return {
          ...video,
          genre: genreNames as string[]
        };
      })
    );
  };

  return {
    videos,
    recommendedVideos,
    trendingVideos,
    popularVideos,
    loading,
    error
  };
};