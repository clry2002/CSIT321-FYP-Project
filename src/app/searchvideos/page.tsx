'use client';

import { Suspense } from 'react';
import Navbar from '../components/Navbar';
import ChatBot from '../components/ChatBot';
import SearchVideoContent from '../components/child/SearchVideoContent';

export default function SearchVideosPage() {
  return (
    <div className="flex flex-col min-h-screen relative">
      <div 
        className="absolute inset-0 bg-repeat bg-center"
        style={{ backgroundImage: 'url(/stars.png)' }}
      />
      <Navbar />
      <div className="flex-1 overflow-y-auto pt-16 px-6 relative">
        <Suspense fallback={<div className="text-center py-8">Loading search...</div>}>
          <SearchVideoContent />
        </Suspense>
        
        {/* Chatbot */}
        <div className="absolute bottom-0 right-0 m-4">
          <ChatBot />
        </div>
      </div>
    </div>
  );
}