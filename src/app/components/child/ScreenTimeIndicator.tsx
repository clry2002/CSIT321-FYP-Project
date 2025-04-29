'use client';

import { useEffect, memo, useRef, useState } from 'react';
import { useScreenTime } from '@/hooks/useScreenTime';
import { screenTimeService } from '@/services/screenTimeService';

interface ScreenTimeIndicatorProps {
  onTimeExceeded?: () => void;
  forceCheckInterval?: number;
}

// Use React.memo to prevent unnecessary re-renders
const ScreenTimeIndicator = memo(({ 
  onTimeExceeded,
  forceCheckInterval = 15000 // Check every 15 seconds
}: ScreenTimeIndicatorProps) => {
  const {
    childId,
    timeLimit,
    timeUsed,
    timeRemaining,
    isLoading,
    endSessionTracking,
    error,
    isLimitExceeded
  } = useScreenTime({ onTimeExceeded });

  // Add state for real-time seconds countdown
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [lastSeenTimeUsed, setLastSeenTimeUsed] = useState<number>(0);
  const [localTimeUsed, setLocalTimeUsed] = useState<number>(0);
  const [sessionStartTime] = useState<number>(Date.now());
  
  // Track the last time we synced with the hook
  const lastSyncTimeRef = useRef<number>(Date.now());
  
  // Refs to hold the latest values from the hook without causing re-renders
  const timeRemainingRef = useRef<number | null>(null);
  const timeLimitRef = useRef<number | null>(null);
  const timeUsedRef = useRef<number>(0);
  const countdownStartedRef = useRef<boolean>(false);
  const hasCalledTimeExceededRef = useRef<boolean>(false);
  
  // Flag to track if we're actively counting down
  const isCountingDownRef = useRef<boolean>(false);
  
  // Debugging reference to track renders
  const renderCount = useRef(0);
  renderCount.current++;

  // Session timer for tracking time used in unlimited mode
  const [sessionDuration, setSessionDuration] = useState<number>(0);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isUnlimitedModeRef = useRef<boolean>(false);

  // Check if we're in unlimited mode
  useEffect(() => {
    isUnlimitedModeRef.current = !timeLimit || timeLimit === 0 || timeLimit >= 1000;
    
    // Start session timer for unlimited mode
    if (isUnlimitedModeRef.current && childId && !sessionTimerRef.current) {
      console.log('Starting unlimited mode session timer');
      sessionTimerRef.current = setInterval(() => {
        const elapsedMinutes = (Date.now() - sessionStartTime) / (1000 * 60);
        setSessionDuration(elapsedMinutes);
      }, 10000); // Update every 10 seconds
    }
    
    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
    };
  }, [timeLimit, childId, sessionStartTime]);

  // Estimate real-time time used based on session duration
  useEffect(() => {
    if (!childId) return;

    const estimateTimeUsedTimer = setInterval(() => {
      // Update local time used based on session duration + server value
      const now = Date.now();
      const sessionDurationMinutes = (now - sessionStartTime) / (1000 * 60);
      
      // Add session duration to the last seen time used from the server
      const estimatedTimeUsed = lastSeenTimeUsed + sessionDurationMinutes;
      
      // Update local state and ref
      setLocalTimeUsed(estimatedTimeUsed);
      timeUsedRef.current = estimatedTimeUsed;
      
      // Only check for time exceeded if we have a non-unlimited limit
      if (timeLimit && timeLimit > 0 && timeLimit < 1000) {
        // Check if estimated time used exceeds limit
        if (estimatedTimeUsed >= (timeLimit) && !hasCalledTimeExceededRef.current) {
          console.log('Estimated time used exceeds limit:', {
            estimatedTimeUsed: estimatedTimeUsed.toFixed(2),
            timeLimit
          });
          
          hasCalledTimeExceededRef.current = true;
          
          if (onTimeExceeded) {
            console.log('Calling onTimeExceeded from time used estimation');
            onTimeExceeded();
          }
        }
      }
    }, 5000); // Update every 5 seconds
    
    return () => {
      clearInterval(estimateTimeUsedTimer);
    };
  }, [childId, timeLimit, lastSeenTimeUsed, onTimeExceeded, sessionStartTime]);

  // Track local time usage
  useEffect(() => {
    // Update lastSeenTimeUsed whenever timeUsed from the hook changes
    if (timeUsed !== lastSeenTimeUsed) {
      console.log('Server time used updated:', { from: lastSeenTimeUsed, to: timeUsed });
      setLastSeenTimeUsed(timeUsed);
      timeUsedRef.current = timeUsed;
    }
  }, [timeUsed, lastSeenTimeUsed]);

  // Set up a manual time checking timer
  useEffect(() => {
    if (!childId) return;
    
    console.log(`Setting up force check timer (every ${forceCheckInterval/1000}s)`);
    
    const checkTimer = setInterval(async () => {
      try {
        // Get fresh usage data
        if (!childId) return;
        
        const freshTimeUsed = await screenTimeService.getTodayUsage(childId);
        console.log('Force check fresh time used:', freshTimeUsed.toFixed(2));
        
        // Update ref and state
        timeUsedRef.current = freshTimeUsed;
        setLastSeenTimeUsed(freshTimeUsed);
        
        // Only check for exceeded time if not in unlimited mode
        if (timeLimit && timeLimit > 0 && timeLimit < 1000) {
          // If time used is greater than or equal to time limit, trigger exceeded
          if (freshTimeUsed >= (timeLimit) && !hasCalledTimeExceededRef.current) {
            console.log('Force check timer detected time limit exceeded', {
              timeUsed: freshTimeUsed.toFixed(2),
              timeLimit
            });
            
            hasCalledTimeExceededRef.current = true;
            
            if (onTimeExceeded) {
              console.log('Calling onTimeExceeded from force check timer');
              onTimeExceeded();
            }
          }
        }
      } catch (error) {
        console.error('Error in force check timer:', error);
      }
    }, forceCheckInterval);
    
    return () => {
      clearInterval(checkTimer);
    };
  }, [childId, timeLimit, forceCheckInterval, onTimeExceeded]);

  // Additional effect to handle limit exceeded state from hook
  useEffect(() => {
    if (isLimitExceeded && !hasCalledTimeExceededRef.current) {
      console.log('Time limit exceeded detected from hook');
      hasCalledTimeExceededRef.current = true;
      
      if (onTimeExceeded) {
        console.log('Calling onTimeExceeded from hook state change');
        onTimeExceeded();
      }
    }
  }, [isLimitExceeded, onTimeExceeded]);

  // Update our refs when hook values change
  useEffect(() => {
    console.log("Hook data changed:", { timeRemaining, timeLimit, timeUsed });
    timeRemainingRef.current = timeRemaining;
    timeLimitRef.current = timeLimit;
    timeUsedRef.current = timeUsed;
    
    // Only set up countdown for non-unlimited mode
    if (timeLimit && timeLimit > 0 && timeLimit < 1000 && timeRemaining !== null) {
      if (secondsLeft === null || !countdownStartedRef.current) {
        const newSecondsLeft = Math.floor(timeRemaining * 60);
        console.log("Initializing seconds counter:", newSecondsLeft);
        setSecondsLeft(newSecondsLeft);
        countdownStartedRef.current = true;
        lastSyncTimeRef.current = Date.now();
      } else if (!isCountingDownRef.current) {
        // Only sync with hook data if we're not actively counting down
        // This prevents jumps when hook data updates
        const currentSecondsLeft = Math.floor(timeRemaining * 60);
        const timeSinceLastSync = Date.now() - lastSyncTimeRef.current;
        
        // If time remaining has changed by more than 60 seconds 
        // or we haven't synced for 5 minutes, sync with hook data
        if (Math.abs((secondsLeft || 0) - currentSecondsLeft) > 60 || timeSinceLastSync > 300000) {
          console.log("Syncing with hook data due to significant change:", {
            from: secondsLeft,
            to: currentSecondsLeft,
            timeSinceLastSync
          });
          setSecondsLeft(currentSecondsLeft);
          lastSyncTimeRef.current = Date.now();
        }
      }
    }
  }, [timeRemaining, timeLimit, timeUsed, secondsLeft]);

  // Set up the seconds countdown timer - only for limited mode
  useEffect(() => {
    // Skip if we don't have valid time data or if time is unlimited
    if (!childId || !timeLimit || timeLimit === 0 || timeLimit >= 1000) {
      isCountingDownRef.current = false;
      return;
    }
    
    console.log("Starting second-by-second countdown timer");
    isCountingDownRef.current = true;
    
    const timer = setInterval(() => {
      setSecondsLeft((prevSeconds) => {
        if (prevSeconds === null) {
          // If no previous value, get from hook
          const currentTimeRemaining = timeRemainingRef.current;
          return currentTimeRemaining !== null ? Math.floor(currentTimeRemaining * 60) : null;
        }
        
        // If we're at 0, stay at 0
        if (prevSeconds <= 0) {
          // If we've reached 0 and haven't called the callback yet, do it now
          if (!hasCalledTimeExceededRef.current) {
            console.log('Countdown reached zero, time limit exceeded');
            hasCalledTimeExceededRef.current = true;
            
            if (onTimeExceeded) {
              console.log('Calling onTimeExceeded from countdown timer');
              onTimeExceeded();
            }
          }
          return 0;
        }
        
        // Decrement by 1 second
        const newValue = Math.max(0, prevSeconds - 1);
        
        // Check if we just hit 0
        if (newValue === 0 && !hasCalledTimeExceededRef.current) {
          console.log('Countdown just reached zero, time limit exceeded');
          hasCalledTimeExceededRef.current = true;
          
          if (onTimeExceeded) {
            console.log('Calling onTimeExceeded from countdown timer');
            onTimeExceeded();
          }
        }
        
        return newValue;
      });
    }, 1000);
    
    return () => {
      clearInterval(timer);
      isCountingDownRef.current = false;
    };
  }, [childId, timeLimit, onTimeExceeded]);

  // Clean up session tracking when component unmounts
  useEffect(() => {
    console.log("ScreenTimeIndicator mounted");
    
    return () => {
      console.log("ScreenTimeIndicator unmounting, cleaning up");
      // Stop all timers
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
      endSessionTracking();
    };
  }, [endSessionTracking]);

  // Skip rendering while loading but log it
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

  // Custom formatting for time display
  let displayedTimeRemaining;
  let timeLeftLabel = "left";
  const displayTimeUsedValue = localTimeUsed.toFixed(1);
  
  // Format differently based on if we're in unlimited mode or limited mode
  const isUnlimitedTime = timeLimit === null || timeLimit === 0 || timeLimit >= 1000;
  
  if (isUnlimitedTime) {
    // Unlimited mode - show session duration instead of remaining time
    displayedTimeRemaining = "Unlimited";
    timeLeftLabel = "";
  } else if (secondsLeft !== null) {
    // Limited mode with countdown - format display based on seconds remaining
    const hours = Math.floor(secondsLeft / 3600);
    const minutes = Math.floor((secondsLeft % 3600) / 60);
    const seconds = secondsLeft % 60;
    
    // Format display based on time remaining
    if (hours > 0) {
      // Hours and minutes format (when > 1 hour left)
      displayedTimeRemaining = `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      // Always show minutes and seconds for real-time countdown
      displayedTimeRemaining = `${minutes}m ${seconds}s`;
    } else {
      // Only seconds format (when less than 1 minute)
      displayedTimeRemaining = `${seconds}s`;
    }
  } else {
    // Fallback to the hook's timeRemaining if secondsLeft is not available
    if (timeRemaining !== null) {
      const totalSeconds = timeRemaining * 60;
      const hours = Math.floor(timeRemaining / 60);
      const minutes = Math.floor(timeRemaining % 60);
      const seconds = Math.floor((totalSeconds % 60));
      
      if (hours > 0) {
        displayedTimeRemaining = `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        displayedTimeRemaining = `${minutes}m ${seconds}s`;
      } else {
        displayedTimeRemaining = `${seconds}s`;
      }
    } else {
      displayedTimeRemaining = "N/A";
      timeLeftLabel = "";
    }
  }

  // Determine colors based on time remaining
  let currentProgressColor = "bg-green-500";
  let currentTextColor = "text-green-700";
  
  // Calculate percent remaining based on local time used
  let realTimePercentRemaining = 100;
  
  if (timeLimit && timeLimit > 0 && timeLimit < 1000) {
    // Use the larger of the official timeUsed or our local estimate
    const effectiveTimeUsed = Math.max(localTimeUsed, timeUsed);
    const remainingTime = Math.max(0, timeLimit - effectiveTimeUsed);
    realTimePercentRemaining = Math.min(100, Math.max(0, (remainingTime / timeLimit) * 100));
    
    // Determine colors based on remaining percentage
    if (realTimePercentRemaining < 25) {
      currentProgressColor = "bg-red-500";
      currentTextColor = "text-red-700";
    } else if (realTimePercentRemaining < 50) {
      currentProgressColor = "bg-yellow-500";
      currentTextColor = "text-yellow-700";
    }
  }

  console.log("Rendering indicator with:", { 
    timeLimit, 
    timeUsed, 
    localTimeUsed,
    timeRemaining, 
    secondsLeft,
    percentRemaining: realTimePercentRemaining,
    displayedTimeRemaining,
    progressColor: currentProgressColor,
    isUnlimitedTime,
    renderCount: renderCount.current 
  });

  return (
    <div className="fixed top-16 right-4 bg-white border border-gray-200 p-3 rounded-lg shadow-md w-64 z-50">
      <div className="mb-1 flex justify-between items-center">
        <h3 className="text-sm text-black font-medium">Time Remaining</h3>
        <span className={`text-sm font-medium ${isUnlimitedTime ? 'text-green-700' : currentTextColor}`}>
          {displayedTimeRemaining} {timeLeftLabel}
        </span>
      </div>
      
      {isUnlimitedTime ? (
        // For unlimited mode, show a pulsing activity bar instead of progress bar
        <div className="w-full bg-gray-200 rounded-full h-2.5 relative overflow-hidden">
          <div 
            className="bg-green-500 h-2.5 absolute left-0 animate-pulse"
            style={{ width: '100%', animationDuration: '2s' }}
          ></div>
        </div>
      ) : (
        // For limited mode, show regular progress bar
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`${currentProgressColor} h-2.5 rounded-full`} 
            style={{ width: `${realTimePercentRemaining}%` }}
          ></div>
        </div>
      )}
      
      <div className="mt-1 text-xs text-gray-600 flex justify-between">
        <span>{displayTimeUsedValue} min used</span>
        <span>
          {timeLimit === null || timeLimit === 0 ? 
            "Unlimited" : 
            timeLimit >= 1000 ? 
              "Unlimited" : 
              `${timeLimit} min total`
          }
        </span>
      </div>
      
      {/* Session duration display for unlimited mode */}
      {isUnlimitedTime && (
        <div className="mt-1 text-xs text-gray-600 text-center border-t border-gray-100 pt-1">
          <span>Session: {sessionDuration.toFixed(1)} min</span>
        </div>
      )}
    </div>
  );
});

// Add display name for better debugging
ScreenTimeIndicator.displayName = 'ScreenTimeIndicator';

export default ScreenTimeIndicator;