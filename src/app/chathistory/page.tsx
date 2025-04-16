'use client';

import { useEffect, useState } from "react";

type ChatMessage = {
  chid: number;
  context: string;
  ischatbot: boolean;
  createddate: string;
};

export default function ChatHistory() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(""); // Fix: Placed inside component

  useEffect(() => {
    setTime(new Date().toLocaleString()); // Fix: Runs only on client side
  }, []);

  useEffect(() => {
    async function fetchChatHistory() {
      try {
        const response = await fetch("/api/chat-history");
        const text = await response.text(); // Read raw response
  
        console.log("API Response:", text); // Debug: Log the response
        
  
        const data = JSON.parse(text); // Parse JSON manually
        setMessages(data);
      } catch (error) {
        console.error("Failed to fetch chat history:", error);
      } finally {
        setLoading(false);
      }
    }
  
    fetchChatHistory();
  }, []);
  
  return (
    <div className="max-w-3xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold mb-4 text-gray-900">Chat History</h2>
      
      <p className="text-sm text-gray-600">Current Time: {time}</p> {/* Fix: Only runs on client */}
      
      {loading ? (
        <p className="text-gray-700">Loading chat history...</p>
      ) : messages.length === 0 ? (
        <p className="text-gray-500">No chat history found.</p>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.chid}
              className={`p-3 rounded-lg shadow ${
                msg.ischatbot ? "bg-gray-200 text-gray-900" : "bg-rose-500 text-white self-end"
              }`}
            >
              <p>{msg.context}</p>
              <span className="text-xs text-gray-600">
                {new Date(msg.createddate).toLocaleString("en-US", { timeZone: "UTC" })} {/* Fix: Ensure consistent formatting */}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ChatHistory.tsx
// 'use client';
// import React, { useEffect, useState } from 'react';
// import axios from 'axios';

// interface ChatMessage {
//   chid: number;
//   context: string;
//   ischatbot: boolean;
//   createddate: string;
//   uaid_child: string;
// }

// interface ChatHistoryProps {
//   userId: string;
// }

// const ChatHistory: React.FC<ChatHistoryProps> = ({ userId }) => {
//   const [history, setHistory] = useState<ChatMessage[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<string | null>(null);
  
//   useEffect(() => {
//     console.log("Current userId:", userId);
//     if (!userId){
//       console.log("No userId provided, skipping fetch");
//       setLoading(false);
//       return;
//     }
    
//     const fetchChatHistory = async () => {
//       const url = `/api/chat/history?user_id=${userId}`;
//       console.log("Fetching from:", url);
//       try {
//         setLoading(true);
//         const response = await axios.get(url);
//         console.log("Response data:", response.data);
//         setHistory(response.data.history || []);
//         setError(null);
//       } catch (err) {
//         console.error("Error details:", err);
//         setError('Failed to load chat history');
//       } finally {
//         setLoading(false);
//       }
//     };
    
//     fetchChatHistory();
//   }, [userId]);
  
//   const clearHistory = async () => {
//     if (!window.confirm('Are you sure you want to clear your chat history?')) return;
    
//     try {
//       setLoading(true);
//       await axios.post('/api/chat/history/clear', { user_id: userId });
//       setHistory([]);
//       setError(null);
//     } catch (err) {
//       setError('Failed to clear chat history');
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };
  
//   if (loading) return <div>Loading chat history...</div>;
//   if (error) return <div className="error">{error}</div>;
  
//   return (
//     <div className="chat-history">
//       <h2>Chat History</h2>
//       {history.length === 0 ? (
//         <p>No chat history found</p>
//       ) : (
//         <>
//           <button 
//             onClick={clearHistory}
//             className="clear-history-btn"
//           >
//             Clear History
//           </button>
//           <div className="messages-container">
//             {history.map((message) => (
//               <div 
//                 key={message.chid}
//                 className={`message ${message.ischatbot ? 'bot-message' : 'user-message'}`}
//               >
//                 <div className="message-header">
//                   <span className="sender">{message.ischatbot ? 'Kid-Bot' : 'You'}</span>
//                   <span className="timestamp">
//                     {new Date(message.createddate).toLocaleString()}
//                   </span>
//                 </div>
//                 <div 
//                   className="message-content"
//                   dangerouslySetInnerHTML={{ __html: message.context }}
//                 />
//               </div>
//             ))}
//           </div>
//         </>
//       )}
//     </div>
//   );
// };

// export default ChatHistory;