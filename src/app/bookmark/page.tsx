'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import type { Book, Video } from '@/types/database.types';

export default function BookmarksPage() {
  const [bookmarkedBooks, setBookmarkedBooks] = useState<Book[]>([]);
  const [bookmarkedVideos, setBookmarkedVideos] = useState<Video[]>([]);
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

        // Fetch books and videos in parallel
        const [booksRes, videosRes] = await Promise.all([
          supabase
            .from('temp_content')
            .select('*')
            .in('cid', bookmarkedCids)
            .eq('cfid', 2), // Books (cfid = 2)

          supabase
            .from('temp_content')
            .select('*')
            .in('cid', bookmarkedCids)
            .eq('cfid', 1), // Videos (cfid = 1)
        ]);

        if (booksRes.error) {
          console.error('Error fetching books:', booksRes.error);
        }
        if (videosRes.error) {
          console.error('Error fetching videos:', videosRes.error);
        }

        // Set books and videos
        setBookmarkedBooks(booksRes.data || []);
        setBookmarkedVideos(videosRes.data || []);
      } catch (err) {
        console.error('Unexpected error fetching bookmarks:', err);
      }
    };

    fetchBookmarks();
  }, [childUaid]);

  const handleRemoveBookmark = async (cid: number, cfid: number) => {
    if (!childUaid) return;

    console.log('Removing bookmark for uaid:', childUaid, 'cid:', cid);

    try {
      const { error } = await supabase
        .from('temp_bookmark')
        .delete()
        .eq('uaid', childUaid)
        .eq('cid', cid);

      if (error) {
        console.error('Error removing bookmark:', error);
        setNotification({ message: 'Failed to remove bookmark', show: true });
        return;
      }

      // Update the state after removal
      if (cfid === 2) {
        setBookmarkedBooks((prev) => prev.filter((book) => book.cid !== cid));
      } else if (cfid === 1) {
        setBookmarkedVideos((prev) => prev.filter((video) => video.cid !== cid));
      }

      setNotification({ message: 'Removed from bookmarks', show: true });
      setTimeout(() => setNotification({ message: '', show: false }), 3000);
    } catch (err) {
      console.error('Unexpected error:', err);
      setNotification({ message: 'Failed to remove bookmark', show: true });
      setTimeout(() => setNotification({ message: '', show: false }), 3000);
    }
  };

  const extractVideoId = (url: string) => {
    console.log('Extracting video ID from URL:', url);
    const match = url.match(
      /(?:youtube\.com\/(?:[^/]+\/[^/]+|(?:v|e(?:mbed)?)\/|.*[?&]v=)([\w-]+))|(?:youtu\.be\/([\w-]+))/i
    );
    if (match) {
      console.log('Matched video ID:', match[1] || match[2]);
      return match[1] || match[2];
    }
    console.log('No video ID found');
    return null;
  };

  const renderYouTubePlayer = (url: string, width: number, height: number) => {
    const videoId = extractVideoId(url);
    if (videoId) {
      return (
        <div className="relative" style={{ width: `${width}px`, height: `${height}px` }}>
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={`https://www.youtube.com/embed/${videoId}`}
            frameBorder="0"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
    return <div>No valid YouTube URL found</div>;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Navbar />
      <div className="flex-1 overflow-y-auto pt-16 px-6">
        <h1 className="text-4xl font-serif mt-10 text-black text-left">Bookmarked Content</h1>

        {notification.show && (
          <div className="fixed top-4 right-4 z-50 bg-rose-500 text-white px-6 py-3 rounded-lg shadow-lg">
            {notification.message}
          </div>
        )}

        {/* Bookmarked Books */}
        {bookmarkedBooks.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Books</h2>
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
                </div>
                <button
                  className="ml-6 p-2 rounded-full hover:bg-gray-100 text-red-500"
                  onClick={() => handleRemoveBookmark(book.cid, 2)} // cfid = 2 for books
                  aria-label="Remove bookmark"
                >
                  <svg className="w-6 h-6" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Bookmarked Videos */}
        {bookmarkedVideos.length > 0 && (
          <div className="space-y-6 mt-12">
            <h2 className="text-2xl font-semibold">Videos</h2>
            {bookmarkedVideos.map((video) => (
              <div key={video.cid} className="flex items-start space-x-6 p-6 bg-white rounded-lg shadow-md hover:bg-gray-50">
                {/* Video player */}
                <div className="flex-shrink-0" style={{ width: '300px', height: '170px' }}>
                  {video.contenturl && renderYouTubePlayer(video.contenturl, 300, 170)} {/* 300x170 size */}
                </div>
                
                {/* Video title and description */}
                <div className="flex-grow">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                    <a href={`/videodetail/${video.cid}`} className="hover:text-rose-500">
                      {video.title}
                    </a>
                  </h3>
                  <p className="text-md text-gray-600 mb-2">{video.description}</p>
                </div>

                {/* Remove bookmark button */}
                <button
                  className="ml-6 p-2 rounded-full hover:bg-gray-100 text-red-500"
                  onClick={() => handleRemoveBookmark(video.cid, 1)} // cfid = 1 for videos
                  aria-label="Remove bookmark"
                >
                  <svg className="w-6 h-6" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Empty state for no bookmarks */}
        {bookmarkedBooks.length === 0 && bookmarkedVideos.length === 0 && (
          <div className="text-center py-8 text-gray-500">Your collection is empty. Browse books and videos and add them here!</div>
        )}
      </div>
    </div>
  );
}
