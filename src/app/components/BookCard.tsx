// components/BookCard.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useInteractions } from '../../hooks/useInteractions';
import { useRouter } from 'next/navigation';

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
  minimumage 
}) => {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const { toggleBookmark, recordBookView } = useInteractions();

  // Use the coverimage as a fallback if coverurl is not provided
  const imageUrl = coverurl || coverimage || null;
  
  // Use author or credit for the author display
  const displayAuthor = author || credit || '';

  // Convert cid to string for consistent handling
  const contentId = typeof cid === 'number' ? cid.toString() : cid;

  useEffect(() => {
    const checkIfBookmarked = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userAccount } = await supabase
          .from('user_account')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!userAccount) return;

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
  }, [contentId]);

  const handleBookmarkToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const success = await toggleBookmark(contentId, !isBookmarked);
    if (success) {
      setIsBookmarked(!isBookmarked);
    }
  };

  const handleClick = async () => {
    // This will increment view count in the database
    await recordBookView(contentId);
  };

  // Function to handle navigation
  const navigateToDetail = (e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleClick(); // Record the view
    router.push(`/bookdetail/${contentId}`);
  };

  // Function to truncate title if it's too long
  const truncateTitle = (title: string) => {
    return title.length > 20 ? `${title.substring(0, 20)}...` : title;
  };

  return (
    <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Main content with hover effect */}
      <div 
        className="relative group cursor-pointer" 
        onClick={(e) => navigateToDetail(e)} 
        role="button"
        tabIndex={0} 
        aria-label={`View details for ${title}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleClick();
            router.push(`/bookdetail/${contentId}`);
          }
        }}
      >
        <div className="aspect-[3/4] bg-gray-100 relative overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholders/book-cover.png'; // Fallback image
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <span className="text-gray-500 text-xs">No cover</span>
            </div>
          )}
          
          {/* Tooltip overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <span className="text-white text-sm font-medium">View book details</span>
          </div>

          {minimumage && minimumage > 0 && (
            <div className="absolute top-1 left-1 bg-blue-900 text-white rounded-full px-2 h-6 flex items-center justify-center">
              <span className="text-xs font-medium">{minimumage}+</span>
            </div>
          )}
        </div>
        
        {/* Bookmark button - positioned outside the hover effect */}
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
      </div>
      
      <div className="p-2">
        <h3 className="font-medium text-xs leading-tight text-black">{truncateTitle(title)}</h3>
        <p className="text-gray-600 text-xs mt-0.5">{displayAuthor}</p>
        
        {showGenre && genre.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {genre.slice(0, 2).map((g, i) => (
              <span key={i} className="text-black text-[12px] bg-gray-100 px-1.5 py-0.5 rounded">
                {g}
              </span>
            ))}
            {genre.length > 2 && (
              <span className="text-black text-[12px] bg-gray-100 px-1.5 py-0.5 rounded">
                +{genre.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookCard;