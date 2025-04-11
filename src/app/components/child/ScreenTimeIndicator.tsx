// components/child/ScreenTimeIndicator.tsx
'use client';

import { useEffect, useState } from 'react';
import { screenTimeService } from '@/services/screenTimeService';
import { supabase } from '@/lib/supabase';

const ScreenTimeIndicator = () => {
    const [username, setUsername] = useState<string | null>(null);
    const [timeUsed, setTimeUsed] = useState<number>(0);
    const [timeLimit, setTimeLimit] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
  
    useEffect(() => {
      console.log("ScreenTimeIndicator mounted");
      
      const fetchTimeData = async () => {
        setIsLoading(true);
        console.log("Fetching time data");
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            console.log("No authenticated user found");
            setError("No authenticated user found");
            setIsLoading(false);
            return;
          }
  
          console.log("Found user:", user.id);
          const currentUsername = await screenTimeService.getUsername(user.id);
          if (!currentUsername) {
            console.log("Username not found");
            setError("Username not found");
            setIsLoading(false);
            return;
          }
          
          console.log("Username found:", currentUsername);
          setUsername(currentUsername);
          
          // Add debug to check time limit issues
          await screenTimeService.debugTimeLimit(currentUsername);
          
          // Get time limit with proper null handling
          let limit = await screenTimeService.getTimeLimit(currentUsername);
          // Make sure limit is either null or a number (not undefined)
          limit = (limit === undefined || limit === null) ? null : Number(limit);
          console.log("Time limit result:", limit);
          setTimeLimit(limit);
          
          const used = await screenTimeService.getTodayUsage(currentUsername);
          console.log("Time data fetched:", { limit, used });
          setTimeUsed(used || 0); // Ensure we have a default value
        } catch (error) {
          console.error("Error fetching time data:", error);
          setError("Error fetching time data");
        } finally {
          setIsLoading(false);
        }
      };
  
      fetchTimeData();
      
      // Set up periodic updates
      const updateTimer = setInterval(async () => {
        if (!username) {
          console.log("No username for update");
          return;
        }
        
        console.log("Updating time usage for:", username);
        try {
          const used = await screenTimeService.getTodayUsage(username);
          console.log("Updated usage:", used);
          setTimeUsed(used || 0); // Ensure we have a default value
        } catch (error) {
          console.error("Error updating time usage:", error);
        }
      }, 60 * 1000); // Update every minute
      
      return () => {
        console.log("ScreenTimeIndicator unmounting, clearing update timer");
        clearInterval(updateTimer);
      };
    }, [username]);
  
    if (isLoading) {
      console.log("Still loading time data");
      return null;
    }
  
    if (!username) {
      console.log("Missing username:", { username });
      return null;
    }
  
    // Handle no time limit case
    if (timeLimit === null || timeLimit === undefined) {
      console.log("No time limit set for user:", username);
      return (
        <div className="fixed top-16 right-4 bg-white border border-gray-200 p-3 rounded-lg shadow-md w-48 z-50">
          <h3 className="text-sm font-medium mb-1">Reading Time</h3>
          <p className="text-xs text-gray-600">
            {timeUsed} minutes used today
          </p>
          <p className="text-xs text-gray-500 mt-1">No time limit set</p>
        </div>
      );
    }
  
    // Only calculate these if we have a valid timeLimit
    const remainingMinutes = Math.max(0, timeLimit - timeUsed);
    const percentRemaining = timeLimit > 0 ? (remainingMinutes / timeLimit) * 100 : 100;
    
    console.log("Rendering indicator with:", { 
      timeLimit, 
      timeUsed, 
      remainingMinutes, 
      percentRemaining 
    });
    
    // Determine color based on time remaining
    let progressColor = "bg-green-500";
    let textColor = "text-green-700";
    
    if (percentRemaining < 25) {
      progressColor = "bg-red-500";
      textColor = "text-red-700";
    } else if (percentRemaining < 50) {
      progressColor = "bg-yellow-500";
      textColor = "text-yellow-700";
    }
  
    // Format time in hours and minutes if over 60 minutes
    const formatTimeRemaining = () => {
      if (remainingMinutes >= 60) {
        const hours = Math.floor(remainingMinutes / 60);
        const minutes = Math.floor(remainingMinutes % 60);
        return `${hours}h ${minutes}m`;
      } else {
        return `${Math.floor(remainingMinutes)}m`;
      }
    };
  
    return (
      <div className="fixed top-16 right-4 bg-white border border-gray-200 p-3 rounded-lg shadow-md w-48 z-50">
        <div className="mb-1 flex justify-between items-center">
          <h3 className="text-sm font-medium">Reading Time</h3>
          <span className={`text-sm font-medium ${textColor}`}>
            {formatTimeRemaining()} left
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`${progressColor} h-2.5 rounded-full`} 
            style={{ width: `${percentRemaining}%` }}
          ></div>
        </div>
      </div>
    );
  };

export default ScreenTimeIndicator;