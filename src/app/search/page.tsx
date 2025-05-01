'use client';

import { useState } from 'react';
import Navbar from '../components/Navbar';
import { useRouter } from 'next/navigation';
import ChatBot from "../components/ChatBot";

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (type: 'books' | 'videos') => {
    if (!searchQuery.trim()) return;
    
    const encodedQuery = encodeURIComponent(searchQuery.trim());
    if (type === 'books') {
      router.push(`/searchbooks?q=${encodedQuery}`);
    } else {
      router.push(`/searchvideos?q=${encodedQuery}`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen relative">
      <div 
        className="absolute inset-0 bg-repeat bg-center"
        style={{ backgroundImage: 'url(/stars.png)' }}
      />
      <Navbar />
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pt-16 px-6 relative">
        <div className="max-w-2xl mx-auto mt-20">
          {/* Search Interface */}
          <div className="text-center mb-8 bg-black/50 backdrop-blur-sm p-8 rounded-xl shadow-lg">
            <h1 className="text-3xl font-bold text-yellow-400 mb-4">Search Content</h1>
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
        <ChatBot />
      </div>
    </div>
  );
} 