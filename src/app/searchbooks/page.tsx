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
  const [searchType, setSearchType] = useState<'books' | 'videos'>('books');

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
        console.log("Searching with query:", searchQuery); // Log search query for debugging
        const { data, error } = await supabase.rpc('search_books', { searchquery: searchQuery });
  
        if (error) {
          console.error(`Error from ${rpcFunction} function:`, error);
          setError(`Error: ${error.message}`);
          return;
        }
  
        setBooks(data || []);
      } catch (err) {
        console.error(`Error searching ${searchType}:`, err);
        setError(`Failed to search ${searchType}`);
      } finally {
        setIsLoading(false);
      }
    };
  
    searchBooks();
  }, [searchQuery]);

  const handleSearch = (type: 'books' | 'videos') => {
    setSearchType(type);
    setSearchQuery('');
    setBooks([]);
    setIsLoading(false);
    setError(null);
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
        {/* Back Button */}
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
                            : `https://bexeexbozsosdtatunld.supabase.co/storage/v1/object/public/book-covers/${book.cover_image}`
                        }
                        alt={book.title}
                        width={96}
                        height={144}
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
                      <a href={`/bookdetail/${book.cid}`} className="hover:text-rose-500 transition-colors">
                        {book.title}
                      </a>
                    </h3>
                    <p className="text-sm text-gray-600">{book.credit}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No {searchType} found</div>
          )}
        </div>
      </div>
    </div>
  );
}
