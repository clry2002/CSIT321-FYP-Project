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
  const [bookSearchTerm, setBookSearchTerm] = useState('');
  const [videoSearchTerm, setVideoSearchTerm] = useState('');
  const [uaidPublisher, setUaidPublisher] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [publisherName, setPublisherName] = useState<string>('');
  const [showDenyReasonModal, setShowDenyReasonModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<Content | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [canDeleteAllContent, setCanDeleteAllContent] = useState(false);

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
    const fetchPublisherPermissions = async () => {
      try {
        // Query the profile_permissions table for the publisher permission
        const { data, error } = await supabase
          .from('profile_permissions')
          .select('active')
          .eq('upid', 1) // Publisher profile type (upid = 1)
          .eq('permission_key', 'delete_own_content')
          .single();

        if (error && error.code !== 'PGRST116') {
          // Not found error
          throw error;
        }
        
        // If the permission exists and is active, enable content deletion
        setCanDeleteAllContent(data?.active || false);
      } catch (err) {
        console.error('Error fetching publisher permissions:', err);
      }
    };

    fetchPublisherPermissions();
  }, []);

  useEffect(() => {
    const fetchPublishedContent = async () => {
      if (!uaidPublisher) {
        console.error('Publisher account ID (uaidPublisher) is null');
        return;
      }

      try {
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

  const handleDeleteContent = async (content: Content) => {
    try {
      // First, delete any bookmarks for this content
      const { error: bookmarkError } = await supabase
        .from('temp_bookmark')
        .delete()
        .eq('cid', content.cid);

      if (bookmarkError) {
        console.error('Error deleting bookmarks:', bookmarkError);
        throw bookmarkError;
      }

      // Then delete the content itself
      const { error } = await supabase
        .from('temp_content')
        .delete()
        .eq('cid', content.cid);

      if (error) throw error;

      setBooks(books.filter(b => b.cid !== content.cid));
      setVideos(videos.filter(v => v.cid !== content.cid));
      
      setDeleteSuccess(`Successfully deleted ${content.title}`);
      setTimeout(() => setDeleteSuccess(null), 3000);
      setShowDeleteConfirmModal(false);
      setContentToDelete(null);
    } catch (err) {
      console.error('Error deleting content:', err);
      setDeleteSuccess(`Failed to delete ${content.title}`);
      setTimeout(() => setDeleteSuccess(null), 3000);
    }
  };

  // Add these computed values before the return statement
  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(bookSearchTerm.toLowerCase())
  );

  const filteredVideos = videos.filter(video => 
    video.title.toLowerCase().includes(videoSearchTerm.toLowerCase())
  );

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

        {/* Success Message */}
        {deleteSuccess && (
          <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-out">
            {deleteSuccess}
          </div>
        )}

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
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search books..."
                  value={bookSearchTerm}
                  onChange={(e) => setBookSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-gray-900"
                />
                <svg
                  className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <button
                className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
                onClick={() => router.push('/publisher/addbook')}
              >
                + Add Book
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full leading-normal">
              <thead>
                <tr className="bg-gray-100 text-gray-700 uppercase text-sm font-semibold">
                  <th className="py-3 px-6 text-left">Title</th>
                  <th className="py-3 px-6 text-left">Credit</th>
                  <th className="py-3 px-6 text-left">Genre</th>
                  <th className="py-3 px-6 text-center">Status</th>
                  <th className="py-3 px-6 text-center"></th>
                </tr>
              </thead>
              <tbody className="text-gray-600 text-sm">
                {filteredBooks.length > 0 ? (
                  filteredBooks.map((book, index) => (
                    <tr
                      key={index}
                      className={
                        book.status === 'pending'
                          ? 'bg-yellow-50'
                          : book.status === 'denied'
                          ? 'bg-red-50'
                          : book.status === 'suspended'
                          ? 'bg-red-50'
                          : book.status === 'approved'
                          ? 'bg-green-50'
                          : ''
                      }
                    >
                      <td className="py-3 px-6 cursor-pointer" onClick={() => router.push(`/publisher/bookdetail/${book.cid}`)}>
                        <span>{book.title}</span>
                      </td>
                      <td className="py-3 px-6">{book.credit}</td>
                      <td className="py-3 px-6">{book.genrename}</td>
                      <td className="py-3 px-6 text-center">
                        <span
                          onClick={() => {
                            if (book.status === 'denied' || book.status === 'suspended') {
                              setSelectedContent(book);
                              setShowDenyReasonModal(true);
                            }
                          }}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            book.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : book.status === 'denied'
                              ? 'bg-red-100 text-red-800 cursor-pointer'
                              : book.status === 'suspended'
                              ? 'bg-red-900 text-red-100 cursor-pointer'
                              : book.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {book.status === 'suspended' 
                            ? 'Suspended'
                            : book.status.charAt(0).toUpperCase() + book.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-center">
                        {(book.status === 'denied' || (canDeleteAllContent && ['pending', 'approved', 'suspended'].includes(book.status))) && (
                          <button
                            onClick={() => {
                              setContentToDelete(book);
                              setShowDeleteConfirmModal(true);
                            }}
                            className="text-red-600"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 px-6 text-center">No books published yet.</td>
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
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search videos..."
                  value={videoSearchTerm}
                  onChange={(e) => setVideoSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-gray-900"
                />
                <svg
                  className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <button
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50"
                onClick={() => router.push('/publisher/addvideo')}
              >
                + Add Video
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full leading-normal">
              <thead>
                <tr className="bg-gray-100 text-gray-700 uppercase text-sm font-semibold">
                  <th className="py-3 px-6 text-left">Title</th>
                  <th className="py-3 px-6 text-left">Credit</th>
                  <th className="py-3 px-6 text-left">Genre</th>
                  <th className="py-3 px-6 text-center">Status</th>
                  <th className="py-3 px-6 text-center"></th>
                </tr>
              </thead>
              <tbody className="text-gray-600 text-sm">
                {filteredVideos.length > 0 ? (
                  filteredVideos.map((video, index) => (
                    <tr
                      key={index}
                      className={
                        video.status === 'pending'
                          ? 'bg-yellow-50'
                          : video.status === 'denied'
                          ? 'bg-red-50'
                          : video.status === 'suspended'
                          ? 'bg-red-50'
                          : video.status === 'approved'
                          ? 'bg-green-50'
                          : ''
                      }
                    >
                      <td className="py-3 px-6 cursor-pointer" onClick={() => router.push(`/publisher/videodetail/${video.cid}`)}>
                        <span>{video.title}</span>
                      </td>
                      <td className="py-3 px-6">{video.credit}</td>
                      <td className="py-3 px-6">{video.genrename}</td>
                      <td className="py-3 px-6 text-center">
                        <span
                          onClick={() => {
                            if (video.status === 'denied' || video.status === 'suspended') {
                              setSelectedContent(video);
                              setShowDenyReasonModal(true);
                            }
                          }}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            video.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : video.status === 'denied'
                              ? 'bg-red-100 text-red-800 cursor-pointer'
                              : video.status === 'suspended'
                              ? 'bg-red-900 text-red-100 cursor-pointer'
                              : video.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {video.status === 'suspended' 
                            ? 'Suspended'
                            : video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-center">
                        {(video.status === 'denied' || (canDeleteAllContent && ['pending', 'approved', 'suspended'].includes(video.status))) && (
                          <button
                            onClick={() => {
                              setContentToDelete(video);
                              setShowDeleteConfirmModal(true);
                            }}
                            className="text-red-600"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 px-6 text-center">No videos published yet.</td>
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
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {selectedContent.status === 'suspended' ? 'Content Suspended' : 'Content Denied'}
            </h3>
            <p className="text-gray-600 mb-4">
              <span className="font-semibold">Title:</span> {selectedContent.title}
            </p>
            <div className="bg-gray-100 p-4 rounded-lg mb-4">
              <p className="text-gray-900 font-semibold mb-2">
                {selectedContent.status === 'suspended' ? 'Reason for suspension:' : 'Reason for denial:'}
              </p>
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && contentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Delete Content</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete &quot;{contentToDelete.title}&quot;? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setContentToDelete(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteContent(contentToDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}