'use client';

import { useEffect, memo, useRef } from 'react';
import { useScreenTime } from '@/hooks/useScreenTime';

interface ScreenTimeIndicatorProps {
  onTimeExceeded?: () => void;
}

// Use React.memo to prevent unnecessary re-renders
const ScreenTimeIndicator = memo(({ onTimeExceeded }: ScreenTimeIndicatorProps) => {
  const {
    childId,
    timeLimit,
    timeUsed,
    timeRemaining,
    percentRemaining,
    isLoading,
    progressColor,
    textColor,
    endSessionTracking,
    error
  } = useScreenTime({ onTimeExceeded });

  // Debugging reference to track renders
  const renderCount = useRef(0);
  renderCount.current++;

  // Only set up cleanup, the hook handles starting tracking internally
  useEffect(() => {
    console.log("ScreenTimeIndicator mounted");
    
    return () => {
      console.log("ScreenTimeIndicator unmounting, cleaning up");
      endSessionTracking();
    };
  }, [endSessionTracking]);

  // Skip rendering while loading
  if (isLoading) {
    console.log("Still loading time data, not rendering indicator");
    return null;
  }

  // Handle error state
  if (error) {
    console.error("Screen time error:", error);
    return (
      <div className="fixed top-16 right-4 bg-white border border-red-200 p-3 rounded-lg shadow-md w-48 z-50">
        <h3 className="text-sm font-medium mb-1 text-red-700">Reading Time</h3>
        <p className="text-xs text-red-600">
          Unable to load screen time
        </p>
      </div>
    );
  }

  // Handle no child ID case
  if (!childId) {
    console.log("Missing child ID, rendering placeholder");
    return (
      <div className="fixed top-16 right-4 bg-white border border-gray-200 p-3 rounded-lg shadow-md w-48 z-50">
        <h3 className="text-sm font-medium mb-1">Reading Time</h3>
        <p className="text-xs text-gray-600">
          Unable to track time usage
        </p>
      </div>
    );
  }

  // Custom formatting for time remaining
  let displayedTimeRemaining: string;
  let timeLeftLabel = "left";
  
  if (timeLimit === null || timeLimit === undefined) {
    displayedTimeRemaining = "No limit";
    timeLeftLabel = "";
  } else if (timeLimit >= 1000) {
    displayedTimeRemaining = "Unlimited";
    timeLeftLabel = "";
  } else if (timeRemaining !== null) {
    if (timeRemaining >= 60) {
      const hours = Math.floor(timeRemaining / 60);
      const minutes = Math.floor(timeRemaining % 60);
      displayedTimeRemaining = `${hours}h ${minutes}m`;
    } else {
      displayedTimeRemaining = `${Math.floor(timeRemaining)}m`;
    }
  } else {
    displayedTimeRemaining = "N/A";
    timeLeftLabel = "";
  }

  // Make sure percentRemaining is a valid number between 0-100
  const safePercentRemaining = typeof percentRemaining === 'number' 
    ? Math.min(100, Math.max(0, percentRemaining)) 
    : 100;

  console.log("Rendering indicator with:", { 
    timeLimit, 
    timeUsed, 
    timeRemaining, 
    percentRemaining: safePercentRemaining,
    displayedTimeRemaining,
    renderCount: renderCount.current 
  });

  return (
    <div className="fixed top-16 right-4 bg-white border border-gray-200 p-3 rounded-lg shadow-md w-48 z-50">
      <div className="mb-1 flex justify-between items-center">
        <h3 className="text-sm font-medium">Reading Time</h3>
        <span className={`text-sm font-medium ${textColor}`}>
          {displayedTimeRemaining} {timeLeftLabel}
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className={`${progressColor} h-2.5 rounded-full`} 
          style={{ width: `${safePercentRemaining}%` }}
        ></div>
      </div>
      
      <div className="mt-1 text-xs text-gray-600 flex justify-between">
        <span>{timeUsed.toFixed(1)} min used</span>
        <span>{timeLimit === null ? "Unlimited" : timeLimit >= 1000 ? "Unlimited" : `${timeLimit} min total`}</span>
      </div>
    </div>
  );
});

// Add display name for better debugging
ScreenTimeIndicator.displayName = 'ScreenTimeIndicator';

export default ScreenTimeIndicator;