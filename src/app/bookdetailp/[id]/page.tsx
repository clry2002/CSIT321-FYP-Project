'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import type { Book } from '@/types/database.types';
import { useInteractions } from '@/hooks/useInteractions';

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [book, setBook] = useState<Book | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; show: boolean }>({ message: '', show: false });

  // Use the interactions hook
  const { recordBookView } = useInteractions();

  interface GenreField {
    genrename: string;
  }

  interface GenreData {
    temp_genre: GenreField[] | GenreField | null;
  }

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

  const handleViewBook = async () => {
    if (!book || !book.contenturl) return;

    try {
      // Record the view using the hook - this handles both viewCount increment and user interactions
      await recordBookView(book.cid.toString());

      // Show notification
      setNotification({ message: 'Viewing book...', show: true });
      setTimeout(() => setNotification({ message: '', show: false }), 3000);

      // Open the book URL in a new tab
      window.open(book.contenturl, '_blank');
    } catch (error) {
      console.error('Error recording book view:', error);
    }
  };

  const getCleanImageUrl = (url: string | null) => {
    if (!url) return null;
    return url.startsWith('@') ? url.substring(1) : url;
  };

  const handleBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-white">
        <div className="flex-1 flex items-center justify-center">
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="flex h-screen bg-white">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-500">{error || 'Book not found'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      <div className="flex-1 overflow-y-auto pt-6 px-6">
        {notification.show && (
          <div className="fixed top-4 right-4 z-50 bg-rose-500 text-white px-6 py-3 rounded-lg shadow-lg">
            {notification.message}
          </div>
        )}

        <div className="max-w-4xl mx-auto mt-8">
          <div className="flex justify-start">
            <button
              onClick={handleBack}
              className="mb-6 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
            >
              ← Back
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-8">
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
                  <button
                    onClick={handleViewBook}
                    className="block w-full text-center bg-rose-500 text-white py-2 rounded-lg hover:bg-rose-600 transition-colors"
                  >
                    View Book
                  </button>
                )}
              </div>
            </div>

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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}