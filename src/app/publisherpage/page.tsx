'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Content {
  cid: number;
  title: string;
  credit: string;
  genrename: string;
  status: string;
  denyreason?: string;
}

interface RawContent {
  cid: number;
  title: string;
  credit: string;
  cfid: number;
  status: string;
  denyreason?: string;
  genre: Array<{
    temp_genre: {
      genrename: string;
    };
  }>;
}

export default function PublisherPage() {
  const router = useRouter();

  const [books, setBooks] = useState<Content[]>([]);
  const [videos, setVideos] = useState<Content[]>([]);
  const [uaidPublisher, setUaidPublisher] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [publisherName, setPublisherName] = useState<string>('');
  const [showDenyReasonModal, setShowDenyReasonModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);

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
        .select('id, fullname')
        .eq('user_id', user.id)
        .single();

      if (userAccountError) {
        console.error('Error fetching user account data:', userAccountError);
        return;
      }

      setUaidPublisher(userAccountData?.id || null);
      setPublisherName(userAccountData?.fullname || 'Publisher');
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
        // Fetch content with genre information
        const { data, error } = await supabase
          .from('temp_content')
          .select(`
            *,
            genre:temp_contentgenres(
              temp_genre(genrename)
            )
          `)
          .eq('uaid_publisher', uaidPublisher);

        if (error) {
          console.error('Error fetching content:', error.message);
          return;
        }

        console.log('Fetched content:', data);

        // Transform the data to match our interface
        const transformedData = (data as RawContent[]).map((item) => ({
          cid: item.cid,
          title: item.title,
          credit: item.credit,
          cfid: item.cfid,
          status: item.status,
          denyreason: item.denyreason,
          genrename: item.genre[0]?.temp_genre?.genrename || 'Unknown'
        }));

        const filteredBooks = transformedData.filter((content) => content.cfid === 2);
        const filteredVideos = transformedData.filter((content) => content.cfid === 1);

        const formattedBooks: Content[] = filteredBooks.map((content) => ({
          cid: content.cid,
          title: content.title,
          credit: content.credit,
          genrename: content.genrename,
          status: content.status,
          denyreason: content.denyreason,
        }));
        const formattedVideos: Content[] = filteredVideos.map((content) => ({
          cid: content.cid,
          title: content.title,
          credit: content.credit,
          genrename: content.genrename,
          status: content.status,
          denyreason: content.denyreason,
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
    <div className="min-h-screen bg-gray-100 py-6">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header Section */}
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-semibold text-gray-900">
                        Welcome, <span className="font-serif">{publisherName}</span>!
                    </h1>
                    <p className="text-gray-500 mt-1">Manage your published content and analytics.</p>
                </div>
                <div className="space-x-3">
                    <button
                        className="bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2 px-4 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-opacity-50"
                        onClick={() => router.push('/publisher/settings')}
                    >
                        Settings
                    </button>
                    <button
                        className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50"
                        onClick={() => router.push('/logout')}
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* Analytics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white shadow-md rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Books Analytics</h2>
                    <p className="text-gray-600 mb-4">Track the performance of your published books.</p>
                    <button
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
                        onClick={() => router.push('/publisher/book-analytics')}
                    >
                        View Books Analytics
                    </button>
                </div>
                <div className="bg-white shadow-md rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Videos Analytics</h2>
                    <p className="text-gray-600 mb-4">Monitor the engagement and views of your videos.</p>
                    <button
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
                        onClick={() => router.push('/publisher/video-analytics')}
                    >
                        View Videos Analytics
                    </button>
                </div>
            </div>

            {/* Published Books Section */}
            <div className="bg-white shadow-md rounded-lg p-6 mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Published Books</h2>
                    <button
                        className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
                        onClick={() => router.push('/publisher/addbook')}
                    >
                        + Add Book
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full leading-normal">
                        <thead>
                            <tr className="bg-gray-100 text-gray-700 uppercase text-sm font-semibold">
                                <th className="py-3 px-6 text-left">Title</th>
                                <th className="py-3 px-6 text-left">Credit</th>
                                <th className="py-3 px-6 text-left">Genre</th>
                                <th className="py-3 px-6 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-600 text-sm">
                            {books.length > 0 ? (
                                books.map((book, index) => (
                                    <tr
                                        key={index}
                                        className={`hover:bg-gray-50 cursor-pointer ${
                                            book.status === 'pending'
                                                ? 'bg-yellow-50'
                                                : book.status === 'denied'
                                                ? 'bg-red-50'
                                                : book.status === 'approved'
                                                ? 'bg-green-50'
                                                : ''
                                        }`}
                                        onClick={() => router.push(`/publisherbookdetail/${book.cid}`)}
                                    >
                                        <td className="py-3 px-6">
                                            {book.title}
                                            {book.status === 'pending' && (
                                                <span className="ml-2 text-yellow-600 font-medium">(Pending)</span>
                                            )}
                                            {book.status === 'denied' && (
                                                <span
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedContent(book);
                                                        setShowDenyReasonModal(true);
                                                    }}
                                                    className="ml-2 text-red-600 font-medium cursor-pointer hover:underline"
                                                >
                                                    (Denied)
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-6">{book.credit}</td>
                                        <td className="py-3 px-6">{book.genrename}</td>
                                        <td className="py-3 px-6 text-center">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    book.status === 'pending'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : book.status === 'denied'
                                                        ? 'bg-red-100 text-red-800'
                                                        : book.status === 'approved'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}
                                            >
                                                {book.status.charAt(0).toUpperCase() + book.status.slice(1)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="py-6 px-6 text-center">No books published yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Published Videos Section */}
            <div className="bg-white shadow-md rounded-lg p-6 mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Published Videos</h2>
                    <button
                        className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50"
                        onClick={() => router.push('/publisher/addvideo')}
                    >
                        + Add Video
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full leading-normal">
                        <thead>
                            <tr className="bg-gray-100 text-gray-700 uppercase text-sm font-semibold">
                                <th className="py-3 px-6 text-left">Title</th>
                                <th className="py-3 px-6 text-left">Credit</th>
                                <th className="py-3 px-6 text-left">Genre</th>
                                <th className="py-3 px-6 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-600 text-sm">
                            {videos.length > 0 ? (
                                videos.map((video, index) => (
                                    <tr
                                        key={index}
                                        className={`hover:bg-gray-50 cursor-pointer ${
                                            video.status === 'pending'
                                                ? 'bg-yellow-50'
                                                : video.status === 'denied'
                                                ? 'bg-red-50'
                                                : video.status === 'approved'
                                                ? 'bg-green-50'
                                                : ''
                                        }`}
                                        onClick={() => router.push(`/publishervideodetail/${video.cid}`)}
                                    >
                                        <td className="py-3 px-6">
                                            {video.title}
                                            {video.status === 'pending' && (
                                                <span className="ml-2 text-yellow-600 font-medium">(Pending)</span>
                                            )}
                                            {video.status === 'denied' && (
                                                <span
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedContent(video);
                                                        setShowDenyReasonModal(true);
                                                    }}
                                                    className="ml-2 text-red-600 font-medium cursor-pointer hover:underline"
                                                >
                                                    (Denied)
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-6">{video.credit}</td>
                                        <td className="py-3 px-6">{video.genrename}</td>
                                        <td className="py-3 px-6 text-center">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    video.status === 'pending'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : video.status === 'denied'
                                                        ? 'bg-red-100 text-red-800'
                                                        : video.status === 'approved'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}
                                            >
                                                {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="py-6 px-6 text-center">No videos published yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* Deny Reason Modal */}
        {showDenyReasonModal && selectedContent && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Content Denied</h3>
                    <p className="text-gray-600 mb-4">
                        <span className="font-semibold">Title:</span> {selectedContent.title}
                    </p>
                    <div className="bg-gray-100 p-4 rounded-lg mb-4">
                        <p className="text-gray-900 font-semibold mb-2">Reason for denial:</p>
                        <p className="text-gray-700">{selectedContent.denyreason}</p>
                    </div>
                    <div className="flex justify-end">
                        <button
                            onClick={() => {
                                setShowDenyReasonModal(false);
                                setSelectedContent(null);
                            }}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
);
}