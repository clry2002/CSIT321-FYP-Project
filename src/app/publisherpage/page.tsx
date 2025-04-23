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
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<Content | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

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

  const handleDeleteContent = async (content: Content) => {
    try {
      const { error } = await supabase
        .from('temp_content')
        .delete()
        .eq('cid', content.cid);

      if (error) throw error;

      // Update the local state to remove the deleted content
      setBooks(books.filter(b => b.cid !== content.cid));
      setVideos(videos.filter(v => v.cid !== content.cid));
      
      setDeleteSuccess(`Successfully deleted ${content.title}`);
      setTimeout(() => setDeleteSuccess(null), 3000);
      setShowDeleteConfirmModal(false);
      setContentToDelete(null);
    } catch (err) {
      console.error('Error deleting content:', err);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6 px-6 py-5">
        <h1 className="text-2xl font-serif text-black">Welcome, {publisherName}!</h1>
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

      {/* Success Message */}
      {deleteSuccess && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-out">
          {deleteSuccess}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 space-y-5">
        
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
                  <tr 
                    key={index} 
                    className={`hover:bg-opacity-90 ${
                      book.status === 'pending' 
                        ? 'bg-yellow-100' 
                        : book.status === 'denied'
                        ? 'bg-red-100'
                        : book.status === 'suspended'
                        ? 'bg-red-800'
                        : book.status === 'approved'
                        ? 'bg-green-100'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className={`px-4 py-2 border ${
                      book.status === 'suspended' ? 'text-red-100' : ''
                    }`}>
                      <span
                        onClick={() => router.push(`/publisherbookdetail/${book.cid}`)}
                        className={`cursor-pointer hover:underline ${
                          book.status === 'pending' 
                            ? 'text-yellow-700' 
                            : book.status === 'denied'
                            ? 'text-red-700'
                            : book.status === 'suspended'
                            ? 'text-red-100'
                            : book.status === 'approved'
                            ? 'text-green-700'
                            : 'text-gray-600'
                        }`}
                      >
                        {book.title}
                        {book.status === 'pending' && (
                          <span className="ml-2 text-yellow-700 font-medium">(Pending)</span>
                        )}
                        {book.status === 'denied' && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedContent(book);
                              setShowDenyReasonModal(true);
                            }}
                            className="ml-2 text-red-700 font-medium cursor-pointer hover:underline"
                          >
                            (Denied)
                          </span>
                        )}
                        {book.status === 'suspended' && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedContent(book);
                              setShowDenyReasonModal(true);
                            }}
                            className="ml-2 text-red-100 font-medium cursor-pointer hover:underline"
                          >
                            (Suspended)
                          </span>
                        )}
                      </span>
                    </td>
                    <td className={`px-4 py-2 border ${
                      book.status === 'suspended' ? 'text-red-100' : book.status === 'pending' 
                        ? 'text-yellow-700' 
                        : book.status === 'denied'
                        ? 'text-red-700'
                        : book.status === 'approved'
                        ? 'text-green-700'
                        : 'text-gray-600'
                    }`}>
                      {book.credit}
                    </td>
                    <td className={`px-4 py-2 border ${
                      book.status === 'suspended' ? 'text-red-100' : book.status === 'pending' 
                        ? 'text-yellow-700' 
                        : book.status === 'denied'
                        ? 'text-red-700'
                        : book.status === 'approved'
                        ? 'text-green-700'
                        : 'text-gray-600'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span>{book.genrename}</span>
                        {book.status === 'denied' && (
                          <button
                            onClick={() => {
                              setContentToDelete(book);
                              setShowDeleteConfirmModal(true);
                            }}
                            className="text-red-600 hover:text-red-800 ml-2"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-center py-4">No books yet.</td>
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
                  <tr 
                    key={index} 
                    className={`hover:bg-opacity-90 ${
                      video.status === 'pending' 
                        ? 'bg-yellow-100' 
                        : video.status === 'denied'
                        ? 'bg-red-100'
                        : video.status === 'suspended'
                        ? 'bg-red-800'
                        : video.status === 'approved'
                        ? 'bg-green-100'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className={`px-4 py-2 border ${
                      video.status === 'suspended' ? 'text-red-100' : ''
                    }`}>
                      <span
                        onClick={() => router.push(`/publishervideodetail/${video.cid}`)}
                        className={`cursor-pointer hover:underline ${
                          video.status === 'pending' 
                            ? 'text-yellow-700' 
                            : video.status === 'denied'
                            ? 'text-red-700'
                            : video.status === 'suspended'
                            ? 'text-red-100'
                            : video.status === 'approved'
                            ? 'text-green-700'
                            : 'text-gray-600'
                        }`}
                      >
                        {video.title}
                        {video.status === 'pending' && (
                          <span className="ml-2 text-yellow-700 font-medium">(Pending)</span>
                        )}
                        {video.status === 'denied' && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedContent(video);
                              setShowDenyReasonModal(true);
                            }}
                            className="ml-2 text-red-700 font-medium cursor-pointer hover:underline"
                          >
                            (Denied)
                          </span>
                        )}
                        {video.status === 'suspended' && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedContent(video);
                              setShowDenyReasonModal(true);
                            }}
                            className="ml-2 text-red-100 font-medium cursor-pointer hover:underline"
                          >
                            (Suspended)
                          </span>
                        )}
                      </span>
                    </td>
                    <td className={`px-4 py-2 border ${
                      video.status === 'suspended' ? 'text-red-100' : video.status === 'pending' 
                        ? 'text-yellow-700' 
                        : video.status === 'denied'
                        ? 'text-red-700'
                        : video.status === 'approved'
                        ? 'text-green-700'
                        : 'text-gray-600'
                    }`}>
                      {video.credit}
                    </td>
                    <td className={`px-4 py-2 border ${
                      video.status === 'suspended' ? 'text-red-100' : video.status === 'pending' 
                        ? 'text-yellow-700' 
                        : video.status === 'denied'
                        ? 'text-red-700'
                        : video.status === 'approved'
                        ? 'text-green-700'
                        : 'text-gray-600'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span>{video.genrename}</span>
                        {video.status === 'denied' && (
                          <button
                            onClick={() => {
                              setContentToDelete(video);
                              setShowDeleteConfirmModal(true);
                            }}
                            className="text-red-600 hover:text-red-800 ml-2"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-center py-4">No videos yet.</td>
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

      {/* Deny Reason Modal */}
      {showDenyReasonModal && selectedContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-[500px]">
            <h3 className="text-xl font-bold mb-4 text-gray-900">
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
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
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
          <div className="bg-white p-6 rounded-lg w-[500px]">
            <h3 className="text-xl font-bold mb-4 text-gray-900">Delete Content</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete &quot;{contentToDelete.title}&quot;? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setContentToDelete(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteContent(contentToDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
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
