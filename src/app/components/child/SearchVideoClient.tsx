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
      <div className="max-w-2xl mx-auto bg-black/50 backdrop-blur-sm p-8 rounded-xl shadow-lg">
        <div className="relative mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search books and videos..."
            className="w-full px-4 py-3 bg-white/10 border border-yellow-400/30 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-white placeholder:text-yellow-400/50"
          />
        </div>
        <div className="flex justify-center space-x-4">
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
  );
}