'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Navbar from '../../components/Navbar';
import ChatBot from '../../components/ChatBot';
import { supabase } from '@/lib/supabase';
import type { Book } from '@/types/database.types';
import { format } from 'date-fns';

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

  useEffect(() => {
    const fetchBook = async () => {
      if (!params.id) {
        setError('Book ID is missing');
        setIsLoading(false);
        return;
      }

      try {
        // Fetch book details
        const { data: bookData, error: bookError } = await supabase
          .from('temp_content')
          .select('*')
          .eq('cid', params.id)
          .single();

        if (bookError) throw bookError;
        setBook(bookData);

        // Fetch genres
        const { data: genreData, error: genreError } = await supabase
          .from('temp_contentgenres')
          .select('temp_genre(genrename)')
          .eq('cid', params.id);

        if (genreError) throw genreError;

        const genreNames = Array.isArray(genreData)
        ? genreData.flatMap((g: any) => {
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
    <div className="flex h-screen bg-white">
      <Navbar />
      <div className="flex-1 overflow-y-auto pt-16 px-6">
        {notification.show && (
          <div className="fixed top-4 right-4 z-50 bg-rose-500 text-white px-6 py-3 rounded-lg shadow-lg">
            {notification.message}
          </div>
        )}

        <div className="max-w-4xl mx-auto mt-8">
          {/* Back Button */}
          <div className="flex justify-start">
            <button
              onClick={handleBackToSearch}
              className="mb-6 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
            >
              ← Back to Search
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-8">
            {/* Book Cover */}
            <div className="w-full md:w-1/3">
              <div className="relative w-full h-[400px]">
                {book.coverimage ? (
                  <Image
                    src={getCleanImageUrl(book.coverimage) || ''}
                    alt={book.title}
                    fill
                    className="w-full h-full object-contain rounded-md shadow-sm"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400">No cover available</span>
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-2">
                {book.contenturl && (
                  <a
                    href={book.contenturl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-rose-500 text-white py-2 rounded-lg hover:bg-rose-600 transition-colors"
                  >
                    View Book
                  </a>
                )}
                <button
                  onClick={handleScheduleBook}
                  className="block w-full text-center bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Schedule Reading
                </button>
              </div>
            </div>

            {/* Schedule Modal */}
            {showScheduleModal && book && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                <div className="bg-white p-6 rounded-xl w-[400px]">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-black">Schedule Reading</h3>
                    <button
                      onClick={handleCloseModal}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Book</label>
                      <p className="text-gray-900 font-medium">{book.title}</p>
                    </div>
                    
                    <div>
                      <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        id="date"
                        value={scheduledDate}
                        min={format(new Date(), 'yyyy-MM-dd')}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full border rounded-lg p-2 text-gray-900"
                      />
                    </div>

                    <div>
                      <label htmlFor="pages" className="block text-sm font-medium text-gray-700 mb-1">Pages to Read</label>
                      <input
                        type="number"
                        id="pages"
                        min="1"
                        value={pagesToRead || ''}
                        onChange={(e) => setPagesToRead(parseInt(e.target.value) || 0)}
                        className="w-full border rounded-lg p-2 text-gray-900"
                        placeholder="Enter number of pages"
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <button
                        onClick={handleCloseModal}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveSchedule}
                        disabled={!scheduledDate || pagesToRead <= 0}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Save Schedule
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Book Details */}
            <div className="w-full md:w-2/3">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{book.title}</h1>
              <div className="space-y-4">
                <div>
                  <h2 className="text-gray-600">Author</h2>
                  <p className="text-gray-900">{book.credit}</p>
                </div>

                {book.createddate && (
                  <div>
                    <h2 className="text-gray-600">Date Published</h2>
                    <p className="text-gray-900">
                      {new Date(book.createddate).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {genres.length > 0 && (
                  <div>
                    <h2 className="text-gray-600">Genres</h2>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {genres.map((genre, idx) => (
                        <span
                          key={idx}
                          className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h2 className="text-gray-600">Summary</h2>
                  <p className="text-gray-900">{book.description}</p>
                </div>
              </div>

              <ChatBot />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}