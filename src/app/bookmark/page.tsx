'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import type { Book } from '@/types/database.types';

export default function BookmarksPage() {
  const [bookmarkedBooks, setBookmarkedBooks] = useState<Book[]>([]);
  const [notification, setNotification] = useState<{ message: string; show: boolean }>({ message: '', show: false });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [childUaid, setChildUaid] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Fetched user:', user);
      setUser(user);
      setLoading(false);

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        setUser(session?.user || null);
        console.log('User onAuthStateChange:', session?.user);
      });

      return () => {
        subscription.unsubscribe();
      };
    };

    fetchUser();
  }, []);

  useEffect(() => {
    const fetchChildProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('user_account')
        .select('id')
        .eq('user_id', user.id)
        .eq('upid', 3)
        .single();

      if (error) {
        console.error('Child profile not found:', error);
        return;
      }

      console.log('Matched child profile:', data);
      setChildUaid(data.id); // This is the actual `uaid` used in temp_bookmark
    };

    fetchChildProfile();
  }, [user]);

  useEffect(() => {
    const fetchBookmarks = async () => {
      if (!childUaid) return;

      console.log('Fetching bookmarks for child uaid:', childUaid);

      try {
        const { data: bookmarks, error: bookmarksError } = await supabase
          .from('temp_bookmark')
          .select('cid')
          .eq('uaid', childUaid);

        if (bookmarksError) {
          console.error('Error fetching bookmarks:', bookmarksError);
          return;
        }

        console.log('Fetched Bookmarks:', bookmarks);

        if (!bookmarks || bookmarks.length === 0) {
          console.log('No bookmarks found for this user.');
          return;
        }

        const bookmarkedCids = bookmarks.map((bookmark) => bookmark.cid);
        console.log('Bookmarked CIDs:', bookmarkedCids);

        const { data: books, error: bookError } = await supabase
          .from('temp_content')
          .select('*')
          .in('cid', bookmarkedCids)
          .eq('cfid', 2); // Ensure it's only books

        if (bookError) {
          console.error('Error fetching books:', bookError);
          return;
        }

        console.log('Fetched Books:', books);

        if (books) {
          setBookmarkedBooks(books);
        } else {
          console.log('No books found for the given cids.');
        }
      } catch (err) {
        console.error('Unexpected error fetching bookmarks:', err);
      }
    };

    fetchBookmarks();
  }, [childUaid]);

  const handleRemoveBookmark = async (book: Book) => {
    if (!childUaid) return;

    console.log('Removing bookmark for uaid:', childUaid, 'book cid:', book.cid);

    try {
      const { error } = await supabase
        .from('temp_bookmark')
        .delete()
        .eq('uaid', childUaid)
        .eq('cid', book.cid);

      if (error) {
        console.error('Error removing bookmark:', error);
        setNotification({ message: 'Failed to remove bookmark', show: true });
        return;
      }

      setBookmarkedBooks(prev => prev.filter(b => b.cid !== book.cid));
      setNotification({ message: 'Book removed from bookmarks', show: true });
      setTimeout(() => setNotification({ message: '', show: false }), 3000);
    } catch (err) {
      console.error('Unexpected error:', err);
      setNotification({ message: 'Failed to remove bookmark', show: true });
      setTimeout(() => setNotification({ message: '', show: false }), 3000);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Navbar />
      <div className="flex-1 overflow-y-auto pt-16 px-6">
        <h1 className="text-4xl font-serif mt-10 text-black text-left">Bookmarked Books</h1>

        {notification.show && (
          <div className="fixed top-4 right-4 z-50 bg-rose-500 text-white px-6 py-3 rounded-lg shadow-lg">
            {notification.message}
          </div>
        )}

        {bookmarkedBooks.length > 0 ? (
          <div className="space-y-6">
            {bookmarkedBooks.map((book) => (
              <div key={book.cid} className="flex items-start space-x-6 p-6 bg-white rounded-lg shadow-md hover:bg-gray-50">
                <div className="flex-shrink-0 w-32 h-48 relative">
                  {book.coverimage ? (
                    <Image src={book.coverimage} alt={book.title} fill className="object-cover rounded-md" />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-md">
                      <span className="text-gray-400">No cover</span>
                    </div>
                  )}
                </div>
                <div className="flex-grow">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                    <a href={`/bookdetail/${book.cid}`} className="hover:text-rose-500">
                      {book.title}
                    </a>
                  </h3>
                  <p className="text-md text-gray-600 mb-2">{book.credit}</p>
                  {book.genre && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm bg-gray-100 px-2 py-1 rounded">{book.genre}</span>
                    </div>
                  )}
                </div>
                <button
                  className="ml-6 p-2 rounded-full hover:bg-gray-100 text-red-500"
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