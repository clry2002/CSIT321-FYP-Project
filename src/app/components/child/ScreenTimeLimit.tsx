// components/child/ScreenTimeLimit.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { screenTimeService } from '@/services/screenTimeService';

const ScreenTimeLimit = () => {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [timeUsed, setTimeUsed] = useState<number>(0);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [checking, setChecking] = useState<boolean>(true);

  // Check once on mount
  useEffect(() => {
    const checkInitialTimeLimit = async () => {
      console.log("ScreenTimeLimit: Initial check");
      setChecking(true);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log("No authenticated user");
          setChecking(false);
          return;
        }
  
        console.log("User found:", user.id);
        const currentUsername = await screenTimeService.getUsername(user.id);
        if (!currentUsername) {
          console.log("Username not found");
          setChecking(false);
          return;
        }
        
        console.log("Username found:", currentUsername);
        setUsername(currentUsername);
        
        // Debug time limit specifically
        await screenTimeService.debugTimeLimit(currentUsername);
        
        const limit = await screenTimeService.getTimeLimit(currentUsername);
        const used = await screenTimeService.getTodayUsage(currentUsername);
        
        console.log("Time data:", { limit, used });
        setTimeLimit(limit);
        setTimeUsed(used);
        
        if (limit !== null && used >= limit) {
          console.log("Time limit reached on initial check");
          await handleTimeLimitReached();
        }
      } catch (error) {
        console.error("Error in checkInitialTimeLimit:", error);
      } finally {
        setChecking(false);
      }
    };
  
    checkInitialTimeLimit();
  }, [router]);

  // Set up periodic checks
  useEffect(() => {
    if (!username) return;
    
    console.log("Setting up periodic time limit checks for:", username);
    
    const checkTimer = setInterval(async () => {
      console.log("Periodic check: Getting current usage");
      try {
        const used = await screenTimeService.getTodayUsage(username);
        console.log("Current usage:", used, "Limit:", timeLimit);
        setTimeUsed(used);
        
        if (timeLimit !== null && used >= timeLimit) {
          console.log("Time limit reached during periodic check");
          await handleTimeLimitReached();
          clearInterval(checkTimer);
        }
      } catch (error) {
        console.error("Error in periodic time check:", error);
      }
    }, 60 * 1000); // Check every minute
    
    return () => {
      console.log("Clearing periodic time limit checks");
      clearInterval(checkTimer);
    };
  }, [username, timeLimit, router]);

  const handleTimeLimitReached = async () => {
    console.log("Time limit reached, handling logout");
    // Show a more child-friendly message
    alert("Your reading time is over for today. Time to take a break! You can come back tomorrow.");
    
    try {
      await screenTimeService.endSession();
      await supabase.auth.signOut();
      router.push('/landing');
    } catch (error) {
      console.error("Error during time limit logout:", error);
    }
  };

  // Optional: Add a visual indicator for remaining time
  const remainingMinutes = timeLimit !== null ? Math.max(0, timeLimit - timeUsed) : null;
  
  if (checking) {
    console.log("Still checking time limits...");
    return null;
  }
  
  if (!username) {
    console.log("No username available");
    return null;
  }
  
  console.log("Rendering with remaining minutes:", remainingMinutes);
  
  return remainingMinutes !== null && remainingMinutes < 10 ? (
    <div className="fixed bottom-4 right-4 bg-amber-50 border border-amber-200 p-3 rounded-lg shadow-md z-50">
      <p className="text-amber-800 font-medium">
        {remainingMinutes <= 0 
          ? "Time's up! Signing out..." 
          : `${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'} of reading time left today`}
      </p>
    </div>
  ) : null;
};

export default ScreenTimeLimit;