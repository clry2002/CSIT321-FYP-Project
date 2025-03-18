'use client';

import { useState } from 'react';
import Navbar from '../components/Navbar';
import Header from '../components/Header';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import type { Book } from '@/types/database.types';
import { useVideos } from '@/hooks/useVideos';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { videos } = useVideos();
  const [activeTab, setActiveTab] = useState<'books' | 'videos'>('books');

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .ilike('title', `%${query.trim()}%`);

      if (error) {
        throw error;
      }

      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const filteredVideos = videos.filter(video => 
    video.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Navbar />
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pt-16 px-6">
        <Header 
          showSearch 
          searchPlaceholder="Search books and videos..."
          onSearch={handleSearch}
        />

        {/* Search Tabs */}
        <div className="px-6">
          <div className="border-b mb-6">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab('books')}
                className={`pb-4 text-sm font-medium ${
                  activeTab === 'books'
                    ? 'text-rose-500 border-b-2 border-rose-500'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Books
              </button>
              <button
                onClick={() => setActiveTab('videos')}
                className={`pb-4 text-sm font-medium ${
                  activeTab === 'videos'
                    ? 'text-rose-500 border-b-2 border-rose-500'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Videos
              </button>
            </div>
          </div>

          {/* Search Results */}
          {activeTab === 'books' ? (
            <div>
              {isSearching ? (
                <div className="text-center py-4">Searching...</div>
              ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {searchResults.map((book) => (
                    <div key={book.id} className="border rounded-lg p-4">
                      <h3 className="font-medium text-black">{book.title}</h3>
                      <p className="text-sm text-gray-600">{book.author}</p>
                      {book.genres && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {book.genres.map((genre, index) => (
                            <span
                              key={index}
                              className="text-xs bg-gray-100 px-2 py-1 rounded"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : searchQuery && (
                <div className="text-center py-4 text-gray-500">No books found</div>
              )}
            </div>
          ) : (
            <div>
              {filteredVideos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredVideos.map((video, index) => (
                    <div key={index} className="space-y-2">
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                        <Image
                          src={video.thumbnail}
                          alt={video.title}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-white bg-opacity-80 flex items-center justify-center">
                            <div className="w-0 h-0 border-t-4 border-b-4 border-l-8 border-transparent border-l-gray-800 ml-1" />
                          </div>
                        </div>
                      </div>
                      <h3 className="font-medium text-sm text-black">{video.title}</h3>
                      <p className="text-xs text-gray-600">{video.views} views • {video.timeAgo}</p>
                    </div>
                  ))}
                </div>
              ) : searchQuery && (
                <div className="text-center py-4 text-gray-500">No videos found</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 