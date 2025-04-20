'use client';

import Navbar from '../components/Navbar';
import ChatBot from '../components/ChatBot';
import ChatHistory from '../components/child/chathistory/ChatHistory';
import useChildData from '../../hooks/useChildData';

export default function ChatPage() {
  const { userFullName, uaidChild, isLoading } = useChildData();

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
      <ChatBot />
    </div>
  );
}