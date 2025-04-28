// services/screenTimeService.ts
import { supabase } from '@/lib/supabase';

// Define interface for usage data
interface UsageRecord {
  id: number;
  child_id: string;
  duration: number;
  usage_date: string;
}

interface UsageResponse {
  data?: UsageRecord[];
  error?: string | Error;
}

// For browser-safe localStorage access
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  }
};

// Cache user information to reduce database calls
let heartbeatInterval: NodeJS.Timeout | null = null;
let isTableChecked = false;
let isTableExists = false;

export const screenTimeService = {
  getUserId: async (authUserId: string): Promise<string | null> => {
    console.log("Getting user_account.id for auth user ID:", authUserId);
    
    try {
      if (!authUserId) {
        console.error("No auth user ID provided to getUserId");
        return null;
      }
      
      const { data, error } = await supabase
        .from('user_account')
        .select('id')
        .eq('user_id', authUserId)
        .single();

      if (error) {
        console.error("Error fetching user_account.id:", error);
        return null;
      }

      if (!data) {
        console.error("User account not found for auth ID:", authUserId);
        return null;
      }

      console.log("Found user_account.id:", data.id);
      return data.id;
    } catch (e) {
      console.error("Exception in getUserId:", e);
      return null;
    }
  },

  checkTableExists: async (): Promise<boolean> => {
    if (isTableChecked) return isTableExists;
    
    try {
      // Try a simple count query to check if table exists
      const { error } = await supabase
        .from('screen_usage')
        .select('*', { count: 'exact', head: true });

      isTableChecked = true;
      
      if (error && error.code === '42P01') {
        // Table doesn't exist
        console.log("screen_usage table doesn't exist");
        isTableExists = false;
        return false;
      }
      
      // Table exists
      isTableExists = true;
      return true;
    } catch (e) {
      console.error("Error checking table existence:", e);
      isTableChecked = true;
      isTableExists = false;
      return false;
    }
  },

  startSession: async (childDbId: string): Promise<void> => {
    console.log("Starting session for child ID:", childDbId);
    
    try {
      if (!childDbId) {
        console.error("No child DB ID provided");
        return;
      }
      
      // First verify the child ID exists in database
      const { data, error } = await supabase
        .from('user_account')
        .select('id')
        .eq('id', childDbId)
        .single();
        
      if (error) {
        console.error("Failed to verify child ID in database:", error);
        return;
      }
      
      console.log("Verified child ID in database:", data?.id);
      
      // Check if we need to reset usage for a new day
      await screenTimeService.checkAndResetDailyUsage(childDbId);
      
      // Store session start time in sessionStorage for page tracking
      sessionStorage.setItem('sessionStartTime', Date.now().toString());
      sessionStorage.setItem('childDbId', childDbId);
      
      // Verify storage worked
      const storedId = sessionStorage.getItem('childDbId');
      console.log("Stored in session storage:", storedId);
      
      if (storedId !== childDbId) {
        console.error("Session storage verification failed!");
      }
      
      console.log("Session started for child ID:", childDbId);
    } catch (e) {
      console.error("Exception in startSession:", e);
    }
  },

  updateSessionStatus: async (): Promise<void> => {
    console.log("Updating session status");
    
    // Get session data from sessionStorage
    const startTimeStr = sessionStorage.getItem('sessionStartTime');
    const childDbId = sessionStorage.getItem('childDbId');
    
    if (!startTimeStr || !childDbId) {
      console.log("No current session data found");
      return;
    }
    
    const startTime = parseInt(startTimeStr, 10);
    const endTime = Date.now();
    const durationSeconds = Math.floor((endTime - startTime) / 1000);
    
    console.log(`Session duration: ${durationSeconds} seconds for child ID: ${childDbId}`);
    
    // Only track if duration is meaningful (more than 1 second)
    if (durationSeconds > 1) {
      try {
        // Check if table exists before trying to track usage
        const tableExists = await screenTimeService.checkTableExists();
        if (tableExists) {
          // Track this session's usage
          console.log(`Recording ${durationSeconds} seconds of usage to screen_usage table...`);
          await screenTimeService.trackUsageInternal(childDbId, durationSeconds);
        } else {
          console.log("Skipping usage tracking as table doesn't exist");
        }
        
        // Update session start time for continuous tracking
        console.log("Resetting session start time for continued tracking");
        sessionStorage.setItem('sessionStartTime', Date.now().toString());
      } catch (e) {
        console.error("Error updating session status:", e);
      }
    } else {
      console.log(`Skipping tracking - duration too short (${durationSeconds} seconds)`);
    }
  },

  endSession: async (): Promise<void> => {
    console.log("Ending session");
    await screenTimeService.updateSessionStatus();
    
    // Clear session data
    sessionStorage.removeItem('sessionStartTime');
    sessionStorage.removeItem('childDbId');
    
    if (heartbeatInterval) {
      console.log("Clearing heartbeat interval");
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  },

  trackUsageInternal: async (childDbId: string, durationSeconds: number): Promise<void> => {
    try {
      console.log("Tracking usage:", { childDbId, durationSeconds });
      
      // Check if table exists first
      const tableExists = await screenTimeService.checkTableExists();
      if (!tableExists) {
        console.log("Skipping usage tracking as table doesn't exist");
        return;
      }
      
      // Check for valid parameters
      if (!childDbId) {
        console.error("Invalid child ID for tracking");
        return;
      }
      
      // Insert usage record
      const { data, error: insertError } = await supabase
        .from('screen_usage')
        .insert([{
          child_id: childDbId,
          duration: durationSeconds,
          usage_date: new Date().toISOString(),
        }])
        .select();
        
      if (insertError) {
        console.error("Error tracking usage:", insertError);
        
        // More detailed error logging
        if (insertError.code === '42P01') {
          console.error("Table 'screen_usage' does not exist. Create it first.");
        } else if (insertError.code === '23503') {
          console.error("Foreign key violation. Check that child_id exists:", childDbId);
        } else if (insertError.code === '23502') {
          console.error("Not null violation. Check that all required fields are provided.");
        }
      } else {
        console.log("Usage tracked successfully:", data);
      }
    } catch (e) {
      console.error("Exception in trackUsageInternal:", e);
    }
  },
  
  // Improved heartbeat function
  startHeartbeat: (): void => {
    console.log("Starting heartbeat interval");
    
    // Clear any existing heartbeat to prevent duplicates
    if (heartbeatInterval) {
      console.log("Clearing existing heartbeat interval");
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    
    // Force an immediate update to capture current usage
    screenTimeService.updateSessionStatus();
    
    // Set up the interval for regular updates
    heartbeatInterval = setInterval(() => {
      console.log("Heartbeat: updating session status");
      screenTimeService.updateSessionStatus();
    }, 60 * 1000);
    console.log("Heartbeat interval set up successfully");
  },

  getTodayUsage: async (childDbId: string): Promise<number> => {
    // Get today's date in local timezone, formatted as YYYY-MM-DD
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Get start and end of current day in ISO format for database query
    const startOfDay = todayStr + 'T00:00:00Z';
    const endOfDay = todayStr + 'T23:59:59Z';
    
    console.log("Getting usage for child ID:", childDbId, "between:", startOfDay, "and", endOfDay);
    
    try {
      if (!childDbId) {
        console.log("No child DB ID provided");
        return 0;
      }
      
      // Check if table exists first
      const tableExists = await screenTimeService.checkTableExists();
      if (!tableExists) {
        console.log("Table doesn't exist, returning 0 usage");
        return 0;
      }
      
      // Get usage records from the screen_usage table for today only
      const { data: usageData, error: usageError } = await supabase
        .from('screen_usage')
        .select('duration, usage_date')
        .eq('child_id', childDbId)
        .gte('usage_date', startOfDay)
        .lte('usage_date', endOfDay);
        
      if (usageError) {
        console.error("Error fetching usage data:", usageError);
        return 0;
      }
      
      console.log("Raw usage data for today:", usageData);
      
      // If no records found, return 0
      if (!usageData || usageData.length === 0) {
        console.log("No usage records found for today, returning 0");
        return 0;
      }
      
      // Calculate total minutes used
      const totalSeconds = usageData.reduce(
        (acc, record) => acc + (record.duration || 0), 
        0
      );
      
      // Convert to minutes
      const totalMinutes = totalSeconds / 60;
      
      console.log("Total time used today:", totalMinutes.toFixed(2), "minutes");
      return totalMinutes;
    } catch (e) {
      console.error("Exception in getTodayUsage:", e);
      return 0;
    }
  },

  resetTodayUsage: async (childDbId: string): Promise<boolean> => {
    if (!childDbId) return false;
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const startOfDay = todayStr + 'T00:00:00Z';
    const endOfDay = todayStr + 'T23:59:59Z';
    
    console.log("Resetting usage for child ID:", childDbId, "for today");
    
    try {
      const { error } = await supabase
        .from('screen_usage')
        .delete()
        .eq('child_id', childDbId)
        .gte('usage_date', startOfDay)
        .lte('usage_date', endOfDay);
        
      if (error) {
        console.error("Error resetting usage:", error);
        return false;
      }
      
      console.log("Successfully reset today's usage");
      return true;
    } catch (e) {
      console.error("Exception in resetTodayUsage:", e);
      return false;
    }
  },

  checkAndResetDailyUsage: async (childDbId: string): Promise<void> => {
    if (!childDbId) return;
    
    try {
      console.log("Checking if reset needed for child ID:", childDbId);
      
      // Instead of using a database column, we'll use localStorage to track the last login date
      const lastLoginKey = `last_login_${childDbId}`;
      const lastLoginStr = safeLocalStorage.getItem(lastLoginKey);
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // If no record of last login, or last login was on a different day, reset usage
      if (!lastLoginStr || lastLoginStr !== today) {
        console.log("New day detected or first login, resetting usage");
        await screenTimeService.resetTodayUsage(childDbId);
        
        // Update last login date in localStorage
        safeLocalStorage.setItem(lastLoginKey, today);
      } else {
        console.log("Same day login, not resetting usage");
      }
    } catch (e) {
      console.error("Exception in checkAndResetDailyUsage:", e);
    }
  },

  getTimeLimit: async (childDbId: string): Promise<number | null> => {
    console.log("Getting time limit for child ID:", childDbId);
    
    try {
      if (!childDbId) {
        console.log("No child DB ID provided");
        return null;
      }
      
      // First check if child exists
      const { error: childError } = await supabase
        .from('user_account')
        .select('id')
        .eq('id', childDbId)
        .single();
        
      if (childError) {
        console.error("Child ID not found in user_account:", childError);
        return null;
      }
      
      // Log entire query for debugging
      console.log("Looking up time limit with query:", {
        table: 'isparentof',
        column: 'child_id',
        value: childDbId
      });
      
      // Look up time limit using child_id
      const { data, error } = await supabase
        .from('isparentof')
        .select('timeLimitMinute, parent_id')
        .eq('child_id', childDbId);

      if (error) {
        console.error("Error fetching time limit from isparentof:", error);
        return null;
      }

      // Log the raw results
      console.log("Time limit query results:", data);

      // Check if we got results and have a time limit
      if (data && data.length > 0) {
        // Get the first parent's time limit (if multiple)
        const timeLimit = data[0].timeLimitMinute;
        console.log("Time limit found:", timeLimit);
        return timeLimit;
      } 
      
      // If no results, log all entries in the table for debugging
      const { data: allData } = await supabase
        .from('isparentof')
        .select('*')
        .limit(10);
        
      console.log("Sample isparentof entries:", allData);
      console.log("No time limit found for child ID:", childDbId);
      return null;
    } catch (e) {
      console.error("Exception in getTimeLimit:", e);
      return null;
    }
  },
  
  debugUserInfo: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log("Current auth user:", user);
      
      if (!user) return { error: "No authenticated user" };
      
      const { data, error } = await supabase
        .from('user_account')
        .select('*')
        .eq('user_id', user.id);
      
      console.log("User account data:", data, error);
      return { user, accountData: data, error };
    } catch (e) {
      console.error("Error in debugUserInfo:", e);
      return { error: e };
    }
  },
  
  debugTimeLimit: async (childDbId: string): Promise<void> => {
    console.log("DEBUG - checking time limit for child ID:", childDbId);
    
    // Look up using child_id
    const { data: childIdData, error: childIdError } = await supabase
      .from('isparentof')
      .select('*')
      .eq('child_id', childDbId);
      
    console.log("Child ID relationship check:", { childIdData, childIdError });
    
    // Get sample of parent relationships for debugging
    const { data: sampleRelations, error: sampleError } = await supabase
      .from('isparentof')
      .select('*')
      .limit(5);
      
    console.log("Sample of parent relationships:", { sampleRelations, sampleError });
  },
  
  // Add comprehensive debug function
  debugRelationships: async (childDbId: string) => {
    console.log("Debugging relationships for child ID:", childDbId);
    
    try {
      // Verify child exists
      const { data: childData, error: childError } = await supabase
        .from('user_account')
        .select('*')
        .eq('id', childDbId)
        .single();
        
      if (childError) {
        console.error("Error finding child:", childError);
        return { error: childError };
      }
      
      // Check if child is in parent relationships
      const { data: asChild } = await supabase
        .from('isparentof')
        .select('*')
        .eq('child_id', childDbId);
        
      // Check if child is also a parent
      const { data: asParent } = await supabase
        .from('isparentof')
        .select('*')
        .eq('parent_id', childDbId);
        
      // Verify session storage
      const sessionChildId = sessionStorage.getItem('childDbId');
      const sessionStartTime = sessionStorage.getItem('sessionStartTime');
      
      return {
        childExists: !!childData,
        childData,
        hasParents: asChild && asChild.length > 0,
        parentRelationships: asChild,
        isParent: asParent && asParent.length > 0,
        childRelationships: asParent,
        sessionStorage: {
          childId: sessionChildId,
          startTime: sessionStartTime,
          matches: sessionChildId === childDbId
        }
      };
    } catch (e) {
      console.error("Error debugging relationships:", e);
      return { error: String(e) };
    }
  },
  
  // Function to check current session data
  checkSessionData: () => {
    try {
      const startTimeStr = sessionStorage.getItem('sessionStartTime');
      const childDbId = sessionStorage.getItem('childDbId');
      
      return {
        startTime: startTimeStr ? parseInt(startTimeStr, 10) : null,
        childId: childDbId,
        hasValidSession: !!(startTimeStr && childDbId)
      };
    } catch (e) {
      console.error("Error checking session data:", e);
      return { error: String(e) };
    }
  },
  
  // Function to force session status update
  forceUpdate: async (): Promise<void> => {
    await screenTimeService.updateSessionStatus();
    console.log("Force updated session status");
    
    const sessionData = screenTimeService.checkSessionData();
    console.log("Current session status:", sessionData);
  },
  
  // Get all session usage
  getAllUsage: async (childDbId: string): Promise<UsageResponse> => {
    try {
      if (!childDbId) {
        console.log("No child DB ID provided");
        return { error: "No child ID provided" };
      }
      
      // Check if table exists first
      const tableExists = await screenTimeService.checkTableExists();
      if (!tableExists) {
        return { error: "Table doesn't exist" };
      }
      
      // Get all usage records for this child
      const { data, error } = await supabase
        .from('screen_usage')
        .select('*')
        .eq('child_id', childDbId)
        .order('usage_date', { ascending: false });
        
      if (error) {
        console.error("Error fetching all usage data:", error);
        return { error };
      }
      
      return { data };
    } catch (e) {
      console.error("Exception in getAllUsage:", e);
      return { error: String(e) };
    }
  }
};