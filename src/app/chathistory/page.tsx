'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import Navbar from '../components/Navbar';
import ChatBot from '../components/ChatBot';

// Define types for chat message
type ChatMessage = {
  chid: number;
  context: string;
  ischatbot: boolean;
  createddate: string;
};

// Book type
type Book = {
  cid: number;
  cfid: number;
  title: string;
  status: string;
  contenturl: string;
  coverimage: string;
  minimumage: number;
  description: string;
};

// Video type
type Video = {
  cid: number;
  cfid: number;
  title: string;
  description: string;
  thumbnailUrl?: string;
  contentUrl?: string;
  minimumage?: number;
};

// Content response
type ContentResponse = {
  genre?: string;
  books?: Book[];
  videos?: Video[];
  books_ai?: string;
  videos_ai?: string;
  error?: string;
};

// Props
interface ChatHistoryProps {
  userId: string;
}

function ChatHistory({ userId }: ChatHistoryProps) {
  const [, setMessages] = useState<ChatMessage[]>([]);
  const [groupedMessages, setGroupedMessages] = useState<{ date: string; messages: ChatMessage[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setCurrentTime(new Date().toLocaleString());
  }, []);

  useEffect(() => {
    async function fetchChatHistory() {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('temp_chathistory')
          .select('chid, context, ischatbot, createddate')
          .eq('uaid_child', userId);

        if (error) {
          setError('Failed to load chat history.');
          console.error(error);
        } else {
          const sortedMessages = (data ?? []).sort(
            (a, b) =>
              new Date(a.createddate).getTime() -
              new Date(b.createddate).getTime()
          );
          setMessages(sortedMessages);
          
          // Group messages by date
          const grouped = groupMessagesByDate(sortedMessages);
          setGroupedMessages(grouped);
          
          // Set the most recent date as selected by default
          if (grouped.length > 0 && !selectedDate) {
            setSelectedDate(grouped[grouped.length - 1].date);
          }
        }
      } catch (fetchError) {
        console.error('Error fetching chat history:', fetchError);
        setError('Failed to load chat history.');
      } finally {
        setLoading(false);
      }
    }

    fetchChatHistory();
  }, [userId, selectedDate]);

  // Group messages by date
  const groupMessagesByDate = (messages: ChatMessage[]) => {
    const groups: { date: string; messages: ChatMessage[] }[] = [];
    
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

  // Extract video ID from YouTube URL - Improved to handle more formats
  const getVideoId = (contentUrl: string) => {
    console.log('Attempting to extract video ID from:', contentUrl);
    if (!contentUrl) {
      console.log('No content URL provided');
      return null;
    }
    
    try {
      // Handle different YouTube URL formats
      if (contentUrl.includes('youtube.com/watch')) {
        const url = new URL(contentUrl);
        const videoId = url.searchParams.get('v');
        console.log('Extracted video ID from youtube.com/watch format:', videoId);
        return videoId;
      } else if (contentUrl.includes('youtu.be/')) {
        const parts = contentUrl.split('youtu.be/');
        if (parts.length >= 2) {
          const videoId = parts[1].split('?')[0].split('&')[0];
          console.log('Extracted video ID from youtu.be format:', videoId);
          return videoId;
        }
      } else if (contentUrl.includes('youtube.com/embed/')) {
        const parts = contentUrl.split('youtube.com/embed/');
        if (parts.length >= 2) {
          const videoId = parts[1].split('?')[0].split('&')[0];
          console.log('Extracted video ID from youtube.com/embed format:', videoId);
          return videoId;
        }
      }
      
      console.warn('Could not extract video ID from URL format:', contentUrl);
      return null;
    } catch (err) {
      console.error('Error parsing YouTube URL:', err, contentUrl);
      return null;
    }
  };

  // Check if text contains book or video recommendations pattern
  const containsRecommendations = (text: string): boolean => {
    return (
      text.includes('recommendations for you') ||
      text.includes('Books:') ||
      text.includes('Videos:') ||
      (text.includes('For ages') && text.includes('–'))
    );
  };

  // Handle viewing book details
  const handleViewDetails = (book: { title: string; cid?: number | string }) => {
    if (book.cid !== undefined) {
      // Convert cid to number if it's a string
      const bookId = typeof book.cid === 'string' ? parseInt(book.cid, 10) : book.cid;
      router.push(`/bookdetail/${bookId}`);
    } else {
      // redirect to search page for books without cid
      handleSearch(book.title, 'books');
    }
  };
  
  // Handle watching video
  const handleWatchVideo = (video: { title: string; cid?: number | string; contentUrl?: string }) => {
    console.log("Video object:", video);
    
    if (video.cid !== undefined && video.cid !== null) {
      const videoId = typeof video.cid === 'string' ? parseInt(video.cid, 10) : video.cid;
      if (!isNaN(videoId)) {
        router.push(`/videodetail/${videoId}`);
        return;
      }
    }
    
    // Last resort - search by title
    handleSearch(video.title, 'videos');
  };

  const handleSearch = (query: string, type: 'books' | 'videos') => {
    if (!query.trim()) return;
    const path = type === 'books' ? '/searchbooks' : '/searchvideos';
    router.push(`${path}?q=${encodeURIComponent(query.trim())}`);
  };

  // Video thumbnail component with iframe implementation
  const VideoThumbnail = ({ contentUrl, title }: { contentUrl?: string, title: string }) => {
    console.log('Rendering video thumbnail for:', title, 'URL:', contentUrl);

    if (!contentUrl) {
      console.warn(`Missing contentUrl for video: "${title}"`);
    }
    
    const videoId = contentUrl ? getVideoId(contentUrl) : null;
    console.log('Extracted video ID:', videoId);

    // If we couldn't extract a video ID or there's no content URL, show fallback immediately
    if (!videoId || !contentUrl) {
      return (
        <div className="w-full aspect-video bg-gray-200 rounded flex items-center justify-center">
          <span className="text-gray-500 text-xs">Video preview not available</span>
        </div>
      );
    }

    // Render the iframe with the extracted video ID
    return (
      <div className="aspect-video relative">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          title={title}
          className="absolute inset-0 w-full h-full rounded"
          allowFullScreen
        />
      </div>
    );
  };

  // Parse the content to extract recommendations
  const extractRecommendations = (content: string) => {
    console.log('Extracting recommendations from content:', content);
    try {
      content = content.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>'); // Replace double asterisks with <b> tags
      // Check if it's already in a recommendations format from the UI screenshot
      if (containsRecommendations(content)) {
        return renderUIBasedRecommendations(content);
      }

      // Try to parse as JSON
      if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
        try {
          // Clean and prepare the string for parsing
          const processedContent = content
            .replace(/'/g, '"') // Replace all single quotes with double quotes
            .replace(/\\"/g, '\\"') // Preserve escaped quotes
            .replace(/(\w+):/g, '"$1":') // Ensure property names are in double quotes
            .replace(/:\s*"([^"]*?)"/g, ':"$1"'); // Fix value formatting
            
          const contentObj = JSON.parse(processedContent);
          
          if (
            contentObj.genre ||
            contentObj.books ||
            contentObj.videos ||
            contentObj.books_ai ||
            contentObj.videos_ai
          ) {
            return renderContentResponse(contentObj);
          }
        } catch {
          // If JSON parsing fails, try to extract books and videos using regex
          return extractContentWithRegex(content);
        }
      }

      // Handle HTML content
      if (content.includes('<br>') || content.includes('<h3>') || content.includes('<b>')) {
        return <div dangerouslySetInnerHTML={{ __html: content }} />;
      }

      // Default case: plain text
      return <p className="whitespace-pre-wrap">{content}</p>;
    } catch (error) {
      console.error('Error formatting chatbot response:', error);
      return <p className="whitespace-pre-wrap">{content}</p>;
    }
  };

  const handleBackPage = () => {
    router.back();
  };

  // Handler for date selection
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  // Render recommendations based on the UI in the screenshot
  const renderUIBasedRecommendations = (content: string) => {
    // Split the content by lines to find book and video sections
    const lines = content.split('\n');
    const genre = lines.find(line => line.includes('recommendations for you'))?.trim() || 'Content recommendations';
    
    // Extract book sections using regex
    const bookPattern = /(\w[\w\s'&-]+)(?:\s–\s)([^]*?)(?:For ages (\d+)\+|$)/g;
    const books = [];
    let match;
    
    const contentString = content.toString();
    while ((match = bookPattern.exec(contentString)) !== null) {
      const title = match[1]?.trim();
      const description = match[2]?.trim();
      const age = match[3] ? parseInt(match[3], 10) : 0;
      
      if (title) {
        books.push({
          title,
          description,
          minimumage: age
        });
      }
    }

    // Extract video sections and URLs
    const videos = [];
    const videoSectionStart = content.indexOf("Videos:");
    
    if (videoSectionStart !== -1) {
      const videoSection = content.substring(videoSectionStart);
      const videoPattern = /(\w[\w\s'&-]+)(?:\s–\s)([^]*?)(?:(?:URL|Link):\s*([^\n]+)|For ages (\d+)\+|$)/g;
      
      while ((match = videoPattern.exec(videoSection)) !== null) {
        const title = match[1]?.trim();
        const description = match[2]?.trim();
        const contentUrl = match[3]?.trim();
        const age = match[4] ? parseInt(match[4], 10) : 0;
        
        if (title) {
          videos.push({
            title,
            description,
            contentUrl,
            minimumage: age
          });
        }
      }
    }

    return (
      <div className="space-y-4">
        <p className="font-medium">{genre}</p>
        
        {books.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-bold text-lg">Books:</h3>
            {books.map((book, index) => (
              <div key={index} className="bg-white p-3 rounded shadow-sm">
                <div className="flex">
                  <div className="w-16 h-20 bg-gray-200 rounded flex-shrink-0 mr-3 flex items-center justify-center">
                    <span className="text-gray-500 text-xs">Cover</span>
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-bold">{book.title}</h4>
                    <p className="text-sm">{book.description}</p>
                    {book.minimumage > 0 && (
                      <p className="text-xs mt-1">For ages {book.minimumage}+</p>
                    )}
                    <button 
                      className="mt-2 px-3 py-1 bg-rose-500 text-white text-sm rounded hover:bg-rose-600 transition-colors"
                      onClick={() => handleViewDetails(book)}
                    >
                      View Book Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {videos.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-bold text-lg">Videos:</h3>
            {videos.map((video, index) => (
              <div key={index} className="bg-white p-3 rounded shadow-sm">
                <div className="flex flex-col">
                  <div className="w-full mb-3">
                    <VideoThumbnail 
                      contentUrl={video.contentUrl} 
                      title={video.title} 
                    />
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-bold">{video.title}</h4>
                    <p className="text-sm">{video.description}</p>
                    {video.minimumage && video.minimumage > 0 && (
                      <p className="text-xs mt-1">For ages {video.minimumage}+</p>
                    )}
                    <button 
                      className="mt-2 px-3 py-1 bg-rose-500 text-white text-sm rounded hover:bg-rose-600 transition-colors"
                      onClick={() => handleWatchVideo(video)}
                    >
                      View Video Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const extractContentWithRegex = (content: string) => {
    try {
      // Extract genre
      const genreMatch = content.match(/'genre':\s*'([^']+)'/);
      const genre = genreMatch ? genreMatch[1] : null;
      
      // Extract books section
      let booksString = '';
      const booksMatch = content.match(/'books':\s*\[([\s\S]*?)\]/);
      if (booksMatch && booksMatch[1]) {
        booksString = booksMatch[1];
      }
      
      // Extract individual book objects
      const books = [];
      const bookRegex = /{[\s\S]*?}/g;
      let bookMatch;
      
      while ((bookMatch = bookRegex.exec(booksString)) !== null) {
        const bookStr = bookMatch[0];
        
        // Extract book properties
        const titleMatch = bookStr.match(/'title':\s*'([^']+)'/);
        const descMatch = bookStr.match(/'description':\s*'([^']+)'/);
        const ageMatch = bookStr.match(/'minimumage':\s*(\d+)/);
        const coverMatch = bookStr.match(/'coverimage':\s*'([^']+)'/);
        const cidMatch = bookStr.match(/'cid':\s*(\d+)/);
        
        const title = titleMatch ? titleMatch[1] : '';
        const description = descMatch ? descMatch[1] : '';
        const minimumage = ageMatch ? parseInt(ageMatch[1], 10) : 0;
        const coverimage = coverMatch ? coverMatch[1] : '';
        const cid = cidMatch ? cidMatch[1] : '';
        
        books.push({
          title,
          description,
          minimumage,
          coverimage,
          cid
        });
      }
      
      // Extract videos section
      let videosString = '';
      const videosMatch = content.match(/'videos':\s*\[([\s\S]*?)\]/);
      if (videosMatch && videosMatch[1]) {
        videosString = videosMatch[1];
      }
      
      // Extract individual video objects
      const videos = [];
      const videoRegex = /{[\s\S]*?}/g;
      let videoMatch;
      
      while ((videoMatch = videoRegex.exec(videosString)) !== null) {
        const videoStr = videoMatch[0];
        
        // Extract video properties
        const titleMatch = videoStr.match(/'title':\s*'([^']+)'/);
        const descMatch = videoStr.match(/'description':\s*'([^']+)'/);
        const ageMatch = videoStr.match(/'minimumage':\s*(\d+)/);
        const thumbnailMatch = videoStr.match(/'thumbnailUrl':\s*'([^']+)'/);
        const contentUrlMatch = videoStr.match(/'contenturl':\s*'([^']+)'/);
        const cidMatch = videoStr.match(/'cid':\s*(\d+)/);
        
        
        const title = titleMatch ? titleMatch[1] : '';
        const description = descMatch ? descMatch[1] : '';
        const minimumage = ageMatch ? parseInt(ageMatch[1], 10) : 0;
        const thumbnailUrl = thumbnailMatch ? thumbnailMatch[1] : '';
        const contentUrl = contentUrlMatch ? contentUrlMatch[1] : '';
        const cid = cidMatch ? cidMatch[1] : '';
        
        videos.push({
          title,
          description,
          minimumage,
          thumbnailUrl,
          contentUrl,
          cid
        });
      }

      // Check if we successfully extracted any data
      if (genre || books.length > 0 || videos.length > 0) {
        return (
          <div className="space-y-4">
            {genre && (
              <p className="font-medium">
                Here are some {genre} recommendations for you:
              </p>
            )}
            
            {books.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold text-lg">Books:</h3>
                {books.map((book, index) => (
                  <div key={index} className="bg-white p-3 rounded shadow-sm">
                    <div className="flex flex-col">
                      <div className="w-full mb-3">
                        {book.coverimage ? (
                          <Image
                            src={book.coverimage}
                            alt={`Cover of ${book.title}`}
                            width={800} 
                            height={400}
                            className="w-full object-cover rounded"
                          />
                        ) : (
                          <div className="w-full h-64 bg-gray-200 rounded flex items-center justify-center">
                            <span className="text-gray-500 text-xs">Cover</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-bold">{book.title}</h4>
                        <p className="text-sm">{book.description}</p>
                        <p className="text-xs mt-1">For ages {book.minimumage}+</p>
                        <button 
                          className="mt-2 px-3 py-1 bg-rose-500 text-white text-sm rounded hover:bg-rose-600 transition-colors"
                          onClick={() => handleViewDetails(book)}
                        >
                          View Book Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {videos.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold text-lg">Videos:</h3>
                {videos.map((video, index) => (
                  <div key={index} className="bg-white p-3 rounded shadow-sm">
                    <div className="flex flex-col">
                      <div className="w-full mb-3">
                        <VideoThumbnail 
                          contentUrl={video.contentUrl} 
                          title={video.title}
                        />
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-bold">{video.title}</h4>
                        <p className="text-sm">{video.description}</p>
                        {video.minimumage !== undefined && video.minimumage > 0 && (
                          <p className="text-xs mt-1">For ages {video.minimumage}+</p>
                        )}
                        <button 
                          className="mt-2 px-3 py-1 bg-rose-500 text-white text-sm rounded hover:bg-rose-600 transition-colors"
                          onClick={() => handleWatchVideo(video)}
                        >
                          View Video Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
      
      // Fallback to plain text if regex extraction fails
      return <p className="whitespace-pre-wrap">{content}</p>;
    } catch (error) {
      console.error('Error in regex extraction:', error);
      return <p className="whitespace-pre-wrap">{content}</p>;
    }
  };

  const renderContentResponse = (content: ContentResponse) => {
    return (
      <div className="space-y-4">
        {content.genre && (
          <p className="font-medium">
            Here are some {content.genre} recommendations for you:
          </p>
        )}

        {content.books && content.books.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-bold text-lg">Books:</h3>
            {content.books.map((book, index) => (
              <div key={index} className="bg-white p-3 rounded shadow-sm">
                <div className="flex">
                  {book.coverimage ? (
                    <Image
                    src={book.coverimage}
                    alt={`Cover of ${book.title}`}
                    width={64} 
                    height={80}
                    className="object-cover rounded flex-shrink-0 mr-3"
                  />
                  ) : (
                    <div className="w-16 h-20 bg-gray-200 rounded flex-shrink-0 mr-3 flex items-center justify-center">
                      <span className="text-gray-500 text-xs">Cover</span>
                    </div>
                  )}
                  <div className="flex-grow">
                    <h4 className="font-bold">{book.title}</h4>
                    <p className="text-sm">{book.description}</p>
                    <p className="text-xs mt-1">For ages {book.minimumage}+</p>
                    <button 
                      className="mt-2 px-3 py-1 bg-rose-500 text-white text-sm rounded hover:bg-rose-600 transition-colors"
                      onClick={() => handleViewDetails(book)}
                    >
                      View Book Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {content.videos && content.videos.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-bold text-lg">Videos:</h3>
            {content.videos.map((video, index) => (
              <div key={index} className="bg-white p-3 rounded shadow-sm">
                <div className="flex flex-col">
                  <div className="w-full mb-3">
                    <VideoThumbnail 
                      contentUrl={video.contentUrl} 
                      title={video.title}
                    />
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-bold">{video.title}</h4>
                    <p className="text-sm">{video.description}</p>
                    {video.minimumage !== undefined && video.minimumage > 0 && (
                      <p className="text-xs mt-1">For ages {video.minimumage}+</p>
                    )}
                    <button 
                      className="mt-2 px-3 py-1 bg-rose-500 text-white text-sm rounded hover:bg-rose-600 transition-colors"
                      onClick={() => handleWatchVideo(video)}
                    >
                      View Video Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {content.books_ai && (
          <div className="mt-3">
            <div dangerouslySetInnerHTML={{ __html: content.books_ai }} />
          </div>
        )}

        {content.videos_ai && (
          <div className="mt-3">
            <div dangerouslySetInnerHTML={{ __html: content.videos_ai }} />
          </div>
        )}

        {content.error && <p className="text-red-500">{content.error}</p>}
      </div>
    );
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Format date for button display - shorter format
  const formatDateForButton = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get currently selected date group
  const selectedDateGroup = groupedMessages.find(group => group.date === selectedDate);

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <div className="flex justify-start">
        <button
          onClick={handleBackPage}
          className="mb-6 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
        >
          ← Back
        </button>
      </div>
      
      <div className="w-full flex flex-col items-center bg-gray-100 px-4 py-6">
        <div className="w-full max-w-4xl bg-white rounded-xl shadow-md p-6">
          <h2 className="text-2xl font-bold mb-2 text-gray-800">Chat History</h2>
          <p className="text-sm text-gray-500 mb-4">
            Current Time: {currentTime}
          </p>

          {loading ? (
            <p className="text-gray-700">Loading chat history...</p>
          ) : error ? (
            <p className="text-red-600">{error}</p>
          ) : groupedMessages.length === 0 ? (
            <p className="text-gray-500">No chat history found.</p>
          ) : (
            <div className="space-y-6">
              {/* Date Selection Buttons */}
              <div className="mb-4">
                <h3 className="text-md font-medium text-gray-700 mb-2">Select Date:</h3>
                <div className="flex flex-wrap gap-2">
                  {groupedMessages.map((group, index) => (
                    <button
                      key={`date-btn-${index}`}
                      onClick={() => handleDateSelect(group.date)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedDate === group.date
                          ? 'bg-rose-500 text-white'
                          : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                      }`}
                    >
                      {formatDateForButton(group.date)}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Selected Date Messages */}
              {selectedDateGroup && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">
                    {formatDate(selectedDateGroup.date)}
                  </h3>
                  
                  <div className="flex flex-col space-y-4">
                    {selectedDateGroup.messages.map((msg) => (
                      <div
                        key={msg.chid}
                        className={`max-w-[80%] p-4 rounded-lg shadow-md ${
                          msg.ischatbot
                            ? 'bg-gray-200 text-gray-900 self-start'
                            : 'bg-rose-500 text-white self-end'
                        }`}
                      >
                        {msg.ischatbot ? (
                          <div className="break-words">
                            {extractRecommendations(msg.context)}
                          </div>
                        ) : (
                          <p className="mb-1 break-words whitespace-pre-wrap">
                            {msg.context}
                          </p>
                        )}
                        <span className="text-xs text-gray-600 block text-right">
                          {new Date(msg.createddate + 'Z').toLocaleString('en-US', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                            timeZone: "Asia/Singapore", // SG timezone
                          })}
                        </span>
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

// Utility to fetch child data
const fetchChildData = async (
  setUserFullName: (name: string | null) => void,
  setIsLoading: (value: boolean) => void,
  router: ReturnType<typeof useRouter>
): Promise<string | null> => {
  setIsLoading(true);

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Error getting auth user:', userError);
      router.push('/landing');
      return null;
    }

    const { data, error } = await supabase
      .from('user_account')
      .select('id, fullname')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching child fullname:', error);
      return null;
    }

    setUserFullName(data?.fullname || null);
    return data?.id || null;
  } catch (error) {
    console.error('Error in fetchChildData:', error);
    return null;
  } finally {
    setIsLoading(false);
  }
};

export default function ChatPage() {
  const [userFullName, setUserFullName] = useState<string | null>(null);
  const [uaidChild, setUaidChild] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      const childId = await fetchChildData(setUserFullName, setIsLoading, router);
      setUaidChild(childId);
    };
    loadData();
  }, [router]);

  if (isLoading) return <p className="text-center mt-20">Loading...</p>;

  return (
    <div className="w-full min-h-screen bg-gray-100 flex flex-col items-center justify-start">
      <Navbar />
      <div className="mt-8 pt-16 flex flex-col items-center">
      <h1 className="text-3xl font-bold mt-8 text-gray-800">
        Chat History for {userFullName}
      </h1>
      <ChatHistory userId={uaidChild ?? ''} />
    </div>
    <ChatBot  />
    </div>
  );
} 