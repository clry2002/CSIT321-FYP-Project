// // services/screenTimeService.ts
// import { supabase } from '@/lib/supabase';

// export interface UserSession {
//   id: string;
//   startTime: Date;
// }

// // Cache user information to reduce database calls
// let currentUserSession: UserSession | null = null;
// let heartbeatInterval: NodeJS.Timeout | null = null;

// export const screenTimeService = {
//   getUsername: async (userId: string): Promise<string | null> => {
//     console.log("Getting username for userId:", userId);
    
//     const { data, error } = await supabase
//       .from('user_account')
//       .select('username')
//       .eq('user_id', userId)
//       .single();

//     if (error || !data) {
//       console.error("Error fetching username:", error);
//       return null;
//     }

//     console.log("Found username:", data.username);
//     return data.username;
//   },

//   startSession: async (username: string): Promise<UserSession | null> => {
//     console.log("Starting session for username:", username);
//     const now = new Date();
    
//     try {
//       console.log("Inserting session data with:", {
//         child_username: username, 
//         session_date: now.toISOString().split('T')[0],
//         session_start: now 
//       });
      
//       const { data, error } = await supabase
//         .from('childscreentimelimit')
//         .insert([{ 
//           child_username: username, 
//           session_date: now.toISOString().split('T')[0], 
//           session_start: now 
//         }])
//         .select('id')
//         .single();

//       console.log("Insert response:", { data, error });
      
//       if (error) {
//         console.error("Error starting screen time session:", error);
//         return null;
//       }

//       const session = { id: data.id, startTime: now };
//       currentUserSession = session;
//       console.log("Session created successfully:", session);
//       return session;
//     } catch (e) {
//       console.error("Exception in startSession:", e);
//       return null;
//     }
//   },

//   updateSessionStatus: async (): Promise<void> => {
//     if (!currentUserSession) {
//       console.log("No current session to update");
//       return;
//     }
    
//     console.log("Updating session end time for session:", currentUserSession.id);
//     const { error } = await supabase
//       .from('childscreentimelimit')
//       .update({ session_end: new Date() })
//       .eq('id', currentUserSession.id);
      
//     if (error) {
//       console.error("Error updating session end time:", error);
//     } else {
//       console.log("Session end time updated successfully");
//     }
//   },

//   endSession: async (): Promise<void> => {
//     console.log("Ending session");
//     await screenTimeService.updateSessionStatus();
//     currentUserSession = null;
    
//     if (heartbeatInterval) {
//       console.log("Clearing heartbeat interval");
//       clearInterval(heartbeatInterval);
//       heartbeatInterval = null;
//     }
//   },

//   startHeartbeat: (): void => {
//     console.log("Starting heartbeat interval");
//     // Update the session every 5 minutes to handle cases where beforeunload doesn't fire
//     if (!heartbeatInterval) {
//       heartbeatInterval = setInterval(() => {
//         console.log("Heartbeat: updating session status");
//         screenTimeService.updateSessionStatus();
//       }, 5 * 60 * 1000);
//     }
//   },

//   getTodayUsage: async (username: string): Promise<number> => {
//     const today = new Date().toISOString().split('T')[0];
//     console.log("Getting usage for:", username, "on date:", today);
    
//     // Get completed sessions
//     const { data: completedSessions, error: completedError } = await supabase
//       .from('childscreentimelimit')
//       .select('duration_minutes')
//       .eq('child_username', username)
//       .eq('session_date', today)
//       .not('duration_minutes', 'is', null);

//     if (completedError) {
//       console.error("Error fetching completed sessions:", completedError);
//       return 0;
//     }

//     console.log("Completed sessions:", completedSessions);

//     // Get active session (if any)
//     const { data: activeSessions, error: activeError } = await supabase
//       .from('childscreentimelimit')
//       .select('session_start')
//       .eq('child_username', username)
//       .eq('session_date', today)
//       .is('session_end', null);

//     if (activeError) {
//       console.error("Error fetching active sessions:", activeError);
//       return 0;
//     }

//     console.log("Active sessions:", activeSessions);

//     // Calculate completed sessions time
//     const completedMinutes = completedSessions.reduce(
//       (acc, session) => acc + (session.duration_minutes || 0), 
//       0
//     );
    
//     // Calculate active session time
//     let activeMinutes = 0;
//     if (activeSessions && activeSessions.length > 0) {
//       const now = new Date();
//       activeMinutes = activeSessions.reduce((acc, session) => {
//         const startTime = new Date(session.session_start);
//         const minutesDiff = (now.getTime() - startTime.getTime()) / (1000 * 60);
//         return acc + minutesDiff;
//       }, 0);
//     }

//     const totalMinutes = completedMinutes + activeMinutes;
//     console.log("Total time used:", totalMinutes, "(completed:", completedMinutes, "active:", activeMinutes, ")");
//     return totalMinutes;
//   },

//   getTimeLimit: async (username: string): Promise<number | null> => {
//     console.log("Getting time limit for:", username);
    
//     try {
//       // Use the correct case for the column name: timeLimitMinute
//       const { data, error } = await supabase
//         .from('isparentof')
//         .select('timeLimitMinute')
//         .eq('child', username);
  
//       if (error) {
//         console.error("Error fetching time limit from isparentof:", error);
//         return null;
//       }
  
//       // Check if we got results and have a time limit
//       if (data && data.length > 0 && data[0].timeLimitMinute !== null) {
//         console.log("Time limit found:", data[0].timeLimitMinute);
//         return data[0].timeLimitMinute;
//       } 
      
//       // Try with lowercase username
//       const { data: lowerCaseData, error: lowerCaseError } = await supabase
//         .from('isparentof')
//         .select('timeLimitMinute')
//         .eq('child', username.toLowerCase());
        
//       if (!lowerCaseError && lowerCaseData && lowerCaseData.length > 0 && lowerCaseData[0].timeLimitMinute !== null) {
//         console.log("Found time limit with lowercase username:", lowerCaseData[0].timeLimitMinute);
//         return lowerCaseData[0].timeLimitMinute;
//       }
      
//       console.log("No time limit found for user:", username);
//       // Return null to indicate no limit was found
//       return null;
//     } catch (e) {
//       console.error("Exception in getTimeLimit:", e);
//       return null;
//     }
//   },
  
//   debugUserInfo: async () => {
//     try {
//       const { data: { user } } = await supabase.auth.getUser();
//       console.log("Current auth user:", user);
      
//       if (!user) return { error: "No authenticated user" };
      
//       const { data, error } = await supabase
//         .from('user_account')
//         .select('*')
//         .eq('user_id', user.id);
      
//       console.log("User account data:", data, error);
//       return { user, accountData: data, error };
//     } catch (e) {
//       console.error("Error in debugUserInfo:", e);
//       return { error: e };
//     }
//   },
  
//   debugTimeLimit: async (username: string): Promise<void> => {
//     console.log("DEBUG - checking time limit for:", username);
    
//     // Direct query with all columns
//     const { data: directData, error: directError } = await supabase
//       .from('isparentof')
//       .select('*')
//       .eq('child', username);
      
//     console.log("Direct parent relationship query:", { directData, directError });
    
//     // Check case sensitivity
//     if (directData && directData.length === 0) {
//       const { data: caseInsensitiveData, error: caseError } = await supabase
//         .from('isparentof')
//         .select('*')
//         .ilike('child', username);
        
//       console.log("Case-insensitive check:", { caseInsensitiveData, caseError });
//     }
    
//     // Get all parent relationships for debugging
//     const { data: allRelations, error: allError } = await supabase
//       .from('isparentof')
//       .select('*');
      
//     console.log("All parent relationships:", { allRelations, allError });
//   }
// };