'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

interface RawContentData {
  cid: number;
  cfid: number;
  title: string;
  description: string;
  coverimage: string | null;
  contenturl: string;
  credit: string;
  minimumage: number;
  createddate: string;
  status: string;
  statuscomment?: string;
  publisher: {
    fullname: string;
    username: string;
  };
  genre: Array<{
    temp_genre: {
      genrename: string;
    };
  }>;
}

interface TransformedContent {
  cid: number;
  cfid: number;
  title: string;
  description: string;
  coverimage: string | null;
  contenturl: string;
  credit: string;
  minimumage: number;
  createddate: string;
  status: string;
  statuscomment?: string;
  publisher: {
    fullname: string;
    username: string;
  };
  genre: {
    genrename: string;
  };
}

export default function ContentReviewPage() {
  const router = useRouter();
  const [pendingContent, setPendingContent] = useState<TransformedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState<TransformedContent | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState<'all' | 'books' | 'videos'>('all');

  useEffect(() => {
    fetchPendingContent();
  }, [contentTypeFilter]);

  const fetchPendingContent = async () => {
    try {
      let query = supabase
        .from('temp_content')
        .select(`
          *,
          publisher:uaid_publisher(fullname, username),
          genre:temp_contentgenres(
            temp_genre(genrename)
          )
        `)
        .eq('status', 'pending');

      if (contentTypeFilter === 'books') {
        query = query.eq('cfid', 2);
      } else if (contentTypeFilter === 'videos') {
        query = query.eq('cfid', 1);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform the data to match our interface
      const transformedData: TransformedContent[] = (data as RawContentData[]).map((item) => ({
        ...item,
        genre: {
          genrename: item.genre[0]?.temp_genre?.genrename || 'Unknown'
        }
      }));

      setPendingContent(transformedData);
    } catch (err) {
      console.error('Error fetching pending content:', err);
      setError('Failed to load pending content');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (content: TransformedContent) => {
    try {
      const { error } = await supabase
        .from('temp_content')
        .update({ status: 'approved' })
        .eq('cid', content.cid);

      if (error) throw error;

      setShowSuccessMessage('Content approved successfully');
      setTimeout(() => setShowSuccessMessage(''), 3000);
      fetchPendingContent();
    } catch (err) {
      console.error('Error approving content:', err);
      setError('Failed to approve content');
    }
  };

  const handleReject = async (content: TransformedContent) => {
    if (!denyReason.trim()) {
      setError('Please provide a reason for denying the content');
      return;
    }

    try {
      const { error } = await supabase
        .from('temp_content')
        .update({ 
          status: 'denied',
          denyreason: denyReason
        })
        .eq('cid', content.cid);

      if (error) throw error;

      setShowSuccessMessage('Content denied successfully');
      setTimeout(() => setShowSuccessMessage(''), 3000);
      setDenyReason('');
      fetchPendingContent();
    } catch (err) {
      console.error('Error denying content:', err);
      setError('Failed to deny content');
    }
  };

  const handlePreview = (content: TransformedContent) => {
    if (content.cfid === 1) { // Video
      window.open(content.contenturl, '_blank');
    } else { // Book
      window.open(content.contenturl, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="p-4 border-b border-gray-800 bg-gray-900">
        <div className="flex justify-between items-center">
          <div className="flex items-center cursor-pointer" onClick={() => router.push('/adminpage')}>
            <Image
              src="/logo2.png"
              alt="Logo"
              width={40}
              height={40}
              className="mr-2"
            />
            <h1 className="text-2xl font-bold">Content Review</h1>
          </div>
          <div className="flex items-center space-x-6">
            <button
              onClick={() => router.push('/adminpage')}
              className="text-sm text-gray-400 hover:text-white font-medium"
            >
              Back to Home
            </button>
            <button
              onClick={() => router.push('/')}
              className="text-sm text-gray-400 hover:text-white font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Filter Buttons */}
      <div className="flex justify-center items-center py-4 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setContentTypeFilter('all')}
            className={`px-4 py-2 rounded-lg ${
              contentTypeFilter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setContentTypeFilter('books')}
            className={`px-4 py-2 rounded-lg ${
              contentTypeFilter === 'books' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Books
          </button>
          <button
            onClick={() => setContentTypeFilter('videos')}
            className={`px-4 py-2 rounded-lg ${
              contentTypeFilter === 'videos' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Videos
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {showSuccessMessage && (
          <div className="mb-4 p-4 bg-green-600 text-white rounded-lg">
            {showSuccessMessage}
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-600 text-white rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : pendingContent.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No pending content to review
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {pendingContent.map((content) => (
              <div key={content.cid} className="bg-gray-900 rounded-lg p-6">
                <div className="flex items-start space-x-6">
                  {content.cfid === 2 && content.coverimage ? (
                    <div className="w-48 h-64 relative flex-shrink-0">
                      <Image
                        src={content.coverimage}
                        alt={content.title}
                        layout="fill"
                        objectFit="cover"
                        className="rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="w-48 h-64 flex-shrink-0 bg-gray-800 rounded-lg flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-grow">
                    <div className="flex justify-between items-start mb-2">
                      <h2 className="text-2xl font-bold">{content.title}</h2>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        content.cfid === 1 ? 'bg-purple-900 text-purple-200' : 'bg-blue-900 text-blue-200'
                      }`}>
                        {content.cfid === 1 ? 'Video' : 'Book'}
                      </span>
                    </div>
                    <p className="text-gray-400 mb-4">by {content.credit}</p>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <span className="text-gray-400">Publisher:</span>
                        <span className="ml-2">{content.publisher.fullname}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Genre:</span>
                        <span className="ml-2">{content.genre.genrename}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Minimum Age:</span>
                        <span className="ml-2">{content.minimumage}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Submitted:</span>
                        <span className="ml-2">
                          {new Date(content.createddate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-300 mb-6">{content.description}</p>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => handlePreview(content)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                      >
                        Preview {content.cfid === 1 ? 'Video' : 'Content'}
                      </button>
                      <button
                        onClick={() => handleApprove(content)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setSelectedContent(content);
                          setShowRejectModal(true);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg w-[600px]">
            <h3 className="text-xl font-bold mb-4">Deny Content</h3>
            <p className="text-gray-400 mb-4">
              Please provide a reason for denying &quot;{selectedContent?.title}&quot;
            </p>
            <textarea
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              placeholder="Enter reason for denial..."
              className="w-full h-32 p-3 mb-4 bg-gray-800 text-white rounded-lg resize-none"
            />
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedContent(null);
                  setDenyReason('');
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedContent) {
                    handleReject(selectedContent);
                    setShowRejectModal(false);
                    setSelectedContent(null);
                  }
                }}
                disabled={!denyReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Deny
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 