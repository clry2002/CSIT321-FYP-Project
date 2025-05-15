'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '@/app/components/Navbar';
import BookCard from '@/app/components/BookCard';
import ChatBot from '@/app/components/ChatBot';
import ScreenTimeIndicator from '@/app/components/child/ScreenTimeIndicator';
import TimeLimitModal from '@/app/components/child/TimeLimitModal';
import { useBooks } from '@/hooks/useBooks';
import { useVideos } from '@/hooks/useVideos';
import { supabase } from '@/lib/supabase';
import { Book } from '@/types/database.types';
import ScoreDebugger from '@/app/components/ScoreDebugger';
import { useInteractions } from '@/hooks/useInteractions';
import { debugUserInteractions } from '@/services/userInteractionsService';
import { getRecommendedBooks } from '@/services/recommendationService';
import { getTrendingBooks, getPopularBooks } from '@/services/trendingPopularService';
import { useScreenTime } from '@/hooks/useScreenTime';
import { useRouter } from 'next/navigation';
import VideoSection from '@/app/components/VideoSection';

export default function ChildPage() {
  // Use refs to maintain stable references
  const isTimeLimitExceededRef = useRef(false);
  
  // State that affects rendering
  const [recommendedBooks, setRecommendedBooks] = useState<Book[]>([]);
  const [trendingBooks, setTrendingBooks] = useState<Book[]>([]);
  const [popularBooks, setPopularBooks] = useState<Book[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);
  const [isLoadingPopular, setIsLoadingPopular] = useState(true);
  const [showTimeLimitModal, setShowTimeLimitModal] = useState(false);
  const [userFullName, setUserFullName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recommendedBooksIndex, setRecommendedBooksIndex] = useState(0);
  const [trendingBooksIndex, setTrendingBooksIndex] = useState(0);
  const [popularBooksIndex, setPopularBooksIndex] = useState(0);
  const router = useRouter();

  const { 
    recommendedVideos,
    trendingVideos,
    popularVideos,
    loading: videosLoading
  } = useVideos();

  useEffect(() => {
      const checkAuth = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
  
          if (!user) {
            router.push('/landing'); // Redirect unauthenticated users to the landing page
            return;
          }
  
        } catch (error) {
          console.error('Error checking auth state:', error);
          router.push('/landing');
        }
      };
  
      checkAuth();
    }, [router]);
  
  
  // Handle time limit exceeded - use a stable callback
  const handleTimeLimitExceeded = useCallback(() => {
    console.log('Time limit exceeded handler called');
    
    // Prevent multiple calls
    if (isTimeLimitExceededRef.current) {
      console.log('Already handled time limit exceeded, ignoring');
      return;
    }
    
    isTimeLimitExceededRef.current = true;
    setShowTimeLimitModal(true);
  }, []);
  
  // Use the screen time hook directly in the component to monitor limit state
  const {
    isLimitExceeded,
    isLoading: isTimeLoading
  } = useScreenTime({
    onTimeExceeded: handleTimeLimitExceeded
  });
  
  // Hooks
  const { availableBooks } = useBooks();
  const { syncFavoriteGenresForUser } = useInteractions();

  // Combine genre component display with recommended books
  const recommendedBooksWithGenre = recommendedBooks.map((book) => {
    const matchingBook = availableBooks.find((b: Book) => b.cid === book.cid);
    return {
      ...book,
      genre: matchingBook?.genre || [],
    };
  });
  
  // Combine genre for trending books
  const trendingBooksWithGenre = trendingBooks.map((book) => {
    const matchingBook = availableBooks.find((b: Book) => b.cid === book.cid);
    return {
      ...book,
      genre: matchingBook?.genre || [],
    };
  });
  
  // Combine genre for popular books
  const popularBooksWithGenre = popularBooks.map((book) => {
    const matchingBook = availableBooks.find((b: Book) => b.cid === book.cid);
    return {
      ...book,
      genre: matchingBook?.genre || [],
    };
  });

  // Sync favorite genres with scores when component loads
  const syncFavoritesOnLoad = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Get user account ID
      const { data: userAccount, error: userError } = await supabase
        .from('user_account')
        .select('id')
        .eq('user_id', user.id)
        .single();
        
      if (userError || !userAccount) {
        console.error('Failed to get user account in sync');
        return;
      }
      
      // Sync favorite genres with interaction scores
      await syncFavoriteGenresForUser();
      
      // Debug user interactions after sync
      await debugUserInteractions(userAccount.id);
      
    } catch (error) {
      console.error('Error syncing favorite genres:', error);
    }
  }, [syncFavoriteGenresForUser]);

  // Fetch user information on mount
  useEffect(() => {
    syncFavoritesOnLoad();
  }, [syncFavoritesOnLoad]);

  useEffect(() => {
    // Use a mounted flag to avoid state updates after unmount
    let mounted = true;
    
    const fetchUserFullName = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('user_account')
          .select('fullname')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user fullname:', error);
          return;
        }

        if (mounted) {
          setUserFullName(data?.fullname || null);
        }
      } catch (error) {
        console.error('Error in fetchUserFullName:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchUserFullName();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch recommended books using the service
  useEffect(() => {
    // Use a mounted flag to avoid state updates after unmount
    let mounted = true;
    
    const fetchRecommendedBooks = async () => {
      if (mounted) {
        setIsLoadingRecommendations(true);
      }
      
      try {
        const books = await getRecommendedBooks();
        
        if (mounted) {
          setRecommendedBooks(books);
        }
      } catch (error) {
        console.error('Error fetching recommended books:', error);
      } finally {
        if (mounted) {
          setIsLoadingRecommendations(false);
        }
      }
    };

    fetchRecommendedBooks();
    
    return () => {
      mounted = false;
    };
  }, []);
  
  // Fetch trending books (from the last 30 days)
  useEffect(() => {
    // Use a mounted flag to avoid state updates after unmount
    let mounted = true;
    
    const fetchTrendingBooks = async () => {
      if (mounted) {
        setIsLoadingTrending(true);
      }
      
      try {
        const books = await getTrendingBooks();
        
        if (mounted) {
          setTrendingBooks(books);
        }
      } catch (error) {
        console.error('Error fetching trending books:', error);
      } finally {
        if (mounted) {
          setIsLoadingTrending(false);
        }
      }
    };

    fetchTrendingBooks();
    
    return () => {
      mounted = false;
    };
  }, []);
  
  // Fetch popular books (all time)
  useEffect(() => {
    // Use a mounted flag to avoid state updates after unmount
    let mounted = true;
    
    const fetchPopularBooks = async () => {
      if (mounted) {
        setIsLoadingPopular(true);
      }
      
      try {
        const books = await getPopularBooks();
        
        if (mounted) {
          setPopularBooks(books);
        }
      } catch (error) {
        console.error('Error fetching popular books:', error);
      } finally {
        if (mounted) {
          setIsLoadingPopular(false);
        }
      }
    };

    fetchPopularBooks();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Effect to also check isLimitExceeded state from the hook
  useEffect(() => {
    if (isLimitExceeded && !isTimeLimitExceededRef.current) {
      console.log('Time limit exceeded detected from hook state');
      isTimeLimitExceededRef.current = true;
      setShowTimeLimitModal(true);
    }
  }, [isLimitExceeded]);

  // Handle modal close and logout - use a stable callback
  const handleModalClose = useCallback(async () => {
    try {
      console.log('Modal closing, logging out user');
      
      // Sign out the user
      await supabase.auth.signOut();
      
      // Redirect to login page
      window.location.href = '/landing';
    } catch (error) {
      console.error('Error during sign out:', error);
      // Force redirect to login even if error occurs
      window.location.href = '/landing';
    }
  }, []);

  // Add logging for when modal state changes
  useEffect(() => {
    console.log('Modal state changed:', { showTimeLimitModal, isLimitExceeded });
  }, [showTimeLimitModal, isLimitExceeded]);

  // Check time limit on component load
  useEffect(() => {
    // If we have loaded time data, check if it's already exceeded
    if (!isTimeLoading && isLimitExceeded) {
      console.log("Time already exceeded on page load");
      setShowTimeLimitModal(true);
    }
    
    console.log("Rendering ChildPage, showTimeLimitModal:", showTimeLimitModal);
  }, [isTimeLoading, isLimitExceeded, showTimeLimitModal]);

  // Helper function to handle navigation
  const handleNavigation = (direction: 'left' | 'right', type: 'recommended' | 'trending' | 'popular') => {
    let books: Book[] = [];
    let setIndex: React.Dispatch<React.SetStateAction<number>>;
    
    switch (type) {
      case 'recommended':
        books = recommendedBooksWithGenre;
        setIndex = setRecommendedBooksIndex;
        break;
      case 'trending':
        books = trendingBooksWithGenre;
        setIndex = setTrendingBooksIndex;
        break;
      case 'popular':
        books = popularBooksWithGenre;
        setIndex = setPopularBooksIndex;
        break;
      default:
        setIndex = setRecommendedBooksIndex;
    }
    
    if (direction === 'left') {
      setIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, books.length - 5)));
    } else {
      setIndex((prev) => (prev + 5 < books.length ? prev + 1 : 0));
    }
  };

  // Helper function to render book carousel
  const renderBookCarousel = (
    books: Book[], 
    index: number, 
    type: 'recommended' | 'trending' | 'popular', 
    title: string, 
    isLoading: boolean
  ) => {
    return (
      <div className="mb-16">
        <h2 className="text-3xl font-extrabold text-yellow-400 drop-shadow text-center font-sans mb-3" style={{ fontFamily: 'Quicksand, Nunito, Arial Rounded MT Bold, Arial, sans-serif' }}>{title}</h2>
        {isLoading ? (
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="border rounded-lg overflow-hidden">
                <div className="w-full aspect-[3/4] bg-gray-200 animate-pulse" />
                <div className="p-2 space-y-2">
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                  <div className="h-2 bg-gray-200 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : books.length > 0 ? (
          <div className="flex items-center justify-center w-full relative">
            <button
              onClick={() => handleNavigation('left', type)}
              className="bg-blue-800 text-white hover:bg-blue-900 p-2 rounded-full shadow-md absolute left-[-50px] z-10"
              aria-label="Previous books"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="overflow-hidden w-[1200px] mx-4 px-4">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${index * 240}px)` }}
              >
                {books.map((book: Book, idx: number) => (
                  <div key={idx} style={{ minWidth: 220, maxWidth: 220, marginRight: '20px' }} className="bg-white/20 backdrop-blur-md shadow-lg rounded-lg">
                    <BookCard {...book} />
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => handleNavigation('right', type)}
              className="bg-blue-800 text-white hover:bg-blue-900 p-2 rounded-full shadow-md absolute right-[-50px] z-10"
              aria-label="Next books"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            <p className="text-lg col-span-5 font-serif text-white font-sm">
              No books available at the moment
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen relative">
      <div 
        className="absolute inset-0 bg-repeat bg-center"
        style={{ backgroundImage: 'url(/stars.png)' }}
      />
      <Navbar/>
      
      {/* Screen Time Components - Only render once */}
      <ScreenTimeIndicator 
        key="screen-time-indicator"
        onTimeExceeded={handleTimeLimitExceeded} 
        forceCheckInterval={15000} // Check every 15 seconds
      />
      
      {/* Display Time Limit Modal if needed */}
      {showTimeLimitModal && (
        <TimeLimitModal 
          key="time-limit-modal"
          onClose={handleModalClose} 
        />
      )}
      
      {/* Main Content */}
      <main className="flex-1 pt-16 relative">
        <div className="max-w-7xl mx-auto px-6">
          {/* Happy Reading Section */}
          <div className="mb-14 flex flex-col items-center mt-20">
            <h1
              className="text-5xl font-extrabold text-yellow-400 text-center font-sans rounded-md drop-shadow-md mb-2"
              style={{ fontFamily: 'Quicksand, Nunito, Arial Rounded MT Bold, Arial, sans-serif' }}
            >
              Happy reading,{' '}
              {isLoading
                ? '...'
                : userFullName
                  ? userFullName.split(' ')[0].toLowerCase()
                  : 'user'}!
            </h1>
            <p className="text-white text-lg text-center font-sans mb-2">
              Meet your book buddy on a reading adventure!
            </p>
          </div>

          {/* Books Sections */}
          {renderBookCarousel(trendingBooksWithGenre, trendingBooksIndex, 'trending', 'Currently Trending', isLoadingTrending)}
          {renderBookCarousel(recommendedBooksWithGenre, recommendedBooksIndex, 'recommended', 'Recommended For You!', isLoadingRecommendations)}
          {renderBookCarousel(popularBooksWithGenre, popularBooksIndex, 'popular', 'Most Popular', isLoadingPopular)}

          {/* Single "Explore more books" link */}
          <div className="mt-2 mb-16 text-right">
            <a
              href="/search"
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              Explore more books →
            </a>
          </div>

          {/* Video Sections */}
          <div className="video-sections mb-16">
            <VideoSection
              title="Trending Videos"
              videos={trendingVideos}
              loading={videosLoading}
              type="trending"
            />
            
            <VideoSection
              title="Recommended Videos"
              videos={recommendedVideos}
              loading={videosLoading}
              type="recommended"
            />
            
            <VideoSection
              title="Popular Videos"
              videos={popularVideos}
              loading={videosLoading}
              type="popular"
            />
            
            {/* Explore More Videos */}
            <div className="mt-2 text-right">
              <a
                href="/searchvideos"
                className="text-blue-600 hover:underline text-sm font-medium"
              >
                Explore more videos →
              </a>
            </div>
          </div>

          {/* ChatBot Section */}
          <div className="mb-8">
            <ChatBot />
          </div>
        </div>
      </main>

      {/* Score Debugger Section - At the very bottom - Only in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="relative">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <h2 className="text-lg font-serif mb-3 text-yellow-400 drop-shadow">Recommendation Score Debug</h2>
            <ScoreDebugger />
          </div>
        </div>
      )}
    </div>
  );
}