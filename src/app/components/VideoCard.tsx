import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Video } from '@/types/database.types';
import AssignVideoModal from './educator/ClassroomDetails/AssignVideoModal';
import { supabase } from '@/lib/supabase';
import { useInteractions } from '../../hooks/useInteractions';

interface VideoCardProps extends Video {
  isEducator?: boolean;
  lazyLoad?: boolean;
  minimumage: number;
}

const VideoCard: React.FC<VideoCardProps> = ({
  cid,
  title,
  credit,
  contenturl,
  minimumage,
  isEducator = false,
  lazyLoad = true
}) => {
  const [inView, setInView] = useState(!lazyLoad);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const interactions = useInteractions();
  
  // Extract YouTube video ID using regex for better matching
  const getYoutubeVideoId = () => {
    if (!contenturl) return null;
    
    const match = contenturl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };
  
  const videoId = getYoutubeVideoId();
  const isYoutubeVideo = videoId !== null;

  // Convert cid to string for consistent handling
  const contentId = typeof cid === 'number' ? cid.toString() : cid;

  // Effect for checking if video is bookmarked (students only)
  useEffect(() => {
    if (!isEducator) {
      const checkIfBookmarked = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: userAccount, error } = await supabase
            .from('user_account')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (error || !userAccount) {
            console.error('Error fetching user account:', error);
            setIsChecking(false);
            return;
          }

          const { data: bookmark } = await supabase
            .from('temp_bookmark')
            .select('*')
            .eq('uaid', userAccount.id)
            .eq('cid', contentId)
            .maybeSingle();

          setIsBookmarked(!!bookmark);
        } catch (error) {
          console.error('Error checking bookmark:', error);
        } finally {
          setIsChecking(false);
        }
      };

      checkIfBookmarked();
    } else {
      setIsChecking(false);
    }
  }, [contentId, isEducator]);

  // Handle bookmark toggle function
  const handleBookmarkToggle = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const success = await interactions.toggleBookmark(contentId, !isBookmarked);
    if (success) {
      setIsBookmarked(!isBookmarked);
    }
  }, [contentId, isBookmarked, interactions]);

  useEffect(() => {
    if (!lazyLoad || !cardRef.current) {
      return;
    }

    // Set up intersection observer to detect when card is visible
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // Load when within 200px of viewport
    );

    observer.observe(cardRef.current);
    
    return () => {
      observer.disconnect();
    };
  }, [lazyLoad]);

  // Handle video view recording for students
  const handleClick = useCallback(async () => {
    // Only record views for students, not educators
    if (!isEducator && contentId) {
      await interactions.recordBookView(contentId);
    }
  }, [contentId, isEducator, interactions]);

  // Generate YouTube thumbnail URL for placeholder
  const thumbnailUrl = videoId 
    ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    : '/placeholder-video.jpg';
    
  // Handle assign button click
  const handleAssignClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation(); // Prevent event bubbling
    setIsAssignModalOpen(true);
  };

  return (
    <>
      <div 
        ref={cardRef}
        className={`border rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-300 relative ${!isEducator ? 'h-full flex flex-col bg-gray-700' : ''}`}
      >
        <Link 
          href={`/${isEducator ? 'educator/videodetail' : 'child/videodetail'}/${cid}`}
          onClick={handleClick}
        >
          {isYoutubeVideo && (
            <div className={`${isEducator ? 'aspect-video' : 'aspect-video'} bg-gray-100 relative`}>
              {inView ? (
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?rel=0`}
                  title={title || 'Video'}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    backgroundImage: `url(${thumbnailUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  <div className="w-12 h-12 rounded-full bg-white bg-opacity-80 flex items-center justify-center">
                    <div className="w-0 h-0 border-y-8 border-y-transparent border-l-10 border-l-rose-500 ml-1"></div>
                  </div>
                </div>
              )}
              
              {/* Age rating indicator - Added similar to BookCard */}
              {minimumage && minimumage > 0 && (
                <div className="absolute top-1 left-1 bg-blue-900 text-white rounded-full px-2 h-6 flex items-center justify-center">
                  <span className="text-xs font-medium">{minimumage}+</span>
                </div>
              )}
            </div>
          )}

          <div className={`p-2 ${!isEducator ? 'flex-grow flex flex-col' : ''}`}>
            <h3 
              className={`font-bold text-xs leading-tight line-clamp-2 ${isEducator ? 'text-black' : 'text-white'}`} 
              style={{ fontFamily: 'Quicksand, Nunito, Arial Rounded MT Bold, Arial, sans-serif' }}
            >
              {title}
            </h3>
            {credit && (
              <p 
                className={`text-xs mt-1 ${isEducator ? 'text-black' : 'text-white'}`} 
                style={{ fontFamily: 'Quicksand, Nunito, Arial Rounded MT Bold, Arial, sans-serif' }}
              >
                {credit}
              </p>
            )}
          </div>
        </Link>
        
        {/* Bookmark button - only visible for students */}
        {!isEducator && (
          <button
            className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-md z-10"
            onClick={handleBookmarkToggle}
            aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
          >
            {isChecking ? (
              <div className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-transparent animate-spin"></div>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={isBookmarked ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={isBookmarked ? "text-blue-500" : "text-gray-500"}
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
            )}
          </button>
        )}
        
        {/* Assign button - only visible for educators */}
        {isEducator && (
          <button
            onClick={handleAssignClick}
            className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded shadow hover:bg-green-600 transition-colors z-10"
          >
            Assign
          </button>
        )}
      </div>
      
      {/* Assign Modal */}
      {isEducator && (
        <AssignVideoModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          videoId={Number(cid)}
          videoTitle={title || ''}
        />
      )}
    </>
  );
};

export default VideoCard;