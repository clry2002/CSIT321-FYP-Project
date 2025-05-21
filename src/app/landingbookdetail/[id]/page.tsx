// src/app/bookdetail/[id]/page.tsx
'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

// Use only the types needed for the public view
type Book = {
  cid: string;
  title: string;
  coverimage: string;
  description: string;
  credit: string;
  contenturl: string;
  createddate?: string;
};

export default function PublicBookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  const [book, setBook] = useState<Book | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authAction, setAuthAction] = useState<string>('');
  const [isMascotHovered, setIsMascotHovered] = useState<boolean>(false);
  
  interface GenreField {
    genrename: string;
  }
  
  interface GenreData {
    temp_genre: GenreField[] | GenreField | null;
  }

  // Fetch book and genre info for public view
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

  // For public view, all interactive features will prompt for auth
  const handleViewBook = () => {
    setAuthAction('view');
    setShowAuthModal(true);
  };

  const handleScheduleBook = () => {
    setAuthAction('schedule');
    setShowAuthModal(true);
  };

  const handleBookmark = () => {
    setAuthAction('bookmark');
    setShowAuthModal(true);
  };
  
  const handleMascotClick = () => {
    setAuthAction('chat');
    setShowAuthModal(true);
  };
  
  const handleCloseAuthModal = () => {
    setShowAuthModal(false);
    setAuthAction('');
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
    <div className="flex h-screen bg-gradient-to-br from-gray-900 to-indigo-900 text-white overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6">
        {showAuthModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center">
            <div className="bg-gray-800 p-6 rounded-xl w-[400px] animate-fade-in">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl font-medium text-yellow-400">Join Our Reading Community</h3>
                <button
                  onClick={handleCloseAuthModal}
                  className="text-gray-400 hover:text-gray-200 transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                {authAction === 'view' && (
                  <div className="text-center">
                    <p className="text-gray-300 mb-2">Ready to start reading?</p>
                    <p className="text-indigo-300 font-medium">Sign in or create an account to explore this book and many more!</p>
                  </div>
                )}
                
                {authAction === 'schedule' && (
                  <div className="text-center">
                    <p className="text-gray-300 mb-2">Plan your reading adventure!</p>
                    <p className="text-indigo-300 font-medium">Sign in or create an account to schedule reading time and track your progress.</p>
                  </div>
                )}
                
                {authAction === 'bookmark' && (
                  <div className="text-center">
                    <p className="text-gray-300 mb-2">Found a book you love?</p>
                    <p className="text-indigo-300 font-medium">Sign in or create an account to bookmark this story and build your personal collection.</p>
                  </div>
                )}
                
                {authAction === 'chat' && (
                  <div className="text-center">
                    <p className="text-gray-300 mb-2">Have questions about this book?</p>
                    <p className="text-indigo-300 font-medium">Sign in or create an account to chat with our friendly AI reading assistant!</p>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col space-y-3">
                <Link href={`/auth/login?redirect=/child/bookdetail/${params.id}`} className="w-full">
                  <button className="w-full px-4 py-2 text-orange-500 border border-orange-500 rounded-full hover:bg-orange-900 hover:bg-opacity-20 transition">
                    Log In
                  </button>
                </Link>
                <Link href={`/auth/signup?redirect=/child/bookdetail/${params.id}`} className="w-full">
                  <button className="w-full px-4 py-2 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition">
                    Sign Up
                  </button>
                </Link>
              </div>
            </div>
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
                    unoptimized
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
                  onClick={handleBookmark}
                  className="block w-full text-center bg-yellow-400 hover:bg-yellow-500 text-white py-2 rounded-lg transition-colors"
                >
                  Add to Bookmarks
                </button>
              </div>
            </div>

            <div className="w-full md:w-2/3 space-y-4">
              <h1 className="text-3xl font-bold text-yellow-400">{book.title}</h1>
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
            </div>
          </div>
        </div>
        
        {/* Chatbot Mascot - Fixed position at bottom right */}
       <div className="chatbot-wrapper fixed bottom-6 right-6 z-40">
        <div 
          className="mascot-container"
          onMouseEnter={() => setIsMascotHovered(true)}
          onMouseLeave={() => setIsMascotHovered(false)}
        >
          <Image 
            src="/mascotnew.png" 
            alt="Mascot" 
            className={`chatbot-mascot-image ${isMascotHovered ? 'mascot-wobble' : ''}`}
            width={100}
            height={100}
            onClick={handleMascotClick}
            style={{ cursor: 'pointer', width: 'auto', height: 'auto', maxWidth: '100px', maxHeight: '100px' }}
            unoptimized
          />
          {isMascotHovered && (
            <div className="mascot-tooltip bg-gray-800 text-white px-3 py-2 rounded-lg absolute -top-10 left-1/2 transform -translate-x-1/2 text-sm">
              Chat with me!
            </div>
          )}
        </div>
      </div>
    </div>
      
      {/* Animations for mascot and modal */}
      <style jsx global>{`        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
        
        @keyframes wobble {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }
        .mascot-wobble {
          animation: wobble 0.6s ease-in-out infinite;
        }
        
        .chatbot-mascot-image {
          transition: transform 0.3s ease;
        }
        
        .mascot-container {
          position: relative;
          display: inline-block;
        }
        
        .mascot-tooltip {
          white-space: nowrap;
          opacity: 0;
          animation: fade-in 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}