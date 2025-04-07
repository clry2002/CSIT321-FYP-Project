'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Book } from '@/types/database.types';

export const useBooks = () => {
  const [popularBooks, setPopularBooks] = useState<Book[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchBooks = async () => {
      const { data, error } = await supabase
        .from('temp_content')
        .select('title, credit, coverimage, cid, genre, minimumage, description, cfid, status');

      if (error) {
        console.error('Error fetching books:', error);
        setError('Failed to fetch books. Please try again later.');
        setLoading(false);
        return;
      }

      const books = data.map((book: any) => ({
        title: book.title || '',
        credit: book.credit || '',
        coverimage: book.coverimage ?? '', // ensure no null
        cid: book.cid || '',
        genre: book.genre || '',
        minimumage: book.minimumage || 0,
        description: book.description || '',
        cfid: book.cfid || '',
        status: book.status || ''
      }));

      setPopularBooks(books);
      setLoading(false);
    };

    fetchBooks();
  }, []);

  return {
    popularBooks,
    error,
    loading
  };
};
