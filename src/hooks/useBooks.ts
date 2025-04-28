'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Book } from '@/types/database.types';

export const useBooks = () => {
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);
  const [recommendedForYouBooks] = useState<Book[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const { data: books, error: booksError } = await supabase
          .from('temp_content')
          .select('cid, title, credit, coverimage, minimumage, description, cfid, status, contenturl, createddate, decisiondate')
          .eq('cfid', 2)
          .eq('status', 'approved');

        if (booksError) {
          console.error('Error fetching books:', booksError);
          setError('Failed to fetch books. Please try again later.');
          return;
        }

        // For each book, fetch its genres
        const booksWithGenres = await Promise.all(
          books.map(async (book) => {
            // Get genre IDs for this book
            const { data: contentGenres, error: genresError } = await supabase
              .from('temp_contentgenres')
              .select('gid')
              .eq('cid', book.cid);

            if (genresError) {
              console.error(`Error fetching genres for book ${book.cid}:`, genresError);
              return {
                ...book,
                genre: [] // Empty array as fallback
              };
            }

            // If book has genres, fetch genre names
            if (contentGenres && contentGenres.length > 0) {
              const genreIds = contentGenres.map(g => g.gid);
              
              const { data: genreData, error: genreNamesError } = await supabase
                .from('temp_genre')
                .select('genrename')
                .in('gid', genreIds);

              if (genreNamesError) {
                console.error(`Error fetching genre names for book ${book.cid}:`, genreNamesError);
                return {
                  ...book,
                  genre: []
                };
              }

              const genreNames = genreData?.map(g => g.genrename) || [];
              
              return {
                ...book,
                genre: genreNames
              };
            }

            return {
              ...book,
              genre: []
            };
          })
        );

        // Convert to Book type
        const formattedBooks: Book[] = booksWithGenres.map(book => ({
          cid: Number(book.cid),
          title: book.title || '',
          credit: book.credit || '',
          coverimage: book.coverimage,
          minimumage: book.minimumage || 0,
          description: book.description || '',
          contenturl: book.contenturl,
          cfid: Number(book.cfid) || 2,
          status: book.status || '',
          createddate: book.createddate,
          decisiondate: book.decisiondate,
          genre: book.genre || [] // Ensure genre is always defined
        }));

        setAvailableBooks(formattedBooks);
      } catch (err) {
        console.error('Unexpected error fetching books:', err);
        setError('An unexpected error occurred. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  return {
    availableBooks,
    recommendedForYouBooks,
    error,
    loading
  };
};