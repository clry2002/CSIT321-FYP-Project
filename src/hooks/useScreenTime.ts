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

  // Formatted values
  formattedTimeRemaining: string;
  progressColor: string;
  textColor: string;
  
  // Actions
  startSessionTracking: () => Promise<void>;
  endSessionTracking: () => Promise<void>;
}

export const useScreenTime = ({ onTimeExceeded }: UseScreenTimeProps = {}): UseScreenTimeResult => {
  const [childId, setChildId] = useState<string | null>(null);
  const [timeUsed, setTimeUsed] = useState<number>(0);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLimitExceeded, setIsLimitExceeded] = useState(false);
  
  // Use refs to maintain values without triggering re-renders
  const hasCalledTimeExceededRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const childIdRef = useRef<string | null>(null);
  const timeLimitRef = useRef<number | null>(null);
  const timeUsedRef = useRef<number>(0);
  const isLimitExceededRef = useRef(false);
  const initCompletedRef = useRef(false);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const initialLoginTimeRef = useRef<number>(Date.now());
  const isNewLoginSessionRef = useRef(true);
  const shouldEnforceTimeLimitRef = useRef(false);
  const gracePeriodTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Debug counter for time updates
  const updateCountRef = useRef(0);
  
  // Calculate derived values safely
  const calculateDerivedValues = () => {
    // Get latest values from refs
    const currentTimeLimit = timeLimitRef.current;
    const currentTimeUsed = timeUsedRef.current;
    
    // Calculate time remaining - handle large limits specially
    let timeRemainingValue: number | null = null;
    let percentRemainingValue: number | null = null;
    
    if (currentTimeLimit === null) {
      // No limit case
      timeRemainingValue = null;
      percentRemainingValue = 100; // Always show full
    } else if (currentTimeLimit >= 1000) {
      // Very large limit case - treat as unlimited
      timeRemainingValue = 999; // Just a large number for display
      percentRemainingValue = 100; // Always show full
    } else {
      // Normal limit case
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

    // Format time string
    let formattedTimeRemainingValue = 'No limit';
    
    if (currentTimeLimit !== null) {
      if (currentTimeLimit >= 1000) {
        formattedTimeRemainingValue = 'Unlimited';
      } else if (timeRemainingValue !== null) {
        if (timeRemainingValue >= 60) {
          const hours = Math.floor(timeRemainingValue / 60);
          const minutes = Math.floor(timeRemainingValue % 60);
          formattedTimeRemainingValue = `${hours}h ${minutes}m`;
        } else {
          formattedTimeRemainingValue = `${Math.floor(timeRemainingValue)}m`;
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
  };
  
  // Create a memoized derived values object
  const derivedValuesRef = useRef(calculateDerivedValues());
  
  // Update derived values when source values change
  const updateDerivedValues = useCallback(() => {
    derivedValuesRef.current = calculateDerivedValues();
  }, []);

  // Setup grace period for time limit enforcement
  const setupTimeLimitGracePeriod = useCallback(() => {
    console.log("Setting up grace period for time limit enforcement");
    
    // Mark as new login session
    isNewLoginSessionRef.current = true;
    
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
  }, []);

  // Function to check if time limit is exceeded
  const checkTimeLimitExceeded = useCallback(() => {
    // Get latest values
    const currentTimeLimit = timeLimitRef.current;
    const currentTimeUsed = timeUsedRef.current;
    
    // Skip check if we shouldn't enforce time limit yet
    if (!shouldEnforceTimeLimitRef.current) {
      console.log("Not enforcing time limit yet (in grace period)");
      return;
    }
    
    console.log("Checking time limit:", {
      timeLimit: currentTimeLimit,
      timeUsed: currentTimeUsed,
      shouldEnforce: shouldEnforceTimeLimitRef.current,
      isLimitExceeded: isLimitExceededRef.current,
      hasCalledTimeExceeded: hasCalledTimeExceededRef.current
    });
    
    // Only check if we have valid data and haven't already exceeded
    if (currentTimeLimit !== null && 
        currentTimeLimit < 1000 && 
        currentTimeUsed > 0 && 
        currentTimeUsed >= currentTimeLimit && 
        !isLimitExceededRef.current) {
      
      console.log("Time limit exceeded:", {
        timeLimit: currentTimeLimit, 
        timeUsed: currentTimeUsed
      });
      
      isLimitExceededRef.current = true;
      setIsLimitExceeded(true);
      
      if (onTimeExceeded && !hasCalledTimeExceededRef.current) {
        hasCalledTimeExceededRef.current = true;
        onTimeExceeded();
      }
    }
  }, [onTimeExceeded]);

  // Clean up timers when component unmounts
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      if (gracePeriodTimerRef.current) {
        clearTimeout(gracePeriodTimerRef.current);
        gracePeriodTimerRef.current = null;
      }
    };
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
      } else {
        console.error("Failed to create valid session!");
      }
    } catch (error) {
      console.error("Error starting session tracking:", error);
    }
  }, []);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set up periodic updates for time used - dependencies minimized
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

        // Check if time limit is now exceeded
        checkTimeLimitExceeded();
        
        console.log(`Time update #${updateCountRef.current}: used=${used.toFixed(1)}, limit=${timeLimitRef.current}`);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Formatted values
    formattedTimeRemaining: derivedValuesRef.current.formattedTimeRemaining,
    progressColor: derivedValuesRef.current.progressColor,
    textColor: derivedValuesRef.current.textColor,
    
    // Actions
    startSessionTracking,
    endSessionTracking
  };
};