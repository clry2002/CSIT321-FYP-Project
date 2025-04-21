'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Define an interface for the chat history item
interface ChatHistoryItem {
  message: string;
  response: string;
  timestamp: string;
  child_id: string;
}

export default function ViewChildChatHistory() {
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchChatHistory = async () => {
      setLoading(true);
      try {
        const { data: { user }, error: userFetchError } = await supabase.auth.getUser();
        if (!user || userFetchError) throw new Error('Failed to fetch user details.');

        const { data: history, error: historyError } = await supabase
          .from('chat_history')
          .select('*')
          .eq('child_id', user.id) // Assuming `child_id` matches the authenticated user ID
          .order('timestamp', { ascending: false });

        if (!history || historyError) throw historyError;

        setChatHistory(history as ChatHistoryItem[]);
      } catch (err) {
        console.error('Error fetching chat history:', err);
        setError('An error occurred while fetching the chat history.');
      } finally {
        setLoading(false);
      }
    };

    fetchChatHistory();
  }, []);

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <div className="flex-1 overflow-y-auto pt-16">
        <div className="px-6 py-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Child Chatbot History</h2>
          <div className="max-w-4xl space-y-6">
            {error && (
              <div className="p-3 rounded-lg text-sm bg-red-50 text-red-500">
                {error}
              </div>
            )}

            {loading && <p>Loading chat history...</p>}

            {!loading && chatHistory.length === 0 && (
              <p>No chat history found.</p>
            )}

            {!loading && chatHistory.length > 0 && (
              <ul className="space-y-4">
                {chatHistory.map((interaction, index) => (
                  <li
                    key={index}
                    className="p-4 rounded-lg shadow-sm bg-gray-100 border border-gray-300"
                  >
                    <p className="text-sm text-gray-700">
                      <strong>Message:</strong> {interaction.message}
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>Response:</strong> {interaction.response}
                    </p>
                    <p className="text-xs text-gray-500">
                      <strong>Timestamp:</strong> {new Date(interaction.timestamp).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}