'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Book } from '@/types/database.types';

export const useSupabaseBooks = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('books')
        .select('*');

      if (error) {
        throw error;
      }

      setBooks(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching books');
    } finally {
      setLoading(false);
    }
  };

  // Function to add a new book
  const addBook = async (newBook: Omit<Book, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('books')
        .insert([newBook])
        .select()
        .single();

      if (error) throw error;

      setBooks(prevBooks => [...prevBooks, data]);
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Error adding book' };
    }
  };

  // Function to update a book
  const updateBook = async (id: number, updates: Partial<Omit<Book, 'id'>>) => {
    try {
      const { data, error } = await supabase
        .from('books')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setBooks(prevBooks => prevBooks.map(book => book.id === id ? data : book));
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Error updating book' };
    }
  };

  // Function to delete a book
  const deleteBook = async (id: number) => {
    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBooks(prevBooks => prevBooks.filter(book => book.id !== id));
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Error deleting book' };
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  return {
    books,
    loading,
    error,
    refreshBooks: fetchBooks,
    addBook,
    updateBook,
    deleteBook
  };
}; 