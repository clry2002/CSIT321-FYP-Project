'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import type { Book } from '@/types/database.types';
import ChatBot from '../components/ChatBot';

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

  useEffect(() => {
    const searchBooks = async () => {
      if (!query) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('search_books', { searchquery: query });
        if (error) {
          console.error('Error from search_books function:', error);
          setError(`Error: ${error.message}`);
          return;
        }
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

  const handleBookmark = async (book: Book) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
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

  const handleSearch = (type: 'books' | 'videos') => {
    if (!searchQuery.trim()) return;
    if (type === 'books') {
      router.push(`/searchbooks?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push(`/searchvideos?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Navbar />
      <div className="flex-1 overflow-y-auto pt-16 px-6">
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

          {notification.show && (
            <div className="fixed top-4 right-4 z-50 bg-rose-500 text-white px-6 py-3 rounded-lg shadow-lg">
              {notification.message}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : books.length > 0 ? (
            <div className="space-y-4">
              {books.map((book) => (
                <div key={book.cid} className="flex items-start space-x-4 p-4 bg-white rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0 w-24 h-36 relative">
                    {book.coverimage && book.coverimage.trim() !== "" ? (
                      <Image
                        src={
                          book.coverimage.includes('http')
                            ? book.coverimage
                            : `https://bexeexbozsosdtatunld.supabase.co/storage/v1/object/public/book-covers/${book.coverimage}`
                        }
                        alt={book.title}
                        width={96}
                        height={144}
                        className="w-full h-full object-contain rounded-md shadow-sm"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 rounded-md flex items-center justify-center">
                        <span className="text-gray-400 text-sm">No cover</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-grow">
                    <h3 className="text-lg font-semibold text-gray-900">
                      <a href={`/bookdetail/${book.cid}`} className="hover:text-rose-500 transition-colors">
                        {book.title}
                      </a>
                    </h3>
                    <p className="text-sm text-gray-600">{book.credit}</p>
                  </div>
                  <button
                    className={`flex-shrink-0 ml-4 p-2 rounded-full hover:bg-gray-100 transition-colors ${
                      bookmarkedBooks.has(book.title) ? 'text-rose-500' : 'text-gray-400'
                    }`}
                    onClick={() => handleBookmark(book)}
                    aria-label="Toggle bookmark"
                  >
                    <svg className="w-6 h-6" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No books found</div>
          )}
        </div>
        <ChatBot />
      </div>
    </div>
  );
}
