// services/videoRecommendationService.ts - Fixed TypeScript errors
import { supabase } from '@/lib/supabase';
import { Video } from '../types/database.types';

// Define interface for scored videos
interface VideoWithScore extends Video {
  recommendationScore: number;
}

// Define type for genre name response from Supabase
interface GenreNameResponse {
  temp_genre: {
    genrename: string;
  } | null;
}

/**
 * Gets recommended videos based on user's interactions and genre preferences
 */
export const getRecommendedVideos = async (): Promise<Video[]> => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No authenticated user found');
      return [];
    }

    // Get user account ID and age
    const { data: userAccount, error: userAccountError } = await supabase
      .from('user_account')
      .select('id, age')
      .eq('user_id', user.id)
      .single();

    if (userAccountError || !userAccount) {
      console.error('Error fetching user account:', userAccountError);
      return [];
    }

    const userAge = userAccount.age || 0;
    const uaid = userAccount.id;

    // Get user's top genres based on interaction scores
    const { data: topGenres, error: genresError } = await supabase
      .from('userInteractions')
      .select('gid, score')
      .eq('uaid', uaid)
      .order('score', { ascending: false })
      .limit(5);
      
    if (genresError || !topGenres || topGenres.length === 0) {
      console.log('No interaction scores found, returning random videos');
      return getRandomVideos(userAge);
    }
    
    // Get content with these genres
    const topGenreIds = topGenres.map(g => g.gid);
    const { data: contentGenres, error: contentError } = await supabase
      .from('temp_contentgenres')
      .select('cid')
      .in('gid', topGenreIds);
      
    if (contentError || !contentGenres || contentGenres.length === 0) {
      console.log('No content found for top genres, returning random videos');
      return getRandomVideos(userAge);
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
      console.log('No videos found for recommended genres, returning random videos');
      return getRandomVideos(userAge);
    }
    
    // Filter blocked genres
    const filteredVideos = await filterBlockedGenres(videos, uaid);
    
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
    
    // Add genre names
    return await addGenreNames(finalVideos);
    
  } catch (error) {
    console.error('Error in getRecommendedVideos:', error);
    return [];
  }
};

/**
 * Gets trending videos (recent uploads with high view counts)
 */
export const getTrendingVideos = async (): Promise<Video[]> => {
  try {
    // Get current user for age filtering
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return [];
    }

    // Get user age
    const { data: userAccount, error: userError } = await supabase
      .from('user_account')
      .select('id, age')
      .eq('user_id', user.id)
      .single();
      
    if (userError || !userAccount) {
      return [];
    }
    
    const userAge = userAccount.age || 0;
    const uaid = userAccount.id;
    
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
      return getRandomVideos(userAge);
    }
    
    // Filter blocked genres
    const filteredVideos = await filterBlockedGenres(videos, uaid);
    
    // Add genre names
    return await addGenreNames(filteredVideos.slice(0, 10));
    
  } catch (error) {
    console.error('Error in getTrendingVideos:', error);
    return [];
  }
};

/**
 * Gets popular videos (all-time high view counts)
 */
export const getPopularVideos = async (): Promise<Video[]> => {
  try {
    // Get current user for age filtering
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return [];
    }

    // Get user age
    const { data: userAccount, error: userError } = await supabase
      .from('user_account')
      .select('id, age')
      .eq('user_id', user.id)
      .single();
      
    if (userError || !userAccount) {
      return [];
    }
    
    const userAge = userAccount.age || 0;
    const uaid = userAccount.id;
    
    // Get videos with highest view counts
    const { data: videos, error: videosError } = await supabase
      .from('temp_content')
      .select('*')
      .eq('cfid', 1) // Videos only
      .eq('status', 'approved')
      .lte('minimumage', userAge)
      .order('viewCount', { ascending: false })
      .limit(15);
      
    if (videosError || !videos || videos.length === 0) {
      return getRandomVideos(userAge);
    }
    
    // Filter blocked genres
    const filteredVideos = await filterBlockedGenres(videos, uaid);
    
    // Add genre names
    return await addGenreNames(filteredVideos.slice(0, 10));
    
  } catch (error) {
    console.error('Error in getPopularVideos:', error);
    return [];
  }
};

/**
 * Helper function to get random videos (fallback for recommendations)
 */
const getRandomVideos = async (userAge: number): Promise<Video[]> => {
  try {
    const { data: videos, error: videosError } = await supabase
      .from('temp_content')
      .select('*')
      .eq('cfid', 1) // Videos only
      .eq('status', 'approved')
      .lte('minimumage', userAge)
      .limit(20);
      
    if (videosError || !videos || videos.length === 0) {
      return [];
    }
    
    // Shuffle and take 10
    const shuffledVideos = [...videos].sort(() => Math.random() - 0.5).slice(0, 10);
    
    // Add genre names
    return await addGenreNames(shuffledVideos);
    
  } catch (error) {
    console.error('Error getting random videos:', error);
    return [];
  }
};

/**
 * Helper to filter out videos with blocked genres
 */
const filterBlockedGenres = async (videos: Video[], uaid: string): Promise<Video[]> => {
  // Get blocked genres for this user
  const { data: blockedGenres, error: blockedGenresError } = await supabase
    .from('blockedgenres')
    .select('genreid')
    .eq('child_id', uaid);
    
  if (blockedGenresError || !blockedGenres || blockedGenres.length === 0) {
    return videos; // No blocked genres, return all videos
  }
  
  const blockedGenreIds = blockedGenres.map(item => item.genreid);
  
  // Filter videos with blocked genres
  const filteredVideos = await Promise.all(
    videos.map(async (video) => {
      // Get genres for this video
      const { data: videoGenres, error: genresError } = await supabase
        .from('temp_contentgenres')
        .select('gid')
        .eq('cid', video.cid);
        
      if (genresError || !videoGenres) {
        return video; // Can't determine genres, include video
      }
      
      // Check if any genre is blocked
      const videoGenreIds = videoGenres.map(g => g.gid);
      const hasBlockedGenre = videoGenreIds.some(gid => 
        blockedGenreIds.includes(gid)
      );
      
      return hasBlockedGenre ? null : video;
    })
  );
  
  return filteredVideos.filter(Boolean) as Video[];
};

/**
 * Helper to add genre names to videos
 */
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