'use client';

import { useState } from 'react';
import Navbar from '../components/Navbar';
import { useRouter } from 'next/navigation';
import ChatBot from "../components/ChatBot";
import ClickableGenreNavigation from '../components/GenreSections';
import { useBooks } from '../../hooks/useBooks';
import { useAllVideos } from '../../hooks/useAllVideos';
import { Video } from "../../types/database.types";

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'books' | 'videos'>('books');
  const router = useRouter();
  
  // Fetch data
  const { availableBooks, loading: booksLoading } = useBooks();
  const { 
    data: availableVideos = [] as Video[], 
    isLoading: videosLoading,
    error: videosError,
    isRefetching
  } = useAllVideos();
  
  // Determine overall loading state
  const isLoading = activeTab === 'books' ? booksLoading : videosLoading;
  
  const handleSearch = (type: 'books' | 'videos') => {
    if (!searchQuery.trim()) return;
    
    const encodedQuery = encodeURIComponent(searchQuery.trim());
    if (type === 'books') {
      router.push(`/searchbooks?q=${encodedQuery}`);
    } else {
      router.push(`/searchvideos?q=${encodedQuery}`);
    }
  };

  // Handle tab switching
  const handleTabChange = (tab: 'books' | 'videos') => {
    setActiveTab(tab);
  };

  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Stars Background */}
      <div 
        className="absolute inset-0 bg-repeat bg-center"
        style={{ backgroundImage: 'url(/stars.png)' }}
      />
      
      <Navbar />
      
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pt-16 px-6 relative">
        {/* Search Interface */}
        <div className="max-w-3xl mx-auto mt-8 mb-6">
          <div className="bg-black/50 backdrop-blur-sm p-6 rounded-xl shadow-lg">
            <h1 className="text-3xl font-bold text-yellow-400 mb-4 text-center">Search Content</h1>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter your search query..."
                className="w-full px-4 py-3 bg-white/10 border border-yellow-400/30 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-white placeholder:text-yellow-400/50"
              />
            </div>
            <div className="mt-4 flex justify-center space-x-4">
              <button
                onClick={() => handleSearch('books')}
                className="px-6 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 transition-colors"
              >
                Search Books
              </button>
              <button
                onClick={() => handleSearch('videos')}
                className="px-6 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 transition-colors"
              >
                Search Videos
              </button>
            </div>
          </div>
        </div>
        
        {/* Category Tabs */}
        <div className="max-w-6xl mx-auto mb-4">
          <div className="flex border-b border-indigo-700/50">
            <button
              onClick={() => handleTabChange('books')}
              className={`px-8 py-2 font-medium ${
                activeTab === 'books' 
                  ? 'text-blue-400 border-b-2 border-blue-400' 
                  : 'text-gray-300'
              }`}
            >
              Books
            </button>
            <button
              onClick={() => handleTabChange('videos')}
              className={`px-8 py-2 font-medium ${
                activeTab === 'videos' 
                  ? 'text-blue-400 border-b-2 border-blue-400' 
                  : 'text-gray-300'
              }`}
            >
              Videos {isRefetching && <span className="text-xs">(updating...)</span>}
            </button>
          </div>
        </div>
        
        {/* Content Display Section */}
        <div className="max-w-6xl mx-auto">
          {/* Show error message if video loading failed */}
          {videosError && activeTab === 'videos' && !isLoading && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
              <p className="text-red-400">Failed to load videos. Please try again.</p>
            </div>
          )}
          
          {isLoading ? (
            // Loading state with skeleton UI
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {Array.from({ length: 12 }).map((_, index) => (
                  <div key={index} className="h-12 bg-gray-600 rounded-lg animate-pulse"></div>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, index) => (
                  <div key={index} className="bg-gray-700 rounded-lg aspect-[3/4] animate-pulse"></div>
                ))}
              </div>
            </div>
          ) : (
            // Clickable Genre Navigation Component
            <ClickableGenreNavigation 
              books={availableBooks}
              videos={availableVideos}
              activeTab={activeTab}
            />
          )}
        </div>
        
        <ChatBot />
      </div>
    </div>
  );
}