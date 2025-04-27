'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import EduNavbar from '../../../components/eduNavbar';
import { supabase } from '@/lib/supabase';
import type { Book } from '@/types/database.types';
import AssignBookModal from '../../../components/educator/ClassroomDetails/AssignModal';

export default function TeacherBookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const showAssign = searchParams.get('assign') === 'true';

  const [book, setBook] = useState<Book | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; show: boolean }>({ message: '', show: false });

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

  // Check if we should open the assign modal based on URL param
  useEffect(() => {
    if (showAssign && book) {
      setShowAssignModal(true);
    }
  }, [showAssign, book]);

  const handleViewBook = async () => {
    if (!book || !book.contenturl) return;
    
    // Show notification
    setNotification({ message: 'Viewing book...', show: true });
    setTimeout(() => setNotification({ message: '', show: false }), 3000);
    
    // Open the book URL in a new tab
    window.open(book.contenturl, '_blank');
  };

  const getCleanImageUrl = (url: string | null) => {
    if (!url) return null;
    return url.startsWith('@') ? url.substring(1) : url;
  };

  const handleBackToSearch = () => {
    if (query) {
      router.push(`/teacher/searchbooks?q=${encodeURIComponent(query)}`);
    } else {
      router.back();
    }
  };

  const handleAssignClick = () => {
    setShowAssignModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-white">
        <EduNavbar />
        <div className="flex-1 flex items-center justify-center">
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="flex h-screen bg-white">
        <EduNavbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-500">{error || 'Book not found'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      <EduNavbar />
      <div className="flex-1 overflow-y-auto pt-16 px-6">
        {notification.show && (
          <div className="fixed top-4 right-4 z-50 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg">
            {notification.message}
          </div>
        )}

        <div className="max-w-4xl mx-auto mt-8">
          <div className="flex justify-start">
            <button
              onClick={handleBackToSearch}
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
                    className="block w-full text-center bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    View Book
                  </button>
                )}
                <button
                  onClick={handleAssignClick}
                  className="block w-full text-center bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  Assign to Students
                </button>
              </div>
            </div>

            <div className="w-full md:w-2/3">
              <div className="space-y-4">
                <div>
                  <h2 className="text-gray-600">Author</h2>
                  <p className="text-gray-900">{book.credit}</p>
                </div>

                {book.createddate && (
                  <div>
                    <h2 className="text-gray-600">Date Added</h2>
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

                {book.minimumage !== undefined && book.minimumage > 0 && (
                  <div>
                    <h2 className="text-gray-600">Minimum Age</h2>
                    <p className="text-gray-900">{book.minimumage}+</p>
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

      {/* Assignment Modal */}
      {book && (
        <AssignBookModal
          bookId={book.cid}
          bookTitle={book.title}
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            // Remove the assign query parameter if it exists
            if (showAssign) {
              router.replace(`/teacher/bookdetail/${params.id}`);
            }
          }}
        />
      )}
    </div>
  );
}