import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DateSelector from './dateselector';
import MessageDetails from './messagedetails';
import { groupMessagesByDate } from './utils';
import { ChatMessage } from '../../../../types/database.types';

// Props
interface ChatHistoryProps {
  userId: string;
  userFullName?: string | null;
}

function ChatHistory({ userId, userFullName }: ChatHistoryProps) {
  const [, setMessages] = useState<ChatMessage[]>([]);
  const [groupedMessages, setGroupedMessages] = useState<{ date: string; messages: ChatMessage[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setCurrentTime(new Date().toLocaleString('en-GB',{
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

  // Handler for date selection
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  const handleBackPage = () => {
    router.back();
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

  // Get currently selected date group
  const selectedDateGroup = groupedMessages.find(group => group.date === selectedDate);

  return (
    <div className="w-full bg-gray-100 rounded-xl shadow-md">
      <div className="w-full bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={handleBackPage}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
          >
            ← Back
          </button>
          
          <h1 className="text-2xl font-bold text-center text-yellow-400">
            Chat History {userFullName ? `for ${userFullName}` : ''}
          </h1>
          
          <div className="w-20"></div>
        </div>
        
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

        {loading ? (
          <p className="text-gray-700">Loading chat history...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
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
                  {selectedDateGroup.messages.map((msg) => (
                    <MessageDetails key={msg.chid} message={msg} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatHistory;