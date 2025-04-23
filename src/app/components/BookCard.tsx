// components/BookCard.tsx
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useInteractions } from '../../hooks/useInteractions';

// Create a custom interface that doesn't extend Book but includes the properties we need
interface BookCardProps {
  cid: string | number; // Allow both string and number types for cid
  title: string; // Title is required
  coverurl?: string | null; // For coverurl
  coverimage?: string | null; // From Book interface
  author?: string; // Alternative to credit
  credit?: string; // From Book interface
  genre?: string[]; // Genre information
  showGenre?: boolean; // UI control prop
  // Add any other Book properties that might be needed
  minimumage?: number;
  description?: string;
  contenturl?: string | null;
  cfid?: number;
  status?: string;
  createddate?: string | null;
  decisiondate?: string | null;
}

const BookCard: React.FC<BookCardProps> = ({ 
  cid, 
  title, 
  author,
  credit, // Add credit prop
  coverurl, // Use coverurl if provided
  coverimage, // Or coverimage from the Book interface
  genre = [],
  showGenre = true 
}) => {
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
    await recordBookView(contentId);
  };

  // Function to truncate title if it's too long
  const truncateTitle = (title: string) => {
    return title.length > 20 ? `${title.substring(0, 20)}...` : title;
  };

  return (
    <Link href={`/books/${contentId}`} onClick={handleClick}>
      <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200">
        <div className="relative">
          <div className="aspect-[3/4] bg-gray-100">
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
          </div>
          
          {/* Bookmark button */}
          <button
            className="absolute top-1 right-1 p-1 bg-white rounded-full shadow-sm"
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
                <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xxs">
                  {g}
                </span>
              ))}
              {genre.length > 2 && (
                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xxs">
                  +{genre.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default BookCard;