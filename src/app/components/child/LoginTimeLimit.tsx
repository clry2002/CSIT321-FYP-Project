'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface TimeLimitExceededPageProps {
  timeUsed: number;
  timeLimit: number;
  username?: string;
  onBack: () => void;
}

const TimeLimitExceededPage: React.FC<TimeLimitExceededPageProps> = ({
  timeUsed,
  timeLimit,
  username = "there",
  onBack
}) => {
  const [currentHour, setCurrentHour] = useState<number>(0);
  const [remainingHours, setRemainingHours] = useState<number>(0);
  const [remainingMinutes, setRemainingMinutes] = useState<number>(0);
  
  useEffect(() => {
    // Get current time
    const now = new Date();
    const hour = now.getHours();
    setCurrentHour(hour);
    
    // Calculate time until midnight
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();
    const hoursUntilMidnight = Math.floor(msUntilMidnight / (1000 * 60 * 60));
    const minutesUntilMidnight = Math.floor((msUntilMidnight % (1000 * 60 * 60)) / (1000 * 60));
    
    setRemainingHours(hoursUntilMidnight);
    setRemainingMinutes(minutesUntilMidnight);
  }, []);
  
  // Determine greeting based on time of day
  const getGreeting = () => {
    if (currentHour >= 5 && currentHour < 12) {
      return "Good morning";
    } else if (currentHour >= 12 && currentHour < 18) {
      return "Good afternoon";
    } else {
      return "Good evening";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-900 to-purple-800">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="bg-red-50 p-4 border-b border-red-100">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-full">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-6 w-6 text-red-500" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            </div>
            <h2 className="ml-3 text-lg font-bold text-red-700">Time Limit Reached</h2>
          </div>
        </div>
        
        <div className="p-6">
          <div className="flex justify-center mb-6">
            <Image
              src="/mascot.png"
              alt="Mascot"
              width={100}
              height={100}
              className="animate-bounce"
            />
          </div>
          
          <h3 className="text-xl font-bold text-gray-800 mb-2">{getGreeting()}, {username}!</h3>
          
          <p className="text-gray-600 mb-4">
            You&apos;ve reached your reading time limit for today ({timeLimit} minutes).
            You&apos;ve already spent <span className="font-bold text-purple-700">{timeUsed.toFixed(1)} minutes</span> reading today.
          </p>
          
          <div className="bg-indigo-50 p-4 rounded-lg mb-6">
            <p className="text-indigo-800 font-medium">
              Your reading time will reset in:
            </p>
            <p className="text-2xl font-bold text-indigo-700 mt-2">
              {remainingHours} hours and {remainingMinutes} minutes
            </p>
            <p className="text-xs text-indigo-600 mt-1">
              (at midnight tonight)
            </p>
          </div>
          
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              Reading is great, but taking breaks is important too! Why not try:
            </p>
            
            <ul className="text-sm text-gray-700 space-y-2 ml-5 list-disc">
              <li>Drawing or coloring a picture</li>
              <li>Playing outside</li>
              <li>Helping with chores</li>
              <li>Talking to family members</li>
              <li>Building something creative</li>
            </ul>
          </div>
          
          <button
            onClick={onBack}
            className="w-full mt-6 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimeLimitExceededPage;