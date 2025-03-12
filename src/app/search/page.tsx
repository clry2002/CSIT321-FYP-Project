'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
<<<<<<< HEAD
import { Search as SearchIcon, Home as HomeIcon, BookOpen, Settings, Bell, PlayCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Book } from '@/types/database.types';
import { useVideos } from '@/hooks/useVideos';
=======
import { Search as SearchIcon, Home as HomeIcon, BookOpen, Settings, PlayCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Book } from '@/types/database.types';
import { useVideos } from '@/hooks/useVideos';
import Header from '../components/Header';
>>>>>>> fbdb6d5 (webpage v1.1)

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { videos } = useVideos();
  const [activeTab, setActiveTab] = useState<'books' | 'videos'>('books');

<<<<<<< HEAD
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
=======
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) return;
>>>>>>> fbdb6d5 (webpage v1.1)

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
<<<<<<< HEAD
        .ilike('title', `%${searchQuery.trim()}%`);
=======
        .ilike('title', `%${query.trim()}%`);
>>>>>>> fbdb6d5 (webpage v1.1)

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
      {/* Sidebar */}
      <aside className="w-20 border-r border-gray-200 flex flex-col items-center py-4 space-y-4">
        <div className="text-xl">✋</div>
        <nav className="flex flex-col space-y-3">
          <Link href="/" className="p-2.5 rounded-lg hover:bg-gray-100">
            <HomeIcon className="w-5 h-5 text-gray-800" />
          </Link>
          <Link href="/search" className="p-2.5 rounded-lg bg-rose-100">
            <SearchIcon className="w-5 h-5 text-rose-500" />
          </Link>
          <Link href="/books" className="p-2.5 rounded-lg hover:bg-gray-100">
            <BookOpen className="w-5 h-5 text-gray-800" />
          </Link>
          <Link href="/videos" className="p-2.5 rounded-lg hover:bg-gray-100">
            <PlayCircle className="w-5 h-5 text-gray-800" />
          </Link>
          <Link href="/settings" className="p-2.5 rounded-lg hover:bg-gray-100">
            <Settings className="w-5 h-5 text-gray-800" />
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
<<<<<<< HEAD
      <div className="flex-1 px-6 py-4 overflow-y-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-5">
          <div className="relative">
            <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search books and videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9 pr-4 py-1.5 w-[400px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder-gray-800 !text-black text-sm font-medium"
            />
          </div>
          <div className="flex items-center space-x-3">
            <button><Bell className="w-5 h-5 text-gray-800" /></button>
            <div className="flex items-center space-x-2">
              <Image
                src="/avatar-mark.jpg"
                alt="Alexander Mark"
                width={32}
                height={32}
                className="rounded-full"
              />
              <span className="font-medium text-sm">Alexander Mark</span>
            </div>
          </div>
        </header>

        {/* Search Tabs */}
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
=======
      <div className="flex-1 overflow-y-auto">
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
>>>>>>> fbdb6d5 (webpage v1.1)
      </div>
    </div>
  );
} 