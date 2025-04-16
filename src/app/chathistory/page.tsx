'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Define type for chat message
type ChatMessage = {
  chid: number;
  context: string;
  ischatbot: boolean;
  createddate: string;
};

// Props for ChatHistory
interface ChatHistoryProps {
  userId: string;
}

// Component: ChatHistory
function ChatHistory({ userId }: ChatHistoryProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState("");

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
          setError("Failed to load chat history.");
          console.error(error);
        } else {
          const sortedMessages = (data ?? []).sort((a, b) =>
            new Date(a.createddate).getTime() - new Date(b.createddate).getTime()
          );
          setMessages(sortedMessages);
        }
      } catch (err) {
        console.error("Error fetching chat history:", err);
        setError("Failed to load chat history.");
      } finally {
        setLoading(false);
      }
    }

    fetchChatHistory();
  }, [userId]);

  return (
    <div className="w-full h-screen flex flex-col items-center bg-gray-100 overflow-y-auto px-4 py-6">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-bold mb-2 text-gray-800">Chat History</h2>
        <p className="text-sm text-gray-500 mb-4">Current Time: {currentTime}</p>

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
                <p className="mb-1 break-words whitespace-pre-wrap">{msg.context}</p>
                <span className="text-xs text-gray-600 block text-right">
                  {new Date(msg.createddate).toLocaleString("en-US", {
                    dateStyle: "short",
                    timeStyle: "short",
                    timeZone: "UTC",
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

// Utility function to fetch child data
const fetchChildData = async (
  setUserFullName: (name: string | null) => void,
  setIsLoading: (value: boolean) => void,
  router: any
) => {
  setIsLoading(true);

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Error getting auth user:", userError);
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

// Main ChatPage component
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
  }, []);

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
