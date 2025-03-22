'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Book {
  title: string;
  author: string;
  cover_image: string;
}

export const useBooks = () => {
  const [popularBooks, setPopularBooks] = useState<Book[]>([]);

  useEffect(() => {
    const fetchBooks = async () => {
      const { data, error } = await supabase
        .from('books')
        .select('title, author, cover_image')
        .in('title', [
          'Big Fish Little Fish',
          'Counting Cabbages – Early grade maths',
          'Through My Eyes',
          'The Little Red Hen'
        ]);

      if (error) {
        console.error('Error fetching books:', error);
        return;
      }

      setPopularBooks(data || []);
    };

    fetchBooks();
  }, []);

  return {
    popularBooks
  };
}; 