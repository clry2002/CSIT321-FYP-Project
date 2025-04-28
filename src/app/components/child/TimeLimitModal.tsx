'use client';

import React, { useEffect, useState, useRef, memo } from 'react';

interface TimeLimitModalProps {
  onClose: () => void;
}

// Use React.memo to prevent unnecessary re-renders
const TimeLimitModal = memo(({ onClose }: TimeLimitModalProps) => {
  const [isClosing, setIsClosing] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const hasTriggeredCloseRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle automatic logout after displaying message
  useEffect(() => {
    console.log("TimeLimitModal mounted, starting countdown from 5");
    
    if (hasTriggeredCloseRef.current) return;
    
    // Start countdown
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Start a timer to automatically close after 5 seconds
    timerRef.current = setTimeout(() => {
      if (hasTriggeredCloseRef.current) return;
      
      console.log("Auto-closing time limit modal after countdown");
      hasTriggeredCloseRef.current = true;
      
      setIsClosing(true);
      
      // Add a small delay before actually executing onClose to allow animation
      closeTimeoutRef.current = setTimeout(() => {
        if (onClose) onClose();
      }, 500);
    }, 5000);
    
    return () => {
      // Clean up all timers when unmounting
      console.log("TimeLimitModal unmounting, cleaning up timers");
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
  }, [onClose]);

  // Handle manual close button click
  const handleClose = () => {
    if (hasTriggeredCloseRef.current) return;
    
    console.log("Manual close of time limit modal");
    hasTriggeredCloseRef.current = true;
    
    // Clear timers to prevent conflicts
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    
    setIsClosing(true);
    
    // Add a small delay before actually executing onClose to allow animation
    closeTimeoutRef.current = setTimeout(() => {
      if (onClose) onClose();
    }, 500);
  };

  console.log("Rendering TimeLimitModal, countdown:", countdown);

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
      <div className={`bg-white rounded-lg p-8 max-w-md w-full shadow-xl transition-all duration-500 ${isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        <div className="text-center">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-8 w-8 text-red-500" 
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
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Time&apos;s Up!
          </h2>
          <p className="text-gray-600 mb-6">
            You&apos;ve reached your daily time limit for today. 
            Please come back tomorrow for more reading time.
          </p>
          <div className="mb-4 text-sm text-gray-500">
            Logging out in {countdown} second{countdown !== 1 ? 's' : ''}...
          </div>
          <button
            onClick={handleClose}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md w-full transition duration-200"
            disabled={isClosing}
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
});

// Add display name for better debugging
TimeLimitModal.displayName = 'TimeLimitModal';

export default TimeLimitModal;