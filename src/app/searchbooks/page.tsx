'use client';

import { Suspense } from 'react';
import Navbar from '../components/Navbar';
import ChatBot from '../components/ChatBot';
import SearchContent from '../components/child/SearchBookContent';

export default function SearchBooksPage() {
  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Navbar />
      <div className="flex-1 overflow-y-auto pt-16 px-6 relative">
        <Suspense fallback={<div className="text-center py-8">Loading search...</div>}>
          <SearchContent />
        </Suspense>
        
        {/* Chatbot */}
        <div className="absolute bottom-0 right-0 m-4">
          <ChatBot />
        </div>
      </div>
    </div>
  );
}