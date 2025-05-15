import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useInteractions } from '../../hooks/useInteractions';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AssignBookModal from './educator/ClassroomDetails/AssignBookModal';

interface BookCardProps {
  cid: string | number; 
  title: string;
  coverurl?: string | null; 
  coverimage?: string | null; 
  author?: string; 
  credit?: string; 
  genre?: string[];
  showGenre?: boolean; 
  minimumage?: number;
  description?: string;
  cfid?: number;
  status?: string;
  createddate?: string | null;
  decisiondate?: string | null;
  viewCount?: number;
  isEducator?: boolean;
}

const BookCard: React.FC<BookCardProps> = ({ 
  cid, 
  title, 
  author,
  credit,
  coverurl,
  coverimage,
  genre = [],
  showGenre = true,
  minimumage,
  createddate,
  viewCount: initialViewCount = 0,
  isEducator = false,
}) => {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const [actualViewCount, setActualViewCount] = useState<number>(initialViewCount);
  const [isLoadingViewCount, setIsLoadingViewCount] = useState<boolean>(isEducator);
  const interactions = useInteractions();
  const hasLoadedViewCount = useRef(false);

  // Use the coverimage as a fallback if coverurl is not provided
  const imageUrl = coverurl || coverimage || null;
  
  // Use author or credit for the author display
  const displayAuthor = author || credit || '';

  // Convert cid to string for consistent handling
  const contentId = useMemo(() => {
    return typeof cid === 'number' ? cid.toString() : cid;
  }, [cid]);

  // Effect for checking bookmarks (students only)
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

  // Fetch view count only once when the component mounts
  useEffect(() => {
    if (!isEducator || hasLoadedViewCount.current) return;
    
    const fetchViewCount = async () => {
      try {
        setIsLoadingViewCount(true);
        const count = await interactions.getContentViewCount(contentId);
        setActualViewCount(count);
        hasLoadedViewCount.current = true;
      } catch (error) {
        console.error('Error fetching view count:', error);
      } finally {
        setIsLoadingViewCount(false);
      }
    };
    
    fetchViewCount();
  }, [contentId, isEducator, interactions]);

  const handleBookmarkToggle = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const success = await interactions.toggleBookmark(contentId, !isBookmarked);
    if (success) {
      setIsBookmarked(!isBookmarked);
    }
  }, [contentId, isBookmarked, interactions]);

  const handleClick = useCallback(async () => {
    // Only record views for students, not educators
    if (!isEducator) {
      await interactions.recordBookView(contentId);
    }
  }, [contentId, isEducator, interactions]);

  const handleAssign = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowAssignModal(true);
  }, []);

  // Function to handle navigation
  const navigateToDetail = useCallback((e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleClick(); // Record the view for students only
    
    // Navigate to different routes based on user type
    if (isEducator) {
      router.push(`/educator/bookdetail/${contentId}`);
    } else {
      router.push(`/child/bookdetail/${contentId}`);
    }
  }, [contentId, handleClick, isEducator, router]);

  // Function to truncate title if it's too long
  const truncateTitle = useCallback((title: string) => {
    return title.length > 20 ? `${title.substring(0, 20)}...` : title;
  }, []);

  // Format date for display
  const formatDate = useCallback((dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }, []);

  // Use grayed background for kids view and white border for educator view
  const containerClassName = `border rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200 h-full flex flex-col ${
    isEducator ? 'bg-white' : 'bg-gray-400/40 backdrop-blur-sm'
  }`;

  return (
    <>
      <div className={containerClassName}>
        {/* Main content with hover effect */}
        <div 
          className="relative group cursor-pointer" 
          onClick={navigateToDetail} 
          role="button"
          tabIndex={0} 
          aria-label={`View details for ${title}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              navigateToDetail(e);
            }
          }}
        >
          <div className="aspect-[3/4] bg-gray-100 relative overflow-hidden">
            {imageUrl && !imageError ? (
              <div className="relative w-full h-full">
                <Image
                  src={imageUrl}
                  alt={title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  style={{ objectFit: 'cover' }}
                  onError={() => setImageError(true)}
                  priority={false}
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <span className="text-gray-500 text-xs">{title}</span>
              </div>
            )}
            
            {/* Tooltip overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {isEducator ? "View details" : "View book details"}
              </span>
            </div>

            {/* Age rating indicator */}
            {minimumage && minimumage > 0 && (
              <div className="absolute top-1 left-1 bg-blue-900 text-white rounded-full px-2 h-6 flex items-center justify-center">
                <span className="text-xs font-medium">{minimumage}+</span>
              </div>
            )}
          </div>
          
          {/* Action buttons - positioned based on user type */}
          {isEducator ? (
            // Assign button for educators
            <button
              className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded shadow hover:bg-green-600 transition-colors z-10"
              onClick={handleAssign}
              aria-label="Assign book"
            >
              Assign
            </button>
          ) : (
            // Bookmark button for students
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
        </div>
        
        {/* Book info section - Content */}
        <div className="p-2 flex-grow flex flex-col">
          <h3 
            className={`font-bold text-xs leading-tight ${isEducator ? 'text-black' : 'text-white'}`} 
            style={{ fontFamily: 'Quicksand, Nunito, Arial Rounded MT Bold, Arial, sans-serif' }}
          >
            {truncateTitle(title)}
          </h3>
          
          <p
            className={`text-xs mt-0.5 overflow-hidden text-ellipsis ${isEducator ? 'text-black' : 'text-white'}`}
            style={{
              fontFamily: 'Quicksand, Nunito, Arial Rounded MT Bold, Arial, sans-serif',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              minHeight: '32px',
              maxHeight: '32px',
              lineHeight: '16px',
              whiteSpace: 'normal',
            }}
            title={displayAuthor}
          >
            {displayAuthor}
          </p>
          
          {/* Genre tags - Always shown in kid view, optional for educators */}
          {((showGenre && isEducator) || !isEducator) && genre.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1 mb-auto">
              {genre.slice(0, 2).map((g, i) => (
                <span 
                  key={i} 
                  className="text-white text-[12px] bg-blue-800 px-2 py-0.5 rounded-full" 
                  style={{ 
                    fontFamily: 'Quicksand, Nunito, Arial Rounded MT Bold, Arial, sans-serif', 
                    maxWidth: '120px', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    display: 'inline-block', 
                    whiteSpace: 'nowrap' 
                  }}
                >
                  {g.length > 20 ? g.slice(0, 19) + '...' : g}
                </span>
              ))}
              {genre.length > 2 && (
                <span 
                  className="text-white text-[12px] bg-blue-800 px-2 py-0.5 rounded-full" 
                  style={{ fontFamily: 'Quicksand, Nunito, Arial Rounded MT Bold, Arial, sans-serif' }}
                >
                  +{genre.length - 2}
                </span>
              )}
            </div>
          )}
          
          {/* Education-specific metadata (only shown to educators) */}
          {isEducator && (
            <div className="mt-auto pt-2 border-t border-gray-100">
              <div className="flex items-center text-xs text-gray-500 mt-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                {isLoadingViewCount ? (
                  <span className="ml-1 w-3 h-3 inline-block animate-spin border-2 border-gray-300 border-t-transparent rounded-full"></span>
                ) : (
                  <>{actualViewCount} views</>
                )}
              </div>
              
              {createddate && (
                <div className="flex items-center text-xs text-gray-500 mt-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-1"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  Published on: {formatDate(createddate)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Assignment Modal */}
      {isEducator && (
        <AssignBookModal
          bookId={Number(contentId)}
          bookTitle={title}
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
        />
      )}
    </>
  );
};

export default BookCard;