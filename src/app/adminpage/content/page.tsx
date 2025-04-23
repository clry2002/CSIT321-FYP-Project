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
  const [allContent, setAllContent] = useState<TransformedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState<TransformedContent | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [filters, setFilters] = useState({
    contentType: 'all', // 'all', 'book', 'video'
    publisher: 'all',
    genre: 'all',
    minAge: 'all',
    status: 'all' // 'all', 'approved', 'suspended'
  });
  const [genres, setGenres] = useState<string[]>([]);
  const [publishers, setPublishers] = useState<string[]>([]);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<TransformedContent | null>(null);

  useEffect(() => {
    fetchGenres();
    fetchPublishers();
    if (activeTab === 'pending') {
      fetchPendingContent();
    } else {
      fetchAllContent();
    }
  }, [activeTab]);

  const fetchGenres = async () => {
    try {
      const { data, error } = await supabase
        .from('temp_genre')
        .select('genrename')
        .order('genrename');

      if (error) throw error;
      setGenres(data.map(g => g.genrename));
    } catch (err) {
      console.error('Error fetching genres:', err);
    }
  };

  const fetchPublishers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_account')
        .select('fullname')
        .eq('upid', 1)  // upid = 1 for publishers
        .order('fullname');

      if (error) throw error;
      setPublishers(data.map(p => p.fullname));
    } catch (err) {
      console.error('Error fetching publishers:', err);
    }
  };

  const fetchPendingContent = async () => {
    try {
      const { data, error } = await supabase
        .from('temp_content')
        .select(`
          *,
          publisher:uaid_publisher(fullname, username),
          genre:temp_contentgenres(
            temp_genre(genrename)
          )
        `)
        .eq('status', 'pending');

      if (error) throw error;

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

  const fetchAllContent = async () => {
    try {
      const { data, error } = await supabase
        .from('temp_content')
        .select(`
          *,
          publisher:uaid_publisher(fullname, username),
          genre:temp_contentgenres(
            temp_genre(genrename)
          )
        `)
        .neq('status', 'pending')
        .neq('status', 'denied');

      if (error) throw error;

      const transformedData: TransformedContent[] = (data as RawContentData[]).map((item) => ({
        ...item,
        genre: {
          genrename: item.genre[0]?.temp_genre?.genrename || 'Unknown'
        }
      }));

      setAllContent(transformedData);
    } catch (err) {
      console.error('Error fetching all content:', err);
      setError('Failed to load content');
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

  const handleSuspend = async (content: TransformedContent) => {
    if (!suspendReason.trim()) {
      setError('Please provide a reason for suspending the content');
      return;
    }

    try {
      const { error } = await supabase
        .from('temp_content')
        .update({ 
          status: 'suspended',
          denyreason: suspendReason
        })
        .eq('cid', content.cid);

      if (error) throw error;

      setShowSuccessMessage('Content suspended successfully');
      setTimeout(() => setShowSuccessMessage(''), 3000);
      setSuspendReason('');
      setShowSuspendModal(false);
      setSelectedContent(null);
      fetchAllContent();
    } catch (err) {
      console.error('Error suspending content:', err);
      setError('Failed to suspend content');
    }
  };

  const handleRevertSuspension = async (content: TransformedContent) => {
    try {
      const { error } = await supabase
        .from('temp_content')
        .update({ 
          status: 'approved',
          denyreason: null
        })
        .eq('cid', content.cid);

      if (error) throw error;

      setShowSuccessMessage('Content suspension reverted successfully');
      setTimeout(() => setShowSuccessMessage(''), 3000);
      fetchAllContent();
    } catch (err) {
      console.error('Error reverting suspension:', err);
      setError('Failed to revert suspension');
    }
  };

  const handleDeleteContent = async (content: TransformedContent) => {
    try {
      const { error } = await supabase
        .from('temp_content')
        .delete()
        .eq('cid', content.cid);

      if (error) throw error;

      setShowSuccessMessage('Content deleted successfully');
      setTimeout(() => setShowSuccessMessage(''), 3000);
      setShowDeleteModal(false);
      setContentToDelete(null);
      fetchAllContent();
    } catch (err) {
      console.error('Error deleting content:', err);
      setError('Failed to delete content');
    }
  };

  const filteredContent = allContent.filter(content => {
    const matchesSearch = 
      content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      content.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      content.publisher.fullname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      content.genre.genrename.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesContentType =
      filters.contentType === 'all' ||
      (filters.contentType === 'book' && content.cfid === 2) ||
      (filters.contentType === 'video' && content.cfid === 1);

    const matchesPublisher =
      filters.publisher === 'all' ||
      content.publisher.fullname === filters.publisher;

    const matchesGenre = 
      filters.genre === 'all' || 
      content.genre.genrename === filters.genre;

    const matchesAge = 
      filters.minAge === 'all' || 
      content.minimumage === parseInt(filters.minAge);

    const matchesStatus =
      filters.status === 'all' ||
      content.status === filters.status;

    return matchesSearch && matchesContentType && matchesPublisher && matchesGenre && matchesAge && matchesStatus;
  });

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
          <div className="flex items-center">
            <button
              onClick={() => router.push('/adminpage')}
              className="text-sm text-gray-400 hover:text-white font-medium mr-12 rounded-full px-4 py-2 hover:bg-gray-800"
            >
              Back to Home
            </button>
            <button
              onClick={() => router.push('/')}
              className="text-gray-400 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs and Search */}
      <div className="flex justify-between items-center py-4 bg-gray-900 border-b border-gray-800 px-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-2 rounded-full ${
              activeTab === 'pending' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-2 rounded-full ${
              activeTab === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            All Content
          </button>
        </div>
        {activeTab === 'all' && (
          <div className="flex items-center space-x-4 flex-1 max-w-3xl ml-4">
            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="px-6 py-2 bg-gray-800 rounded-full text-white hover:bg-gray-700 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
              </button>
              {showFilterDropdown && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-lg z-50">
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Content Type</label>
                      <select
                        value={filters.contentType}
                        onChange={(e) => setFilters({...filters, contentType: e.target.value})}
                        className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="all">All Types</option>
                        <option value="book">Books</option>
                        <option value="video">Videos</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Publisher</label>
                      <select
                        value={filters.publisher}
                        onChange={(e) => setFilters({...filters, publisher: e.target.value})}
                        className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="all">All Publishers</option>
                        {publishers.map((publisher) => (
                          <option key={publisher} value={publisher}>{publisher}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters({...filters, status: e.target.value})}
                        className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="all">All Status</option>
                        <option value="approved">Approved</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Genre</label>
                      <select
                        value={filters.genre}
                        onChange={(e) => setFilters({...filters, genre: e.target.value})}
                        className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="all">All Genres</option>
                        {genres.map((genre) => (
                          <option key={genre} value={genre}>{genre}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Minimum Age</label>
                      <select
                        value={filters.minAge}
                        onChange={(e) => setFilters({...filters, minAge: e.target.value})}
                        className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="all">All Ages</option>
                        {[3,4,5,6,7,8,9,10,11,12,13].map((age) => (
                          <option key={age} value={age}>{age} years</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 rounded-lg text-white placeholder-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
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
        ) : activeTab === 'pending' ? (
          pendingContent.length === 0 ? (
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
                        <span className={`px-3 py-1 rounded-lg text-sm ${
                          content.cfid === 1 ? 'bg-purple-900 text-purple-200' : 'bg-blue-900 text-blue-200'
                        }`}>
                          {content.cfid === 1 ? 'Video' : 'Book'}
                        </span>
                      </div>
                      <p className="text-gray-400 mb-4">
                        <span className="font-medium">Credits: </span>
                        {content.credit}
                      </p>
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
                      <div className="mb-6">
                        <p className="text-gray-400 font-medium mb-2">Description:</p>
                        <p className="text-gray-300">{content.description}</p>
                      </div>
                      <div className="flex space-x-4">
                        <button
                          onClick={() => handlePreview(content)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full"
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => handleApprove(content)}
                          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setSelectedContent(content);
                            setShowRejectModal(true);
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredContent.map((content) => (
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
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-lg text-sm ${
                          content.cfid === 1 ? 'bg-purple-900 text-purple-200' : 'bg-blue-900 text-blue-200'
                        }`}>
                          {content.cfid === 1 ? 'Video' : 'Book'}
                        </span>
                        {content.status === 'suspended' && (
                          <span className="px-3 py-1 rounded-lg text-sm bg-red-900 text-red-200">
                            Suspended
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-400 mb-4">
                      <span className="font-medium">Credits: </span>
                      {content.credit}
                    </p>
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
                    <div className="mb-6">
                      <p className="text-gray-400 font-medium mb-2">Description:</p>
                      <p className="text-gray-300">{content.description}</p>
                    </div>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => handlePreview(content)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full"
                      >
                        Preview
                      </button>
                      {content.status === 'suspended' ? (
                        <button
                          onClick={() => handleRevertSuspension(content)}
                          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full"
                        >
                          Revert Suspension
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedContent(content);
                            setShowSuspendModal(true);
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full"
                        >
                          Suspend
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Suspend Modal */}
      {showSuspendModal && selectedContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg w-[600px]">
            <h3 className="text-xl font-bold mb-4">Suspend Content</h3>
            <p className="text-gray-400 mb-4">
              Please provide a reason for suspending &quot;{selectedContent.title}&quot;
            </p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Enter reason for suspension..."
              className="w-full h-32 p-3 mb-4 bg-gray-800 text-white rounded-lg resize-none"
            />
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowSuspendModal(false);
                  setSelectedContent(null);
                  setSuspendReason('');
                }}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-full"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedContent) {
                    handleSuspend(selectedContent);
                  }
                }}
                disabled={!suspendReason.trim()}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suspend
              </button>
            </div>
          </div>
        </div>
      )}

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
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-full"
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
                className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Deny
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && contentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg w-[600px]">
            <h3 className="text-xl font-bold mb-4">Delete Content</h3>
            <p className="text-gray-400 mb-4">
              Are you sure you want to delete &quot;{contentToDelete.title}&quot;? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setContentToDelete(null);
                }}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-full"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteContent(contentToDelete)}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-full"
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