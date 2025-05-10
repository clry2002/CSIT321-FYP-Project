'use client';

import React, { useState, useEffect } from 'react';
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

  // Fetch available genres on component mount
  useEffect(() => {
    const fetchAvailableGenres = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get blocked genres for this child
        const { data: blockedData } = await supabase
          .from('blockedgenres')
          .select('genreid')
          .eq('child_id', user.id);

        const blockedGenreIds = new Set(blockedData?.map(item => item.genreid) || []);

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

  // Fetch content for selected genre
  useEffect(() => {
    if (selectedGenre === null) {
      setContentByGenre({ books: [], videos: [] });
      return;
    }

    const fetchContentForGenre = async () => {
      setIsLoadingContent(true);
      try {
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
  }, [selectedGenre, books, videos]);

  if (isLoadingGenres) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="h-12 bg-gray-600 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const currentContent = activeTab === 'books' ? contentByGenre.books : contentByGenre.videos;
  const selectedGenreData = availableGenres.find(g => g.gid === selectedGenre);

  return (
    <div className="space-y-6">
      {/* Genre Selection Grid */}
      <div>
        <h2 className="text-xl font-bold text-yellow-400 mb-4">
          Select a Genre
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {availableGenres.map((genre) => {
            const currentCount = activeTab === 'books' ? genre.bookCount : genre.videoCount;
            const isActive = selectedGenre === genre.gid;
            
            if (currentCount === 0) return null;

            return (
              <button
                key={genre.gid}
                onClick={() => setSelectedGenre(genre.gid)}
                className={`p-3 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-yellow-400 text-black font-medium' 
                    : 'bg-black/20 text-white hover:bg-black/30 border border-white/10'
                }`}
              >
                <div className="text-sm font-medium truncate">
                  {genre.genrename}
                </div>
                <div className="text-xs mt-1 opacity-75">
                  {currentCount} {activeTab}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Display */}
      {selectedGenre && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-yellow-400">
              {selectedGenreData?.genrename} - {currentContent.length} {activeTab}
            </h3>
            <button
              onClick={() => setSelectedGenre(null)}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              ← Back to genres
            </button>
          </div>

          {isLoadingContent ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={index} className="bg-gray-700 rounded-lg aspect-[3/4] animate-pulse"></div>
              ))}
            </div>
          ) : currentContent.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {currentContent.map((item, index) => (
                <div key={`${item.cid}-${index}`} className="rounded-lg overflow-hidden">
                  {activeTab === 'books' ? (
                    <BookCard
                      {...(item as Book)}
                      showGenre={false}
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
            <div className="text-center py-12">
              <p className="text-gray-400">
                No {activeTab} available in this genre
              </p>
            </div>
          )}
        </div>
      )}

      {/* Initial state message */}
      {!selectedGenre && !isLoadingGenres && (
        <div className="text-center py-12">
          <p className="text-gray-400">
            Click on a genre above to see {activeTab}
          </p>
        </div>
      )}
    </div>
  );
}