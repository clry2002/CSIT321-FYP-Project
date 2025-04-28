'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Navbar from '../../components/Navbar';
import ChatBot from '../../components/ChatBot';
import { supabase } from '@/lib/supabase';
import type { Book } from '@/types/database.types';
import { format } from 'date-fns';
import { debugUserInteractions } from '@/services/userInteractionsService';
import { useInteractions } from '@/hooks/useInteractions';

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  const [book, setBook] = useState<Book | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [pagesToRead, setPagesToRead] = useState<number>(0);
  const [notification, setNotification] = useState<{ message: string; show: boolean }>({ message: '', show: false });

  const [childId, setChildId] = useState<number | null>(null);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  
  // Use the interactions hook
  const { recordBookView, toggleBookmark } = useInteractions();

  interface GenreField {
    genrename: string;
  }
  
  interface GenreData {
    temp_genre: GenreField[] | GenreField | null;
  }

  // Fetch child profile ID (uaid)
  useEffect(() => {
    const fetchChildProfile = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('User not logged in or error:', userError);
        return;
      }

      const { data, error } = await supabase
        .from('user_account')
        .select('id')
        .eq('user_id', user.id)
        .eq('upid', 3)
        .single();

      if (error) {
        console.error('Child profile not found for this user:', error);
        return;
      }

      setChildId(data.id);
    };

    fetchChildProfile();
  }, []);

  // Fetch book and genre info
  useEffect(() => {
    const fetchBook = async () => {
      if (!params.id) {
        setError('Book ID is missing');
        setIsLoading(false);
        return;
      }

      try {
        const { data: bookData, error: bookError } = await supabase
          .from('temp_content')
          .select('*')
          .eq('cid', params.id)
          .single();

        if (bookError) throw bookError;
        setBook(bookData);

        const { data: genreData, error: genreError } = await supabase
          .from('temp_contentgenres')
          .select('temp_genre(genrename)')
          .eq('cid', params.id);

        if (genreError) throw genreError;

        const genreNames = Array.isArray(genreData)
          ? genreData.flatMap((g: GenreData) => {
              const genreField = g.temp_genre;
              if (Array.isArray(genreField)) {
                return genreField.map((tg) => tg.genrename);
              } else if (genreField && typeof genreField === 'object') {
                return [genreField.genrename];
              } else {
                return [];
              }
            })
          : [];

        setGenres(genreNames);
      } catch (err) {
        console.error('Error fetching book or genres:', err);
        setError('Failed to load book details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBook();
  }, [params.id]);

  // Fetch bookmark status
  useEffect(() => {
    const fetchBookmark = async () => {
      if (!childId || !params.id) return;

      const { data, error } = await supabase
        .from('temp_bookmark')
        .select('*')
        .eq('uaid', childId)
        .eq('cid', params.id)
        .single();

      setIsBookmarked(!error && data);
    };

    fetchBookmark();
  }, [childId, params.id]);

  const handleViewBook = async () => {
    if (!book || !book.contenturl) return;
    
    try {
      // Record the view using the hook - this handles both viewCount increment and user interactions
      await recordBookView(book.cid.toString());
      
      // Debug user interactions after recording the view
      if (childId) {
        await debugUserInteractions(childId.toString());
      }
      
      // Show notification
      setNotification({ message: 'Viewing book...', show: true });
      setTimeout(() => setNotification({ message: '', show: false }), 3000);
      
      // Open the book URL in a new tab
      window.open(book.contenturl, '_blank');
    } catch (error) {
      console.error('Error recording book view:', error);
    }
  };

  const toggleBookmarkHandler = async () => {
    if (!childId || !book) return;

    try {
      // Use the toggle bookmark hook that handles both DB operations and interactions
      const success = await toggleBookmark(book.cid.toString(), !isBookmarked);
      
      if (success) {
        setIsBookmarked(!isBookmarked);
        setNotification({ 
          message: isBookmarked ? 'Bookmark removed' : 'Book bookmarked', 
          show: true 
        });
        setTimeout(() => setNotification({ message: '', show: false }), 3000);
        
        // Debug user interactions after toggling the bookmark
        if (childId) {
          await debugUserInteractions(childId.toString());
        }
      } else {
        setNotification({ message: 'Failed to update bookmark', show: true });
        setTimeout(() => setNotification({ message: '', show: false }), 3000);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      setNotification({ message: 'Failed to update bookmark', show: true });
      setTimeout(() => setNotification({ message: '', show: false }), 3000);
    }
  };

  const getCleanImageUrl = (url: string | null) => {
    if (!url) return null;
    return url.startsWith('@') ? url.substring(1) : url;
  };

  const handleBackToSearch = () => {
    if (query) {
      router.push(`/searchbooks?q=${encodeURIComponent(query)}`);
    } else {
      router.back();
    }
  };

  const handleScheduleBook = () => {
    setScheduledDate(format(new Date(), 'yyyy-MM-dd'));
    setPagesToRead(0);
    setShowScheduleModal(true);
  };

  const handleCloseModal = () => {
    setShowScheduleModal(false);
    setScheduledDate('');
    setPagesToRead(0);
  };

  const handleSaveSchedule = async () => {
    if (!book || !scheduledDate || pagesToRead <= 0) {
      setNotification({ message: 'Please fill in all fields', show: true });
      setTimeout(() => setNotification({ message: '', show: false }), 3000);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('reading_schedules')
        .insert({
          user_id: user.id,
          date: new Date(scheduledDate).toISOString(),
          book_title: book.title,
          pages: pagesToRead,
          content_id: book.cid
        });

      if (error) throw error;

      setNotification({ message: 'Reading schedule saved successfully', show: true });
      setTimeout(() => setNotification({ message: '', show: false }), 3000);
      handleCloseModal();
    } catch (error) {
      console.error('Error saving schedule:', error);
      setNotification({ message: 'Failed to save schedule', show: true });
      setTimeout(() => setNotification({ message: '', show: false }), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="flex h-screen bg-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-500">{error || 'Book not found'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 to-indigo-900 text-white overflow-hidden">
      <Navbar />
      <div className="flex-1 overflow-y-auto pt-16 px-6">
        {notification.show && (
          <div className="fixed top-4 right-4 z-50 bg-rose-600 text-white px-6 py-3 rounded-lg shadow-md">
            {notification.message}
          </div>
        )}
  
        <div className="max-w-4xl mx-auto mt-8">
          <div className="flex justify-start">
            <button
              onClick={handleBackToSearch}
              className="mb-6 px-4 py-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition"
            >
              ← Back
            </button>
          </div>
  
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/3 rounded-lg shadow-md overflow-hidden">
              <div className="relative w-full h-[400px]">
                {book.coverimage ? (
                  <Image
                    src={getCleanImageUrl(book.coverimage) || ''}
                    alt={book.title}
                    fill
                    className="w-full h-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-800 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500">No cover available</span>
                  </div>
                )}
              </div>
  
              <div className="mt-4 space-y-2">
                {book.contenturl && (
                  <button
                    onClick={handleViewBook}
                    className="block w-full text-center bg-indigo-500 text-white py-2 rounded-lg hover:bg-indigo-600 transition-colors"
                  >
                    View Book
                  </button>
                )}
                <button
                  onClick={handleScheduleBook}
                  className="block w-full text-center bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Schedule Reading
                </button>
                <button
                  onClick={toggleBookmarkHandler}
                  className={`block w-full text-center ${
                    isBookmarked ? 'bg-red-500 hover:bg-red-600' : 'bg-yellow-400 hover:bg-yellow-500'
                  } text-white py-2 rounded-lg transition-colors`}
                >
                  {isBookmarked ? 'Remove Bookmark' : 'Add to Bookmarks'}
                </button>
              </div>
            </div>
  
            {showScheduleModal && book && (
              <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center">
                <div className="bg-gray-800 p-6 rounded-xl w-[400px]">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-indigo-300">Schedule Reading</h3>
                    <button
                      onClick={handleCloseModal}
                      className="text-gray-500 hover:text-gray-400"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Book</label>
                      <p className="text-gray-100 font-medium">{book.title}</p>
                    </div>
  
                    <div>
                      <label htmlFor="date" className="block text-sm font-medium text-gray-300 mb-1">Date</label>
                      <input
                        type="date"
                        id="date"
                        value={scheduledDate}
                        min={format(new Date(), 'yyyy-MM-dd')}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full border border-gray-700 rounded-lg p-2 text-gray-100 bg-gray-700 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
  
                    <div>
                      <label htmlFor="pages" className="block text-sm font-medium text-gray-300 mb-1">Pages to Read</label>
                      <input
                        type="number"
                        id="pages"
                        min="1"
                        value={pagesToRead || ''}
                        onChange={(e) => setPagesToRead(parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-700 rounded-lg p-2 text-gray-100 bg-gray-700 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter number of pages"
                      />
                    </div>
  
                    <div className="flex justify-end space-x-2 pt-4">
                      <button
                        onClick={handleCloseModal}
                        className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveSchedule}
                        disabled={!scheduledDate || pagesToRead <= 0}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed"
                      >
                        Save Schedule
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
  
            <div className="w-full md:w-2/3 space-y-4">
              <h1 className="text-3xl font-bold text-indigo-300">{book.title}</h1>
              <div>
                <h2 className="text-gray-400">Author</h2>
                <p className="text-gray-100">{book.credit}</p>
              </div>
  
              {book.createddate && (
                <div>
                  <h2 className="text-gray-400">Date Published</h2>
                  <p className="text-gray-100">
                    {new Date(book.createddate).toLocaleDateString()}
                  </p>
                </div>
              )}
  
              {genres.length > 0 && (
                <div>
                  <h2 className="text-gray-400">Genres</h2>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {genres.map((genre, idx) => (
                      <span
                        key={idx}
                        className="bg-indigo-100 text-indigo-800 text-sm font-medium px-2.5 py-0.5 rounded-full"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              )}
  
              <div>
                <h2 className="text-gray-400">Summary</h2>
                <p className="text-gray-100">{book.description}</p>
              </div>
  
              <div className="mt-8">
                <ChatBot />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}