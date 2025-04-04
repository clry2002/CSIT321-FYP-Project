'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import type { Book } from '@/types/database.types';

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
      if (!searchQuery) {
        setIsLoading(false);
        return;
      }
  
      try {
        console.log("Searching with query:", searchQuery); // Log the searchQuery to ensure it's correct
        const { data, error } = await supabase.rpc('search_books', { searchquery: searchQuery });
  
        if (error) {
          console.error('Error from search_books function:', error);
          setError(`Error: ${error.message}`);
          return;
        }
  
        // Use a Map to remove duplicates based on book.book_id
        const uniqueBooksMap = new Map();
        data?.forEach((book: Book) => {
          if (!uniqueBooksMap.has(book.book_id)) {
            uniqueBooksMap.set(book.book_id, book);
          }
        });
  
        // Convert the Map values back to an array
        setBooks(Array.from(uniqueBooksMap.values()));
      } catch (err) {
        console.error('Error searching books:', err);
        setError('Failed to search books');
      } finally {
        setIsLoading(false);
      }
    };
  
    searchBooks();
  }, [searchQuery]);
  

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

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Navbar />
      <div className="flex-1 overflow-y-auto pt-16 px-6">
       {/* Back Button placed above the Search Input */}
        <div className="mt-8 mb-4 flex justify-end">
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
          >
            Back
          </button>
        </div>

        {/* Search Input */}
        <div className="max-w-2xl mx-auto mt-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Search Books</h1>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter your search query..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-black"
              />
            </div>
          </div>
        </div>

        {/* Notification Toast */}
        {notification.show && (
          <div className="fixed top-4 right-4 z-50 bg-rose-500 text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out">
            {notification.message}
          </div>
        )}

        {/* Results or Loading State */}
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : books.length > 0 ? (
            <div className="space-y-4">
              {books.map((book) => (
                <div key={book.book_id} className="flex items-start space-x-4 p-4 bg-white rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0 w-24 h-36 relative">
                    {book.cover_image ? (
                      <Image
                        src={book.cover_image}
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
                      <a href={`/bookdetail/${book.book_id}`} className="hover:text-rose-500 transition-colors">
                        {book.title}
                      </a>
                    </h3>
                    <p className="text-sm text-gray-600">{book.author}</p>
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
      </div>
    </div>
  );
}
