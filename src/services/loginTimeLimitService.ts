// services/loginTimeLimitService.ts
import { supabase } from '@/lib/supabase';
import { localStorageService } from './localStorageService';

export interface TimeLimitCheckResult {
  isExceeded: boolean;
  timeUsed: number;
  timeLimit: number | null;
  message: string;
}

export const timeLimitCheckService = {
  /**
   * Checks if a child user has exceeded their time limit
   * @param childId The database ID of the child user
   * @returns Object containing limit status information
   */
  checkUserTimeLimit: async (childId: string): Promise<TimeLimitCheckResult> => {
    try {
      console.log("Checking time limit during login for child ID:", childId);
      
      // Step 1: Check if we need to reset usage for a new day
      await timeLimitCheckService.checkAndResetDailyUsage(childId);
      
      // Step 2: Get the time limit for this child
      const { data: parentData, error: parentError } = await supabase
        .from('isparentof')
        .select('timeLimitMinute')
        .eq('child_id', childId);
        
      if (parentError) {
        console.error("Error fetching time limit:", parentError);
        return {
          isExceeded: false,
          timeUsed: 0,
          timeLimit: null,
          message: "Unable to check time limit"
        };
      }
      
      // Debug parent data
      console.log("Parent data for time limit:", parentData);
      
      // If no time limit is set, no parent relationship exists, or time limit is 0
      if (!parentData || 
          parentData.length === 0 || 
          parentData[0].timeLimitMinute === undefined || 
          parentData[0].timeLimitMinute === null ||
          parentData[0].timeLimitMinute === 0) { // Add check for 0 time limit
        return {
          isExceeded: false,
          timeUsed: 0,
          timeLimit: null, // Treat 0 as null (no limit)
          message: "No time limit set"
        };
      }
      
      const timeLimit = parentData[0].timeLimitMinute;
      
      // If time limit is "unlimited" (≥1000)
      if (timeLimit >= 1000) {
        return {
          isExceeded: false,
          timeUsed: 0,
          timeLimit,
          message: "Unlimited time"
        };
      }
      
      // Step 3: Get today's usage
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const startOfDay = todayStr + 'T00:00:00Z';
      const endOfDay = todayStr + 'T23:59:59Z';
      
      // Get usage records from the screen_usage table for today only
      const { data: usageData, error: usageError } = await supabase
        .from('screen_usage')
        .select('duration, usage_date')
        .eq('child_id', childId)
        .gte('usage_date', startOfDay)
        .lte('usage_date', endOfDay);
        
      if (usageError) {
        console.error("Error fetching usage data:", usageError);
        return {
          isExceeded: false,
          timeUsed: 0,
          timeLimit,
          message: "Unable to check usage data"
        };
      }
      
      // Debug the raw usage data
      console.log("Raw usage data for time limit check:", usageData);
      
      // Calculate total minutes used
      const totalSeconds = (usageData || []).reduce(
        (acc, record) => acc + (record.duration || 0), 
        0
      );
      
      // Convert to minutes
      const timeUsed = totalSeconds / 60;
      
      console.log(`Time limit check: Used=${timeUsed.toFixed(2)} minutes, Limit=${timeLimit} minutes (Limit type: ${typeof timeLimit})`);
      
      // Add a small buffer (0.1 min) to prevent false triggers on very small overages
      const buffer = 0.1;
      const isExceeded = timeUsed >= (timeLimit + buffer);
      
      return {
        isExceeded,
        timeUsed,
        timeLimit,
        message: isExceeded 
          ? `Daily time limit (${timeLimit} min) exceeded. Currently used: ${timeUsed.toFixed(1)} min.`
          : `Time remaining: ${Math.max(0, timeLimit - timeUsed).toFixed(1)} of ${timeLimit} minutes`
      };
    } catch (error) {
      console.error("Exception in checkUserTimeLimit:", error);
      return {
        isExceeded: false,
        timeUsed: 0,
        timeLimit: null,
        message: "Error checking time limit"
      };
    }
  },
  
  /**
   * Checks if we need to reset daily usage based on the last login date
   */
  checkAndResetDailyUsage: async (childId: string): Promise<void> => {
    if (!childId) return;
    
    try {
      console.log("Checking if daily usage reset needed for child ID:", childId);
      
      // Use localStorage to track the last login date
      const lastLoginKey = `last_login_${childId}`;
      const lastLoginStr = localStorageService.getItem(lastLoginKey);
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      console.log("Last login check:", { lastLoginStr, today });
      
      // If no record of last login, or last login was on a different day, reset usage
      if (!lastLoginStr || lastLoginStr !== today) {
        console.log("New day detected or first login, resetting usage");
        await timeLimitCheckService.resetTodayUsage(childId);
        
        // Update last login date in localStorage
        localStorageService.setItem(lastLoginKey, today);
        console.log("Updated last login date in localStorage:", today);
      } else {
        console.log("Same day login, not resetting usage");
      }
    } catch (e) {
      console.error("Exception in checkAndResetDailyUsage:", e);
    }
  },
  
  /**
   * Resets the current day's time usage for a child.
   */
  resetTodayUsage: async (childId: string): Promise<boolean> => {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const startOfDay = todayStr + 'T00:00:00Z';
      const endOfDay = todayStr + 'T23:59:59Z';
      
      console.log("Resetting usage for child ID:", childId, "for today");
      
      // First check if there's any usage to delete
      const { data: existingData } = await supabase
        .from('screen_usage')
        .select('id')
        .eq('child_id', childId)
        .gte('usage_date', startOfDay)
        .lte('usage_date', endOfDay);
        
      if (existingData && existingData.length > 0) {
        console.log(`Found ${existingData.length} usage records to delete`);
        
        // Delete today's usage records for this child
        const { error } = await supabase
          .from('screen_usage')
          .delete()
          .eq('child_id', childId)
          .gte('usage_date', startOfDay)
          .lte('usage_date', endOfDay);
          
        if (error) {
          console.error("Error resetting usage:", error);
          return false;
        }
        
        console.log("Successfully deleted usage records");
      } else {
        console.log("No usage records found to delete");
      }
      
      return true;
    } catch (error) {
      console.error("Exception in resetTodayUsage:", error);
      return false;
    }
  }
};