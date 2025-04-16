// 'use client';
// import { FC } from 'react';
// import React, { useEffect, useState } from 'react';
// import axios from 'axios';
// import { useSession } from '@/contexts/SessionContext';
// import { useRouter } from 'next/navigation';

// interface ChatHistoryProps {
//   userId?: string;
// }

// interface ChatMessage {
//   chid: number;
//   context: string;
//   ischatbot: boolean;
//   createddate: string;
//   uaid_child: string;
// }

// const ChatHistory: FC<ChatHistoryProps> = ({ userId: externalUserId }) => {
//   const [history, setHistory] = useState<ChatMessage[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<string | null>(null);
//   const { userAccount, userProfile, loading: sessionLoading } = useSession();
//   const router = useRouter();
  
//   useEffect(() => {
//     // Use provided userId if available, otherwise wait for session
//     if (!externalUserId && sessionLoading) return;
    
//     // If using session and not authenticated, redirect
//     if (!externalUserId && (!userAccount || !userAccount.user_id)) {
//       console.log("No authenticated user found, redirecting to login");
//       router.push('/auth/login');
//       return;
//     }
    
//     // Use external userId if provided, otherwise use from session
//     const effectiveUserId = externalUserId || (userAccount?.user_id);
    
//     if (!effectiveUserId) {
//       console.log("No userId provided, skipping");
//       setLoading(false);
//       return;
//     }
    
//     console.log("Current userId:", effectiveUserId);
    
//     const fetchChatHistory = async () => {
//       const url = `/api/chat/history?user_id=${effectiveUserId}`;
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
//   }, [userAccount, sessionLoading, router, externalUserId]);
  
//   const clearHistory = async () => {
//     // Use provided userId if available, otherwise use from session
//     const effectiveUserId = externalUserId || (userAccount?.user_id);
    
//     if (!effectiveUserId) {
//       setError('User ID not available');
//       return;
//     }
    
//     if (!window.confirm('Are you sure you want to clear your chat history?')) return;
    
//     try {
//       setLoading(true);
//       await axios.post('/api/chat/history/clear', { user_id: effectiveUserId });
//       setHistory([]);
//       setError(null);
//     } catch (err) {
//       setError('Failed to clear chat history');
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };
  
//   if (loading) {
//     return <div className="p-4 text-center">Loading chat history...</div>;
//   }
  
//   if (error) {
//     return <div className="p-4 text-center text-red-500">{error}</div>;
//   }
  
//   return (
//     <div className="chat-history max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
//       <h2 className="text-2xl font-bold mb-6 text-gray-800">Chat History</h2>
//       {userProfile && (
//         <div className="mb-4 text-sm">
//           <span className="font-medium">Account Type:</span> {userProfile.name}
//         </div>
//       )}
      
//       {history.length === 0 ? (
//         <p className="text-gray-500 text-center">No chat history found</p>
//       ) : (
//         <>
//           <button 
//             onClick={clearHistory}
//             className="clear-history-btn px-4 py-2 bg-red-500 text-white rounded mb-6 hover:bg-red-600 transition"
//           >
//             Clear History
//           </button>
          
//           <div className="messages-container space-y-4">
//             {history.map((message) => (
//               <div 
//                 key={message.chid}
//                 className={`message p-4 rounded-lg shadow-sm ${
//                   message.ischatbot 
//                     ? 'bot-message bg-blue-50 border-l-4 border-blue-500' 
//                     : 'user-message bg-gray-50 border-l-4 border-gray-500'
//                 }`}
//               >
//                 <div className="message-header flex justify-between text-sm text-gray-600 mb-2">
//                   <span className="sender font-medium">
//                     {message.ischatbot ? 'Kid-Bot' : userAccount?.username || 'You'}
//                   </span>
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
