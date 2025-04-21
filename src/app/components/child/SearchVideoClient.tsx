'use client';

import { useState } from 'react';

interface SearchVideosClientProps {
  onSearch: (query: string, type: 'books' | 'videos') => void;
  initialQuery: string;
}

export default function SearchVideosClient(props: SearchVideosClientProps) {
  const { onSearch, initialQuery } = props;
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  const handleSearch = (type: 'books' | 'videos') => {
    if (!searchQuery.trim()) return;
    onSearch(searchQuery.trim(), type);
  };

  return (
    <div className="mt-20 mb-8">
      <div className="max-w-2xl mx-auto">
        <div className="relative mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search books and videos..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-black"
          />
        </div>
        <div className="flex justify-center space-x-4">
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
  );
}