'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { supabase } from '@/lib/supabase';

import type { Book } from '@/types/database.types';
import Image from 'next/image';

export default function SearchBooksPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(query);
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarkedBooks, setBookmarkedBooks] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{ message: string; show: boolean }>({ message: '', show: false });

  useEffect(() => {
    const searchBooks = async () => {
      if (!query) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('books')
          .select('*')
          .ilike('title', `%${query}%`);

        if (error) throw error;
        setBooks(data || []);
      } catch (err) {
        console.error('Error searching books:', err);
        setError('Failed to search books');
      } finally {
        setIsLoading(false);
      }
    };

    searchBooks();
  }, [query]);

  // Fetch bookmarked books when component mounts
  useEffect(() => {
    const fetchBookmarkedBooks = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) return;

        const { data: profile, error } = await supabase
          .from('child_profile')
          .select('books_bookmark')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        if (profile?.books_bookmark) {
          setBookmarkedBooks(new Set(profile.books_bookmark));
        }
      } catch (err) {
        console.error('Error fetching bookmarked books:', err);
      }
    };

    fetchBookmarkedBooks();
  }, []);

  const handleSearch = (type: 'books' | 'videos') => {
    if (!searchQuery.trim()) return;
    if (type === 'books') {
      router.push(`/searchbooks?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push(`/searchvideos?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleBookmark = async (book: Book) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setNotification({ message: 'Please log in to bookmark books', show: true });
        setTimeout(() => setNotification({ message: '', show: false }), 3000);
        return;
      }

      const isCurrentlyBookmarked = bookmarkedBooks.has(book.title);
      const newBookmarkedBooks = new Set(bookmarkedBooks);

      if (isCurrentlyBookmarked) {
        newBookmarkedBooks.delete(book.title);
        setNotification({ message: 'Book removed from bookmarks', show: true });
      } else {
        newBookmarkedBooks.add(book.title);
        setNotification({ message: 'You saved this book', show: true });
      }

      const { error } = await supabase
        .from('child_profile')
        .update({ books_bookmark: Array.from(newBookmarkedBooks) })
        .eq('user_id', user.id);

      if (error) throw error;

      setBookmarkedBooks(newBookmarkedBooks);
      setTimeout(() => setNotification({ message: '', show: false }), 3000);
    } catch (err) {
      console.error('Error updating bookmarks:', err);
      setNotification({ message: 'Failed to update bookmark', show: true });
      setTimeout(() => setNotification({ message: '', show: false }), 3000);
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Navbar />
      <div className="flex-1 overflow-y-auto pt-16 px-6">
        {/* Notification Toast */}
        {notification.show && (
          <div className="fixed top-4 right-4 z-50 bg-rose-500 text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out">
            {notification.message}
          </div>
        )}

        <div className="max-w-7xl mx-auto">
          {/* Search Interface */}
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

          {query && (
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Search Results for "{query}"
            </h1>
          )}

          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : query && books.length > 0 ? (
            <div className="space-y-4">
              {books.map((book) => (
                <div key={`book-${book.book_id}`} className="flex items-start space-x-4 p-4 bg-white rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0 w-24 h-36 relative">
                    {book.cover_image ? (
                      <Image
                        src={book.cover_image || ''}
                        alt={book.title}
                        fill
                        className="object-cover rounded-md shadow-sm"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 rounded-md flex items-center justify-center">
                        <span className="text-gray-400 text-sm">No cover</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-lg font-semibold text-gray-900">
                      <a 
                        href={`/bookdetail/${book.book_id}`}
                        className="hover:text-rose-500 transition-colors"
                      >
                        {book.title}
                      </a>
                    </h3>
                    <p className="text-sm text-gray-600">{book.author}</p>
                    {book.genre && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {book.genre.map((genre, index) => (
                          <span
                            key={`genre-${book.book_id}-${genre}-${index}`}
                            className="text-xs bg-gray-100 text-black px-2 py-1 rounded"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button 
                    className={`flex-shrink-0 ml-4 p-2 rounded-full hover:bg-gray-100 transition-colors ${
                      bookmarkedBooks.has(book.title) ? 'text-rose-500' : 'text-gray-400'
                    }`}
                    onClick={() => handleBookmark(book)}
                    aria-label={bookmarkedBooks.has(book.title) ? 'Remove from bookmarks' : 'Add to bookmarks'}
                  >
                    <svg 
                      className="w-6 h-6" 
                      fill={bookmarkedBooks.has(book.title) ? 'currentColor' : 'none'} 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : query && (
            <div className="text-center py-8 text-gray-500">
              No books found matching your search
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
