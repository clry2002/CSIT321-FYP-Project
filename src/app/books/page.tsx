'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Plus, Home as HomeIcon, BookOpen, Settings, PlayCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Book } from '@/types/database.types';
import Header from '../components/Header';

export default function BooksPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [userBooks, setUserBooks] = useState<Book[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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
        console.error('Supabase error:', error);
        throw error;
      }

      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching books:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addToUserBooks = (book: Book) => {
    if (!userBooks.some(b => b.id === book.id)) {
      setUserBooks([...userBooks, book]);
    }
  };

  const removeFromUserBooks = (bookId: number) => {
    setUserBooks(userBooks.filter(book => book.id !== bookId));
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-20 border-r border-gray-200 flex flex-col items-center py-4 space-y-4">
        <div className="text-xl">✋</div>
        <nav className="flex flex-col space-y-3">
          <Link href="/home" className="p-2.5 rounded-lg hover:bg-gray-100">
            <HomeIcon className="w-5 h-5 text-gray-800" />
          </Link>
          <Link href="/search" className="p-2.5 rounded-lg hover:bg-gray-100">
            <Search className="w-5 h-5 text-gray-800" />
          </Link>
          <Link href="/books" className="p-2.5 rounded-lg bg-rose-100">
            <BookOpen className="w-5 h-5 text-rose-500" />
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
      <div className="flex-1 overflow-y-auto">
        <Header 
          showSearch 
          searchPlaceholder="Search by book title..."
          onSearch={handleSearch}
        />
        
        <div className="px-6">
          <h2 className="text-2xl font-serif mb-6 text-black">My Collection</h2>

          {/* Search Results */}
          {isSearching ? (
            <div className="text-center py-4">Searching...</div>
          ) : searchResults.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              {searchResults.map((book) => (
                <div key={book.id} className="border rounded-lg p-4">
                  <h3 className="font-medium">{book.title}</h3>
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
                  <button
                    onClick={() => addToUserBooks(book)}
                    className="mt-3 flex items-center text-sm text-rose-500 hover:text-rose-600"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add to My Books
                  </button>
                </div>
              ))}
            </div>
          ) : searchQuery && (
            <div className="text-center py-4 text-gray-500">No books found</div>
          )}

          {/* User's Books Section */}
          <div>
            {userBooks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Your collection is empty. Search for books to add them here!
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {userBooks.map((book) => (
                  <div key={book.id} className="border rounded-lg p-4">
                    <h3 className="font-medium">{book.title}</h3>
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
                    <button
                      onClick={() => removeFromUserBooks(book.id)}
                      className="mt-3 text-sm text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 