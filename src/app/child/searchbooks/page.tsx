'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import ChatBot from '@/app/components/ChatBot';
import SearchContent from '@/app/components/child/SearchBookContent';

export default function SearchBooksPage() {
  const router = useRouter();

  const handleBackToSearch = () => {
    // Navigate directly to the main search page
    router.push('/search');
  };

  return (
    <div className="flex flex-col min-h-screen relative">
      <div 
        className="absolute inset-0 bg-repeat bg-center"
        style={{ backgroundImage: 'url(/stars.png)' }}
      />
      <Navbar />
      <div className="flex-1 overflow-y-auto pt-16 px-6 relative">
        {/* Back to Search Button */}
        <button
          onClick={handleBackToSearch}
          className="mb-4 px-4 py-2 flex items-center text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          aria-label="Go back to search page"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 mr-1" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" 
              clipRule="evenodd" 
            />
          </svg>
          Back
        </button>

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