'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { screenTimeService } from '@/services/screenTimeService';

export interface UseScreenTimeProps {
  onTimeExceeded?: () => void;
}

export interface UseScreenTimeResult {
  // State
  childId: string | null;
  timeUsed: number;
  timeLimit: number | null;
  timeRemaining: number | null;
  percentRemaining: number | null;
  isLoading: boolean;
  isLimitExceeded: boolean;
  error: string | null;
  sessionDuration: number; // Added for unlimited mode tracking

  // Formatted values
  formattedTimeRemaining: string;
  progressColor: string;
  textColor: string;
  
  // Actions
  startSessionTracking: () => Promise<void>;
  endSessionTracking: () => Promise<void>;
  resetLimitExceededState: () => Promise<boolean>;
}

export const useScreenTime = ({ onTimeExceeded }: UseScreenTimeProps = {}): UseScreenTimeResult => {
  const [childId, setChildId] = useState<string | null>(null);
  const [timeUsed, setTimeUsed] = useState<number>(0);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLimitExceeded, setIsLimitExceeded] = useState(false);
  const [sessionDuration, setSessionDuration] = useState<number>(0); // Added for tracking session time
  
  // Use refs to maintain values without triggering re-renders
  const hasCalledTimeExceededRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null); // Added for session timing
  const childIdRef = useRef<string | null>(null);
  const timeLimitRef = useRef<number | null>(null);
  const timeUsedRef = useRef<number>(0);
  const isLimitExceededRef = useRef(false);
  const initCompletedRef = useRef(false);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const initialLoginTimeRef = useRef<number>(Date.now());
  const sessionStartTimeRef = useRef<number>(Date.now()); // Added to track session start
  const isNewLoginSessionRef = useRef(true);
  const shouldEnforceTimeLimitRef = useRef(false);
  const gracePeriodTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Debug counter for time updates
  const updateCountRef = useRef(0);
  
  // Calculate derived values safely
  const calculateDerivedValues = useCallback(() => {
    // Get latest values from refs
    const currentTimeLimit = timeLimitRef.current;
    const currentTimeUsed = timeUsedRef.current;
    
    // Calculate time remaining - handle special cases
    let timeRemainingValue: number | null = null;
    let percentRemainingValue: number | null = null;
    
    // Handle special cases: no limit, 0 limit, or unlimited (≥1000)
    if (currentTimeLimit === null || currentTimeLimit === 0) {
      // No limit case
      timeRemainingValue = null;
      percentRemainingValue = 100; // Always show full
    } else if (currentTimeLimit >= 1000) {
      // Very large limit case - treat as unlimited
      timeRemainingValue = 999; // Just a large number for display
      percentRemainingValue = 100; // Always show full
    } else {
      // Normal limit case with precise calculation
      // Maintain fractions for seconds-level precision
      timeRemainingValue = Math.max(0, currentTimeLimit - currentTimeUsed);
      
      percentRemainingValue = currentTimeLimit > 0 
        ? Math.min(100, Math.max(0, (timeRemainingValue / currentTimeLimit) * 100))
        : 100;
    }
    
    // Determine colors based on time remaining
    let progressColor = "bg-green-500";
    let textColor = "text-green-700";
    
    if (percentRemainingValue !== null && percentRemainingValue < 100) {
      if (percentRemainingValue < 25) {
        progressColor = "bg-red-500";
        textColor = "text-red-700";
      } else if (percentRemainingValue < 50) {
        progressColor = "bg-yellow-500";
        textColor = "text-yellow-700";
      }
    }

    // Format time string - now with seconds for small values
    let formattedTimeRemainingValue = 'No limit';
    
    if (currentTimeLimit !== null && currentTimeLimit > 0) {
      if (currentTimeLimit >= 1000) {
        formattedTimeRemainingValue = 'Unlimited';
      } else if (timeRemainingValue !== null) {
        // Convert to seconds for precision
        const totalSeconds = timeRemainingValue * 60;
        const hours = Math.floor(timeRemainingValue / 60);
        const minutes = Math.floor(timeRemainingValue % 60);
        const seconds = Math.floor(totalSeconds % 60);
        
        if (hours > 0) {
          // Hours and minutes format
          formattedTimeRemainingValue = `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
          if (minutes < 5) {
            // Minutes and seconds format when under 5 minutes
            formattedTimeRemainingValue = `${minutes}m ${seconds}s`;
          } else {
            // Just minutes when 5 minutes or more
            formattedTimeRemainingValue = `${minutes}m`;
          }
        } else {
          // Only seconds when less than a minute
          formattedTimeRemainingValue = `${seconds}s`;
        }
      }
    }
  
  return {
    timeRemaining: timeRemainingValue,
    percentRemaining: percentRemainingValue,
    progressColor,
    textColor,
    formattedTimeRemaining: formattedTimeRemainingValue
  };
}, []);
  
  // Create a memoized derived values object
  const derivedValuesRef = useRef(calculateDerivedValues());
  
  // Update derived values when source values change
  const updateDerivedValues = useCallback(() => {
    derivedValuesRef.current = calculateDerivedValues();
  }, [calculateDerivedValues]);

  // Function to reset limit exceeded state
  const resetLimitExceededState = useCallback(async () => {
    console.log("Resetting limit exceeded state");
    
    // Reset the internal ref first
    isLimitExceededRef.current = false;
    
    // Then update the state
    setIsLimitExceeded(false);
    
    // Reset the flag for calling onTimeExceeded
    hasCalledTimeExceededRef.current = false;
    
    // Force a fresh check of time limit
    const currentChildId = childIdRef.current;
    if (currentChildId) {
      try {
        // Get fresh time data using the service
        const { timeLimit: freshLimit, timeUsed: freshUsed, success } = 
          await screenTimeService.refreshTimeLimitData(currentChildId);
          
        if (success) {
          // Update refs first
          timeLimitRef.current = freshLimit;
          timeUsedRef.current = freshUsed;
          
          // Then update state
          setTimeLimit(freshLimit);
          setTimeUsed(freshUsed);
          
          // Update derived values
          updateDerivedValues();
          
          console.log("Successfully reset limit exceeded state with fresh data:", {
            timeLimit: freshLimit,
            timeUsed: freshUsed
          });
          
          return true;
        }
      } catch (error) {
        console.error("Error resetting limit exceeded state:", error);
      }
    }
    
    return false;
  }, [updateDerivedValues]);

  // Function to check if time limit is exceeded
  const checkTimeLimitExceeded = useCallback(() => {
    // Get latest values
    const currentTimeLimit = timeLimitRef.current;
    const currentTimeUsed = timeUsedRef.current;
    
    // Log current state for debugging
    console.log("Checking time limit:", {
      timeLimit: currentTimeLimit,
      timeUsed: currentTimeUsed,
      shouldEnforce: shouldEnforceTimeLimitRef.current,
      isLimitExceeded: isLimitExceededRef.current,
      hasCalledTimeExceeded: hasCalledTimeExceededRef.current
    });
    
    // Check if we need to enforce time limits yet
    if (!shouldEnforceTimeLimitRef.current) {
      console.log("Not enforcing time limit yet (in grace period)");
      
      // IMPORTANT: even in grace period, check if we've significantly exceeded the limit
      // This ensures the modal shows even during grace period if the user is way over limit
      if (currentTimeLimit !== null && 
          currentTimeLimit > 0 && 
          currentTimeLimit < 1000 && 
          currentTimeUsed > 0 && 
          currentTimeUsed >= (currentTimeLimit + 1)) { // Only trigger if more than 1 minute over
          
        console.log("Significantly over time limit, enforcing despite grace period");
        shouldEnforceTimeLimitRef.current = true; // Force enforcement
      } else {
        return; // Otherwise respect grace period
      }
    }
    
    // Only check if we have valid data, a non-zero time limit that's not unlimited
    if (currentTimeLimit !== null && 
        currentTimeLimit > 0 &&
        currentTimeLimit < 1000 && 
        currentTimeUsed > 0) {
        
      // Check if we're over the limit
      if (currentTimeUsed >= currentTimeLimit) {
        // Even if we've already exceeded, log the current status
        console.log(`Time used (${currentTimeUsed.toFixed(1)}) exceeds limit (${currentTimeLimit})`);
        
        // If we haven't already set the exceeded state, do it now
        if (!isLimitExceededRef.current) {
          console.log("Setting time limit exceeded state to true");
          isLimitExceededRef.current = true;
          setIsLimitExceeded(true);
          
          // Call onTimeExceeded callback if provided and not already called
          if (onTimeExceeded && !hasCalledTimeExceededRef.current) {
            console.log("Calling onTimeExceeded callback");
            hasCalledTimeExceededRef.current = true;
            onTimeExceeded();
          }
        }
      } else if (isLimitExceededRef.current) {
        // We were exceeding but now we're not (limit increased)
        console.log("Time limit no longer exceeded (limit increased):", {
          timeLimit: currentTimeLimit,
          timeUsed: currentTimeUsed
        });
        
        // Reset the exceeded state
        isLimitExceededRef.current = false;
        setIsLimitExceeded(false);
        
        // Allow calling onTimeExceeded again if needed in the future
        hasCalledTimeExceededRef.current = false;
      }
    }
  }, [onTimeExceeded]);

  // Setup grace period for time limit enforcement
  const setupTimeLimitGracePeriod = useCallback(() => {
    console.log("Setting up grace period for time limit enforcement");
    
    // Mark as new login session
    isNewLoginSessionRef.current = true;
    
    // Initialize the session start time
    sessionStartTimeRef.current = Date.now();
    
    // Initially don't enforce time limits (grace period)
    shouldEnforceTimeLimitRef.current = false;
    
    // Record initial login time
    initialLoginTimeRef.current = Date.now();
    
    // Clear any previous grace period timer
    if (gracePeriodTimerRef.current) {
      clearTimeout(gracePeriodTimerRef.current);
    }
    
    // Set grace period (15 seconds to allow time for data to load correctly)
    gracePeriodTimerRef.current = setTimeout(() => {
      console.log("Grace period ended, now enforcing time limits");
      shouldEnforceTimeLimitRef.current = true;
      
      // Check time limit after grace period ends
      checkTimeLimitExceeded();
    }, 15 * 1000);
  }, [checkTimeLimitExceeded]);

  // Clean up timers when component unmounts
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
      
      if (gracePeriodTimerRef.current) {
        clearTimeout(gracePeriodTimerRef.current);
        gracePeriodTimerRef.current = null;
      }
    };
  }, []);

  // Start session duration timer
  const startSessionDurationTimer = useCallback(() => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
    }
    
    console.log("Starting session duration timer");
    
    // Update session duration immediately
    const currentDuration = (Date.now() - sessionStartTimeRef.current) / (1000 * 60);
    setSessionDuration(currentDuration);
    
    // Set up timer to update session duration every 10 seconds
    sessionTimerRef.current = setInterval(() => {
      const elapsedMinutes = (Date.now() - sessionStartTimeRef.current) / (1000 * 60);
      setSessionDuration(elapsedMinutes);
    }, 10000);
  }, []);

  // Internal helper function for starting session tracking
  const startSessionTrackingInternal = useCallback(async (id: string) => {
    try {
      console.log("Starting session tracking for child ID:", id);
      
      // Check and reset daily usage if needed
      await screenTimeService.checkAndResetDailyUsage(id);
      
      // Start the session
      await screenTimeService.startSession(id);
      
      // Verify session was created
      const sessionData = screenTimeService.checkSessionData();
      console.log("Session verification:", sessionData);
      
      if (sessionData.hasValidSession) {
        screenTimeService.startHeartbeat();
        
        // Reset the session start time for accurate duration tracking
        sessionStartTimeRef.current = Date.now();
        
        // Start the session duration timer (for both limited and unlimited modes)
        startSessionDurationTimer();
      } else {
        console.error("Failed to create valid session!");
      }
    } catch (error) {
      console.error("Error starting session tracking:", error);
    }
  }, [startSessionDurationTimer]);

  // Fetch initial time data - run only once
  useEffect(() => {
    let mounted = true;
    
    // Setup grace period for time limit enforcement
    setupTimeLimitGracePeriod();
    
    const fetchTimeData = async () => {
      if (!mounted) return;
      
      setIsLoading(true);
      console.log("Fetching time data");
      
      try {
        // First check if we already have session data
        const sessionData = screenTimeService.checkSessionData();
        let userId: string | null = null;
        
        if (sessionData.hasValidSession) {
          console.log("Using existing session data:", sessionData);
          userId = sessionData.childId;
          
          // If resuming session, may not need full grace period
          isNewLoginSessionRef.current = false;
        } else {
          // No session data, need to look up the user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            console.log("No authenticated user found");
            if (mounted) {
              setError("No authenticated user found");
              setIsLoading(false);
            }
            return;
          }

          console.log("Found auth user:", user.id);
          // Get user's database ID
          userId = await screenTimeService.getUserId(user.id);
          if (!userId) {
            console.log("User DB ID not found");
            if (mounted) {
              setError("User DB ID not found");
              setIsLoading(false);
            }
            return;
          }
          
          // This is a new login session
          isNewLoginSessionRef.current = true;
        }
        
        console.log("User ID found:", userId);
        
        // Set only the ref first to avoid render
        childIdRef.current = userId;
        
        if (!mounted) return;
        
        // Then update state - this will cause render
        setChildId(userId);
        
        if (!userId) {
          console.error("No valid user ID after all checks");
          if (mounted) {
            setError("No valid user ID");
            setIsLoading(false);
          }
          return;
        }
        
        // Debug time limit
        await screenTimeService.debugTimeLimit(userId);
        
        // Get time limit
        let limit = await screenTimeService.getTimeLimit(userId);
        // Make sure limit is either null or a number (not undefined)
        limit = (limit === undefined || limit === null) ? null : Number(limit);
        console.log("Time limit result:", limit);
        
        // Set ref first
        timeLimitRef.current = limit;
        
        if (!mounted) return;
        
        // Then update state
        setTimeLimit(limit);
        
        // Get time used - check for table existence first
        // Make sure we properly check for daily reset
        await screenTimeService.checkAndResetDailyUsage(userId);
        
        // Now get the current usage for today
        const used = await screenTimeService.getTodayUsage(userId);
        console.log("Time data fetched:", { limit, used });
        
        // Set ref first
        timeUsedRef.current = used || 0;
        
        if (!mounted) return;
        
        // Then update state
        setTimeUsed(used || 0);
        
        // Update derived values
        updateDerivedValues();

        // Don't check time limit here - we'll do it after grace period
        // or immediately if it's a resumed session
        if (!isNewLoginSessionRef.current) {
          // If this is a resumed session, we can enforce time limits immediately
          shouldEnforceTimeLimitRef.current = true;
          checkTimeLimitExceeded();
        }
        
        // Mark initialization as complete
        initCompletedRef.current = true;

        // Automatically start session tracking once we have a valid child ID
        if (mounted) {
          await startSessionTrackingInternal(userId);
        }
      } catch (error) {
        console.error("Error fetching time data:", error);
        if (mounted) {
          setError("Error fetching time data");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchTimeData();
    
    return () => {
      mounted = false;
      
      // Clear grace period timer on cleanup
      if (gracePeriodTimerRef.current) {
        clearTimeout(gracePeriodTimerRef.current);
        gracePeriodTimerRef.current = null;
      }
    };
  }, [setupTimeLimitGracePeriod, checkTimeLimitExceeded, updateDerivedValues, startSessionTrackingInternal]);

  // Set up periodic updates for time used - for both limited and unlimited modes
  useEffect(() => {
    // Only run if we have a child ID
    const currentChildId = childIdRef.current;
    if (!currentChildId) return;

    console.log("Setting up periodic updates for child ID:", currentChildId);
    
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    let previousTimeUsed = timeUsedRef.current;
    
    // Set up new timer
    timerRef.current = setInterval(async () => {
      // Use ref for reliable access to ID at callback time
      const currentChildId = childIdRef.current;
      if (!currentChildId) {
        console.log("No child ID for update");
        return;
      }
      
      // Rate limit updates to prevent excessive queries
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
      if (timeSinceLastUpdate < 30000) { // At least 30 seconds between updates
        return;
      }
      
      lastUpdateTimeRef.current = now;
      updateCountRef.current++;
      
      try {
        // Always track time usage even in unlimited mode
        const used = await screenTimeService.getTodayUsage(currentChildId);
        
        // Update ref immediately
        timeUsedRef.current = used || 0;
        
        // Only update state if value has changed significantly (0.5 min)
        // This prevents unnecessary re-renders
        if (Math.abs(used - previousTimeUsed) >= 0.5) {
          previousTimeUsed = used;
          setTimeUsed(used || 0);
          
          // Update derived values whenever time used changes significantly
          updateDerivedValues();
        }

        // Only check time limit exceeded for limited mode
        const currentTimeLimit = timeLimitRef.current;
        const isUnlimitedMode = !currentTimeLimit || currentTimeLimit === 0 || currentTimeLimit >= 1000;
        
        if (!isUnlimitedMode) {
          // Check if time limit is now exceeded (only for limited mode)
          checkTimeLimitExceeded();
        }
        
        // Log update for either mode
        console.log(`Time update #${updateCountRef.current}: used=${used.toFixed(1)}, limit=${timeLimitRef.current}, mode=${isUnlimitedMode ? 'unlimited' : 'limited'}`);
      } catch (error) {
        console.error("Error updating time usage:", error);
      }
    }, 60 * 1000); // Update every minute
    
    return () => {
      if (timerRef.current) {
        console.log("Clearing update timer");
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []); 

  // Start session tracking - memoized with useCallback
  const startSessionTracking = useCallback(async () => {
    // Use ref instead of state to ensure we have the latest value
    const currentChildId = childIdRef.current;
    
    if (currentChildId) {
      // If we already have a child ID, use it directly
      await startSessionTrackingInternal(currentChildId);
    } else if (!isLoading) {
      // If not loading and no child ID, it's truly missing
      console.error("Cannot start session tracking: No child ID available");
    } else {
      // We're still loading, so we'll let the initialization effect handle it
      console.log("Deferring session tracking until child ID is available");
    }
  }, [isLoading, startSessionTrackingInternal]);

  // End session tracking - memoized with useCallback
  const endSessionTracking = useCallback(async () => {
    console.log("Ending session tracking");
    
    // Clean up session timer
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    
    // End the session in the service
    await screenTimeService.endSession();
  }, []);

  return {
    // State
    childId,
    timeUsed,
    timeLimit,
    timeRemaining: derivedValuesRef.current.timeRemaining,
    percentRemaining: derivedValuesRef.current.percentRemaining,
    isLoading,
    isLimitExceeded,
    error,
    sessionDuration, // Added for unlimited mode

    // Formatted values
    formattedTimeRemaining: derivedValuesRef.current.formattedTimeRemaining,
    progressColor: derivedValuesRef.current.progressColor,
    textColor: derivedValuesRef.current.textColor,
    
    // Actions
    startSessionTracking,
    endSessionTracking,
    resetLimitExceededState
  };
};