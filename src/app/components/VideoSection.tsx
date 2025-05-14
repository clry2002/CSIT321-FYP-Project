// components/VideoSection.tsx
import { useState } from 'react';
import { Video } from '../../types/database.types';
import VideoCard from './VideoCard';

interface VideoSectionProps {
  title: string;
  videos: Video[];
  loading: boolean;
  type: 'recommended' | 'trending' | 'popular';
}

const VideoSection = ({ 
  title, 
  videos, 
  loading, 
}: VideoSectionProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Calculate how many videos to show per page based on screen size
  const videosPerPage = 4; // This can be adjusted based on your layout
  
  // Handle navigation
  const navigateLeft = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };
  
  const navigateRight = () => {
    const maxStartIndex = Math.max(0, videos.length - videosPerPage);
    setCurrentIndex(prev => Math.min(maxStartIndex, prev + 1));
  };

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-yellow-400 mb-4">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border rounded-lg overflow-hidden bg-white/20 backdrop-blur-md">
              <div className="w-full aspect-video bg-gray-200 animate-pulse"></div>
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-300 rounded animate-pulse w-3/4"></div>
                <div className="h-3 bg-gray-300 rounded animate-pulse w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-yellow-400">{title}</h2>
      </div>
      
      <div className="relative">
        {currentIndex > 0 && (
          <button 
            onClick={navigateLeft}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 -ml-4 bg-blue-800 text-white rounded-full p-2 shadow-md z-10 hover:bg-blue-900 transition-colors"
            aria-label="Previous videos"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        
        <div className="overflow-hidden">
          <div 
            className="flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * (100 / videosPerPage)}%)` }}
          >
            {videos.map((video) => (
              <div key={video.cid} 
                className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 flex-shrink-0 px-2"
                style={{ fontFamily: 'Quicksand, Nunito, Arial Rounded MT Bold, Arial, sans-serif' }}
              >
                <VideoCard 
                  {...video}
                  minimumage={video.minimumage}
                  lazyLoad={true}
                />
              </div>
            ))}
          </div>
        </div>
        
        {currentIndex < Math.max(0, videos.length - videosPerPage) && (
          <button 
            onClick={navigateRight}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 -mr-4 bg-blue-800 text-white rounded-full p-2 shadow-md z-10 hover:bg-blue-900 transition-colors"
            aria-label="Next videos"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default VideoSection;