'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { supabase } from '@/lib/supabase';
import { Plus } from 'lucide-react';
import Image from 'next/image';
import type { Book } from '@/types/database.types';

export default function BookmarksPage() {
  const [bookmarkedBooks, setBookmarkedBooks] = useState<Book[]>([]);
  const [notification, setNotification] = useState<{ message: string; show: boolean }>({ message: '', show: false });
  const [childId, setChildId] = useState<string | null>(null);

  // Fetch the first available child profile's bookmarks
  useEffect(() => {
    const fetchChildProfile = async () => {
      try {
        const { data: childProfiles, error } = await supabase
          .from('child_profile')
          .select('child_id, books_bookmark')
          .limit(1);

        if (error || !childProfiles || childProfiles.length === 0) {
          console.error('No child profile found', error);
          return;
        }

        const childProfile = childProfiles[0];
        setChildId(childProfile.child_id);

        // Ensure books_bookmark is an array
        const bookmarkedTitles = Array.isArray(childProfile.books_bookmark) ? childProfile.books_bookmark : [];

        // Fetch the books for this child profile
        const { data: books, error: bookError } = await supabase
          .from('books')
          .select('*')
          .in('title', bookmarkedTitles);

        if (bookError) {
          console.error('Error fetching books:', bookError);
          return;
        }

        setBookmarkedBooks(books || []);
      } catch (err) {
        console.error('Error fetching child profile:', err);
      }
    };

    fetchChildProfile();
  }, []);

  const handleRemoveBookmark = async (book: Book) => {
    try {
      if (!childId) {
        setNotification({ message: 'No child profile found', show: true });
        setTimeout(() => setNotification({ message: '', show: false }), 3000);
        return;
      }

      // Ensure safe array update
      const updatedBookmarks = bookmarkedBooks.filter(b => b.book_id !== book.book_id).map(b => b.title);

      // Update the database
      const { error } = await supabase
        .from('child_profile')
        .update({ books_bookmark: updatedBookmarks.length > 0 ? updatedBookmarks : [] })
        .eq('child_id', childId);

      if (error) {
        console.error('Error updating bookmarks:', error);
        setNotification({ message: 'Failed to update bookmark', show: true });
        return;
      }

      // Update state
      setBookmarkedBooks(prev => prev.filter(b => b.book_id !== book.book_id));
      setNotification({ message: 'Book removed from bookmarks', show: true });
      setTimeout(() => setNotification({ message: '', show: false }), 3000);
    } catch (err) {
      console.error('Unexpected error removing bookmark:', err);
      setNotification({ message: 'Failed to remove bookmark', show: true });
      setTimeout(() => setNotification({ message: '', show: false }), 3000);
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Navbar />
      <div className="flex-1 overflow-y-auto pt-16 px-6">
        <h1 className="text-4xl font-serif mt-10 text-black text-left">Bookmarked Books</h1>

        {/* Notification Toast */}
        {notification.show && (
          <div className="fixed top-4 right-4 z-50 bg-rose-500 text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out">
            {notification.message}
          </div>
        )}

        {/* Bookmarked Books List */}
        {bookmarkedBooks.length > 0 ? (
          <div className="space-y-6">
            {bookmarkedBooks.map((book) => (
              <div key={book.book_id} className="flex items-start space-x-6 p-6 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0 w-32 h-48 relative">
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
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                    <a href={`/bookdetail/${book.book_id}`} className="hover:text-rose-500 transition-colors">
                      {book.title}
                    </a>
                  </h3>
                  <p className="text-md text-gray-600 mb-2">{book.author}</p>
                  {book.genres && (
                    <div className="flex flex-wrap gap-2">
                      {book.genres.map((genre, index) => (
                        <span
                          key={index}
                          className="text-sm bg-gray-100 px-2 py-1 rounded"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  className="ml-6 p-2 rounded-full hover:bg-gray-100 transition-colors text-red-500"
                  onClick={() => handleRemoveBookmark(book)}
                  aria-label="Remove bookmark"
                >
                  <svg className="w-6 h-6" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">Your collection is empty. Browse books and add them here!</div>
        )}
      </div>
    </div>
  );
}

//