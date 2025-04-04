'use client';

import { useSupabaseBooks } from '@/hooks/useSupabaseBooks';
import { useState } from 'react';
import type { Book } from '@/types/database.types';

export default function BooksList() {
  const { books, loading, error, addBook, updateBook, deleteBook } = useSupabaseBooks();
  const [newBook, setNewBook] = useState<Omit<Book, 'id'>>({
    title: '',+
    author: '',
  });

  if (loading) return <div>Loading books...</div>;
  if (error) return <div>Error: {error}</div>;

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBook.title) return;
    
    const { error } = await addBook(newBook);
    if (!error) {
      setNewBook({ title: '', author: '' });
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Books List</h2>
      
      {/* Add Book Form */}
      <form onSubmit={handleAddBook} className="mb-6 space-y-4">
        <div>
          <input
            type="text"
            placeholder="Book title"
            value={newBook.title}
            onChange={(e) => setNewBook(prev => ({ ...prev, title: e.target.value }))}
            className="border p-2 rounded mr-2"
          />
          <input
            type="text"
            placeholder="Author"
            value={newBook.author || ''}
            onChange={(e) => setNewBook(prev => ({ ...prev, author: e.target.value }))}
            className="border p-2 rounded mr-2"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Add Book
          </button>
        </div>
      </form>

      {/* Books List */}
      <div className="space-y-4">
        {books.map((book) => (
          <div
            key={book.id}
            className="border p-4 rounded shadow-sm flex justify-between items-center"
          >
            <div>
              <h3 className="font-bold">{book.title}</h3>
              {book.author && <p className="text-gray-600">{book.author}</p>}
              {book.genres && (
                <div className="mt-1">
                  {book.genres.map((genre, index) => (
                    <span
                      key={index}
                      className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded mr-2"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => deleteBook(book.id)}
              className="text-red-500 hover:text-red-700"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
} 