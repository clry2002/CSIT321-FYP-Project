'use client';

import { useEffect, useState } from 'react';
// import { useRouter, usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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

  const formatChatbotResponse = (content: string) => {
    try {
      if (content.includes('{') && content.includes('}')) {
        const contentObj = JSON.parse(content.replace(/'/g, '"'));

        if (
          contentObj.genre ||
          contentObj.books ||
          contentObj.videos ||
          contentObj.books_ai ||
          contentObj.videos_ai
        ) {
          return renderContentResponse(contentObj);
        }
      }

      if (content.includes('<br>') || content.includes('<h3>')) {
        return <div dangerouslySetInnerHTML={{ __html: content }} />;
      }

      return <p>{content}</p>;
    } catch {
      return <p>{content}</p>;
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
                <h4 className="font-bold">{book.title}</h4>
                <p className="text-sm">{book.description}</p>
                <p className="text-xs mt-1">For ages {book.minimumage}+</p>
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
                  <div className="break-words whitespace-pre-wrap">
                    {formatChatbotResponse(msg.context)}
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
