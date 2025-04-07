'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import type { Book } from '@/types/database.types';

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
    <div className="flex flex-col h-screen bg-white overflow-hidden">
    <Navbar />
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pt-25 px-6">
        
        <div className="px-6">
          <h2 className="text-2xl font-serif mb-6 text-black">My Bookmarks</h2>

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
                Your collection is empty. Browse books and add them here!
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
        <ChatBot />
      </div>
    </div>
  );
}
