import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Video } from '@/types/database.types';
import AssignVideoModal from './educator/ClassroomDetails/AssignVideoModal';

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
  
  // Extract YouTube video ID using regex for better matching
  const getYoutubeVideoId = () => {
    if (!contenturl) return null;
    
    const match = contenturl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };
  
  const videoId = getYoutubeVideoId();
  const isYoutubeVideo = videoId !== null;

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
        className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-300 relative"
      >
        <Link href={`/${isEducator ? 'educator/videodetail' : 'child/video'}/${cid}`}>
          {isYoutubeVideo && (
            <div className="aspect-video bg-gray-100 relative">
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

          <div className="p-2">
            <h3 className="font-bold text-xs text-black leading-tight line-clamp-2" style={{ fontFamily: 'Quicksand, Nunito, Arial Rounded MT Bold, Arial, sans-serif' }}>{title}</h3>
            {credit && (
              <p className="text-black text-xs mt-1" style={{ fontFamily: 'Quicksand, Nunito, Arial Rounded MT Bold, Arial, sans-serif' }}>
                {credit}
              </p>
            )}
          </div>
        </Link>
        
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
          videoId={Number(cid)} // Pass the video ID as bookId (using the naming from AssignVideoModal)
          videoTitle={title || ''} // Pass the video title as bookTitle
        />
      )}
    </>
  );
};

export default VideoCard;