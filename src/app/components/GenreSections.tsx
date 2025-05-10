'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import BookCard from './BookCard';
import VideoCard from './VideoCard';
import { Book, Video } from '../../types/database.types';

interface GenreSection {
  genreId: number;
  genreName: string;
  books: Book[];
  videos: Video[];
}

interface GenreSectionsProps {
  books: Book[];
  videos: Video[];
  activeTab: 'books' | 'videos';
}

export default function GenreSections({ books, videos, activeTab }: GenreSectionsProps) {
  const [genreSections, setGenreSections] = useState<GenreSection[]>([]);
  const [, setBlockedGenres] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  // Fetch blocked genres and organize content by genre
  useEffect(() => {
    const fetchBlockedGenresAndOrganize = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get blocked genres for this child
        const { data: blockedData } = await supabase
          .from('blockedgenres')
          .select('genreid')
          .eq('child_id', user.id);

        const blockedGenreSet = new Set(blockedData?.map(item => item.genreid) || []);
        setBlockedGenres(blockedGenreSet);

        // Fetch all genres
        const { data: allGenres } = await supabase
          .from('temp_genre')
          .select('gid, genrename')
          .order('genrename');

        if (!allGenres) return;

        // Initialize genre sections
        const genreMap = new Map<number, GenreSection>();
        allGenres.forEach(genre => {
          genreMap.set(genre.gid, {
            genreId: genre.gid,
            genreName: genre.genrename,
            books: [],
            videos: []
          });
        });

        // Fetch all content-genre relationships
        const { data: contentGenres } = await supabase
          .from('temp_contentgenres')
          .select('cid, gid');

        if (!contentGenres) return;

        // Create a map of content ID to genre IDs
        const contentGenreMap = new Map<number, number[]>();
        contentGenres.forEach(relation => {
          if (!contentGenreMap.has(relation.cid)) {
            contentGenreMap.set(relation.cid, []);
          }
          contentGenreMap.get(relation.cid)!.push(relation.gid);
        });

        // Categorize books by genre (cfid = 2)
        books.forEach(book => {
          const genreIds = contentGenreMap.get(Number(book.cid)) || [];
          genreIds.forEach(genreId => {
            if (genreMap.has(genreId)) {
              genreMap.get(genreId)!.books.push(book);
            }
          });
        });

        // Categorize videos by genre (cfid = 1)
        videos.forEach(video => {
          const genreIds = contentGenreMap.get(Number(video.cid)) || [];
          genreIds.forEach(genreId => {
            if (genreMap.has(genreId)) {
              genreMap.get(genreId)!.videos.push(video);
            }
          });
        });

        // Convert to array and filter out blocked genres and empty sections
        const sections = Array.from(genreMap.values())
          .filter(section => 
            !blockedGenreSet.has(section.genreId) && 
            (section.books.length > 0 || section.videos.length > 0)
          )
          .sort((a, b) => {
            // Sort by total content count
            const aTotal = a.books.length + a.videos.length;
            const bTotal = b.books.length + b.videos.length;
            return bTotal - aTotal;
          });

        setGenreSections(sections);
      } catch (error) {
        console.error('Error organizing content by genre:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlockedGenresAndOrganize();
  }, [books, videos]);

  // Toggle expanded state for a genre section
  const toggleSection = (genreId: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(genreId)) {
      newExpanded.delete(genreId);
    } else {
      newExpanded.add(genreId);
    }
    setExpandedSections(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="bg-white/5 rounded-lg p-4">
            <div className="h-6 bg-gray-600 rounded animate-pulse mb-4 w-1/4"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-gray-700 rounded-lg aspect-[3/4] animate-pulse"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {genreSections.map((section) => {
        const displayContent = activeTab === 'books' ? section.books : section.videos;
        if (displayContent.length === 0) return null;

        const isExpanded = expandedSections.has(section.genreId);
        const visibleContent = isExpanded ? displayContent : displayContent.slice(0, 6);

        return (
          <div key={section.genreId} className="bg-black/20 backdrop-blur-sm rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-yellow-400">
                {section.genreName}
                <span className="ml-2 text-sm text-gray-300">
                  ({displayContent.length} {activeTab})
                </span>
              </h3>
              {displayContent.length > 6 && (
                <button
                  onClick={() => toggleSection(section.genreId)}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  {isExpanded ? 'Show Less' : `Show All (${displayContent.length})`}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {visibleContent.map((item, index) => (
                <div key={`${item.cid}-${index}`} className="rounded-lg overflow-hidden">
                  {activeTab === 'books' ? (
                    <BookCard
                      {...(item as Book)}
                      showGenre={false} // Don't show genre tags since we're already in a genre section
                      isEducator={false}
                    />
                  ) : (
                    <VideoCard
                      {...(item as Video)}
                      isEducator={false}
                      lazyLoad={true}
                    />
                  )}
                </div>
              ))}
            </div>

            {displayContent.length === 0 && (
              <p className="text-center text-gray-400 py-8">
                No {activeTab} available in this genre
              </p>
            )}
          </div>
        );
      })}

      {genreSections.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">
            No {activeTab} available in your accessible genres
          </p>
        </div>
      )}
    </div>
  );
}