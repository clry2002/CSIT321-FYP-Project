'use client';

import { useState } from 'react';
import Navbar from '@/app/components/Navbar';
import { useRouter } from 'next/navigation';
import ChatBot from "@/app/components/ChatBot";
import ClickableGenreNavigation from '@/app/components/ClickableGenreNavigation';
import { useBooks } from '@/hooks/useBooks';
import { useAllVideos } from '@/hooks/useAllVideos';
import { Video } from "@/types/database.types";

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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(activeTab);
    }
  };

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden">
      {/* Enhanced Background with gradient overlay */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900"
      />
      <div 
        className="absolute inset-0 bg-repeat bg-center opacity-40"
        style={{ backgroundImage: 'url(/stars.png)' }}
      />
      
      <Navbar />
      
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pt-16 px-4 md:px-6 relative z-10">
        {/* Hero Section with Search */}
        <div className="max-w-5xl mx-auto mt-8 mb-8">
          <div className="bg-black/30 backdrop-blur-lg p-8 md:p-10 rounded-2xl shadow-2xl border border-yellow-400/20">
            {/* Hero Title */}
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500 mb-2">
                Discover Your Next Adventure
              </h1>
              <p className="text-gray-300 text-lg">Search through our collection of books and videos</p>
            </div>
            
            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="What would you like to explore today?"
                className="w-full px-6 py-4 bg-white/10 border border-yellow-400/30 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-white placeholder:text-yellow-400/50 text-lg backdrop-blur-sm"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-yellow-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            {/* Enhanced Search Buttons */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <button
                onClick={() => handleSearch('books')}
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black rounded-full hover:from-yellow-500 hover:to-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-black/30 transition-all transform hover:scale-105 font-semibold flex items-center justify-center gap-2 shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C20.832 18.477 19.247 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Search Books
              </button>
              <button
                onClick={() => handleSearch('videos')}
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-black/30 transition-all transform hover:scale-105 font-semibold flex items-center justify-center gap-2 shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Search Videos
              </button>
            </div>
          </div>
        </div>
        
        {/* Enhanced Category Tabs */}
        <div className="max-w-6xl mx-auto mb-6">
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-1 border border-indigo-700/50">
            <div className="flex">
              <button
                onClick={() => handleTabChange('books')}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'books' 
                    ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black shadow-lg' 
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                } flex items-center justify-center gap-2`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C20.832 18.477 19.247 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Books
              </button>
              <button
                onClick={() => handleTabChange('videos')}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'videos' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' 
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                } flex items-center justify-center gap-2`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Videos {isRefetching && <span className="text-xs animate-pulse">(updating...)</span>}
              </button>
            </div>
          </div>
        </div>
        
        {/* Content Display Section */}
        <div className="max-w-7xl mx-auto">
          {/* Show error message if video loading failed */}
          {videosError && activeTab === 'videos' && !isLoading && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-red-400">Failed to load videos. Please try again.</p>
              </div>
            </div>
          )}
          
          {isLoading ? (
            // Enhanced Loading state with skeleton UI
            <div className="space-y-8">
              <div className="space-y-3">
                <div className="h-4 bg-gradient-to-r from-gray-600/40 to-gray-700/40 rounded-lg animate-pulse w-1/3"></div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <div key={index} className="bg-gradient-to-br from-gray-700/40 to-gray-800/40 rounded-lg aspect-[1/1] animate-pulse"></div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-gradient-to-r from-gray-600/40 to-gray-700/40 rounded-lg animate-pulse w-1/4"></div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <div key={index} className="bg-gradient-to-br from-gray-700/40 to-gray-800/40 rounded-lg aspect-[3/4] animate-pulse"></div>
                  ))}
                </div>
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
        
        {/* Bottom padding for mobile */}
        <div className="h-20"></div>
      </div>
    </div>
  );
}