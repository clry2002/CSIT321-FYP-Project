'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// Define proper types
interface ContentItem {
  cid: number;
  title: string;
  description?: string;
  minimumage?: number;
  contenturl?: string;
  coverimage?: string;
  cfid: number;
  status: string;
  credit?: string;
}

interface ParsedMessage {
  type: string;
  message: string;
  books?: ContentItem[];
  videos?: ContentItem[];
  genre?: string;
}

interface ChatMessage {
  chid: number;
  context: string;
  ischatbot: boolean;
  createddate: string;
}

interface UserAccount {
  fullname: string;
}

interface GroupedMessage {
  date: string;
  messages: ChatMessage[];
}

// Utility function to group messages by date
const groupMessagesByDate = (messages: ChatMessage[]): GroupedMessage[] => {
  const groups: GroupedMessage[] = [];
  
  messages.forEach((message) => {
    const messageDate = new Date(message.createddate);
    const dateString = messageDate.toDateString();
    
    const existingGroup = groups.find(group => group.date === dateString);
    if (existingGroup) {
      existingGroup.messages.push(message);
    } else {
      groups.push({
        date: dateString,
        messages: [message]
      });
    }
  });
  
  return groups;
};

// Utility function to extract YouTube video ID
const getYouTubeVideoId = (url: string): string | null => {
  try {
    if (url.includes('youtube.com/watch')) {
      const urlObj = new URL(url);
      return urlObj.searchParams.get('v');
    } else if (url.includes('youtu.be/')) {
      const parts = url.split('youtu.be/');
      if (parts.length >= 2) {
        return parts[1].split('?')[0].split('&')[0];
      }
    } else if (url.includes('youtube.com/embed/')) {
      const parts = url.split('youtube.com/embed/');
      if (parts.length >= 2) {
        return parts[1].split('?')[0].split('&')[0];
      }
    }
    return null;
  } catch {
    return null;
  }
};

// Utility function to safely parse JSON
const safeJsonParse = (text: string): ParsedMessage | null => {
  try {
    const trimmed = text.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
      return null;
    }
    
    const parsed = JSON.parse(trimmed);
    
    if (parsed && typeof parsed === 'object' && parsed.type === 'content_response') {
      return parsed as ParsedMessage;
    }
    
    return null;
  } catch {
    return null;
  }
};

// Enhanced Modal Component with credits and no "Open Original"
const ContentModal = ({ 
  isOpen, 
  onClose, 
  content, 
  type 
}: {
  isOpen: boolean;
  onClose: () => void;
  content: ContentItem | null;
  type: 'book' | 'video';
}) => {
  const [showVideo, setShowVideo] = useState(false);

  if (!isOpen || !content) return null;

  const videoId = type === 'video' && content.contenturl ? getYouTubeVideoId(content.contenturl) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold text-gray-800">
              {type === 'book' ? '📚 Book Details' : '🎬 Video Details'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            {/* Video Player or Cover/Thumbnail */}
            <div className="flex justify-center">
              {type === 'video' && videoId && showVideo ? (
                <div className="w-full max-w-3xl">
                  <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                      className="absolute top-0 left-0 w-full h-full rounded-lg"
                      src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                      title={content.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              ) : type === 'video' && content.coverimage ? (
                <div className="relative cursor-pointer" onClick={() => setShowVideo(true)}>
                  <Image
                    src={content.coverimage}
                    alt={`Thumbnail of ${content.title}`}
                    width={600}
                    height={338}
                    className="object-cover rounded shadow-lg"
                    unoptimized
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded">
                    <div className="bg-red-600 rounded-full p-4 hover:bg-red-700 transition-colors">
                      <svg className="w-12 h-12 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-sm">
                    ▶️ Click to play
                  </div>
                </div>
              ) : type === 'book' && content.coverimage ? (
                <Image
                  src={content.coverimage}
                  alt={`Cover of ${content.title}`}
                  width={300}
                  height={400}
                  className="object-cover rounded shadow-lg"
                  unoptimized
                />
              ) : (
                <div className="w-96 h-60 bg-gray-200 rounded flex items-center justify-center">
                  <span className="text-gray-500">No {type === 'book' ? 'Cover' : 'Thumbnail'}</span>
                </div>
              )}
            </div>

            {/* Content Details */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-800">{content.title}</h3>
              
              {content.description && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Description:</h4>
                  <p className="text-gray-600 leading-relaxed">{content.description}</p>
                </div>
              )}

              {content.minimumage && (
                <div className="flex items-center space-x-2">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    Ages {content.minimumage}+
                  </span>
                </div>
              )}

              {content.credit && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-700 mb-2 flex items-center">
                    <span className="mr-2">👥</span>
                    Credits:
                  </h4>
                  <p className="text-gray-600 leading-relaxed">{content.credit}</p>
                </div>
              )}

              <div className="pt-4 border-t flex flex-wrap gap-3">
                {type === 'video' && videoId && !showVideo && (
                  <button
                    onClick={() => setShowVideo(true)}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                  >
                    <span>▶️</span>
                    <span>Watch Video</span>
                  </button>
                )}

                {type === 'video' && showVideo && (
                  <button
                    onClick={() => setShowVideo(false)}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                  >
                    <span>📱</span>
                    <span>Show Thumbnail</span>
                  </button>
                )}

                {type === 'book' && content.contenturl && (
                  <a
                    href={content.contenturl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <span>📖</span>
                    <span>Read Book</span>
                  </a>
                )}

                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Date Selector Component
const DateSelector = ({ 
  groupedMessages, 
  selectedDate, 
  formatDate, 
  onDateSelect 
}: {
  groupedMessages: GroupedMessage[];
  selectedDate: string;
  formatDate: (date: string) => string;
  onDateSelect: (date: string) => void;
}) => {
  return (
    <div className="mb-6">
      <label htmlFor="date-select" className="block text-sm font-medium text-gray-700 mb-2">
        Select Date:
      </label>
      <select
        id="date-select"
        value={selectedDate}
        onChange={(e) => onDateSelect(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-black"
      >
        {groupedMessages.map((group) => (
          <option key={group.date} value={group.date}>
            {formatDate(group.date)}
          </option>
        ))}
      </select>
    </div>
  );
};

// Enhanced Message Display
const ParentMessageDisplay = ({ message }: { message: ChatMessage }) => {
  const [modalContent, setModalContent] = useState<ContentItem | null>(null);
  const [modalType, setModalType] = useState<'book' | 'video'>('book');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (content: ContentItem, type: 'book' | 'video') => {
    setModalContent(content);
    setModalType(type);
    setIsModalOpen(true);
  };

  const renderBotMessage = () => {
    const parsed = safeJsonParse(message.context);
    
    if (parsed && parsed.type === 'content_response') {
      return (
        <>
          <div className="space-y-3">
            <p className="break-words">{parsed.message}</p>
            
            {parsed.books && parsed.books.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold">📚 Books:</h4>
                {parsed.books.map((book: ContentItem, index: number) => (
                  <div key={index} className="bg-white p-3 rounded shadow-sm border">
                    <div className="flex">
                      {book.coverimage ? (
                        <Image
                          src={book.coverimage}
                          alt={`Cover of ${book.title}`}
                          width={48}
                          height={64}
                          className="object-cover rounded mr-3"
                          unoptimized
                        />
                      ) : (
                        <div className="w-12 h-16 bg-gray-200 rounded mr-3 flex items-center justify-center">
                          <span className="text-xs text-gray-500">📖</span>
                        </div>
                      )}
                      <div className="flex-grow">
                        <h5 className="font-semibold text-sm">{book.title}</h5>
                        {book.minimumage && (
                          <p className="text-xs text-gray-600 mt-1">Age {book.minimumage}+</p>
                        )}
                        {book.credit && (
                          <p className="text-xs text-gray-500 mt-1">
                            👥 {book.credit.length > 50 ? `${book.credit.substring(0, 50)}...` : book.credit}
                          </p>
                        )}
                        <button
                          onClick={() => openModal(book, 'book')}
                          className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {parsed.videos && parsed.videos.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold">🎬 Videos:</h4>
                {parsed.videos.map((video: ContentItem, index: number) => (
                  <div key={index} className="bg-white p-3 rounded shadow-sm border">
                    <div className="flex">
                      {video.coverimage ? (
                        <div className="relative mr-3">
                          <Image
                            src={video.coverimage}
                            alt={`Thumbnail of ${video.title}`}
                            width={64}
                            height={48}
                            className="object-cover rounded"
                            unoptimized
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-black bg-opacity-50 rounded-full p-1">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                              </svg>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-16 h-12 bg-gray-200 rounded mr-3 flex items-center justify-center">
                          <span className="text-xs text-gray-500">🎬</span>
                        </div>
                      )}
                      <div className="flex-grow">
                        <h5 className="font-semibold text-sm">{video.title}</h5>
                        {video.minimumage && (
                          <p className="text-xs text-gray-600 mt-1">Age {video.minimumage}+</p>
                        )}
                        {video.credit && (
                          <p className="text-xs text-gray-500 mt-1">
                            👥 {video.credit.length > 50 ? `${video.credit.substring(0, 50)}...` : video.credit}
                          </p>
                        )}
                        <button
                          onClick={() => openModal(video, 'video')}
                          className="mt-2 px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                        >
                          Watch Video
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <ContentModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            content={modalContent}
            type={modalType}
          />
        </>
      );
    }
    
    return (
      <div className="break-words">
        <div className="text-xs text-gray-500 mb-2 italic">
          💭 Text message (older format)
        </div>
        {message.context}
      </div>
    );
  };

  return (
    <div
      className={`max-w-[80%] p-4 rounded-lg shadow-md ${
        message.ischatbot
          ? 'bg-gray-200 text-gray-900'
          : 'bg-rose-500 text-white'
      }`}
    >
      {message.ischatbot ? renderBotMessage() : (
        <p className="mb-1 break-words whitespace-pre-wrap">{message.context}</p>
      )}
      <span className={`text-xs block text-right mt-2 ${
        message.ischatbot ? 'text-gray-500' : 'text-white' 
      }`}>
        {new Date(message.createddate + 'Z').toLocaleString('en-GB', {
          dateStyle: 'short',
          timeStyle: 'short',
          timeZone: "Asia/Singapore",
        })}
      </span>
    </div>
  );
};

export default function ParentChatHistoryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatHistoryContent />
    </Suspense>
  );
}

function ChatHistoryContent() {
  const [childName, setChildName] = useState<string | null>(null);
  const [, setSelectedChildId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setMessages] = useState<ChatMessage[]>([]);
  const [groupedMessages, setGroupedMessages] = useState<GroupedMessage[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    setCurrentTime(new Date().toLocaleString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: "Asia/Singapore"
    }));
  }, []);

  useEffect(() => {
    const childIdFromUrl = searchParams.get('childId');
    if (childIdFromUrl) {
      setSelectedChildId(childIdFromUrl);
      fetchChildData(childIdFromUrl);
      fetchChatHistory(childIdFromUrl);
    } else {
      setError('No child ID provided in the URL.');
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fetchChildData = async (childId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_account')
        .select('fullname')
        .eq('id', childId)
        .single();

      if (error) throw error;
      
      const userData = data as UserAccount | null;
      setChildName(userData?.fullname || null);
    } catch (err) {
      console.error('Error fetching child data:', err);
      setError('Failed to load child information.');
    }
  };

  const fetchChatHistory = async (childId: string) => {
    try {
      const { data, error } = await supabase
        .from('temp_chathistory')
        .select('chid, context, ischatbot, createddate')
        .eq('uaid_child', childId);

      if (error) throw error;
      
      const chatData = data as ChatMessage[] | null;
      const sortedMessages = (chatData ?? []).sort(
        (a, b) => new Date(a.createddate).getTime() - new Date(b.createddate).getTime()
      );
      
      setMessages(sortedMessages);
      
      // Group messages by date
      const grouped = groupMessagesByDate(sortedMessages);
      setGroupedMessages(grouped);
      
      // Set the most recent date as selected by default
      if (grouped.length > 0 && !selectedDate) {
        setSelectedDate(grouped[grouped.length - 1].date);
      }
    } catch (err) {
      console.error('Error fetching chat history:', err);
      setError('Failed to load chat history.');
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    return formattedDate.replace(/(^[A-Z][a-z]+)( \d)/, '$1,$2');
  };

  // Handler for date selection
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  // Get currently selected date group
  const selectedDateGroup = groupedMessages.find(group => group.date === selectedDate);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 py-16">
      <div className="container mx-auto max-w-4xl bg-white shadow-xl rounded-lg overflow-hidden">
        <div className="bg-indigo-600 text-white py-6 px-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 rounded transition-colors"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-semibold text-center tracking-wide">
              {childName ? `${childName}'s Chat History` : 'Chat History'}
            </h1>
            <div className="w-20"></div>
          </div>
        </div>

        <div className="p-8">
          {/* Current Time and Note */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm text-gray-500">
                Current Time: {currentTime}
              </p>
              <p className="text-sm text-red-500 italic mt-1">
                Note: Chat messages are automatically deleted after 1 week
              </p>
            </div>
          </div>

          {error && (
            <div className="p-4 mb-4 rounded-md text-sm bg-red-100 text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-10">
              <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 0 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600">Loading chat history...</p>
            </div>
          ) : groupedMessages.length === 0 ? (
            <p className="text-gray-500">No chat history found.</p>
          ) : (
            <div className="space-y-6">
              {/* Date Selection Dropdown */}
              <DateSelector 
                groupedMessages={groupedMessages}
                selectedDate={selectedDate || ''}
                formatDate={formatDate}
                onDateSelect={handleDateSelect}
              />
              
              {/* Selected Date Messages */}
              {selectedDateGroup && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">
                    {formatDate(selectedDateGroup.date)}
                  </h3>
                  
                  <div className="flex flex-col space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {selectedDateGroup.messages.map((message) => (
                      <div key={message.chid} className={`flex ${message.ischatbot ? 'justify-start' : 'justify-end'}`}>
                        <ParentMessageDisplay message={message} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}