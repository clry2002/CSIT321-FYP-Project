'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function HomePage() {
  const router = useRouter();
  const [timeoutOccurred, setTimeoutOccurred] = useState(false);
  
  // Add a fallback timeout to redirect if AuthGuard gets stuck
  useEffect(() => {
    // Set a timeout to display a fallback UI and redirect to landing after delay
    const timeoutId = setTimeout(() => {
      console.log('Root page timeout triggered, redirecting to landing page');
      setTimeoutOccurred(true);
      
      // Give the user a moment to see the message, then redirect
      const redirectTimeout = setTimeout(() => {
        router.replace('/landing');
      }, 1500);
      
      return () => clearTimeout(redirectTimeout);
    }, 3000); // Wait 3 seconds before showing fallback
    
    return () => clearTimeout(timeoutId);
  }, [router]);
  
  // If timeout occurs, show a nice loading screen
  if (timeoutOccurred) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-purple-50 to-white">
        <div className="text-center p-8">
          <div className="mb-6">
            <Image 
              src="/logo2.png" 
              alt="CoReadability Logo" 
              width={100} 
              height={100} 
              className="mx-auto mb-4"
              unoptimized
            />
            <h1 className="text-3xl font-bold text-purple-700 mb-2">CoReadability</h1>
          </div>
          <p className="text-lg text-gray-600">Redirecting to our homepage...</p>
          <div className="mt-4">
            <div className="w-12 h-1 bg-purple-200 rounded-full mx-auto animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }
  
  // Return null initially
  return null;
}