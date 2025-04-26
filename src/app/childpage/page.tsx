'use client';

import Navbar from '../components/Navbar';
import BookCard from '../components/BookCard';
import ReadingCalendar from '../components/ReadingCalendar';
import ChatBot from '../components/ChatBot';
import { useBooks } from '../../hooks/useBooks';
import { useVideos } from '../../hooks/useVideos';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/lib/supabase';
import { useEffect, useState, useCallback } from 'react';
import { Book } from '../../types/database.types';
import ScoreDebugger from '../components/ScoreDebugger';
import { useInteractions } from '../../hooks/useInteractions';
import { debugUserInteractions } from '../../services/userInteractionsService';
import { getRecommendedBooks } from '../../services/recommendationService';

export default function ChildPage() {
  const [recommendedBooks, setRecommendedBooks] = useState<Book[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true);
  const { availableBooks } = useBooks();
  const { videos } = useVideos();
  const { loading } = useSession();
  const [userFullName, setUserFullName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { syncFavoriteGenresForUser } = useInteractions();

  // Combine genre component display with recommended books 
  const recommendedBooksWithGenre = recommendedBooks.map((book) => {
    const matchingBook = availableBooks.find((b) => b.cid === book.cid);
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

  useEffect(() => {
    syncFavoritesOnLoad();
  }, [syncFavoritesOnLoad]);

  useEffect(() => {
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

        setUserFullName(data?.fullname || null);
      } catch (error) {
        console.error('Error in fetchUserFullName:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserFullName();
  }, []);

  // Fetch recommended books using the new service
  useEffect(() => {
    const fetchRecommendedBooks = async () => {
      setIsLoadingRecommendations(true);
      try {
        const books = await getRecommendedBooks();
        setRecommendedBooks(books);
      } catch (error) {
        console.error('Error fetching recommended books:', error);
      } finally {
        setIsLoadingRecommendations(false);
      }
    };

    fetchRecommendedBooks();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-white">
      <Navbar/>
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden pt-16">
        {/* Left Section */}
        <div className="w-1/2 overflow-y-auto p-6 border-r">
          {/* Happy Reading Section */}
          <div className="mb-8">
            <h1 className="text-2xl font-serif mb-1.5 text-black">
              Happy reading,<br />
              {isLoading ? '...' : userFullName ? userFullName.split(' ')[0] : 'User'}
            </h1>
            <p className="text-gray-800 mb-2 text-sm">
              Welcome, {isLoading ? '...' : userFullName || 'User'}!
            </p>
            <button className="bg-gray-900 text-white px-4 py-1.5 rounded-lg inline-flex items-center text-xs">
              Start reading
              <span className="ml-1.5">↗</span>
            </button>
          </div>

          {/* Available Books Section */}
          <div className="mb-8">
            <h2 className="text-lg font-serif mb-3 text-black">Available Books</h2>
            {isLoadingRecommendations ? (
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="border rounded-lg overflow-hidden">
                    <div className="w-full aspect-[3/4] bg-gray-200 animate-pulse" />
                    <div className="p-2 space-y-2">
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                      <div className="h-2 bg-gray-200 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : 
            <div className="grid grid-cols-4 gap-2">
              {availableBooks.slice(0,8).map((book, index) => (
                <BookCard key={index} {...book} />
              ))}
            </div>
          }
          </div>
        
          {/* Explore More Books */}
          <div className="mt-4 text-right">
            <a
              href="/search"
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              Explore more books →
            </a>
          </div>

          {/* Recommended Books Section with Loading State */}
          <div className="mb-8">
            <h2 className="text-lg font-serif mb-3 text-black">Recommended For You!</h2>

            {isLoadingRecommendations ? (
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="border rounded-lg overflow-hidden">
                    <div className="w-full aspect-[3/4] bg-gray-200 animate-pulse" />
                    <div className="p-2 space-y-2">
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                      <div className="h-2 bg-gray-200 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recommendedBooksWithGenre.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {recommendedBooksWithGenre.map((book, index) => (
                  <BookCard key={index} {...book} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                <p className="text-lg col-span-4 font-serif text-black font-sm">
                  We currently have no books to recommend...
                </p>
              </div>
            )}
          </div>

          {/* Videos for You Section */}
          <div>
            <h2 className="text-lg font-serif mb-3 text-black">Videos for You</h2>
            <div className="grid grid-cols-4 gap-2">
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="space-y-1">
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-200 animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                  </div>
                ))
              ) : videos.length > 0 ? (
                videos.map((video) => {
                  const videoId = video.contenturl?.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
                
                  return (
                    <div key={video.title} className="border rounded-lg overflow-hidden">
                      <div className="aspect-video relative">
                        {videoId ? (
                          <iframe
                            src={`https://www.youtube.com/embed/${videoId}`}
                            title={video.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute inset-0 w-full h-full"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                            <p className="text-gray-500">Invalid video link</p>
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <h3 className="font-medium text-xs text-black leading-tight">{video.title}</h3>
                      </div>
                    </div>
                  );
                })
                
              ) : (
                <div className="col-span-4 text-center text-gray-500 py-4">
                  No videos available at the moment
                </div>
              )}
            </div>
          </div>

           {/* Explore More Videos */}
           <div className="mt-4 text-right">
            <a
              href="/search"
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              Explore more videos →
            </a>
          </div>
        </div>
      
        {/* Right Section */}
        <div className="w-1/2 overflow-y-auto p-6">
          <div className="h-full flex flex-col">
            {/* Calendar Section - With custom positioning */}
            <div className="flex-1">
              <div className="mt-12">
                <div className="w-[320px] mx-auto">
                  <ReadingCalendar />
                </div>
              </div>
            </div>

            {/* ChatBot Section - Bottom */}
            <div className="mt-auto">
              <ChatBot />
            </div>
            
            {/* Score Debugger Section */}
            <div className="mt-8">
              <h2 className="text-lg font-serif mb-3 text-black">Recommendation Score Debug</h2>
              <ScoreDebugger />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}