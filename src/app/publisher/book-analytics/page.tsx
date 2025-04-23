'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface BookAnalyticData {
  cid: number;
  title: string;
  viewCount: number | null;
}

const BookAnalytics: React.FC = () => {
  const router = useRouter();
  const [bookMetrics, setBookMetrics] = useState<BookAnalyticData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uaidPublisher, setUaidPublisher] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData?.user) {
        console.error('Error fetching user or user is not logged in:', userError);
        return;
      }

      const user = userData.user;

      const { data: userAccountData, error: userAccountError } = await supabase
        .from('user_account')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (userAccountError) {
        console.error('Error fetching user account data:', userAccountError);
        return;
      }

      setUaidPublisher(userAccountData?.id || null);
      setLoading(false);
    };

    fetchUser();
  }, []);

  useEffect(() => {
    const fetchBookAnalytics = async () => {
      if (!uaidPublisher) {
        return;
      }

      try {
        const { data, error } = await supabase
          .from('temp_content')
          .select('cid, title, viewCount')
          .eq('uaid_publisher', uaidPublisher)
          .eq('cfid', 2); // Filter for books

        if (error) {
          console.error('Error fetching book analytics:', error);
          return;
        }

        setBookMetrics(data as BookAnalyticData[]);
      } catch (error) {
        console.error('An error occurred while fetching book analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!loading) {
      fetchBookAnalytics();
    }
  }, [uaidPublisher, loading]);

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
        <div className="flex justify-between items-center mb-6 px-6 py-5">
          <h1 className="text-2xl font-serif text-black">Book Analytics</h1>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-lg"
            onClick={() => router.push('/publisherpage')}
          >
            Back to Publisher Dashboard
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-lg text-gray-700">Loading book analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6 px-6 py-5">
        <h1 className="text-2xl font-serif text-black">Book Analytics</h1>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded-lg"
          onClick={() => router.push('/publisherpage')}
        >
          Back to Publisher Dashboard
        </button>
      </div>

      {/* Analytics Table */}
      <div className="flex-1 overflow-y-auto px-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-serif mb-3 text-black">Published Books</h2>
          <table className="table-auto w-full text-left text-gray-600 text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border">Title</th>
                <th className="px-4 py-2 border">Reads</th>
              </tr>
            </thead>
            <tbody>
              {bookMetrics.length > 0 ? (
                bookMetrics.map((book, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border">{book.title}</td>
                    <td className="px-4 py-2 border">{book.viewCount !== null ? book.viewCount : 'N/A'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="text-center py-4">No books published yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BookAnalytics;