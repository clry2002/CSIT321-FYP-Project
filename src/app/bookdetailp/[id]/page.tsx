'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import type { Book } from '@/types/database.types';

interface GenreField {
  genrename: string;
}

interface GenreData {
  temp_genre: GenreField[] | GenreField | null;
}

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [book, setBook] = useState<Book | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; show: boolean }>({ message: '', show: false });

  useEffect(() => {
    const fetchBookDetails = async () => {
      if (!params.id) {
        setError('Book ID is missing.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const { data: bookData, error: bookError } = await supabase
          .from('temp_content')
          .select('*')
          .eq('cid', params.id)
          .single();

        if (bookError) {
          console.error('Error fetching book:', bookError);
          throw bookError;
        }
        setBook(bookData);

        const { data: genreData, error: genreError } = await supabase
          .from('temp_contentgenres')
          .select('temp_genre(genrename)')
          .eq('cid', params.id);

        if (genreError) {
          console.error('Error fetching genres:', genreError);
          throw genreError;
        }

        const genreNames = (Array.isArray(genreData)
          ? genreData.flatMap((g: GenreData) => {
              const genreField = g.temp_genre;
              if (Array.isArray(genreField)) {
                return genreField.map((tg) => tg.genrename);
              } else if (genreField?.genrename) {
                return [genreField.genrename];
              }
              return [];
            })
          : []) as string[];
        setGenres(genreNames);
        setError(null);
      } catch {
        setError('Failed to load book details.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookDetails();
  }, [params.id]);

  const handleViewBook = () => {
    if (!book?.contenturl) return;

    // Removed the call to recordBookView
    setNotification({ message: 'Viewing book...', show: true });
    setTimeout(() => setNotification({ message: '', show: false }), 3000);
    window.open(book.contenturl, '_blank');
  };

  const getCleanImageUrl = (url: string | null) => {
    return url?.startsWith('@') ? url.substring(1) : url;
  };

  const handleBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div>Loading book details...</div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-red-500">{error || 'Book not found.'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {notification.show && (
          <div className="fixed top-4 right-4 z-50 rounded-lg bg-rose-500 px-4 py-2 text-white shadow-lg">
            {notification.message}
          </div>
        )}

        <div className="mb-6">
          <button
            onClick={handleBack}
            className="rounded bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 transition"
          >
            ← Back
          </button>
        </div>

        <div className="md:flex md:gap-8 bg-white rounded-lg shadow-md p-6">
          <div className="md:w-1/3">
            <div className="relative h-96 w-full overflow-hidden rounded-md shadow-sm">
              {book.coverimage ? (
                <Image
                  src={getCleanImageUrl(book.coverimage) || ''}
                  alt={book.title}
                  fill
                  className="object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-gray-200">
                  <span className="text-gray-400">No cover available</span>
                </div>
              )}
            </div>
            {book.contenturl && (
              <div className="mt-4">
                <button
                  onClick={handleViewBook}
                  className="w-full rounded-lg bg-rose-500 py-2 text-center text-white hover:bg-rose-600 transition-colors"
                >
                  View Book
                </button>
              </div>
            )}
          </div>

          <div className="md:w-2/3">
            <h1 className="mb-2 text-3xl font-semibold text-gray-900">{book.title}</h1>
            <div className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Author</h2>
                <p className="text-gray-800">{book.credit}</p>
              </div>

              {book.createddate && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Published Date</h2>
                  <p className="text-gray-800">{new Date(book.createddate).toLocaleDateString()}</p>
                </div>
              )}

              {genres.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Genres</h2>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {genres.map((genre, idx) => (
                      <span
                        key={idx}
                        className="rounded-full bg-blue-100 px-3 py-1 text-blue-800 text-xs font-medium"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Summary</h2>
                <p className="text-gray-800">{book.description}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}