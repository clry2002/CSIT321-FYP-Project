'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Content {
  cid: number;
  title: string;
  credit: string;
  genrename: string;
}

interface PublishedContent {
  cid: number;
  title: string;
  credit: string;
  cfid: number; // 1 for video, 2 for book
  genrename: string;
}

export default function PublisherPage() {
  const router = useRouter();

  const [books, setBooks] = useState<Content[]>([]);
  const [videos, setVideos] = useState<Content[]>([]);
  const [uaidPublisher, setUaidPublisher] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    const fetchPublishedContent = async () => {
      if (!uaidPublisher) {
        console.error('Publisher account ID (uaidPublisher) is null');
        return;
      }

      try {
        const { data, error } = await supabase.rpc('view_published_book', {
          uaid_publisher: uaidPublisher,
        });

        if (error) {
          console.error('Error executing RPC function:', error.message);
          return;
        }

        console.log('Fetched content:', data);

        const contentList = data as PublishedContent[];

        const filteredBooks = contentList.filter((content) => content.cfid === 2);
        const filteredVideos = contentList.filter((content) => content.cfid === 1);

        const formattedBooks: Content[] = filteredBooks.map((content) => ({
          cid: content.cid,
          title: content.title,
          credit: content.credit,
          genrename: content.genrename,
        }));
        const formattedVideos: Content[] = filteredVideos.map((content) => ({
          cid: content.cid,
          title: content.title,
          credit: content.credit,
          genrename: content.genrename,
        }));

        setBooks(formattedBooks);
        setVideos(formattedVideos);
      } catch (error) {
        console.error('Error fetching published content:', error);
      }
    };

    if (!loading) {
      fetchPublishedContent();
    }
  }, [uaidPublisher, loading]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6 px-6 py-5">
        <h1 className="text-2xl font-serif text-black">Welcome, Publisher!</h1>
        <div className="flex space-x-3">
          <button
            className="bg-gray-900 text-white px-4 py-2 rounded-lg"
            onClick={() => router.push('/publisher/settings')}
          >
            Settings
          </button>
          <button
            className="bg-red-600 text-white px-4 py-2 rounded-lg"
            onClick={() => router.push('/logout')}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 space-y-5">
        {/* Top Genres Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-serif mb-3 text-black">Top Book Genres</h2>
            <ul className="list-disc list-inside text-gray-600 text-sm">
              <li>Genre 1: 5 books</li>
              <li>Genre 2: 3 books</li>
              <li>Genre 3: 2 books</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-serif mb-3 text-black">Top Video Genres</h2>
            <ul className="list-disc list-inside text-gray-600 text-sm">
              <li>Genre A: 4 videos</li>
              <li>Genre B: 3 videos</li>
              <li>Genre C: 1 video</li>
            </ul>
          </div>
        </div>

        {/* Books Analytics Section */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-serif mb-3 text-black">Books Analytics</h2>
          <p className="text-gray-600 text-sm mb-3">
            Track performance metrics and trends for your published books.
          </p>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-lg w-full"
            onClick={() => router.push('/publisher/book-analytics')}
          >
            View Books Analytics
          </button>
        </div>

        {/* Videos Analytics Section */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-serif mb-3 text-black">Videos Analytics</h2>
          <p className="text-gray-600 text-sm mb-3">
            Monitor views, engagement, and trends for your published videos.
          </p>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-lg w-full"
            onClick={() => router.push('/publisher/video-analytics')}
          >
            View Videos Analytics
          </button>
        </div>

        {/* Published Books Section */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-serif mb-3 text-black">Published Books</h2>
          <table className="table-auto w-full text-left text-gray-600 text-sm mb-3 border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border">Title</th>
                <th className="px-4 py-2 border">Credit</th>
                <th className="px-4 py-2 border">Genre</th>
              </tr>
            </thead>
            <tbody>
              {books.length > 0 ? (
                books.map((book, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border">{book.title}</td>
                    <td className="px-4 py-2 border">{book.credit}</td>
                    <td className="px-4 py-2 border">{book.genrename}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-center py-4">No published books yet.</td>
                </tr>
              )}
            </tbody>
          </table>
          <button
            className="bg-green-500 text-white px-4 py-2 rounded-lg w-full"
            onClick={() => router.push('/publisher/addbook')}
          >
            + Add Book
          </button>
        </div>

        {/* Published Videos Section */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-serif mb-3 text-black">Published Videos</h2>
          <table className="table-auto w-full text-left text-gray-600 text-sm mb-3 border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border">Title</th>
                <th className="px-4 py-2 border">Credit</th>
                <th className="px-4 py-2 border">Genre</th>
              </tr>
            </thead>
            <tbody>
              {videos.length > 0 ? (
                videos.map((video, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border">{video.title}</td>
                    <td className="px-4 py-2 border">{video.credit}</td>
                    <td className="px-4 py-2 border">{video.genrename}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-center py-4">No published videos yet.</td>
                </tr>
              )}
            </tbody>
          </table>
          <button
            className="bg-yellow-500 text-white px-4 py-2 rounded-lg w-full"
            onClick={() => router.push('/publisher/addvideo')}
          >
            + Add Video
          </button>
        </div>
      </div>
    </div>
  );
}
