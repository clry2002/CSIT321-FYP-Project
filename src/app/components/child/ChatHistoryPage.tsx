// 'use client';
// import { useEffect, useState } from 'react';
// import { useSession } from '@/contexts/SessionContext';
// import ChatHistory from './ChatHistory';

// export default function ChatHistoryPage() {
//   const { userAccount, loading } = useSession();
//   const [userId, setUserId] = useState<string | null>(null);

//   useEffect(() => {
//     if (loading) return;

//     if (userAccount?.user_id) {
//       setUserId(userAccount.user_id);
//       localStorage.setItem('userId', userAccount.user_id); // optional
//       return;
//     }

//     const storedUserId = localStorage.getItem('userId');
//     if (storedUserId) {
//       setUserId(storedUserId);
//     }
//   }, [userAccount, loading]);

//   if (loading || !userId) {
//     return <div className="text-center py-8">Loading chat history...</div>;
//   }

//   return (
//     <div className="container mx-auto py-8">
//       <h1 className="text-3xl font-bold mb-8 text-center">Your Chat History</h1>
//       <ChatHistory userId={userId} />
//     </div>
//   );
// }
