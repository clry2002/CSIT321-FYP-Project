'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import SearchBooksClient from './SearchBookClient';
import { useInteractions } from '../../../hooks/useInteractions';

// Define types
interface BookWithGenres {
  cid: number;
  title: string;
  credit: string;
  description: string;
  coverimage: string;
  genreNames?: string[];
  viewCount?: number;
}

interface RawBook {
  cid: number;
  title: string;
  coverimage: string;
  credit: string;
  description: string;
  contenturl: string;
  content_format: string;
  viewCount?: number;
}

export default function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';

  const handleSearch = (query: string, type: 'books' | 'videos') => {
    if (!query.trim()) return;
    const path = type === 'books' ? '/searchbooks' : '/searchvideos';
    router.push(`${path}?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <>
      <SearchBooksClient onSearch={handleSearch} initialQuery={initialQuery} />
      <SearchResults query={initialQuery} />
    </>
  );
}

// Component to fetch and display search results
function SearchResults({ query }: { query: string }) {
  const [books, setBooks] = useState<BookWithGenres[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarkedBooks, setBookmarkedBooks] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{ message: string; show: boolean }>({ message: '', show: false });
  const [childId, setChildId] = useState<string | null>(null);
  const [blockedGenreIds, setBlockedGenreIds] = useState<number[] | null>(null);
  const { toggleBookmark, recordBookView } = useInteractions();

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

  useEffect(() => {
    const fetchBlockedGenres = async () => {
      if (!childId) return;

      const { data, error } = await supabase
        .from('blockedgenres')
        .select('genreid')
        .eq('child_id', childId);

      if (error) {
        console.error('Error fetching blocked genres:', error);
        setBlockedGenreIds([]); // Initialize as empty array on error
        return;
      }

      setBlockedGenreIds(data.map((row) => row.genreid));
    };

    fetchBlockedGenres();
  }, [childId]);

  useEffect(() => {
    const fetchBookmarks = async () => {
      if (!childId) return;

      const { data, error } = await supabase
        .from('temp_bookmark')
        .select('cid')
        .eq('uaid', childId);

      if (error) {
        console.error('Error fetching bookmarks:', error);
        return;
      }

      const bookmarkedCids = new Set(data?.map((item) => item.cid.toString()));
      setBookmarkedBooks(bookmarkedCids);
    };

    fetchBookmarks();
  }, [childId]);

  // Replace your fetchBooks function with this:

  useEffect(() => {
    const fetchBooks = async () => {
      if (!query || childId === null || blockedGenreIds === null) {
        setIsLoading(false);
        return;
      }
  
      setIsLoading(true);
      setError(null);
  
      try {
        // Single search attempt with no fallbacks
        const { data: rawBooks, error } = await supabase.rpc('search_books', {
          searchquery: query
        });
  
        if (error) {
          console.error('Error from search_books function', error);
          setError(`Error: ${error.message}`);
          setIsLoading(false);
          return;
        }
  
        if (!rawBooks || rawBooks.length === 0) {
          setError('No matching books found for your search.');
          setIsLoading(false);
          return;
        }
        
        const bookCids = rawBooks.map((book: RawBook) => book.cid);
        const { data: genresMap, error: genreError } = await supabase
          .from('temp_contentgenres')
          .select('cid, gid')
          .in('cid', bookCids);
  
        if (genreError) {
          console.error('Error fetching genres:', genreError);
          setBooks([]);
          setIsLoading(false);
          return;
        }
        
        // Fetch genre data inside the useEffect
        const { data: allGenres } = await supabase.from('temp_genre').select('gid, genrename');
  
        const genreLookup: Record<number, number[]> = {};
        genresMap.forEach(({ cid, gid }) => {
          if (!genreLookup[cid]) genreLookup[cid] = [];
          genreLookup[cid].push(gid);
        });
  
        const genreMap: Record<number, string> = {};
        allGenres?.forEach(({ gid, genrename }) => {
          genreMap[gid] = genrename;
        });
  
        const blockedGenreNames = Object.entries(genreMap)
          .filter(([gid]) => blockedGenreIds.includes(Number(gid)))
          .map(([, name]) => name.toLowerCase());
  
        const filteredBooks: BookWithGenres[] = rawBooks
          .filter((book: RawBook) => {
            const genreIds = genreLookup[book.cid] || [];
            const lowerTitle = book.title?.toLowerCase() || '';
            const lowerDescription = book.description?.toLowerCase() || '';
  
            const mentionsBlockedGenreText = blockedGenreNames.some((genre) =>
              lowerTitle.includes(genre) || lowerDescription.includes(genre)
            );
            const hasBlockedGenreId = genreIds.some((gid) => blockedGenreIds.includes(gid));
  
            return !mentionsBlockedGenreText && !hasBlockedGenreId;
          })
          .map((book: RawBook) => {
            const genreIds = genreLookup[book.cid] || [];
            const allowedGenreNames = genreIds
              .filter((gid) => !blockedGenreIds.includes(gid))
              .map((gid) => genreMap[gid])
              .filter(Boolean);
            return { 
              ...book, 
              genreNames: allowedGenreNames,
              viewCount: book.viewCount || 0
            };
          });
  
        if (filteredBooks.length === 0) {
          if (rawBooks.length > 0) {
            setError('This genre has been blocked, please search another genre.');
          } else {
            setError('No matching books found for your search.');
          }
        } else {
          setError(null);
        }
  
        setBooks(filteredBooks);
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to fetch books');
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchBooks();
  }, [query, childId, blockedGenreIds]);

  const handleBookmarkToggle = async (book: BookWithGenres) => {
    if (!childId) {
      setNotification({ message: 'No child profile found', show: true });
      setTimeout(() => setNotification({ message: '', show: false }), 3000);
      return;
    }

    const cidStr = book.cid.toString();
    const isBookmarked = bookmarkedBooks.has(cidStr);
    const updatedBookmarks = new Set(bookmarkedBooks);

    // Call the toggleBookmark function to update interactions
    const success = await toggleBookmark(book.cid.toString(), !isBookmarked);
    
    if (success) {
      if (isBookmarked) {
        updatedBookmarks.delete(cidStr);
      } else {
        updatedBookmarks.add(cidStr);
      }
      
      setBookmarkedBooks(updatedBookmarks);
      setNotification({
        message: isBookmarked ? 'Book removed from bookmarks' : 'You saved this book',
        show: true,
      });
      
      setTimeout(() => setNotification({ message: '', show: false }), 3000);
    } else {
      setNotification({
        message: 'Failed to update bookmark',
        show: true,
      });
      setTimeout(() => setNotification({ message: '', show: false }), 3000);
    }
  };

  const handleBookClick = async (bookId: number) => {
    // Record the book view in the user interactions
    await recordBookView(bookId.toString());
  };

  return (
    <>
      {query && (
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Search Results for &quot;{query}&quot;
        </h1>
      )}

      {notification.show && (
        <div className="fixed top-4 right-4 z-50 bg-rose-500 text-white px-6 py-3 rounded-lg shadow-lg">
          {notification.message}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">Loading books...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">{error}</div>
      ) : books.length > 0 ? (
        <div className="space-y-4">
          {books.map((book) => (
            <div key={book.cid} className="flex items-start space-x-4 p-4 bg-white rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex-shrink-0 w-24 h-36 relative">
                {book.coverimage && book.coverimage.trim() !== "" ? (
                  <Image
                    src={
                      book.coverimage.includes('http')
                        ? book.coverimage
                        : `https://bexeexbozsosdtatunld.supabase.co/storage/v1/object/public/book-covers/${book.coverimage}`
                    }
                    alt={book.title}
                    width={96}
                    height={144}
                    className="w-full h-full object-contain rounded-md shadow-sm"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 rounded-md flex items-center justify-center">
                    <span className="text-gray-400 text-sm">No cover</span>
                  </div>
                )}
              </div>

              <div className="flex-grow">
                <h3 className="text-lg font-semibold text-gray-900">
                  <a 
                    href={`/bookdetail/${book.cid}`} 
                    className="hover:text-rose-500 transition-colors"
                    onClick={() => handleBookClick(book.cid)}
                  >
                    {book.title}
                  </a>
                </h3>
                <p className="text-sm text-gray-600">{book.credit}</p>
                {book.genreNames && (
                  <div className="text-xs text-gray-500 mt-1">
                    {book.genreNames.join(', ')}
                  </div>
                )}
              </div>
              <button
                className={`flex-shrink-0 ml-4 p-2 rounded-full hover:bg-gray-100 transition-colors ${
                  bookmarkedBooks.has(book.cid.toString()) ? 'text-rose-500' : 'text-gray-400'
                }`}
                onClick={() => handleBookmarkToggle(book)}
                aria-label="Toggle bookmark"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">{error || 'No results found'}</div>
      )}
    </>
  );
}