'use client';

import { useState } from 'react';
import Navbar from '../components/Navbar';
import { useRouter } from 'next/navigation';

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
    <div className="flex h-screen bg-white overflow-hidden">
      <Navbar />
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pt-16 px-6">
        <div className="max-w-2xl mx-auto mt-20">
          {/* Search Interface */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Search</h1>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter your search query..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-black"
              />
            </div>
            <div className="mt-4 flex justify-center space-x-4">
              <button
                onClick={() => handleSearch('books')}
                className="px-6 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
              >
                Search Books
              </button>
              <button
                onClick={() => handleSearch('videos')}
                className="px-6 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
              >
                Search Videos
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 