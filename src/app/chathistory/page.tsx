'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

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

// Basic video type
type Video = {
  title: string;
  description: string;
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState('');

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
        }
      } catch (fetchError) {
        console.error('Error fetching chat history:', fetchError);
        setError('Failed to load chat history.');
      } finally {
        setLoading(false);
      }
    }

    fetchChatHistory();
  }, [userId]);

  // Check if text contains book recommendations pattern
  const containsRecommendations = (text: string): boolean => {
    return (
      text.includes('recommendations for you') ||
      text.includes('Books:') ||
      (text.includes('For ages') && text.includes('–'))
    );
  };

  // Handle viewing book details
  const handleViewDetails = (bookTitle: string) => {
    // Implementation for viewing book details
    console.log(`Viewing details for: ${bookTitle}`);
    // You could implement navigation to a book detail page here
    // router.push(`/books/${bookId}`);
  };

  // Parse the content to extract recommendations
  const extractRecommendations = (content: string) => {
    try {
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
        } catch (parseError) {
          console.error('Error parsing JSON content:', parseError);
          // If JSON parsing fails, try to extract books using regex
          return extractBooksWithRegex(content);
        }
      }

      // Handle HTML content
      if (content.includes('<br>') || content.includes('<h3>')) {
        return <div dangerouslySetInnerHTML={{ __html: content }} />;
      }

      // Default case: plain text
      return <p className="whitespace-pre-wrap">{content}</p>;
    } catch (error) {
      console.error('Error formatting chatbot response:', error);
      return <p className="whitespace-pre-wrap">{content}</p>;
    }
  };

  // Render recommendations based on the UI in the screenshot
  const renderUIBasedRecommendations = (content: string) => {
    // Split the content by lines to find book sections
    const lines = content.split('\n');
    const genre = lines.find(line => line.includes('recommendations for you'))?.trim() || 'Book recommendations';
    
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
                      onClick={() => handleViewDetails(book.title)}
                    >
                      View Details
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

  const extractBooksWithRegex = (content: string) => {
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

      // Check if we successfully extracted any data
      if (genre || books.length > 0) {
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
                          onClick={() => handleViewDetails(book.title)}
                        >
                          View Details
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
                      onClick={() => handleViewDetails(book.title)}
                    >
                      View Details
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
                <h4 className="font-bold">{video.title}</h4>
                <p className="text-sm">{video.description}</p>
                <button 
                  className="mt-2 px-3 py-1 bg-rose-500 text-white text-sm rounded hover:bg-rose-600 transition-colors"
                  onClick={() => handleViewDetails(video.title)}
                >
                  Watch Video
                </button>
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

  return (
    <div className="w-full h-screen flex flex-col items-center bg-gray-100 overflow-y-auto px-4 py-6">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-bold mb-2 text-gray-800">Chat History</h2>
        <p className="text-sm text-gray-500 mb-4">
          Current Time: {currentTime}
        </p>

        {loading ? (
          <p className="text-gray-700">Loading chat history...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : messages.length === 0 ? (
          <p className="text-gray-500">No chat history found.</p>
        ) : (
          <div className="flex flex-col space-y-4">
            {messages.map((msg) => (
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
                  {new Date(msg.createddate).toLocaleString('en-US', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                    timeZone: "Asia/Singapore", // SG timezone
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
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
    <div className="w-full h-screen bg-gray-100 flex flex-col items-center justify-start">
      <h1 className="text-3xl font-bold mt-8 text-gray-800">
        Chat History for {userFullName}
      </h1>
      <ChatHistory userId={uaidChild ?? ''} />
    </div>
  );
}