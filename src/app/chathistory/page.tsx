'use client';

import Navbar from '@/app/components/Navbar';
import ChatBot from '@/app/components/ChatBot';
import ChatHistory from '@/app/components/child/chathistory/ChatHistory';
import useChildData from '@/hooks/useChildData';

export default function ChatPage() {
  const { userFullName, uaidChild, isLoading } = useChildData();

  if (isLoading) return <p className="text-center mt-20">Loading...</p>;

  return (
    <div
      className="flex flex-col h-screen"
      style={{
        backgroundImage: 'url("/stars.png")',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      }}
    >
      <Navbar />
      <div className="flex-1 flex flex-col items-center pt-16 px-4 overflow-hidden">
        <div className="w-full max-w-4xl flex-1 overflow-y-auto mt-8">
          <ChatHistory userId={uaidChild ?? ''} userFullName={userFullName} />
        </div>
      </div>
      <ChatBot />
    </div>
  );
}