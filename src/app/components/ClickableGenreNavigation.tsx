'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import BookCard from './BookCard';
import VideoCard from './VideoCard';
import { Book, Video } from '../../types/database.types';

interface Genre {
  gid: number;
  genrename: string;
  bookCount: number;
  videoCount: number;
}

interface ContentByGenre {
  books: Book[];
  videos: Video[];
}

interface ClickableGenreNavigationProps {
  books: Book[];
  videos: Video[];
  activeTab: 'books' | 'videos';
}

export default function ClickableGenreNavigation({ books, videos, activeTab }: ClickableGenreNavigationProps) {
  const [availableGenres, setAvailableGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [contentByGenre, setContentByGenre] = useState<ContentByGenre>({ books: [], videos: [] });
  const [isLoadingGenres, setIsLoadingGenres] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isGenreListVisible, setIsGenreListVisible] = useState(true);
  
  // Refs for scrolling
  const genreListRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Fetch available genres on component mount
  useEffect(() => {
    const fetchAvailableGenres = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
  
        // First get the child's user_account ID
        const { data: userAccount, error: userAccountError } = await supabase
          .from('user_account')
          .select('id')
          .eq('user_id', user.id)
          .eq('upid', 3) // Child profiles have upid=3
          .single();
  
        if (userAccountError || !userAccount) {
          console.error('Error fetching child profile:', userAccountError);
          return;
        }
  
        const childId = userAccount.id;
        console.log('Found child ID:', childId);
  
        // Get blocked genres using the correct childId
        const { data: blockedData } = await supabase
          .from('blockedgenres')
          .select('genreid')
          .eq('child_id', childId);
  
        const blockedGenreIds = new Set(blockedData?.map(item => item.genreid) || []);
        console.log('Blocked genre IDs:', Array.from(blockedGenreIds));

        // Fetch content-genre relationships
        const { data: contentGenres } = await supabase
          .from('temp_contentgenres')
          .select('cid, gid');

        if (!contentGenres) return;

        // Count content per genre
        const genreContentCount = new Map<number, { books: number; videos: number }>();
        
        // Initialize counts
        contentGenres.forEach(relation => {
          if (!genreContentCount.has(relation.gid)) {
            genreContentCount.set(relation.gid, { books: 0, videos: 0 });
          }
        });

        // Count books and videos per genre
        books.forEach(book => {
          const genreIds = contentGenres
            .filter(cg => cg.cid === Number(book.cid))
            .map(cg => cg.gid);
          
          genreIds.forEach(gid => {
            const count = genreContentCount.get(gid);
            if (count) count.books++;
          });
        });

        videos.forEach(video => {
          const genreIds = contentGenres
            .filter(cg => cg.cid === Number(video.cid))
            .map(cg => cg.gid);
          
          genreIds.forEach(gid => {
            const count = genreContentCount.get(gid);
            if (count) count.videos++;
          });
        });

        // Fetch genre names
        const genreIds = Array.from(genreContentCount.keys());
        const { data: genreData } = await supabase
          .from('temp_genre')
          .select('gid, genrename')
          .in('gid', genreIds);

        if (!genreData) return;

        // Create genre objects with counts, excluding blocked genres
        const genresWithCounts = genreData
          .filter(genre => !blockedGenreIds.has(genre.gid))
          .map(genre => {
            const count = genreContentCount.get(genre.gid) || { books: 0, videos: 0 };
            return {
              gid: genre.gid,
              genrename: genre.genrename,
              bookCount: count.books,
              videoCount: count.videos
            };
          })
          .filter(genre => genre.bookCount > 0 || genre.videoCount > 0)
          .sort((a, b) => {
            // Sort by total content count, then by name
            const aTotal = a.bookCount + a.videoCount;
            const bTotal = b.bookCount + b.videoCount;
            if (aTotal !== bTotal) return bTotal - aTotal;
            return a.genrename.localeCompare(b.genrename);
          });

        setAvailableGenres(genresWithCounts);
      } catch (error) {
        console.error('Error fetching available genres:', error);
      } finally {
        setIsLoadingGenres(false);
      }
    };

    fetchAvailableGenres();
  }, [books, videos]);

  // Reset genre list visibility when active tab changes
  useEffect(() => {
    setIsGenreListVisible(true);
    setSelectedGenre(null);
  }, [activeTab]);

  // Fetch content for selected genre
  useEffect(() => {
    if (selectedGenre === null) {
      setContentByGenre({ books: [], videos: [] });
      return;
    }
  
    const fetchContentForGenre = async () => {
      setIsLoadingContent(true);
      try {
        // Get current user to double-check if genre is blocked
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoadingContent(false);
          return;
        }
  
        // Get the child's user_account ID
        const { data: userAccount, error: userAccountError } = await supabase
          .from('user_account')
          .select('id')
          .eq('user_id', user.id)
          .eq('upid', 3) // Child profiles
          .single();
  
        if (userAccountError || !userAccount) {
          console.error('Error fetching child profile:', userAccountError);
          setIsLoadingContent(false);
          return;
        }
  
        const childId = userAccount.id;
  
        // Check if the selected genre is blocked (safety check)
        const { data: blockedCheck } = await supabase
          .from('blockedgenres')
          .select('genreid')
          .eq('child_id', childId)
          .eq('genreid', selectedGenre)
          .maybeSingle();
  
        // If genre is blocked, reset and return
        if (blockedCheck) {
          console.log(`Genre ${selectedGenre} is blocked for this user`);
          setSelectedGenre(null);
          setContentByGenre({ books: [], videos: [] });
          setIsLoadingContent(false);
          return;
        }
  
        // Get content IDs for this genre
        const { data: contentGenres } = await supabase
          .from('temp_contentgenres')
          .select('cid')
          .eq('gid', selectedGenre);

        if (!contentGenres) return;

        const contentIds = contentGenres.map(cg => cg.cid);

        // Filter books and videos by content IDs
        const genreBooks = books.filter(book => contentIds.includes(Number(book.cid)));
        const genreVideos = videos.filter(video => contentIds.includes(Number(video.cid)));

        setContentByGenre({
          books: genreBooks,
          videos: genreVideos
        });
      } catch (error) {
        console.error('Error fetching content for genre:', error);
      } finally {
        setIsLoadingContent(false);
      }
    };

    fetchContentForGenre();
    
    // Scroll to content when a genre is selected
    if (contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedGenre, books, videos]);

  // Handle back to genres
  const handleBackToGenres = () => {
    setSelectedGenre(null);
    setIsGenreListVisible(true);
    
    // Scroll back to genre list
    if (genreListRef.current) {
      genreListRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Get icon for active tab
  const getIcon = () => {
    if (activeTab === 'books') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C20.832 18.477 19.247 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
    } else {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
  };

  if (isLoadingGenres) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-32 bg-gradient-to-r from-yellow-400/40 to-yellow-500/40 rounded-lg animate-pulse"></div>
          <div className="h-8 w-16 bg-gradient-to-r from-yellow-400/40 to-yellow-500/40 rounded-lg animate-pulse"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="h-24 bg-gradient-to-br from-gray-700/40 to-gray-800/40 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const currentContent = activeTab === 'books' ? contentByGenre.books : contentByGenre.videos;
  const selectedGenreData = availableGenres.find(g => g.gid === selectedGenre);

  return (
    <div className="space-y-8">
      {/* Genre Selection Section */}
      <div ref={genreListRef}>
        {/* Collapsible Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500 flex items-center gap-2">
              {getIcon()}
              Browse {activeTab === 'books' ? 'Books' : 'Videos'} by Genre
            </h2>
          </div>
          
          {/* Toggle button for genre list when genre is selected */}
          {selectedGenre && (
            <button
              onClick={() => setIsGenreListVisible(!isGenreListVisible)}
              className="px-4 py-2 bg-black/30 text-yellow-400 rounded-lg hover:bg-black/40 transition-all duration-200 backdrop-blur-sm flex items-center gap-2 border border-yellow-400/20"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`h-4 w-4 transition-transform duration-200 ${isGenreListVisible ? 'rotate-180' : ''}`}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {isGenreListVisible ? 'Hide Genres' : 'Show Genres'}
            </button>
          )}
        </div>
        
        {/* Genre Grid */}
        {isGenreListVisible && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {availableGenres.map((genre) => {
              const currentCount = activeTab === 'books' ? genre.bookCount : genre.videoCount;
              const isActive = selectedGenre === genre.gid;
              
              if (currentCount === 0) return null;

              return (
                <button
                  key={genre.gid}
                  onClick={() => setSelectedGenre(genre.gid)}
                  className={`group relative overflow-hidden rounded-xl p-4 transition-all duration-300 transform ${
                    isActive 
                      ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black scale-105 shadow-xl ring-2 ring-yellow-300/50 ring-offset-2 ring-offset-black/30' 
                      : 'bg-black/30 text-white hover:bg-black/40 hover:scale-102 backdrop-blur-sm border border-white/10 hover:border-yellow-400/30'
                  } active:scale-95`}
                >
                  {/* Animated background for active state */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-300/20 to-yellow-500/20 animate-pulse"></div>
                  )}
                  
                  <div className="relative z-10">
                    <div className="font-bold text-sm md:text-base truncate mb-1">
                      {genre.genrename}
                    </div>
                    <div className="text-xs opacity-80 flex items-center justify-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-current"></span>
                      {currentCount} {activeTab}
                    </div>
                  </div>
                  
                  {/* Hover effect background */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-br from-white to-transparent transition-opacity duration-300"></div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Content Display */}
      {selectedGenre && (
        <div ref={contentRef}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500 flex items-center gap-2">
              {getIcon()}
              {selectedGenreData?.genrename} ({currentContent.length} {activeTab})
            </h3>
            <button
              onClick={handleBackToGenres}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center gap-2 shadow-lg transform hover:scale-105"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to genres
            </button>
          </div>

          {isLoadingContent ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={index} className="relative">
                  <div className="bg-gradient-to-br from-gray-700/40 to-gray-800/40 rounded-xl aspect-[3/4] animate-pulse">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent animate-pulse"></div>
                  </div>
                  <div className="mt-2 space-y-2">
                    <div className="h-4 bg-gradient-to-r from-gray-600/40 to-gray-700/40 rounded animate-pulse"></div>
                    <div className="h-3 bg-gradient-to-r from-gray-600/40 to-gray-700/40 rounded animate-pulse w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : currentContent.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {currentContent.map((item, index) => (
                <div 
                  key={`${item.cid}-${index}`} 
                  className="rounded-xl overflow-hidden bg-gray-400/40 backdrop-blur-sm transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
                >
                  {activeTab === 'books' ? (
                    <BookCard
                      {...(item as Book)}
                      showGenre={true}
                      isEducator={false}
                    />
                  ) : (
                    <VideoCard
                      {...(item as Video)}
                      isEducator={false}
                      lazyLoad={false}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="inline-flex p-4 rounded-full bg-gray-800/50 mb-4">
                {activeTab === 'books' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C20.832 18.477 19.247 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <p className="text-gray-400 text-lg mb-2">
                No {activeTab} available in this genre
              </p>
              <p className="text-gray-500 text-sm">
                Try selecting a different genre to explore more content
              </p>
            </div>
          )}
        </div>
      )}

      {/* Initial state message */}
      {!selectedGenre && !isLoadingGenres && (
        <div className="text-center py-16">
          <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 mb-4">
            {getIcon()}
          </div>
          <h3 className="text-xl font-bold text-yellow-400 mb-2">
            Choose a Genre to Get Started
          </h3>
          <p className="text-gray-400">
            Click on any genre above to discover amazing {activeTab}
          </p>
        </div>
      )}
    </div>
  );
}