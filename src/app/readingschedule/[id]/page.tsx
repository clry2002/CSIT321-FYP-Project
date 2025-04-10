'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

interface BookDetails {
  title: string;
  description: string;
  coverimage?: string;
  credit: string;
  minimumage: number;
  contenturl?: string;
}

export default function BookDetailFromSchedule({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [book, setBook] = useState<BookDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('temp_content')
          .select('*')
          .eq('cid', params.id)
          .single();

        if (error) throw error;
        setBook(data);
      } catch (error) {
        console.error('Error fetching book details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookDetails();
  }, [params.id]);

  const handleBack = () => {
    router.push('/childpage'); // Navigate directly to childpage
  };

  const handleViewBook = () => {
    if (book?.contenturl) {
      window.open(book.contenturl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-xl text-gray-600">Book not found</p>
        <button
          onClick={handleBack}
          className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <button
          onClick={handleBack}
          className="mb-6 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center"
        >
          <span>←</span>
          <span className="ml-2">Back</span>
        </button>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="md:flex">
            <div className="md:flex-shrink-0 p-6">
              {book.coverimage ? (
                <Image
                  src={book.coverimage}
                  alt={book.title}
                  width={240}
                  height={360}
                  className="rounded-lg object-cover"
                />
              ) : (
                <div className="w-60 h-90 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400">No image available</span>
                </div>
              )}
              {book?.contenturl && (
                <button
                  onClick={handleViewBook}
                  className="w-full mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center"
                >
                  <span>View Book</span>
                  <span className="ml-2">↗</span>
                </button>
              )}
            </div>

            <div className="p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">{book.title}</h1>
              
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Author</h2>
                <p className="text-gray-600">{book.credit}</p>
              </div>

              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Description</h2>
                <p className="text-gray-600">{book.description}</p>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">Age Rating</h2>
                <p className="text-gray-600">{book.minimumage}+</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 